import Link from 'next/link';

const tasks = [
  { department: 'CEO AI Agent', title: 'Create asset profile and execution plan', status: 'RUNNING', owner: 'CEO', confidence: 0.82, blockers: ['Awaiting legal record request'] },
  { department: 'Legal & Due Diligence', title: 'Verify title deed, encumbrances, and ownership chain', status: 'QUEUED', owner: 'Legal', confidence: 0.41, blockers: ['Missing ownership documents'] },
  { department: 'Industrial & Technical Assessment', title: 'Assess plant condition and restart feasibility', status: 'BLOCKED', owner: 'Technical', confidence: 0.29, blockers: ['No site inspection confirmed'] },
  { department: 'Market Intelligence', title: 'Analyze leather industry trade flows and competitive landscape', status: 'RUNNING', owner: 'Research', confidence: 0.67, blockers: ['HS codes and product scope pending'] },
  { department: 'Financial Analysis', title: 'Reconstruct historical statements and normalize EBITDA', status: 'NEEDS_REVIEW', owner: 'Finance', confidence: 0.54, blockers: ['Financial statements pending reconciliation'] },
];

const findings = [
  {
    id: 'F-001',
    title: 'Asset classification identified',
    text: 'The submitted asset is classified as a closed industrial facility requiring validation before valuation or buyer marketing.',
    department: 'CEO AI Agent',
    confidence: 0.86,
    source: { name: 'Asset Intake Form', url: '#', date: '2026-10-11', confidence: 0.9 },
  },
  {
    id: 'F-002',
    title: 'Ownership verification required',
    text: 'Legal ownership and any encumbrances must be verified before external materials are produced.',
    department: 'Legal & Due Diligence',
    confidence: 0.74,
    source: { name: 'Legal checklist', url: '#', date: '2026-10-11', confidence: 0.8 },
  },
];

export default function AssetWorkspacePage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="badge mb-3">Asset Workspace</div>
            <h1 className="text-3xl font-semibold text-white">Amoun Leather Factory</h1>
            <p className="mt-2 text-sm text-slate-400">Asset ID: {params.id}</p>
          </div>
          <div className="flex gap-3">
            <Link href="/assets" className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200">
              Portfolio
            </Link>
            <button className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-400">
              Request Chairman Approval
            </button>
          </div>
        </header>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          {[
            { label: 'Transaction Stage', value: 'Asset Intake' },
            { label: 'Status', value: 'Evidence review' },
            { label: 'Critical Risks', value: '3' },
            { label: 'Buyer Shortlist', value: '0 qualified' },
          ].map((item) => (
            <div key={item.label} className="kpi">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
              <p className="mt-3 text-xl font-semibold text-white">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <section className="card p-5">
            <h2 className="mb-5 text-xl font-semibold text-white">Department execution view</h2>
            <div className="space-y-4">
              {tasks.map((task) => (
                <div key={task.department} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{task.department}</p>
                      <p className="mt-1 text-sm text-slate-300">{task.title}</p>
                    </div>
                    <span className="rounded-full border border-slate-700 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-slate-200">
                      {task.status}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                    <span>Owner: {task.owner}</span>
                    <span>Confidence: {(task.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${task.confidence * 100}%` }} />
                  </div>
                  <div className="mt-3 text-xs text-amber-300">
                    Blockers: {task.blockers.join(' • ')}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="card p-5">
              <h3 className="text-lg font-semibold text-white">Evidence & findings</h3>
              <div className="mt-4 space-y-4">
                {findings.map((finding) => (
                  <div key={finding.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <p className="text-sm font-medium text-white">{finding.title}</p>
                    <p className="mt-2 text-sm text-slate-300">{finding.text}</p>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{finding.department}</span>
                      <span>{finding.confidence * 100}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <h3 className="text-lg font-semibold text-white">Source traceability</h3>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                <li>Asset intake form</li>
                <li>Legal ownership request</li>
                <li>Market research dataset</li>
                <li>Technical data request</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
