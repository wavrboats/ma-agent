import { mockAssets } from '@/lib/types';

export const initializeWorkflow = (assetId: string): AssetWorkflowState => ({
  assetId,
  stage: 'SCREENING',
  status: 'RUNNING',
  tasks: [
    {
      id: 'ceo-1',
      assetId,
      department: 'CEO AI Agent',
      title: 'Create asset profile and execution plan',
      status: 'RUNNING',
      owner: 'CEO',
      confidence: 0.82,
      blockers: [],
      dueDate: '2026-10-12',
      dependsOn: [],
    },
    {
      id: 'legal-1',
      assetId,
      department: 'Legal & Due Diligence',
      title: 'Verify title deed, ownership chain, and encumbrances',
      status: 'QUEUED',
      owner: 'Legal Team',
      confidence: 0.41,
      blockers: ['Missing ownership documents'],
      dueDate: '2026-10-14',
      dependsOn: ['ceo-1'],
    },
    {
      id: 'tech-1',
      assetId,
      department: 'Industrial & Technical Assessment',
      title: 'Assess plant condition and restart feasibility',
      status: 'BLOCKED',
      owner: 'Technical Team',
      confidence: 0.29,
      blockers: ['No site inspection confirmed'],
      dueDate: '2026-10-16',
      dependsOn: ['ceo-1'],
    },
    {
      id: 'market-1',
      assetId,
      department: 'Market Intelligence',
      title: 'Analyze leather trade flows and competitor landscape',
      status: 'QUEUED',
      owner: 'Research Desk',
      confidence: 0.67,
      blockers: ['HS code scope pending'],
      dueDate: '2026-10-15',
      dependsOn: ['ceo-1'],
    },
    {
      id: 'finance-1',
      assetId,
      department: 'Financial Analysis',
      title: 'Reconstruct historical statements and normalize EBITDA',
      status: 'QUEUED',
      owner: 'Finance',
      confidence: 0.54,
      blockers: ['Financial statements pending reconciliation'],
      dueDate: '2026-10-16',
      dependsOn: ['ceo-1'],
    },
  ],
  findings: [
    {
      id: 'finding-001',
      assetId,
      department: 'CEO AI Agent',
      title: 'Asset classification identified',
      text: 'The submitted asset is classified as a closed industrial facility requiring validation before valuation or buyer marketing.',
      confidence: 0.86,
      source: {
        name: 'Asset Intake Form',
        url: '#',
        date: '2026-10-11',
        confidence: 0.9,
      },
    },
    {
      id: 'finding-002',
      assetId,
      department: 'Legal & Due Diligence',
      title: 'Ownership verification required',
      text: 'Legal ownership and any encumbrances must be verified before external materials are prepared.',
      confidence: 0.74,
      source: {
        name: 'Legal checklist',
        url: '#',
        date: '2026-10-11',
        confidence: 0.8,
      },
    },
  ],
  approvals: [
    {
      action: 'Buyer outreach',
      requiredRole: 'Chairman',
      status: 'PENDING',
      reason: 'External buyer contact or confidential disclosure cannot proceed without Chairman approval.',
    },
    {
      action: 'Confidential document release',
      requiredRole: 'Chairman',
      status: 'PENDING',
      reason: 'Confidential information memoranda and data room access require formal approval before dissemination.',
    },
  ],
});

export const createCEOReport = (assetId: string, findings: any[]) => ({
  assetId,
  executiveSummary:
    'The asset requires legal verification, physical inspection, and financial reconstruction before it is suitable for external buyer marketing.',
  keyRisks: findings.map((item) => item.title),
  nextActions: [
    'Confirm legal ownership and title status',
    'Request technical inspection and restart feasibility review',
    'Reconstruct historical statements and normalize EBITDA',
    'Prepare buyer universe after valuation and red-team review',
  ],
  readiness: findings.length >= 2 ? 'READY_FOR_REVIEW' : 'NOT_READY',
});

export const getWorkflowForAsset = (assetId: string) => initializeWorkflow(assetId);
