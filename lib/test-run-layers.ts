// What sits inside each agent bubble of the test-run map: the inner bubbles you see when you tap it,
// and what each inner bubble shows when you tap that.

import { getStage, pipelineStages } from '@/lib/pipeline';
import type { StageCode } from '@/lib/pipeline';
import type { ChecklistItem } from '@/lib/test-run-checklists';
import type { TestRunState } from '@/lib/test-run';

export type InnerTone = 'asset' | 'finding' | 'risk' | 'document' | 'buyer' | 'output' | 'gate' | 'workstream' | 'outcome';

export type InnerBubble = {
  id: string;
  label: string;
  tone: InnerTone;
  count?: number;
  lines: string[];
  // Opens a further layer of workstream bubbles.
  checklist?: { title: string; items: ChecklistItem[] };
};

// "SITE ANALYSIS – HOTELS NEARBY" → "Hotels nearby"
export function prettyHeading(heading: string) {
  const core = heading.replace(/^.*?[–-]\s+/, '').trim();
  if (heading === 'Intake record') return 'Asset record';
  if (core !== core.toUpperCase()) return core;
  return core.charAt(0) + core.slice(1).toLowerCase();
}

const STATUS_LABEL: Record<ChecklistItem['status'], string> = {
  covered: 'Covered by your material',
  produced: 'Produced by the run',
  'needs-data': 'Needs data',
  'not-applicable': 'Not relevant to this asset',
  'not-reached': 'Not reached yet',
};

export function innerBubbles(run: TestRunState, node: StageCode | 'RESULT', files: { name: string }[]): InnerBubble[] {
  const bubbles: InnerBubble[] = [];

  if (node === 'RESULT') {
    if (run.outcome) bubbles.push({ id: 'outcome', label: 'Outcome', tone: 'outcome', lines: [run.outcome.headline, ...run.outcome.points] });
    const strategy = run.outputs.STRATEGY?.find((block) => block.title === 'Recommendation');
    if (strategy) bubbles.push({ id: 'strategy', label: 'Strategy', tone: 'output', lines: strategy.items });
    const value = run.outputs.VALUE?.[0];
    if (value) bubbles.push({ id: 'value', label: 'Size and value', tone: 'output', lines: value.items });
    const types = run.buyers.filter((buyer) => buyer.kind === 'Buyer type');
    const named = run.buyers.filter((buyer) => buyer.kind !== 'Buyer type');
    if (types.length) bubbles.push({ id: 'types', label: 'Buyer types', tone: 'buyer', count: types.length, lines: types.map((b) => `${'★'.repeat(b.fit)} ${b.name}`) });
    if (named.length) bubbles.push({ id: 'named', label: 'Named leads', tone: 'buyer', count: named.length, lines: named.map((b) => b.name) });
    const high = run.risks.filter((risk) => risk.severity === 'HIGH' || risk.severity === 'CRITICAL');
    if (run.risks.length) bubbles.push({ id: 'risks', label: 'Risks', tone: 'risk', count: run.risks.length, lines: run.risks.map((r) => `${r.severity}: ${r.title}`) });
    if (run.missingDocuments.length) {
      bubbles.push({ id: 'docs', label: 'Missing documents', tone: 'document', count: run.missingDocuments.length, lines: run.missingDocuments.map((d) => d.document) });
    }
    if (!high.length && !bubbles.length) bubbles.push({ id: 'none', label: 'Not reached', tone: 'output', lines: ['The run has not reached the end yet.'] });
    return bubbles;
  }

  const stage = getStage(node);
  const checklist = run.checklists[node];

  // Due diligence: the workstreams themselves are the inner bubbles.
  if ((node === 'VERIFY' || node === 'ASSESS') && checklist) {
    for (const item of checklist.items) {
      bubbles.push({
        id: `ws-${item.number}`,
        label: `${item.number} ${item.name}`,
        tone: item.status === 'covered' ? 'finding' : item.status === 'needs-data' ? 'document' : item.status === 'produced' ? 'output' : 'workstream',
        lines: [
          STATUS_LABEL[item.status],
          item.note,
          `Owner: ${pipelineStages.find((s) => s.code === item.stage)?.agent}`,
        ],
      });
    }
  } else {
    if (node === 'INTAKE' && files.length) {
      bubbles.push({ id: 'files', label: 'Attached files', tone: 'asset', count: files.length, lines: files.map((file) => file.name) });
    }
    // Findings, grouped by the heading they came from in the owner's material.
    const groups = new Map<string, string[]>();
    for (const finding of run.findings.filter((item) => item.stage === node)) {
      const lines = groups.get(finding.workstream) ?? [];
      lines.push(finding.value !== null && finding.workstream === 'Intake record' ? `${finding.title}: ${finding.value}` : finding.text);
      groups.set(finding.workstream, lines);
    }
    for (const [workstream, lines] of Array.from(groups)) {
      bubbles.push({ id: `f-${workstream}`, label: prettyHeading(workstream), tone: workstream === 'Intake record' ? 'asset' : 'finding', count: lines.length, lines });
    }
    for (const block of run.outputs[node] ?? []) {
      bubbles.push({ id: `o-${block.title}`, label: block.title.replace(/\s*\(.*\)$/, ''), tone: 'output', count: block.items.length, lines: block.items });
    }
    if (node === 'BUYERS') {
      for (const buyer of run.buyers) {
        bubbles.push({
          id: buyer.id,
          label: buyer.name,
          tone: 'buyer',
          lines: [`${'★'.repeat(buyer.fit)} ${buyer.kind}`, buyer.rationale, `Approach: ${buyer.approach}`],
        });
      }
    }
    if (checklist) {
      bubbles.push({ id: 'workstreams', label: 'Workstreams', tone: 'workstream', count: checklist.items.length, lines: [], checklist });
    }
  }

  const risks = run.risks.filter((risk) => risk.stage === node);
  if (risks.length) {
    bubbles.push({ id: 'risks', label: 'Risks', tone: 'risk', count: risks.length, lines: risks.map((r) => `${r.severity}: ${r.title}. ${r.description} Next step: ${r.mitigation}`) });
  }
  const docs = run.missingDocuments.filter((doc) => doc.stage === node);
  if (docs.length) {
    bubbles.push({ id: 'docs', label: 'Missing documents', tone: 'document', count: docs.length, lines: docs.map((d) => `${d.document} (from ${d.likelyHolder})`) });
  }
  const gateCode = stage.exitGate;
  const gate = gateCode ? run.gates[gateCode] : undefined;
  if (gateCode && gate) {
    bubbles.push({
      id: 'gate',
      label: `Gate ${gateCode}`,
      tone: 'gate',
      lines: [
        `Recommendation: ${gate.recommendation ?? 'none'}`,
        gate.rationale ?? '',
        gate.decision ? `Decision: ${gate.decision.toLowerCase()} by ${gate.decidedBy}` : 'Waiting for a decision',
      ].filter(Boolean),
    });
  }
  return bubbles;
}
