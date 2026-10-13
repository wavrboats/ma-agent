import { pipelineStages } from '@/lib/pipeline';
import type { ApproverRole, FindingStatus, GateCode, StageCode } from '@/lib/pipeline';

// A photo or PDF kept with an asset, stored in the asset-files Supabase Storage bucket.
export type AssetAttachment = {
  path: string;
  name: string;
  contentType: string;
  size: number;
};

export type Asset = {
  id: string;
  assetId: string;
  name: string;
  assetClass: string;
  country: string;
  city: string;
  address: string;
  description: string;
  ownerObjective: string;
  transactionType: string;
  operatingStatus: string;
  askingPrice: number | null;
  // The price as written when it is not a plain number, e.g. "EGP 30 million".
  askingPriceText?: string | null;
  industry?: string;
  // Free text copied from the asset's documents.
  documentDetails?: string;
  attachments?: AssetAttachment[];
  status: string;
  createdAt: string;
};

export type WorkflowTask = {
  id: string;
  assetId: string;
  department: string;
  stage: StageCode;
  title: string;
  status: 'QUEUED' | 'RUNNING' | 'BLOCKED' | 'NEEDS_REVIEW' | 'COMPLETED';
  owner: string;
  dueDate: string;
  // null means not yet assessed: unknown ≠ zero.
  confidence: number | null;
  blockers: string[];
  dependsOn: string[];
};

export type WorkflowFinding = {
  id: string;
  assetId: string;
  department: string;
  title: string;
  text: string;
  confidence: number;
  owner: string;
  status: FindingStatus;
  source: {
    name: string;
    url: string;
    date: string;
    confidence: number;
  };
};

export type ApprovalGate = {
  gate: GateCode;
  action: string;
  requiredRole: ApproverRole;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason: string;
};

export type AssetWorkflowState = {
  assetId: string;
  stage: StageCode;
  status: 'QUEUED' | 'RUNNING' | 'BLOCKED' | 'NEEDS_REVIEW' | 'COMPLETED';
  tasks: WorkflowTask[];
  findings: WorkflowFinding[];
  approvals: ApprovalGate[];
};

export const mockAssets: Asset[] = [
  {
    id: 'AS-001',
    assetId: 'AS-001',
    name: 'Amoun Leather Factory',
    assetClass: 'Industrial Facility',
    country: 'Egypt',
    city: 'El Salheya',
    address: 'Sharqia Industrial Zone',
    description: 'Former industrial leather processing facility requiring legal and technical validation before any strategic exit path is recommended.',
    ownerObjective: 'Sell or restart under a strategic acquirer',
    transactionType: 'Asset Sale',
    operatingStatus: 'Closed',
    askingPrice: null,
    status: 'INTAKE',
    createdAt: '2026-10-11',
  },
  {
    id: 'AS-002',
    assetId: 'AS-002',
    name: 'Nile Logistics Park',
    assetClass: 'Logistics Real Estate',
    country: 'Egypt',
    city: 'Cairo',
    address: 'Industrial Ring Road',
    description: 'Regional logistics and distribution asset under review for strategic sale and value optimization.',
    ownerObjective: 'Exit via sale to strategic operator',
    transactionType: 'Asset Sale',
    operatingStatus: 'Operational',
    askingPrice: 32000000,
    status: 'VERIFY',
    createdAt: '2026-10-08',
  },
];

export const workflowStages: StageCode[] = pipelineStages.map((stage) => stage.code);

export const departmentProgress = [
  { name: 'CEO AI Agent', status: 'RUNNING', progress: 82, owner: 'Chairman / CEO' },
  { name: 'Legal & Due Diligence', status: 'QUEUED', progress: 26, owner: 'Legal Team' },
  { name: 'Industrial & Technical Assessment', status: 'BLOCKED', progress: 14, owner: 'Technical Team' },
  { name: 'Market Intelligence', status: 'RUNNING', progress: 58, owner: 'Research Desk' },
  { name: 'Financial Analysis', status: 'NEEDS_REVIEW', progress: 49, owner: 'Finance' },
  { name: 'Valuation', status: 'QUEUED', progress: 12, owner: 'Valuation Lead' },
  { name: 'Buyer Intelligence', status: 'QUEUED', progress: 0, owner: 'Buyer Research' },
  { name: 'Risk & Compliance', status: 'QUEUED', progress: 0, owner: 'Compliance' },
];

export const defaultAssetForm = {
  name: 'Amoun Leather Factory',
  assetClass: 'Industrial Facility',
  country: 'Egypt',
  city: 'El Salheya',
  address: 'Sharqia Industrial Zone',
  description: 'Former industrial leather processing facility requiring legal and technical validation before any strategic exit path is recommended.',
  ownerObjective: 'Sell or restart under a strategic acquirer',
  transactionType: 'Asset Sale',
  operatingStatus: 'Closed',
  askingPrice: '',
};
