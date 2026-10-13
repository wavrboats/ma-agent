import Anthropic from '@anthropic-ai/sdk';
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { BetaMessage, BetaToolUnion } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import { z } from 'zod';
import { SYSTEM_PROMPT, agentDefinitions } from '@/lib/agents/definitions';
import type { AgentDefinition } from '@/lib/agents/definitions';
import { loadRun, newRunState, saveRun } from '@/lib/agents/store';
import type { AgentRunState } from '@/lib/agents/types';
import { getGate, getStage, nextStage, validateFinding } from '@/lib/pipeline';
import type { GateCode, StageCode } from '@/lib/pipeline';
import { mockAssets } from '@/lib/types';

const MODEL = 'claude-opus-5-5';
const MAX_ITERATIONS = 40;

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
      await saveRun(state);

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
      await saveRun(state);
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
      await saveRun(state);
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
          await saveRun(state);
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

function buildTask(state: AgentRunState, definition: AgentDefinition) {
  const stage = getStage(definition.stage);
  const asset = mockAssets.find((item) => item.assetId === state.assetId);
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

async function runStage(state: AgentRunState, definition: AgentDefinition) {
  const stage = getStage(definition.stage);
  const seenUrls = new Set<string>();

  state.stages[stage.code] = { status: 'RUNNING', startedAt: now() };
  log(state, `${stage.agent} started`, stage.code);
  await saveRun(state);

  const runner = getClient().beta.messages.toolRunner({
    model: MODEL,
    max_tokens: 16000,
    max_iterations: MAX_ITERATIONS,
    output_config: { effort: 'high' },
    // On a safety decline the API re-runs the turn on a fallback model chosen by refusal category.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    tools: buildTools(state, definition, seenUrls),
    messages: [{ role: 'user', content: buildTask(state, definition) }],
  });

  let last: BetaMessage | undefined;
  for await (const message of runner) {
    last = message;
    // Yielded before this message's tool calls run, so citations can be checked against it.
    collectSeenUrls(message, seenUrls);
    // A long server-side search turn can pause; the runner does not resume it on its own.
    if (message.stop_reason === 'pause_turn') {
      runner.pushMessages({ role: 'assistant', content: message.content });
    }
  }

  if (!last) throw new Error('The model returned no response.');
  if (last.stop_reason === 'refusal') {
    throw new Error(`The model declined this stage${last.stop_details?.category ? ` (${last.stop_details.category})` : ''}.`);
  }
  if (last.stop_reason === 'tool_use' || last.stop_reason === 'pause_turn') {
    throw new Error(`The agent hit the ${MAX_ITERATIONS}-step limit before finishing.`);
  }
  if (last.stop_reason === 'max_tokens') {
    throw new Error('The agent ran out of output tokens before finishing.');
  }

  const summary = last.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  state.stages[stage.code] = { ...state.stages[stage.code], status: 'COMPLETED', summary, finishedAt: now() };
  log(state, `${stage.agent} finished`, stage.code);
  await saveRun(state);
}

const approvedGates = (state: AgentRunState) =>
  (Object.keys(state.gates) as GateCode[]).filter((code) => state.gates[code]?.decision === 'APPROVED');

// Runs agents stage by stage until a gate needs a human, a stage has no agent yet, or a stage fails.
async function continuePipeline(state: AgentRunState) {
  try {
    while (true) {
      const stage = getStage(state.currentStage);
      const definition = agentDefinitions[stage.code];

      if (state.stages[stage.code]?.status !== 'COMPLETED') {
        if (!definition) {
          state.status = 'STOPPED';
          log(state, `Stopped: the ${stage.agent} has not been built yet`, stage.code);
          await saveRun(state);
          return;
        }
        await runStage(state, definition);
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
          await saveRun(state);
          return;
        }
      }

      const next = nextStage(stage.code, approvedGates(state));
      if (!next) {
        state.status = 'STOPPED';
        log(state, 'Pipeline complete', stage.code);
        await saveRun(state);
        return;
      }
      state.currentStage = next;
      await saveRun(state);
    }
  } catch (error) {
    const stage = state.currentStage;
    state.status = 'FAILED';
    state.error = error instanceof Anthropic.APIError ? `Claude API error ${error.status}: ${error.message}` : String(error);
    state.stages[stage] = { ...state.stages[stage], status: 'FAILED', finishedAt: now() };
    log(state, `Failed: ${state.error}`, stage);
    await saveRun(state);
  }
}

export class PipelineError extends Error {}

// Starts or resumes the run. Returns once the run is marked RUNNING; the agents continue in the background.
export async function startRun(assetId: string, options: { reset?: boolean } = {}) {
  if (!mockAssets.some((asset) => asset.assetId === assetId)) throw new PipelineError(`Unknown asset ${assetId}`);

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

  void continuePipeline(state);
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

  if (decision === 'REJECTED') {
    state.status = 'STOPPED';
    await saveRun(state);
    return state;
  }

  state.status = 'RUNNING';
  await saveRun(state);
  void continuePipeline(state);
  return state;
}

export const getRun = loadRun;
