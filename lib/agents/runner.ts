import Anthropic from '@anthropic-ai/sdk';
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import type {
  BetaContentBlockParam,
  BetaMessage,
  BetaToolResultBlockParam,
  BetaToolUnion,
} from '@anthropic-ai/sdk/resources/beta/messages/messages';
import type { BetaRunnableTool } from '@anthropic-ai/sdk/lib/tools/BetaRunnableTool';
import { z } from 'zod';
import { SYSTEM_PROMPT, agentDefinitions } from '@/lib/agents/definitions';
import type { AgentDefinition } from '@/lib/agents/definitions';
import { loadRun, newRunState, saveRun } from '@/lib/agents/store';
import type { AgentRunState } from '@/lib/agents/types';
import { getGate, getStage, nextStage, validateFinding } from '@/lib/pipeline';
import type { GateCode, StageCode } from '@/lib/pipeline';
import { getAsset } from '@/lib/assets/store';

const MODEL = 'claude-opus-5-5';
const MAX_REQUESTS_PER_STAGE = 40;

// Vercel stops a function at its maxDuration (300 s here, the most every plan allows). A step stops
// starting new model calls after STEP_BUDGET_MS and aborts any call still running at
// STEP_DEADLINE_MS, then saves, so the next step resumes the stage from its saved conversation.
const STEP_BUDGET_MS = 200_000;
const STEP_DEADLINE_MS = 280_000;
const LEASE_MS = 300_000;

let client: Anthropic | undefined;
const getClient = () => (client ??= new Anthropic());

const now = () => new Date().toISOString();
const normalizeUrl = (url: string) => url.trim().replace(/\/+$/, '');
const newId = (prefix: string, count: number) => `${prefix}-${String(count + 1).padStart(3, '0')}`;

function log(state: AgentRunState, message: string, stage?: StageCode) {
  state.log.push({ at: now(), stage, message });
}

// Collects every URL the model saw in its own web search and fetch results, so a finding can be
// checked against pages the agent actually read.
function collectSeenUrls(message: BetaMessage, seen: Set<string>) {
  for (const block of message.content) {
    if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
      for (const result of block.content) seen.add(normalizeUrl(result.url));
    }
    if (block.type === 'web_fetch_tool_result' && block.content.type === 'web_fetch_result') {
      seen.add(normalizeUrl(block.content.url));
    }
  }
}

