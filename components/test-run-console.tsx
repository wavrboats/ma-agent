'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PipelineGraph, RESULT_NODE } from '@/components/pipeline-graph';
import type { GraphNodeId } from '@/components/pipeline-graph';
import { listDeviceDrafts } from '@/lib/device-drafts';
import type { DeviceDraft } from '@/lib/device-drafts';
import { getGate, pipelineStages } from '@/lib/pipeline';
import type { GateCode } from '@/lib/pipeline';
import { runTestPipeline } from '@/lib/test-run';
import type { GateDecision, TestRunState } from '@/lib/test-run';

const tones: Record<string, string> = {
  COMPLETED: 'bg-emerald-500/10 text-emerald-300',
  APPROVED: 'bg-emerald-500/10 text-emerald-300',
  APPROVE: 'bg-emerald-500/10 text-emerald-300',
  AWAITING_APPROVAL: 'bg-amber-500/10 text-amber-300',
  HOLD: 'bg-amber-500/10 text-amber-300',
  MEDIUM: 'bg-amber-500/10 text-amber-300',
  HIGH: 'bg-orange-500/10 text-orange-300',
  CRITICAL: 'bg-red-500/10 text-red-300',
  REJECTED: 'bg-red-500/10 text-red-300',
};

function Pill({ value }: { value: string }) {
  return (
    <span className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.12em] ${tones[value] ?? 'bg-slate-800 text-slate-300'}`}>
      {value.replace(/_/g, ' ')}
    </span>
  );
}

// Runs the rule-based test pipeline on an asset saved on this device and shows the result.
export function TestRunConsole({ draftId }: { draftId: string }) {
  const [draft, setDraft] = useState<DeviceDraft | null | undefined>(undefined);
  const [run, setRun] = useState<TestRunState | null>(null);
  const [decisions, setDecisions] = useState<Partial<Record<GateCode, GateDecision>>>({});
  const [approver, setApprover] = useState('');
  const [selected, setSelected] = useState<GraphNodeId | null>(null);

  useEffect(() => {
    listDeviceDrafts()
      .then((drafts) => {
        const found = drafts.find((item) => item.id === draftId) ?? null;
        setDraft(found);
        if (found) setRun(runTestPipeline(found.id, found.fields, found.savedAt));
      })
      .catch(() => setDraft(null));
  }, [draftId]);

  if (draft === undefined) return <p className="p-8 text-sm text-slate-400">Loading…</p>;
  if (!draft || !run) {
    return (
      <div className="p-8 text-sm text-slate-300">
        This asset is not saved on this device.{' '}
        <Link href="/assets" className="text-brand-300 underline">
          Back to the portfolio
        </Link>
      </div>
    );
  }

  const stage = pipelineStages.find((item) => item.code === run.currentStage)!;
  const pendingGate = run.status === 'AWAITING_APPROVAL' && stage.exitGate ? getGate(stage.exitGate) : undefined;
  const pendingState = pendingGate ? run.gates[pendingGate.code] : undefined;

  // Each decision is kept and the whole test run is recomputed up to the next undecided gate.
  const decide = (decision: 'APPROVED' | 'REJECTED') => {
    if (!pendingGate || !approver.trim()) return;
    const next = { ...decisions, [pendingGate.code]: { decision, decidedBy: `${approver.trim()} (test run)`, decidedAt: new Date().toISOString() } };
    setDecisions(next);
    setRun(runTestPipeline(draft.id, draft.fields, draft.savedAt, next));
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="badge mb-3">Test run</div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">{draft.fields.name || 'Untitled asset'}</h1>
            <p className="mt-2 text-sm text-slate-400">All 12 stages, from intake to closing</p>
          </div>
          <Link href="/assets" className="self-start rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200">
            Portfolio
          </Link>
        </header>

        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          This is a test run made with simple rules, not the Claude agents. It reads only what you typed and pasted, does no
          research, and leaves every finding unverified. Add the Anthropic key and Supabase to run the real agents.
        </p>

        {run.outcome && (
          <section className="card border-brand-500/40 p-5">
            <h2 className="text-lg font-semibold text-white">Outcome</h2>
            <p className="mt-2 text-sm text-slate-200">{run.outcome.headline}</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-300">
              {run.outcome.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="card p-4 sm:p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Agents</h2>
            <Pill value={run.status} />
          </div>
          <p className="mb-3 text-xs text-slate-400">Tap a bubble to see what that agent produced.</p>
          <PipelineGraph run={run} selected={selected} onSelect={setSelected} />
        </section>

        {selected && (
          <section className="card p-5">
            {selected === RESULT_NODE ? (
              <>
                <h2 className="text-lg font-semibold text-white">Result</h2>
                <p className="mt-2 text-sm text-slate-200">{run.outcome?.headline}</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-300">
                  {run.outcome?.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </>
            ) : (
              (() => {
                const info = pipelineStages.find((item) => item.code === selected)!;
                const stageRun = run.stages[info.code];
                const gate = info.exitGate ? run.gates[info.exitGate] : undefined;
                const count = (list: { stage: string }[]) => list.filter((item) => item.stage === info.code).length;
                return (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-lg font-semibold text-white">
                        {String(info.number).padStart(2, '0')} {info.agent}
                      </h2>
                      <Pill value={stageRun?.status ?? 'NOT RUN'} />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{info.title}</p>
                    {stageRun?.summary ? (
                      <p className="mt-3 text-sm text-slate-200">{stageRun.summary}</p>
                    ) : (
                      <p className="mt-3 text-sm text-slate-400">This agent has not run yet. Decide the open gate to move the task on.</p>
                    )}
                    {stageRun && (
                      <p className="mt-3 text-xs text-slate-400">
                        {count(run.findings)} findings · {count(run.risks)} risks · {count(run.missingDocuments)} missing documents
                        {info.code === 'BUYERS' ? ` · ${run.buyers.length} buyers` : ''}
                      </p>
                    )}
                    {gate && (
                      <p className="mt-3 text-sm text-slate-300">
                        Gate {info.exitGate}: recommends <Pill value={gate.recommendation ?? 'open'} />{' '}
                        {gate.decision ? <Pill value={gate.decision} /> : <span className="text-amber-300">waiting for a decision</span>}
                      </p>
                    )}
                    {run.outputs[info.code]?.map((block) => (
                      <div key={block.title} className="mt-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                        <p className="text-sm font-medium text-white">{block.title}</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                          {block.items.map((entry, index) => (
                            <li key={`${block.title}-${index}`}>{entry}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    {info.code === 'BUYERS' && run.buyers.length > 0 && (
                      <ul className="mt-3 space-y-1 text-sm text-slate-300">
                        {run.buyers.map((buyer) => (
                          <li key={buyer.id}>
                            <span className="text-amber-300">{'★'.repeat(buyer.fit)}</span> {buyer.name}{' '}
                            <span className="text-xs text-slate-500">({buyer.kind})</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                );
              })()
            )}
          </section>
        )}

        {pendingGate && (
          <section className="card border-amber-500/30 p-5">
            <h2 className="text-lg font-semibold text-white">
              Decision needed: {pendingGate.code} {pendingGate.title}
            </h2>
            <p className="mt-1 text-sm text-slate-400">Approver: {pendingGate.approverRole}. {pendingGate.reason}</p>
            {pendingState?.recommendation && (
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-300">
                <p className="mb-2">
                  Recommendation: <Pill value={pendingState.recommendation} />
                </p>
                <p>{pendingState.rationale}</p>
              </div>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
              <input
                value={approver}
                onChange={(event) => setApprover(event.target.value)}
                placeholder="Your name"
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              />
              <button
                disabled={!approver.trim()}
                onClick={() => decide('APPROVED')}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                Approve
              </button>
              <button
                disabled={!approver.trim()}
                onClick={() => decide('REJECTED')}
                className="rounded-xl border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-200 disabled:opacity-40"
              >
                Reject
              </button>
            </div>
          </section>
        )}

        <section className="card p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">Agent summaries</h2>
          <div className="space-y-3">
            {pipelineStages
              .filter((item) => run.stages[item.code]?.summary)
              .map((item) => (
                <div key={item.code} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <p className="text-sm font-medium text-white">{item.agent}</p>
                  <p className="mt-2 text-sm text-slate-300">{run.stages[item.code]?.summary}</p>
                </div>
              ))}
          </div>
        </section>

        {run.buyers.length > 0 && (
          <section className="card p-5">
            <h2 className="text-lg font-semibold text-white">Potential buyers ({run.buyers.length})</h2>
            <p className="mt-1 text-xs text-slate-400">
              Buyer types are ranked from the facts you gave. Named leads are only names that appear in your material; none were
              researched or contacted.
            </p>
            <div className="mt-4 space-y-3">
              {run.buyers.map((buyer) => (
                <div key={buyer.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-white">
                      <span className="mr-2 text-slate-500">{buyer.id}</span>
                      {buyer.name}
                    </p>
                    <span className="shrink-0 text-xs text-amber-300">{'★'.repeat(buyer.fit)}</span>
                  </div>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-slate-500">{buyer.kind}</p>
                  <p className="mt-2 text-slate-300">{buyer.rationale}</p>
                  <p className="mt-1 text-xs text-slate-400">Approach: {buyer.approach}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {pipelineStages.some((item) => run.outputs[item.code]) && (
          <section className="card p-5">
            <h2 className="mb-4 text-lg font-semibold text-white">Stage outputs</h2>
            <div className="space-y-5">
              {pipelineStages
                .filter((item) => run.outputs[item.code])
                .map((item) => (
                  <div key={item.code}>
                    <p className="text-sm font-semibold text-brand-200">
                      {String(item.number).padStart(2, '0')} {item.code} · {item.agent}
                    </p>
                    {run.outputs[item.code]!.map((block) => (
                      <div key={block.title} className="mt-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                        <p className="text-sm font-medium text-white">{block.title}</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                          {block.items.map((entry, index) => (
                            <li key={`${block.title}-${index}`}>{entry}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          </section>
        )}

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="card p-5">
            <h2 className="mb-4 text-lg font-semibold text-white">Risk register ({run.risks.length})</h2>
            <div className="space-y-3">
              {run.risks.map((risk) => (
                <div key={risk.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-white">
                      <span className="mr-2 text-slate-500">{risk.id}</span>
                      {risk.title}
                    </p>
                    <Pill value={risk.severity} />
                  </div>
                  <p className="mt-2 text-slate-300">{risk.description}</p>
                  <p className="mt-2 text-xs text-slate-400">Next step: {risk.mitigation}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="mb-4 text-lg font-semibold text-white">Missing documents ({run.missingDocuments.length})</h2>
            <ul className="space-y-2 text-sm text-slate-300">
              {run.missingDocuments.map((doc) => (
                <li key={doc.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <p className="font-medium text-white">{doc.document}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {doc.reason} · Holder: {doc.likelyHolder}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="card p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">Findings ({run.findings.length})</h2>
          <div className="space-y-2">
            {run.findings.map((finding) => (
              <div key={finding.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-white">
                    <span className="mr-2 text-slate-500">{finding.id}</span>
                    {finding.title}
                  </p>
                  <Pill value={finding.status} />
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {finding.stage} · {finding.workstream} · Value: {finding.value === null ? <span className="text-amber-300">Unknown</span> : finding.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">Log</h2>
          <ol className="space-y-1 text-xs text-slate-400">
            {[...run.log].reverse().map((entry, index) => (
              <li key={`${entry.at}-${index}`}>
                {entry.stage && <span className="text-slate-300">{entry.stage}</span>} {entry.message}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
