'use client';

import { useEffect, useState } from 'react';

const agentsData = [
  {
    id: 'ceo-agent',
    name: 'CEO AI Agent',
    department: 'Executive',
    status: 'RUNNING',
    progress: 82,
    task: 'Create asset profile and execution plan',
    output: 'Workflow created. 9 departments assigned. Blockers identified: ownership verification required, site inspection pending.'
  },
  {
    id: 'legal-agent',
    name: 'Legal & Due Diligence Agent',
    department: 'Legal',
    status: 'QUEUED',
    progress: 0,
    task: 'Verify ownership, title, and encumbrances',
    output: 'Awaiting CEO clearance. Will request: title deeds, ownership chain, mortgage records, permits, litigation search.'
  },
  {
    id: 'technical-agent',
    name: 'Industrial & Technical Assessment',
    department: 'Technical',
    status: 'BLOCKED',
    progress: 15,
    task: 'Assess plant condition and restart feasibility',
    output: 'BLOCKED: No site inspection confirmed. Requires on-site evaluation before proceeding.'
  },
  {
    id: 'market-agent',
    name: 'Market Intelligence Agent',
    department: 'Research',
    status: 'RUNNING',
    progress: 58,
    task: 'Analyze leather market and trade flows',
    output: 'Research in progress. Analyzing: Egyptian leather industry, global trade flows (HS codes 4104-4114), competitors, export markets.'
  },
  {
    id: 'finance-agent',
    name: 'Financial Analysis Agent',
    department: 'Finance',
    status: 'QUEUED',
    progress: 0,
    task: 'Reconstruct historical financials',
    output: 'Awaiting financial documents. Will normalize EBITDA, model scenarios, assess viability.'
  },
  {
    id: 'valuation-agent',
    name: 'Valuation Agent',
    department: 'Valuation',
    status: 'QUEUED',
    progress: 0,
    task: 'Build DCF and comparable valuations',
    output: 'Awaiting technical and financial inputs. Will calculate: DCF, market comps, sensitivity ranges.'
  },
  {
    id: 'buyer-agent',
    name: 'Buyer Intelligence Agent',
    department: 'Buyer Intelligence',
    status: 'QUEUED',
    progress: 0,
    task: 'Identify and score strategic buyers',
    output: 'Awaiting valuation. Will research: global leather producers, regional operators, financial buyers.'
  },
  {
    id: 'strategy-agent',
    name: 'Strategy & Exit Planning',
    department: 'Strategy',
    status: 'QUEUED',
    progress: 0,
    task: 'Compare exit strategies',
    output: 'Awaiting findings. Will analyze: asset sale, restart + sell, joint venture, liquidation scenarios.'
  },
  {
    id: 'risk-agent',
    name: 'Risk & Compliance Agent',
    department: 'Risk & Compliance',
    status: 'RUNNING',
    progress: 45,
    task: 'Monitor for risks and deal blockers',
    output: 'RED FLAGS: Ownership uncertainty (CRITICAL), No site inspection confirmed (HIGH), Missing financials (HIGH).'
  }
];

const statusColors: Record<string, string> = {
  RUNNING: 'border-blue-500/50 bg-blue-500/10',
  QUEUED: 'border-slate-700 bg-slate-950',
  BLOCKED: 'border-red-500/50 bg-red-500/10',
  COMPLETED: 'border-green-500/50 bg-green-500/10',
  'NEEDS_REVIEW': 'border-yellow-500/50 bg-yellow-500/10'
};

const statusBadgeColors: Record<string, string> = {
  RUNNING: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  QUEUED: 'bg-slate-700/50 text-slate-300 border-slate-700',
  BLOCKED: 'bg-red-500/20 text-red-300 border-red-500/30',
  COMPLETED: 'bg-green-500/20 text-green-300 border-green-500/30',
  'NEEDS_REVIEW': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
};