function buildTools(state: AgentRunState, definition: AgentDefinition, seenUrls: Set<string>) {
  const stage = getStage(definition.stage);
  const intakeRef = `intake://${state.assetId}`;

  const recordFinding = betaZodTool({
    name: 'record_finding',
    description:
      'Record one evidenced fact about the asset. Every finding needs a source URL, source date, confidence and status. Use value null when the fact is unknown; never use 0 for an unknown.',
    inputSchema: z.object({
      workstream: z.string().describe('The workstream this fact belongs to, from your task list'),
      title: z.string().describe('Short label for the fact'),
      text: z.string().describe('The fact and the evidence for it, in one or two sentences'),
      value: z.string().nullable().describe('The value established, e.g. an owner name or area, or null if unknown'),
      source_name: z.string().describe('Name of the source, e.g. "GAFI investor map" or "Owner intake record"'),
      source_url: z.string().describe(`URL of the page you read, or ${intakeRef} for owner-provided intake data`),
      source_date: z.string().describe('Publication or access date of the source, YYYY-MM-DD'),
      confidence: z.number().min(0).max(1),
      status: z.enum(['UNVERIFIED', 'VERIFIED', 'DISPUTED', 'REJECTED']),
    }),
    run: async (input) => {
      const errors = validateFinding({
        sourceUrl: input.source_url,
        date: input.source_date,
        confidence: input.confidence,
        owner: stage.agent,
        status: input.status,
        value: input.value,
      });
      const isIntake = input.source_url === intakeRef;
      if (!isIntake && !/^https?:\/\//.test(input.source_url)) {
        errors.push(`source_url must be an http(s) URL or ${intakeRef}`);
      }
      if (errors.length > 0) return `REJECTED, finding not recorded: ${errors.join('; ')}. Fix these and record it again.`;

      const sourceSeen = isIntake || seenUrls.has(normalizeUrl(input.source_url));
      // Owner statements, and web citations the agent never opened in this run, cannot count as verified.
      const status = (isIntake || !sourceSeen) && input.status === 'VERIFIED' ? 'UNVERIFIED' : input.status;

      const finding = {
        id: newId('F', state.findings.length),
        stage: stage.code,
        agent: stage.agent,
        workstream: input.workstream,
        title: input.title,
        text: input.text,
        value: input.value,
        sourceName: input.source_name,
        sourceUrl: input.source_url,
        date: input.source_date,
        confidence: input.confidence,
        owner: stage.agent,
        status,
        sourceSeen,
      };
      state.findings.push(finding);

      return status === input.status
        ? `Recorded ${finding.id}.`
        : `Recorded ${finding.id} as UNVERIFIED: ${
            isIntake
              ? 'owner-provided intake data needs an independent source to be verified'
              : `${input.source_url} was not among the pages you searched or fetched in this task`
          }.`;
    },
  });

  const recordRisk = betaZodTool({
    name: 'record_risk',
    description: 'Add an issue to the risk register: anything that could reduce value, block a sale or create a liability.',
    inputSchema: z.object({
      workstream: z.string(),
      title: z.string(),
      severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
      description: z.string().describe('What the risk is and the evidence for it'),
      mitigation: z.string().describe('What would resolve or reduce it'),
    }),
    run: async (input) => {
      const risk = { id: newId('R', state.risks.length), stage: stage.code, ...input };
      state.risks.push(risk);
      return `Recorded ${risk.id}.`;
    },
  });

  const requestDocument = betaZodTool({
    name: 'request_document',
    description: 'Add a document or piece of information to the missing-documents list when a fact cannot be established without it.',
    inputSchema: z.object({
      workstream: z.string(),
      document: z.string().describe('The document or information needed, e.g. "Title deed from the real estate registry"'),
      reason: z.string().describe('Which fact it would establish'),
      likely_holder: z.string().describe('Who is likely to hold it, e.g. owner, registry, auditor'),
    }),
    run: async (input) => {
      const doc = {
        id: newId('D', state.missingDocuments.length),
        stage: stage.code,
        workstream: input.workstream,
        document: input.document,
        reason: input.reason,
        likelyHolder: input.likely_holder,
      };
      state.missingDocuments.push(doc);
      return `Added ${doc.id} to the missing-documents list.`;
    },
  });

  const tools: BetaToolUnion[] = [recordFinding, recordRisk, requestDocument];

  if (definition.recommendsGate) {
    const gate = getGate(definition.recommendsGate);
    tools.push(
      betaZodTool({
        name: 'recommend_gate',
        description: `Give your recommendation on gate ${gate.code} (${gate.title}). This is a recommendation only; the gate is decided by ${gate.humanApproval ? `a human (${gate.approverRole})` : 'the orchestrator'}.`,
        inputSchema: z.object({
          recommendation: z.enum(['APPROVE', 'HOLD', 'REJECT']),
          rationale: z.string().describe('Why, citing finding and risk IDs where relevant'),
        }),
        run: async (input) => {
          state.gates[gate.code] = { ...state.gates[gate.code], ...input };
              return `Recommendation on ${gate.code} recorded.`;
        },
      }),
    );
  }

  if (definition.webResearch) {
    tools.push(
      { type: 'web_search_20260209', name: 'web_search', max_uses: 15 },
      { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 15 },
    );
  }

  return tools;
}

async function buildTask(state: AgentRunState, definition: AgentDefinition) {
  const stage = getStage(definition.stage);
  const asset = await getAsset(state.assetId);
  const earlierFindings = state.findings.map(
    ({ id, stage: findingStage, workstream, title, value, status, sourceUrl }) => ({
      id,
      stage: findingStage,
      workstream,
      title,
      value,
      status,
      sourceUrl,
    }),
  );

  return `You are the ${stage.agent} for stage ${String(stage.number).padStart(2, '0')} ${stage.code} (${stage.title}).

Asset ID: ${state.assetId}
Today's date: ${now().slice(0, 10)}

Intake record (owner-provided, unverified):
${JSON.stringify(asset ?? { assetId: state.assetId, note: 'No intake record found' }, null, 2)}

Findings already recorded by earlier stages:
${earlierFindings.length > 0 ? JSON.stringify(earlierFindings, null, 2) : 'None.'}

Risks already recorded: ${state.risks.length > 0 ? state.risks.map((risk) => `${risk.id} ${risk.title} (${risk.severity})`).join('; ') : 'None.'}

Your workstreams:
${definition.workstreams.map((workstream, index) => `${String(index + 1).padStart(2, '0')} ${workstream}`).join('\n')}

Your task:
${definition.instructions}`;
}

const isRunnable = (tool: BetaToolUnion): tool is BetaRunnableTool =>
  typeof (tool as Partial<BetaRunnableTool>).run === 'function';

const errorMessage = (error: unknown) =>
  error instanceof Anthropic.APIError ? `Claude API error ${error.status}: ${error.message}` : String(error instanceof Error ? error.message : error);

