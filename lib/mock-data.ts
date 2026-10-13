import type { StageCode } from '@/lib/pipeline';

export type AssetStatus = StageCode;

export type DepartmentStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'BLOCKED'
  | 'NEEDS_REVIEW'
  | 'COMPLETED';

export const mockAssets = [
  {
    id: 'AS-001',
    assetId: 'AS-001',
    name: 'Amoun Leather Factory',
    assetClass: 'Industrial Facility',
    country: 'Egypt',
    city: 'El Salheya',
    address: 'Sharqia Industrial Zone',
    description:
      'Former leather processing facility requiring legal, technical, market, and financial verification before strategic exit planning.',
    ownerObjective: 'Sell or restart under a strategic acquirer',
    transactionType: 'Asset Sale',
    operatingStatus: 'Closed',
    askingPrice: null,
    status: 'INTAKE' as AssetStatus,
    createdAt: '2026-10-11T00:00:00Z',
  },
  {
    id: 'AS-002',
    assetId: 'AS-002',
    name: 'Nile Logistics Park',
    assetClass: 'Logistics Real Estate',
    country: 'Egypt',
    city: 'Cairo',
    address: '6th of October Road',
    description: 'Regional logistics facility with warehouse and landhold opportunity.',
    ownerObjective: 'Structured exit via sale-leaseback or sale to industrial operator',
    transactionType: 'Share Sale',
    operatingStatus: 'Operational',
    askingPrice: 32000000,
    status: 'VERIFY' as AssetStatus,
    createdAt: '2026-10-07T00:00:00Z',
  },
];

export const mockTasks = [
  {
    id: 'TASK-001',
    assetId: 'AS-001',
    department: 'CEO AI Agent',
    title: 'Create asset profile and execution plan',
    status: 'RUNNING' as DepartmentStatus,
    owner: 'CEO',
    confidence: 0.82,
    blockers: ['Awaiting legal record request'],
    dueDate: '2026-10-12',
  },
  {
    id: 'TASK-002',
    assetId: 'AS-001',
    department: 'Legal & Due Diligence',
    title: 'Verify title deed, ownership chain, and encumbrances',
    status: 'QUEUED' as DepartmentStatus,
    owner: 'Legal Team',
    confidence: 0.41,
    blockers: ['Missing ownership documents'],
    dueDate: '2026-10-14',
  },
  {
    id: 'TASK-003',
    assetId: 'AS-001',
    department: 'Industrial & Technical Assessment',
    title: 'Assess plant condition and restart feasibility',
    status: 'BLOCKED' as DepartmentStatus,
    owner: 'Technical Team',
    confidence: 0.29,
    blockers: ['No site inspection yet'],
    dueDate: '2026-10-16',
  },
  {
    id: 'TASK-004',
    assetId: 'AS-001',
    department: 'Market Intelligence',
    title: 'Analyze leather industry trade flows and competitor landscape',
    status: 'RUNNING' as DepartmentStatus,
    owner: 'Research Desk',
    confidence: 0.67,
    blockers: ['HS codes pending scope confirmation'],
    dueDate: '2026-10-15',
  },
];

export const mockFindings = [
  {
    id: 'FIND-001',
    assetId: 'AS-001',
    department: 'CEO AI Agent',
    title: 'Asset classification identified',
    text:
      'The submitted asset is classified as a closed industrial facility requiring validation before valuation or buyer marketing.',
    confidence: 0.86,
    source: { name: 'Asset Intake Form', url: '#', date: '2026-10-11', confidence: 0.9 },
  },
  {
    id: 'FIND-002',
    assetId: 'AS-001',
    department: 'Legal & Due Diligence',
    title: 'Ownership verification required',
    text: 'Legal ownership and encumbrance validation must be completed before external materials are prepared.',
    confidence: 0.74,
    source: { name: 'Legal checklist', url: '#', date: '2026-10-11', confidence: 0.8 },
  },
];

export const departmentDefinitions = [
  {
    id: 'dept-ceo',
    name: 'CEO AI Agent',
    department: 'Executive',
    mandate: 'Coordinate and consolidate all departmental findings and make executive recommendations.',
  },
  {
    id: 'dept-legal',
    name: 'Legal & Due Diligence',
    department: 'Legal',
    mandate: 'Verify title, ownership, encumbrances, permits, litigation, and regulatory exposure.',
  },
  {
    id: 'dept-technical',
    name: 'Industrial & Technical Assessment',
    department: 'Technical',
    mandate: 'Assess the industrial asset, restart feasibility, CAPEX needs, and operational risk.',
  },
  {
    id: 'dept-market',
    name: 'Market Intelligence',
    department: 'Research',
    mandate: 'Assess market size, trade flows, competition, and channel opportunity.',
  },
  {
    id: 'dept-finance',
    name: 'Financial Analysis',
    department: 'Finance',
    mandate: 'Reconstruct historical performance, model scenarios, and assess operating viability.',
  },
];
