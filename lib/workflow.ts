import type { ApprovalGate, AssetWorkflowState, WorkflowFinding, WorkflowTask } from '@/lib/types';
import { pipelineStages, stageGates } from '@/lib/pipeline';
import type { StageCode } from '@/lib/pipeline';

// Current state of each stage for the demo asset. Stages not listed are queued behind their gate.
// Confidence is null where nothing has been researched yet: unknown ≠ zero.
const stageProgress: Partial<
  Record<StageCode, Pick<WorkflowTask, 'title' | 'status' | 'owner' | 'confidence' | 'blockers' | 'dueDate'>>
> = {
  INTAKE: {
    title: 'Register asset, assign asset ID and collect owner documents',
    status: 'COMPLETED',
    owner: 'CEO',
    confidence: 0.9,
    blockers: [],
    dueDate: '2026-10-11',
  },
  SCREEN: {
    title: 'Check mandate fit and raise red flags',
    status: 'RUNNING',
    owner: 'CEO',
    confidence: 0.82,
    blockers: [],
    dueDate: '2026-10-12',
  },
  VERIFY: {
    title: 'Verify legal entity, title deed, ownership chain and encumbrances',
    status: 'QUEUED',
    owner: 'Legal Team',
    confidence: 0.41,
    blockers: ['Missing ownership documents'],
    dueDate: '2026-10-14',
  },
  ASSESS: {
    title: 'Assess plant condition, restart feasibility and environmental exposure',
    status: 'BLOCKED',
    owner: 'Technical Team',
    confidence: 0.29,
    blockers: ['No site inspection confirmed'],
    dueDate: '2026-10-16',
  },
  MARKET: {
    title: 'Size the leather market and map trade flows and competitors',
    status: 'QUEUED',
    owner: 'Research Desk',
    confidence: 0.67,
    blockers: ['HS code scope pending'],
    dueDate: '2026-10-15',
  },
  MODEL: {
    title: 'Reconstruct historical statements and normalize EBITDA',
    status: 'QUEUED',
    owner: 'Finance',
    confidence: 0.54,
    blockers: ['Financial statements pending reconciliation'],
    dueDate: '2026-10-16',
  },
};

const buildTasks = (assetId: string): WorkflowTask[] => {
  // Every gate is still pending, so a stage with no work yet waits on the closest gate before it.
  let previousGate: string | undefined;

  return pipelineStages.map((stage, index) => {
    const progress = stageProgress[stage.code];
    const blockers = progress ? [...progress.blockers] : [];
    if (!progress && previousGate) blockers.push(`Awaiting ${previousGate} approval`);
    if (stage.exitGate) previousGate = stage.exitGate;

    return {
      id: `${assetId}-${String(stage.number).padStart(2, '0')}-${stage.code.toLowerCase()}`,
      assetId,
      department: stage.agent,
      stage: stage.code,
      title: progress?.title ?? stage.scope,
      status: progress?.status ?? 'QUEUED',
      owner: progress?.owner ?? stage.layer,
      confidence: progress?.confidence ?? null,
      blockers,
      dueDate: progress?.dueDate ?? '',
      dependsOn: index === 0 ? [] : [`${assetId}-${String(stage.number - 1).padStart(2, '0')}-${pipelineStages[index - 1].code.toLowerCase()}`],
    };
  });
};

const buildFindings = (assetId: string): WorkflowFinding[] => [
  {
    id: 'finding-001',
    assetId,
    department: 'Intake Agent',
    title: 'Asset classification identified',
    text: 'The submitted asset is classified as a closed industrial facility requiring validation before valuation or buyer marketing.',
    confidence: 0.86,
    owner: 'CEO',
    status: 'VERIFIED',
    source: {
      name: 'Asset Intake Form',
      url: `/assets/${assetId}`,
      date: '2026-10-11',
      confidence: 0.9,
    },
  },
  {
    id: 'finding-002',
    assetId,
    department: 'DD Agent',
    title: 'Ownership verification required',
    text: 'Legal ownership and any encumbrances must be verified before external materials are prepared.',
    confidence: 0.74,
    owner: 'Legal Team',
    status: 'UNVERIFIED',
    source: {
      name: 'Due diligence checklist',
      url: '/pipeline#due-diligence',
      date: '2026-10-11',
      confidence: 0.8,
    },
  },
];

const buildApprovals = (): ApprovalGate[] =>
  stageGates.map((gate) => ({
    gate: gate.code,
    action: `${gate.code} ${gate.title}`,
    requiredRole: gate.approverRole,
    status: 'PENDING',
    reason: gate.reason,
  }));

export const initializeWorkflow = (assetId: string): AssetWorkflowState => ({
  assetId,
  stage: 'SCREEN',
  status: 'RUNNING',
  tasks: buildTasks(assetId),
  findings: buildFindings(assetId),
  approvals: buildApprovals(),
});

export const createCEOReport = (assetId: string, findings: WorkflowFinding[]) => ({
  assetId,
  executiveSummary:
    'The asset requires legal verification, physical inspection, and financial reconstruction before it is suitable for external buyer marketing.',
  keyRisks: findings.map((item) => item.title),
  nextActions: [
    'G0: confirm mandate fit and clear screening red flags',
    'G1: confirm legal ownership and title status',
    'Request technical inspection and restart feasibility review',
    'G2: reconstruct historical statements and normalize EBITDA',
    'Prepare buyer universe only after G3 valuation approval',
  ],
  readiness: findings.length >= 2 ? 'READY_FOR_REVIEW' : 'NOT_READY',
});

export const getWorkflowForAsset = (assetId: string) => initializeWorkflow(assetId);