async function runTool(tool: BetaRunnableTool | undefined, block: { id: string; name: string; input: unknown }) {
  const result: BetaToolResultBlockParam = { type: 'tool_result', tool_use_id: block.id, content: '' };
  if (!tool) return { ...result, is_error: true, content: `Unknown tool ${block.name}.` };
  try {
    return { ...result, content: await tool.run(tool.parse(block.input)) };
  } catch (error) {
    return { ...result, is_error: true, content: `Invalid input: ${errorMessage(error)}` };
  }
}

// Works on the current stage until it finishes or the step's time budget runs out.
// Returns true when the stage is complete, false when it paused and needs another step.
async function workOnStage(state: AgentRunState, definition: AgentDefinition, stepStart: number): Promise<boolean> {
  const stage = getStage(definition.stage);

  let stageRun = state.stages[stage.code];
  if (!stageRun || !stageRun.messages) {
    stageRun = {
      status: 'RUNNING',
      startedAt: now(),
      messages: [{ role: 'user', content: await buildTask(state, definition) }],
      seenUrls: [],
      requests: 0,
    };
    state.stages[stage.code] = stageRun;
    log(state, `${stage.agent} started`, stage.code);
    await saveRun(state);
  }
  const messages = stageRun.messages!;
  const seenUrls = new Set(stageRun.seenUrls);
  const tools = buildTools(state, definition, seenUrls);
  const runnable = new Map(tools.filter(isRunnable).map((tool) => [tool.name, tool]));

  while (true) {
    const elapsed = Date.now() - stepStart;
    if (elapsed > STEP_BUDGET_MS) return false;
    if ((stageRun.requests ?? 0) >= MAX_REQUESTS_PER_STAGE) {
      throw new Error(`The agent hit the ${MAX_REQUESTS_PER_STAGE}-request limit before finishing.`);
    }

    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), STEP_DEADLINE_MS - elapsed);
    let message: BetaMessage;
    try {
      message = await getClient().beta.messages.create(
        {
          model: MODEL,
          max_tokens: 16000,
          output_config: { effort: 'high' },
          // On a safety decline the API re-runs the turn on a fallback model chosen by refusal category.
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
          tools,
          messages,
        },
        { signal: abort.signal },
      );
    } catch (error) {
      // The call ran past the step deadline: nothing was added, so the next step repeats it.
      if (error instanceof Anthropic.APIUserAbortError) return false;
      throw error;
    } finally {
      clearTimeout(timer);
    }

    stageRun.requests = (stageRun.requests ?? 0) + 1;
    // Echo the reply back unchanged so the conversation stays append-only.
    messages.push({ role: 'assistant', content: message.content as BetaContentBlockParam[] });
    collectSeenUrls(message, seenUrls);
    stageRun.seenUrls = Array.from(seenUrls);

    if (message.stop_reason === 'refusal') {
      throw new Error(`The model declined this stage${message.stop_details?.category ? ` (${message.stop_details.category})` : ''}.`);
    }
    if (message.stop_reason === 'max_tokens') throw new Error('The agent ran out of output tokens before finishing.');

    // A long server-side search turn can pause; sending the conversation back resumes it.
    if (message.stop_reason === 'pause_turn') {
      await saveRun(state);
      continue;
    }

    const toolUses = message.content.filter((block) => block.type === 'tool_use');
    if (message.stop_reason === 'tool_use' && toolUses.length > 0) {
      const results: BetaToolResultBlockParam[] = [];
      for (const block of toolUses) results.push(await runTool(runnable.get(block.name), block));
      messages.push({ role: 'user', content: results });
      await saveRun(state);
      continue;
    }

    const summary = message.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();
    // The finished conversation is no longer needed and would bloat every read of the run.
    state.stages[stage.code] = {
      status: 'COMPLETED',
      summary,
      startedAt: stageRun.startedAt,
      finishedAt: now(),
      requests: stageRun.requests,
    };
    log(state, `${stage.agent} finished`, stage.code);
    await saveRun(state);
    return true;
  }
}

const approvedGates = (state: AgentRunState) =>
  (Object.keys(state.gates) as GateCode[]).filter((code) => state.gates[code]?.decision === 'APPROVED');

