import Link from 'next/link';
import { pipelineStages } from '@/lib/pipeline';

const stats = [
  { label: 'Total Assets', value: '18', change: '+2 this month' },
  { label: 'Active Mandates', value: '07', change: '3 in diligence' },
  { label: 'Critical Risks', value: '03', change: '2 require escalation' },
  { label: 'Qualified Buyers', value: '14', change: '4 newly added' },
];

const opportunities = [
  {
    name: 'Amoun Leather Factory',
    location: 'El Salheya, Sharqia, Egypt',
    stage: 'Asset Intake',
    risk: 'Medium',
    owners: 'CEO + Legal + Technical',
  },
  {
    name: 'Cairo Industrial Park',
    location: 'Cairo, Egypt',
    stage: 'Due Diligence',
    risk: 'High',
    owners: 'CEO + Financial + Risk',
  },
  {
    name: 'North Delta Logistics Hub',
    location: 'Delta Region, Egypt',
    stage: 'Valuation',
    risk: 'Low',
    owners: 'CEO + Strategy',
  },
];

const agents = pipelineStages.map((stage) => stage.agent);

export function ChairmanDashboard() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 border-b border-slate-800 pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="badge mb-3">Chairman Control Room</div>
            <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
              ASSET-TO-EXIT AI OPERATING SYSTEM
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200">
              English / العربية
            </button>
            <button className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-brand-400">
              New Asset Intake
            </button>
          </div>
        </header>

        <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <div key={item.label} className="kpi">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-3xl font-semibold text-white">{item.value}</span>
              </div>
              <p className="mt-3 text-xs text-slate-400">{item.change}</p>
            </div>
          ))}
        </section>

        <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <section className="card p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Asset Portfolio</h2>
              <button className="text-sm text-brand-300">View all</button>
            </div>

            <div className="space-y-4">
              {opportunities.map((opportunity) => (
                <div key={opportunity.name} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-white">{opportunity.name}</h3>
                      <p className="mt-1 text-sm text-slate-400">{opportunity.location}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-200">{opportunity.stage}</span>
                      <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-300">{opportunity.risk}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-2 text-xs text-slate-400 md:flex-row md:items-center md:justify-between">
                    <span>Owners: {opportunity.owners}</span>
                    <button className="text-brand-300">Open workspace</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="card p-5">
              <h3 className="text-lg font-semibold text-white">Decision Queue</h3>
              <ul className="mt-5 space-y-3 text-sm text-slate-300">
                <li className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">Approve buyer outreach for Amoun Leather Factory</li>
                <li className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">Escalate due diligence blockers to CEO</li>
                <li className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">Review valuation sensitivity model</li>
              </ul>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">AI Agent Pipeline</h3>
                <Link href="/pipeline" className="text-sm text-brand-300">
                  Master map
                </Link>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {agents.map((agent) => (
                  <span key={agent} className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-slate-300">
                    {agent}
                  </span>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
