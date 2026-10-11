export type AssetStatus =
  | 'INTAKE'
  | 'SCREENING'
  | 'VERIFICATION'
  | 'DUE_DILIGENCE'
  | 'MARKET_RESEARCH'
  | 'TECHNICAL_ASSESSMENT'
  | 'FINANCIAL_MODEL'
  | 'VALUATION'
  | 'EXIT_STRATEGY'
  | 'BUYER_INTELLIGENCE'
  | 'DEAL_PREP'
  | 'NEGOTIATION'
  | 'CLOSING';

export type Asset = {
  id: string;
  name: string;
  assetClass: string;
  country: string;
  city: string;
  address: string;
  description: string;
  status: AssetStatus;
  ownerObjective: string;
  transactionType: string;
  operatingStatus: string;
  askingPrice: number | null;
  createdAt: string;
};

export type DepartmentTask = {
  id: string;
  department: string;
  title: string;
  status: 'QUEUED' | 'RUNNING' | 'BLOCKED' | 'NEEDS_REVIEW' | 'COMPLETED';
  owner: string;
  dueDate: string;
  confidence: number;
  blockers: string[];
};

export type Source = {
  name: string;
  url: string;
  date: string;
  confidence: number;
};

export type Finding = {
  id: string;
  title: string;
  text: string;
  department: string;
  confidence: number;
  source: Source;
};
