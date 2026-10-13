export { workflowStages } from '@/lib/types';

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
