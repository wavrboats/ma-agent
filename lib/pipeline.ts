// Canonical Asset → Exit AI-agent operating pipeline.
// Universal across factories, commercial property, hospitality, land and corporate assets.
// One asset ID runs through every stage; agents research, humans approve irreversible decisions.

export type StageCode =
  | 'INTAKE'
  | 'SCREEN'
  | 'VERIFY'
  | 'ASSESS'
  | 'MARKET'
  | 'MODEL'
  | 'VALUE'
  | 'STRATEGY'
  | 'BUYERS'
  | 'MATERIALS'
  | 'OUTREACH'
  | 'EXECUTE';

export type GateCode = 'G0' | 'G1' | 'G2' | 'G3' | 'G4' | 'G5';

export type ArchitectureLayer =
  | 'Orchestrator'
  | 'Source Collector'
  | 'Verification'
  | 'Analysis'
  | 'Buyer Intelligence'
  | 'Deal Execution';

export type ApproverRole = 'Chairman' | 'CEO' | 'Legal' | 'Finance';

export type PipelineStage = {
  number: number;
  code: StageCode;
  title: string;
  scope: string;
  agent: string;
  layer: ArchitectureLayer;
  workstreamGroup?: WorkstreamGroupId;
  // Gate that must be approved before the asset can leave this stage.
  exitGate?: GateCode;
};

export type StageGate = {
  code: GateCode;
  title: string;
  afterStage: StageCode;
  humanApproval: boolean;
  approverRole: ApproverRole;
  reason: string;
};

export type WorkstreamGroupId = 'DUE_DILIGENCE' | 'MARKET_RESEARCH' | 'ECONOMICS_VALUE_EXIT' | 'BUYER_TO_CLOSING';

export type WorkstreamGroup = {
  id: WorkstreamGroupId;
  label: string;
  stages: StageCode[];
  output: string;
  workstreams: string[];
};

export const pipelineStages: PipelineStage[] = [
  { number: 1, code: 'INTAKE', title: 'Asset registration', scope: 'Asset registration', agent: 'Intake Agent', layer: 'Orchestrator' },
  { number: 2, code: 'SCREEN', title: 'Mandate / red flags', scope: 'Mandate / red flags', agent: 'Screening Agent', layer: 'Orchestrator', exitGate: 'G0' },
  { number: 3, code: 'VERIFY', title: 'Legal + ownership', scope: 'Legal + ownership', agent: 'DD Agent', layer: 'Verification', workstreamGroup: 'DUE_DILIGENCE', exitGate: 'G1' },
  { number: 4, code: 'ASSESS', title: 'Technical + ESG', scope: 'Technical + ESG', agent: 'Engineering Agent', layer: 'Analysis', workstreamGroup: 'DUE_DILIGENCE' },
  { number: 5, code: 'MARKET', title: 'Demand + competitors', scope: 'Demand + competitors', agent: 'Research Agent', layer: 'Source Collector', workstreamGroup: 'MARKET_RESEARCH' },
  { number: 6, code: 'MODEL', title: 'Financial normalization', scope: 'Financial normalization', agent: 'Finance Agent', layer: 'Analysis', workstreamGroup: 'ECONOMICS_VALUE_EXIT', exitGate: 'G2' },
  { number: 7, code: 'VALUE', title: 'Valuation + scenarios', scope: 'Valuation + scenarios', agent: 'Valuation Agent', layer: 'Analysis', workstreamGroup: 'ECONOMICS_VALUE_EXIT', exitGate: 'G3' },
  { number: 8, code: 'STRATEGY', title: 'Exit / reposition / JV', scope: 'Exit / reposition / JV', agent: 'Strategy Agent', layer: 'Analysis', workstreamGroup: 'ECONOMICS_VALUE_EXIT' },
  { number: 9, code: 'BUYERS', title: 'Longlist → shortlist', scope: 'Longlist → shortlist', agent: 'Buyer Agent', layer: 'Buyer Intelligence', workstreamGroup: 'BUYER_TO_CLOSING', exitGate: 'G4' },
  { number: 10, code: 'MATERIALS', title: 'Teaser + CIM + data room', scope: 'Teaser + CIM + data room', agent: 'Deal Prep Agent', layer: 'Deal Execution', workstreamGroup: 'BUYER_TO_CLOSING' },
  { number: 11, code: 'OUTREACH', title: 'NDA + buyer engagement', scope: 'NDA + buyer engagement', agent: 'Origination Agent', layer: 'Deal Execution', workstreamGroup: 'BUYER_TO_CLOSING' },
  { number: 12, code: 'EXECUTE', title: 'Offers → SPA → close', scope: 'Offers → SPA → close', agent: 'Execution Agent', layer: 'Deal Execution', workstreamGroup: 'BUYER_TO_CLOSING', exitGate: 'G5' },
];

