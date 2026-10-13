import Link from 'next/link';
import {
  architectureLayers,
  exampleSources,
  implementationRoadmap,
  pipelineStages,
  sharedDatabaseTables,
  stageGates,
  workstreamGroups,
} from '@/lib/pipeline';

const sectionId = (id: string) => id.toLowerCase().replace(/_/g, '-');

export default function PipelinePage() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="badge mb-3">One-page master map</div>
            <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Asset → Exit | AI-agent operating pipeline
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Universal: factories, commercial property, hospitality, land and corporate assets
            </p>
          </div>
          <Link href="/" className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200">
            Control room
          </Link>
        </header>

        <section className="card p-5">
          <h2 className="mb-5 text-xl font-semibold text-white">Stages and agents</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {pipelineStages.map((stage) => (
              <div key={stage.code} className="flex flex-col rounded-2xl border border-slate-800 bg-slate-950/60">
                <div className="rounded-t-2xl bg-brand-500/20 px-3 py-2 text-xs font-semibold text-brand-200">
                  {String(stage.number).padStart(2, '0')} {stage.code}
                </div>
                <div className="flex flex-1 flex-col justify-between gap-4 p-3">
                  <p className="text-sm font-medium text-white">{stage.title}</p>
                  <div className="space-y-1 text-xs">
                    <p className="text-slate-400">{stage.agent}</p>
                    {stage.exitGate && <p className="text-amber-300">Exit gate: {stage.exitGate}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-5 text-xl font-semibold text-white">Gates</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {stageGates.map((gate) => (
              <div key={gate.code} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">
                    {gate.code} {gate.title}
                  </p>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.12em] ${
                      gate.humanApproval ? 'bg-amber-500/10 text-amber-300' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {gate.humanApproval ? `Human: ${gate.approverRole}` : `Agent: ${gate.approverRole}`}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-400">After {gate.afterStage}</p>
                <p className="mt-2 text-sm text-slate-300">{gate.reason}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-300">
            <span className="font-semibold text-white">Data rule:</span> each finding = source URL + date + confidence +
            owner + status; unknown ≠ zero. Human approval at legal, valuation, outreach and closing gates.
          </p>
        </section>

        {workstreamGroups.map((group) => (
          <section key={group.id} id={sectionId(group.id)} className="card p-5">
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-white">{group.label}</h2>
              <p className="mt-1 text-sm text-slate-400">
                {group.workstreams.length} workstreams • Output: {group.output}
              </p>
            </div>
            <ol className="grid gap-2 text-sm text-slate-300 md:grid-cols-2 xl:grid-cols-3">
              {group.workstreams.map((workstream, index) => (
                <li key={workstream} className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                  <span className="mr-2 text-slate-500">{String(index + 1).padStart(2, '0')}</span>
                  {workstream}
                </li>
              ))}
            </ol>
          </section>
        ))}

        <section className="card p-5">
          <h2 className="text-xl font-semibold text-white">AI agent architecture</h2>
          <p className="mt-1 text-sm text-slate-400">
            One asset ID across all stages • Agents research, humans approve irreversible decisions
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {architectureLayers.map((layer) => (
              <div key={layer.name} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-sm font-semibold text-white">{layer.name}</p>
                <p className="mt-2 text-sm text-slate-300">{layer.responsibilities.join(' • ')}</p>
                <p className="mt-3 text-xs text-slate-500">
                  {pipelineStages
                    .filter((stage) => stage.layer === layer.name)
                    .map((stage) => stage.agent)
                    .join(', ') || '—'}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {sharedDatabaseTables.map((table) => (
              <span key={table} className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300">
                {table}
              </span>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Example sources: {exampleSources.join(' • ')}. Access and reliability vary.
          </p>
        </section>

        <section className="card p-5">
          <h2 className="text-xl font-semibold text-white">Implementation roadmap</h2>
          <p className="mt-1 text-sm text-slate-400">
            Deploy incrementally; avoid automating conclusions before establishing reliable evidence
          </p>
          <ol className="mt-5 space-y-2">
            {implementationRoadmap.map((item) => (
              <li
                key={item.sprint}
                className="flex gap-6 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm"
              >
                <span className="w-20 shrink-0 font-semibold text-brand-300">Sprint {item.sprint}</span>
                <span className="text-slate-200">{item.scope}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