export function AgentDemoPage() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>('ceo-agent');
  const asset = { name: 'Amoun Leather Factory - Plant A', id: 'AS-AMOUN-001' };

  const selectedAgentData = agentsData.find((agent) => agent.id === selectedAgent);

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 border-b border-slate-800 pb-6">
          <div className="badge mb-3">Agent Workflow Demo</div>
          <h1 className="text-4xl font-semibold text-white">{asset.name}</h1>
          <p className="mt-2 text-sm text-slate-400">{asset.id} • Multi-Agent Orchestration</p>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1fr_1.5fr]">
          {/* Agent List */}
          <div className="card p-5">
            <h2 className="mb-4 text-lg font-semibold text-white">Agent Status</h2>
            <div className="space-y-2">
              {agentsData.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selectedAgent === agent.id
                      ? 'border-brand-500 bg-brand-500/10'
                      : statusColors[agent.status]
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{agent.name}</p>
                      <p className="mt-1 text-xs text-slate-400">{agent.department}</p>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                        statusBadgeColors[agent.status]
                      }`}
                    >
                      {agent.status}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${agent.progress}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Agent Details */}
          {selectedAgentData && (
            <div className="space-y-6">
              <div className="card p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-white">{selectedAgentData.name}</h2>
                    <p className="mt-1 text-sm text-slate-400">{selectedAgentData.department}</p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${
                      statusBadgeColors[selectedAgentData.status]
                    }`}
                  >
                    {selectedAgentData.status}
                  </span>
                </div>

                <div className="space-y-4 border-t border-slate-800 pt-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-400">Current Task</p>
                    <p className="mt-2 text-sm text-white">{selectedAgentData.task}</p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-400">Progress</p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${selectedAgentData.progress}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{selectedAgentData.progress}% complete</p>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <p className="text-xs uppercase tracking-widest text-slate-400">Agent Output / Findings</p>
                <p className="mt-3 leading-6 text-slate-200">{selectedAgentData.output}</p>
              </div>

              {/* Agent Mandate */}
              <div className="card p-6">
                <p className="text-xs uppercase tracking-widest text-slate-400">Agent Mandate</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {selectedAgentData.id === 'ceo-agent' && (
                    <>
                      <li>✓ Coordinate full asset review workflow</li>
                      <li>✓ Create structured execution plan</li>
                      <li>✓ Assign tasks to specialist departments</li>
                      <li>✓ Consolidate departmental findings</li>
                      <li>✓ Identify and escalate blockers</li>
                    </>
                  )}
                  {selectedAgentData.id === 'legal-agent' && (
                    <>
                      <li>✓ Verify legal entity and ownership chain</li>
                      <li>✓ Check title deeds and encumbrances</li>
                      <li>✓ Review permits, licenses, and zoning</li>
                      <li>✓ Research litigation and disputes</li>
                      <li>✓ Produce 15-category due diligence checklist</li>
                    </>
                  )}
                  {selectedAgentData.id === 'technical-agent' && (
                    <>
                      <li>✓ Assess land and building condition</li>
                      <li>✓ Inventory machinery and equipment</li>
                      <li>✓ Evaluate production capacity</li>
                      <li>✓ Assess restart feasibility and CAPEX</li>
                      <li>✓ Identify operational bottlenecks</li>
                    </>
                  )}
                  {selectedAgentData.id === 'market-agent' && (
                    <>
                      <li>✓ Define market and product categories (HS codes)</li>
                      <li>✓ Analyze trade flows and competitors</li>
                      <li>✓ Calculate TAM and market sizing</li>
                      <li>✓ Research pricing and benchmarks</li>
                      <li>✓ Identify export opportunities</li>
                    </>
                  )}
                  {selectedAgentData.id === 'finance-agent' && (
                    <>
                      <li>✓ Reconstruct historical financials</li>
                      <li>✓ Normalize EBITDA</li>
                      <li>✓ Analyze cash flow and working capital</li>
                      <li>✓ Model profitability scenarios</li>
                      <li>✓ Assess operating viability</li>
                    </>
                  )}
                  {selectedAgentData.id === 'valuation-agent' && (
                    <>
                      <li>✓ Build Discounted Cash Flow (DCF) valuation</li>
                      <li>✓ Analyze trading comparables</li>
                      <li>✓ Research precedent transactions</li>
                      <li>✓ Build sensitivity tables</li>
                      <li>✓ Calculate valuation range and IRR</li>
                    </>
                  )}
                  {selectedAgentData.id === 'buyer-agent' && (
                    <>
                      <li>✓ Define global buyer universe</li>
                      <li>✓ Research M&A history and expansion strategy</li>
                      <li>✓ Assess buyer fit and synergies</li>
                      <li>✓ Build buyer scoring model</li>
                      <li>✓ Prepare buyer shortlist and outreach</li>
                    </>
                  )}
                  {selectedAgentData.id === 'strategy-agent' && (
                    <>
                      <li>✓ Analyze asset sale option</li>
                      <li>✓ Compare restart and sell strategy</li>
                      <li>✓ Evaluate joint venture and partnership</li>
                      <li>✓ Assess liquidation scenario</li>
                      <li>✓ Recommend optimal exit path</li>
                    </>
                  )}
                  {selectedAgentData.id === 'risk-agent' && (
                    <>
                      <li>✓ Monitor all departments for risks</li>
                      <li>✓ Flag ownership and legal uncertainty</li>
                      <li>✓ Identify deal blockers</li>
                      <li>✓ Build risk register</li>
                      <li>✓ Escalate critical issues to CEO and Chairman</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="mt-6 card p-6">
          <h3 className="text-lg font-semibold text-white">How the System Works</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand-300">1. CEO Orchestrates</p>
              <p className="mt-2 text-sm text-slate-300">
                CEO Agent receives asset and creates an execution plan. Assigns all 9 departments and sets dependencies.
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand-300">2. Agents Execute in Parallel</p>
              <p className="mt-2 text-sm text-slate-300">
                Each agent runs independently. Legal verifies ownership. Technical assesses condition. Market researches demand.
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand-300">3. Consolidate & Decide</p>
              <p className="mt-2 text-sm text-slate-300">
                Risk Agent flags issues. CEO consolidates findings. Chairman reviews and approves next action.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