// Human approval is required at the legal, valuation, outreach and closing gates.
export const stageGates: StageGate[] = [
  {
    code: 'G0',
    title: 'Mandate accepted',
    afterStage: 'SCREEN',
    humanApproval: false,
    approverRole: 'CEO',
    reason: 'Screening confirms the asset fits the mandate and has no disqualifying red flags.',
  },
  {
    code: 'G1',
    title: 'Identity & ownership verified',
    afterStage: 'VERIFY',
    humanApproval: true,
    approverRole: 'Legal',
    reason: 'Legal must confirm entity, title and encumbrances before any further work is relied upon.',
  },
  {
    code: 'G2',
    title: 'Asset commercially viable',
    afterStage: 'MODEL',
    humanApproval: false,
    approverRole: 'CEO',
    reason: 'Technical, market and normalized financial evidence supports a commercial case.',
  },
  {
    code: 'G3',
    title: 'Valuation approved',
    afterStage: 'VALUE',
    humanApproval: true,
    approverRole: 'Chairman',
    reason: 'Management approval of the price range is required before strategy and marketing.',
  },
  {
    code: 'G4',
    title: 'Buyer list approved',
    afterStage: 'BUYERS',
    humanApproval: true,
    approverRole: 'Chairman',
    reason: 'No external outreach or confidential disclosure before the shortlist is approved.',
  },
  {
    code: 'G5',
    title: 'Binding terms approved',
    afterStage: 'EXECUTE',
    humanApproval: true,
    approverRole: 'Chairman',
    reason: 'Binding offers, SPA terms and closing require formal human sign-off.',
  },
];

export const workstreamGroups: WorkstreamGroup[] = [
  {
    id: 'DUE_DILIGENCE',
    label: '03–04 Due diligence',
    stages: ['VERIFY', 'ASSESS'],
    output: 'Verified fact book, risk register, missing-documents list',
    workstreams: [
      'Legal entity / ownership',
      'Title deeds / land tenure',
      'Liens / mortgages / pledges',
      'Permits / zoning / licenses',
      'Litigation / disputes',
      'Tax / regulatory exposure',
      'Financial statements / debt',
      'Revenue / customer contracts',
      'Machinery / condition / age',
      'Capacity / utilization / downtime',
      'Utilities / infrastructure',
      'Environmental / wastewater',
      'Labor / workforce liabilities',
      'Insurance / safety / compliance',
      'Site visit / independent verification',
    ],
  },
  {
    id: 'MARKET_RESEARCH',
    label: '05 Market research',
    stages: ['MARKET'],
    output: 'Market sizing, competition, trade flows, opportunity map',
    workstreams: [
      'Market definition / HS codes',
      'Natural vs synthetic segments',
      'Raw / wet blue / crust / finished',
      'End-use industries',
      'Egypt TAM / SAM / SOM',
      'Global TAM / trends',
      'Demand volume / value',
      'Domestic production / capacity',
      'Imports by country / year',
      'Exports by destination / year',
      'Import suppliers / shares',
      'Export destinations / shares',
      'Unit values by HS + quality',
      'Local selling prices / quotes',
      'Global benchmark prices',
      'Freight / insurance / tariffs',
      'Trade agreements / rules',
      'Input / labor / utility costs',
      'Factory clusters / locations',
      'Competitor longlist',
      'Competitor capacity / utilization',
      'Competitor market shares (verified)',
      'Customers / offtake sectors',
      'Buyer procurement behavior',
      'Technical specs / certifications',
      'Market growth / scenarios',
      'Substitutes / threats',
      'Regulatory / ESG constraints',
      'Route / logistics advantages',
      'White spaces / export feasibility',
    ],
  },
  {
    id: 'ECONOMICS_VALUE_EXIT',
    label: '06–08 Economics, value & exit',
    stages: ['MODEL', 'VALUE', 'STRATEGY'],
    output: 'Investment case and approved transaction strategy',
    workstreams: [
      'Historical financial reconstruction',
      'Normalize EBITDA / one-offs',
      'Working capital / debt bridge',
      'Restart capex / repair budget',
      'Unit economics by product',
      'Production + price scenarios',
      'DCF / NPV / IRR',
      'Trading / transaction comparables',
      'Land + machinery appraisal',
      'Liquidation / downside value',
      'Greenfield vs buy comparison',
      'Build-vs-buy strategic savings',
      'Asset sale vs share sale',
      'JV / lease / restart-and-exit',
      'Management approval of price range',
    ],
  },
  {
    id: 'BUYER_TO_CLOSING',
    label: '09–12 Buyer → closing',
    stages: ['BUYERS', 'MATERIALS', 'OUTREACH', 'EXECUTE'],
    output: 'Ranked targets, controlled outreach, transaction completion',
    workstreams: [
      'Buyer universe by geography',
      'Strategic / financial / industrial',
      'Import dependence by product',
      'Supply-chain fit / synergies',
      'Buyer production footprint',
      'Capacity / ability to pay',
      'M&A history / expansion',
      'Rank by evidence + fit',
      'Identify decision makers',
      'Teaser / NDA / CIM',
      'Virtual data room / Q&A',
      'Outreach / interest tracking',
      'Indicative offers / IOIs',
      'LOI / exclusivity / confirmatory DD',
      'SPA / approvals / payment / handover',
    ],
  },
];

