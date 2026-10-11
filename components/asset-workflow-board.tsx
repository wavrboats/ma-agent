export function AssetWorkflowBoard({ workflow }: { workflow: any }) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="badge mb-3">CEO Workflow</div>
          <h2 className="text-xl font-semibold text-white">Asset orchestration board</h2>
        </div>
      </div>

      <div className="mb-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {['INTAKE', 'SCREENING', 'VERIFICATION', 'DUE_DILIGENCE'].map((stage, index) => (
          <div
            key={stage}
            className={`rounded-xl border p-2 text-center text-xs ${
              stage === workflow.stage
                ? 'border-brand-500/40 bg-brand-500/10 text-brand-200'
                : 'border-slate-700 bg-slate-950 text-slate-300'
            }`}
          >
            {stage}
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {workflow.tasks.map((task: any) => (
          <div key={task.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between gap-3">
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
            {task.blockers.length > 0 && (
              <div className="mt-3 text-xs text-amber-300">Blockers: {task.blockers.join(' • ')}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
