'use client';

const departments = [
  { name: 'CEO AI Agent', status: 'RUNNING', progress: 82, owner: 'Chairman / CEO' },
  { name: 'Legal & Due Diligence', status: 'QUEUED', progress: 26, owner: 'Legal Team' },
  { name: 'Industrial & Technical Assessment', status: 'BLOCKED', progress: 14, owner: 'Technical Team' },
  { name: 'Market Intelligence', status: 'RUNNING', progress: 58, owner: 'Research Desk' },
  { name: 'Financial Analysis', status: 'NEEDS_REVIEW', progress: 49, owner: 'Finance' },
  { name: 'Valuation', status: 'QUEUED', progress: 12, owner: 'Valuation Lead' },
  { name: 'Buyer Intelligence', status: 'QUEUED', progress: 0, owner: 'Buyer Research' },
  { name: 'Risk & Compliance', status: 'QUEUED', progress: 0, owner: 'Compliance' },
];

const workflowStages = [
  'Asset Intake',
  'Initial Screening',
  'Verification',
  'Due Diligence',
  'Market Research',
  'Technical Assessment',
  'Financial Modeling',
  'Valuation',
  'Exit Strategy',
  'Buyer Intelligence',
  'Deal Preparation',
  'Outreach',
  'Closing',
];

export function CEOWorkflowPanel() {
  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="badge mb-3">CEO Control Room</div>
            <h2 className="text-xl font-semibold text-white">Asset workflow orchestration</h2>
          </div>
          <button className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200">
            Escalate to Chairman
          </button>
        </div>

        <div className="mb-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {workflowStages.map((stage, index) => (
            <div
              key={stage}
              className={`rounded-xl border p-2 text-center text-xs ${
                index <= 1
                  ? 'border-brand-500/40 bg-brand-500/10 text-brand-200'
                  : 'border-slate-700 bg-slate-950 text-slate-300'
              }`}
            >
              {stage}
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {departments.map((department) => (
            <div key={department.name} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">{department.name}</p>
                  <p className="mt-1 text-xs text-slate-400">Owner: {department.owner}</p>
                </div>
                <span className="rounded-full border border-slate-700 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-slate-300">
                  {department.status}
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{ width: `${department.progress}%` }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                <span>{department.progress}% complete</span>
                <button className="text-brand-300">Inspect</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-lg font-semibold text-white">CEO recommendation summary</h3>
        <ul className="mt-4 space-y-3 text-sm text-slate-300">
          <li className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            Create asset identifier and assign initial mandate classification.
          </li>
          <li className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            Request legal ownership, title, and encumbrance verification first.
          </li>
          <li className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            Flag physical inspection and technical due diligence as mandatory before valuation publish.
          </li>
          <li className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            Maintain evidence-based research only. Do not convert assumptions into facts.
          </li>
        </ul>
      </div>
    </div>
  );
}