export const architectureLayers: { name: ArchitectureLayer; responsibilities: string[] }[] = [
  { name: 'Orchestrator', responsibilities: ['Asset ID', 'Workflow', 'Stage gates'] },
  { name: 'Source Collector', responsibilities: ['Registries', 'Regulators', 'Trade data', 'News'] },
  { name: 'Verification', responsibilities: ['Entity matching', 'Cross-source checks'] },
  { name: 'Analysis', responsibilities: ['Market', 'Financial', 'Technical', 'Valuation'] },
  { name: 'Buyer Intelligence', responsibilities: ['Buyer evidence', 'Import economics', 'Scoring'] },
  { name: 'Deal Execution', responsibilities: ['CRM', 'Documents', 'Approvals', 'Milestones'] },
];

export const sharedDatabaseTables = [
  'Assets',
  'Entities',
  'Sources',
  'Findings',
  'Risks',
  'Financials',
  'Markets',
  'Buyers',
  'Contacts',
  'Documents',
  'Tasks',
  'Approvals',
  'Audit log',
];

// Access and reliability vary by source.
export const exampleSources = [
  'GAFI',
  'IDA',
  'CAPMAS',
  'GOEIC',
  'Chambers',
  'UN Comtrade',
  'ITC/WITS',
  'Company filings',
  'Land registry',
  'Site inspection',
];

export const implementationRoadmap = [
  { sprint: 1, scope: 'Intake + asset database + source registry' },
  { sprint: 2, scope: 'DD checklists + verification + risk flags' },
  { sprint: 3, scope: 'Market data + HS-level trade analytics' },
  { sprint: 4, scope: 'Valuation model + strategic buyer ranking' },
  { sprint: 5, scope: 'Teaser/CIM generation + deal CRM' },
  { sprint: 6, scope: 'Pilot on Amoun + human review + refine' },
];

// DATA RULE: each finding = source URL + date + confidence + owner + status; unknown ≠ zero.
export type FindingStatus = 'UNVERIFIED' | 'VERIFIED' | 'DISPUTED' | 'REJECTED';

export type EvidencedFinding = {
  sourceUrl: string;
  date: string;
  confidence: number;
  owner: string;
  status: FindingStatus;
  // A missing value is null (unknown), never 0.
  value?: number | string | null;
};

export function validateFinding(finding: Partial<EvidencedFinding>): string[] {
  const errors: string[] = [];
  if (!finding.sourceUrl || finding.sourceUrl === '#') errors.push('Missing source URL');
  if (!finding.date || Number.isNaN(Date.parse(finding.date))) errors.push('Missing or invalid date');
  if (typeof finding.confidence !== 'number' || finding.confidence < 0 || finding.confidence > 1) {
    errors.push('Confidence must be between 0 and 1');
  }
  if (!finding.owner) errors.push('Missing owner');
  if (!finding.status) errors.push('Missing status');
  return errors;
}

export const getStage = (code: StageCode) => pipelineStages.find((stage) => stage.code === code)!;

export const getGate = (code: GateCode) => stageGates.find((gate) => gate.code === code)!;

export const getWorkstreamGroup = (id: WorkstreamGroupId) => workstreamGroups.find((group) => group.id === id)!;

// An asset may advance past a stage only once that stage's exit gate is approved.
export function canAdvance(stage: StageCode, approvedGates: GateCode[]): boolean {
  const gate = getStage(stage).exitGate;
  return !gate || approvedGates.includes(gate);
}

export function nextStage(stage: StageCode, approvedGates: GateCode[]): StageCode | null {
  if (!canAdvance(stage, approvedGates)) return null;
  const next = pipelineStages.find((item) => item.number === getStage(stage).number + 1);
  return next ? next.code : null;
}
