import type { BetaMessageParam } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import type { FindingStatus, GateCode, StageCode } from '@/lib/pipeline';

export type RunStatus = 'IDLE' | 'RUNNING' | 'AWAITING_APPROVAL' | 'STOPPED' | 'FAILED';

export type StageRunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export type AgentFinding = {
  id: string;
  stage: StageCode;
  agent: string;
  workstream: string;
  title: string;
  text: string;
  // null when the fact is unknown: unknown ≠ zero.
  value: string | null;
  sourceName: string;
  sourceUrl: string;
  date: string;
  confidence: number;
  owner: string;
  status: FindingStatus;
  // True when the cited web page was returned by the agent's own search or fetch in this run.
  sourceSeen: boolean;
};

export type AgentRisk = {
  id: string;
  stage: StageCode;
  workstream: string;
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  mitigation: string;
};

export type MissingDocument = {
  id: string;
  stage: StageCode;
  workstream: string;
  document: string;
  reason: string;
  likelyHolder: string;
};

export type GateRecommendation = 'APPROVE' | 'HOLD' | 'REJECT';

export type GateState = {
  recommendation?: GateRecommendation;
  rationale?: string;
  decision?: 'APPROVED' | 'REJECTED';
  decidedBy?: string;
  decidedAt?: string;
  notes?: string;
};

export type StageRun = {
  status: StageRunStatus;
  summary?: string;
  startedAt?: string;
  finishedAt?: string;
  // The stage's conversation so far, so a stage can stop before a hosting time limit and resume
  // on the next request.
  messages?: BetaMessageParam[];
  // Pages the agent searched or fetched in this stage; citations are checked against them.
  seenUrls?: string[];
  // Model requests made so far in this stage.
  requests?: number;
};

export type LogEntry = {
  at: string;
  stage?: StageCode;
  message: string;
};

export type AgentRunState = {
  assetId: string;
  status: RunStatus;
  currentStage: StageCode;
  stages: Partial<Record<StageCode, StageRun>>;
  findings: AgentFinding[];
  risks: AgentRisk[];
  missingDocuments: MissingDocument[];
  gates: Partial<Record<GateCode, GateState>>;
  log: LogEntry[];
  error?: string;
  // Set while a request is working on the run, until this time, so two requests never run the same step.
  leaseUntil?: string;
  updatedAt: string;
};
