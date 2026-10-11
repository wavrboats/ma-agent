import { mockAssets } from '@/lib/types';
import { getWorkflowForAsset, createCEOReport } from '@/lib/workflow';
import { AssetWorkflowBoard } from '@/components/asset-workflow-board';

export default function AssetDemoPage() {
  const asset = mockAssets[0];
  const workflow = getWorkflowForAsset(asset.assetId);
  const report = createCEOReport(asset.assetId, workflow.findings);

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="badge mb-3">Workflow Demo</div>
            <h1 className="text-3xl font-semibold text-white">{asset.name}</h1>
            <p className="mt-2 text-sm text-slate-400">Asset ID: {asset.assetId}</p>
          </div>
          <button className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white">
            Request Chairman Approval
          </button>
        </header>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          {[
            { label: 'Stage', value: workflow.stage },
            { label: 'Status', value: workflow.status },
            { label: 'Readiness', value: report.readiness },
            { label: 'Critical Risks', value: String(workflow.findings.length) },
          ].map((item) => (
            <div key={item.label} className="kpi">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
              <p className="mt-3 text-xl font-semibold text-white">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <AssetWorkflowBoard workflow={workflow} />

          <div className="space-y-6">
            <div className="card p-5">
              <h3 className="text-lg font-semibold text-white">CEO summary</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">{report.executiveSummary}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                {report.nextActions.map((item) => (
                  <li key={item} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="card p-5">
              <h3 className="text-lg font-semibold text-white">Approval gates</h3>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                {workflow.approvals.map((gate) => (
                  <li key={gate.action} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    {gate.action} • {gate.requiredRole} • {gate.status}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