// Moves the run forward until a gate needs a human, a stage has no agent yet, or the step's time runs out.
async function advance(state: AgentRunState, stepStart: number) {
  while (true) {
    const stage = getStage(state.currentStage);
    const definition = agentDefinitions[stage.code];

    if (state.stages[stage.code]?.status !== 'COMPLETED') {
      if (!definition) {
        state.status = 'STOPPED';
        log(state, `Stopped: the ${stage.agent} has not been built yet`, stage.code);
        return;
      }
      if (!(await workOnStage(state, definition, stepStart))) return;
    }

    if (stage.exitGate && state.gates[stage.exitGate]?.decision !== 'APPROVED') {
      const gate = getGate(stage.exitGate);
      const gateState = state.gates[gate.code];

      if (!gate.humanApproval && gateState?.recommendation === 'APPROVE') {
        state.gates[gate.code] = { ...gateState, decision: 'APPROVED', decidedBy: 'Orchestrator', decidedAt: now() };
        log(state, `${gate.code} ${gate.title}: approved by the orchestrator on the agent's recommendation`, stage.code);
      } else {
        state.status = 'AWAITING_APPROVAL';
        log(state, `Waiting for ${gate.approverRole} to decide ${gate.code} ${gate.title}`, stage.code);
        return;
      }
    }

    const next = nextStage(stage.code, approvedGates(state));
    if (!next) {
      state.status = 'STOPPED';
      log(state, 'Pipeline complete', stage.code);
      return;
    }
    state.currentStage = next;
    await saveRun(state);
  }
}

export class PipelineError extends Error {}

const leaseActive = (state: AgentRunState) => Boolean(state.leaseUntil && Date.parse(state.leaseUntil) > Date.now());

// Runs one step of the pipeline within this request. Call it again while the run is RUNNING;
// each call resumes from the saved state.
export async function runStep(assetId: string): Promise<AgentRunState> {
  const stepStart = Date.now();
  const state = await loadRun(assetId);
  if (state.status !== 'RUNNING' || leaseActive(state)) return state;

  state.leaseUntil = new Date(stepStart + LEASE_MS).toISOString();
  await saveRun(state);

  try {
    await advance(state, stepStart);
  } catch (error) {
    const stage = state.currentStage;
    state.status = 'FAILED';
    state.error = errorMessage(error);
    state.stages[stage] = { ...state.stages[stage], status: 'FAILED', finishedAt: now() };
    log(state, `Failed: ${state.error}`, stage);
  } finally {
    state.leaseUntil = undefined;
    await saveRun(state);
  }
  return state;
}

// Starts a new run, or retries a failed stage. The agents then advance through runStep.
export async function startRun(assetId: string, options: { reset?: boolean } = {}) {
  if (!(await getAsset(assetId))) throw new PipelineError(`Unknown asset ${assetId}`);

  let state = await loadRun(assetId);
  if (state.status === 'RUNNING') throw new PipelineError('This asset already has a run in progress.');
  if (state.status === 'AWAITING_APPROVAL' && !options.reset) {
    throw new PipelineError('This run is waiting on a gate decision.');
  }

  if (options.reset) {
    state = newRunState(assetId);
  } else if (state.status === 'FAILED') {
    // Retry the failed stage from a clean slate for that stage.
    const stage = state.currentStage;
    state.findings = state.findings.filter((item) => item.stage !== stage);
    state.risks = state.risks.filter((item) => item.stage !== stage);
    state.missingDocuments = state.missingDocuments.filter((item) => item.stage !== stage);
    delete state.stages[stage];
    const gate = getStage(stage).exitGate;
    if (gate) delete state.gates[gate];
  }

  state.status = 'RUNNING';
  state.error = undefined;
  log(state, options.reset ? 'Run started' : 'Run resumed');
  await saveRun(state);
  return state;
}

export async function decideGate(
  assetId: string,
  gateCode: GateCode,
  decision: 'APPROVED' | 'REJECTED',
  decidedBy: string,
  notes?: string,
) {
  const state = await loadRun(assetId);
  const gate = getGate(gateCode);
  const stage = getStage(state.currentStage);

  if (state.status !== 'AWAITING_APPROVAL' || stage.exitGate !== gateCode) {
    throw new PipelineError(`${gateCode} is not waiting for a decision.`);
  }

  state.gates[gateCode] = { ...state.gates[gateCode], decision, decidedBy, decidedAt: now(), notes };
  log(state, `${gateCode} ${gate.title}: ${decision.toLowerCase()} by ${decidedBy}${notes ? ` (${notes})` : ''}`, stage.code);
  state.status = decision === 'APPROVED' ? 'RUNNING' : 'STOPPED';
  await saveRun(state);
  return state;
}

// The run as API clients see it: the saved conversations stay server-side.
export function publicRun(state: AgentRunState) {
  const stages = Object.fromEntries(
    Object.entries(state.stages).map(([code, stageRun]) => {
      const { messages, seenUrls, ...rest } = stageRun ?? {};
      return [code, rest];
    }),
  );
  return { ...state, stages, stepInProgress: leaseActive(state) };
}

export const getRun = loadRun;
