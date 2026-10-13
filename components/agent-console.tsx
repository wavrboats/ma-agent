'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { isAgentBuilt } from '@/lib/agents/definitions';
import type { AgentRunState } from '@/lib/agents/types';
import { getGate, pipelineStages } from '@/lib/pipeline';

type AssetOption = { assetId: string; name: string };
type RunView = AgentRunState & { stepInProgress?: boolean };

const statusStyles: Record<string, string> = {
  IDLE: 'bg-slate-800 text-slate-300',
  RUNNING: 'bg-brand-500/20 text-brand-200',
  AWAITING_APPROVAL: 'bg-amber-500/10 text-amber-300',
  STOPPED: 'bg-slate-800 text-slate-300',
  FAILED: 'bg-red-500/10 text-red-300',
  COMPLETED: 'bg-emerald-500/10 text-emerald-300',
  PENDING: 'bg-slate-900 text-slate-500',
  VERIFIED: 'bg-emerald-500/10 text-emerald-300',
  UNVERIFIED: 'bg-slate-800 text-slate-300',
  DISPUTED: 'bg-amber-500/10 text-amber-300',
  REJECTED: 'bg-red-500/10 text-red-300',
  LOW: 'bg-slate-800 text-slate-300',
  MEDIUM: 'bg-amber-500/10 text-amber-300',
  HIGH: 'bg-orange-500/10 text-orange-300',
  CRITICAL: 'bg-red-500/10 text-red-300',
};

function Pill({ value }: { value: string }) {
  return (
    <span className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.12em] ${statusStyles[value] ?? 'bg-slate-800 text-slate-300'}`}>
      {value.replace(/_/g, ' ')}
    </span>
  );
}

export function AgentConsole({ assets, initialAssetId }: { assets: AssetOption[]; initialAssetId?: string }) {
  const [assetId, setAssetId] = useState(initialAssetId ?? assets[0]?.assetId ?? 'AS-001');
  const [run, setRun] = useState<RunView | null>(null);
  const [stepping, setStepping] = useState(false);
  const currentAsset = useRef(assetId);
  currentAsset.current = assetId;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [approver, setApprover] = useState('');
  const [notes, setNotes] = useState('');

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/agents?assetId=${encodeURIComponent(assetId)}`, { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) setError(data.error ?? 'Could not load the run');
    else if (currentAsset.current === assetId) setRun(data.run);
  }, [assetId]);

  useEffect(() => {
    setRun(null);
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (run?.status !== 'RUNNING') return;
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, [run?.status, refresh]);

  // Each step runs the agents for a few minutes inside one request, which keeps every request under
  // the hosting time limit. While the run is active, this page asks for the next step as soon as the
  // previous one returns.
  useEffect(() => {
    if (run?.status !== 'RUNNING' || run.stepInProgress || stepping) return;
    const stepAsset = assetId;
    setStepping(true);
    fetch('/api/agents/step', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetId: stepAsset }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (currentAsset.current !== stepAsset) return;
        if (data.run) setRun(data.run);
        else if (data.error) setError(data.error);
      })
      // A dropped step is picked up again once its lease expires and the poll sees the run idle.
      .catch(() => undefined)
      .finally(() => setStepping(false));
  }, [run?.status, run?.stepInProgress, stepping, assetId]);

  const post = async (url: string, body: object) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) setError(data.error ?? 'Request failed');
      else setRun(data.run);
    } finally {
      setBusy(false);
    }
  };

  const currentStage = run ? pipelineStages.find((stage) => stage.code === run.currentStage) : undefined;
  const pendingGate = run?.status === 'AWAITING_APPROVAL' && currentStage?.exitGate ? getGate(currentStage.exitGate) : undefined;
  const pendingGateState = pendingGate ? run?.gates[pendingGate.code] : undefined;
  const canStart = run && run.status !== 'RUNNING' && run.status !== 'AWAITING_APPROVAL';

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="badge mb-3">Agent console</div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Pipeline agents</h1>
            <p className="mt-2 text-sm text-slate-400">
              Agents research and record evidence. People decide the gates. A run moves forward while this page is open.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={assetId}
              onChange={(event) => setAssetId(event.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
            >
              {assets.map((asset) => (
                <option key={asset.assetId} value={asset.assetId}>
                  {asset.assetId} · {asset.name}
                </option>
              ))}
            </select>
            <button
              disabled={!canStart || busy}
              onClick={() => post('/api/agents', { assetId, reset: run?.status === 'IDLE' || run?.status === 'STOPPED' })}
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-400 disabled:opacity-40"
            >
              {run?.status === 'FAILED' ? 'Retry stage' : run?.status === 'STOPPED' ? 'Start new run' : 'Run agents'}
            </button>
            <Link href="/pipeline" className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200">
              Master map
            </Link>
          </div>
        </header>

        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
        {run?.error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{run.error}</div>
        )}

        {run && (
          <>
            <section className="card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Stages</h2>
                <Pill value={run.status} />
              </div>
              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {pipelineStages.map((stage) => {
                  const stageRun = run.stages[stage.code];
                  const gate = stage.exitGate ? run.gates[stage.exitGate] : undefined;
                  return (
                    <div
                      key={stage.code}
                      className={`rounded-xl border p-3 text-xs ${
                        stage.code === run.currentStage ? 'border-brand-500/50 bg-brand-500/10' : 'border-slate-800 bg-slate-950/60'
                      }`}
                    >
                      <p className="font-semibold text-white">
                        {String(stage.number).padStart(2, '0')} {stage.code}
                      </p>
                      <p className="mt-1 text-slate-400">{stage.agent}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <Pill value={stageRun?.status ?? (isAgentBuilt(stage.code) ? 'PENDING' : 'NOT BUILT')} />
                        {stage.exitGate && <Pill value={`${stage.exitGate} ${gate?.decision ?? 'open'}`} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {pendingGate && (
              <section className="card border-amber-500/30 p-5">
                <h2 className="text-lg font-semibold text-white">
                  Decision needed: {pendingGate.code} {pendingGate.title}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Approver: {pendingGate.approverRole}. {pendingGate.reason}
                </p>
                {pendingGateState?.recommendation ? (
                  <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-300">
                    <p className="mb-2">
                      Agent recommendation: <Pill value={pendingGateState.recommendation} />
                    </p>
                    <p className="whitespace-pre-wrap">{pendingGateState.rationale}</p>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-amber-300">The agent did not give a recommendation for this gate.</p>
                )}
                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_2fr_auto_auto]">
                  <input
                    value={approver}
                    onChange={(event) => setApprover(event.target.value)}
                    placeholder="Your name"
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                  />
                  <input
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Notes (optional)"
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                  />
                  {(['APPROVED', 'REJECTED'] as const).map((decision) => (
                    <button
                      key={decision}
                      disabled={busy || approver.trim() === ''}
                      onClick={() =>
                        post('/api/agents/gates', { assetId, gate: pendingGate.code, decision, decidedBy: approver, notes })
                      }
                      className={`rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-40 ${
                        decision === 'APPROVED' ? 'bg-emerald-600 text-white' : 'border border-red-500/40 text-red-200'
                      }`}
                    >
                      {decision === 'APPROVED' ? 'Approve' : 'Reject'}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
              <section className="card p-5">
                <h2 className="mb-4 text-lg font-semibold text-white">Findings ({run.findings.length})</h2>
                <div className="space-y-3">
                  {run.findings.length === 0 && <p className="text-sm text-slate-500">No findings yet.</p>}
                  {run.findings.map((finding) => (
                    <div key={finding.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-white">
                          <span className="mr-2 text-slate-500">{finding.id}</span>
                          {finding.title}
                        </p>
                        <Pill value={finding.status} />
                      </div>
                      <p className="mt-2 text-sm text-slate-300">{finding.text}</p>
                      <p className="mt-2 text-xs text-slate-400">
                        Value: {finding.value === null ? <span className="text-amber-300">Unknown</span> : finding.value}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                        <span>{finding.stage} · {finding.workstream}</span>
                        <span>
                          Source:{' '}
                          {finding.sourceUrl.startsWith('http') ? (
                            <a href={finding.sourceUrl} target="_blank" rel="noreferrer" className="text-brand-300 underline">
                              {finding.sourceName}
                            </a>
                          ) : (
                            finding.sourceName
                          )}
                          {!finding.sourceSeen && <span className="ml-1 text-amber-300">(not opened by agent)</span>}
                        </span>
                        <span>{finding.date}</span>
                        <span>Confidence {(finding.confidence * 100).toFixed(0)}%</span>
                        <span>Owner: {finding.owner}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <aside className="space-y-6">
                <section className="card p-5">
                  <h2 className="mb-4 text-lg font-semibold text-white">Risk register ({run.risks.length})</h2>
                  <div className="space-y-3">
                    {run.risks.length === 0 && <p className="text-sm text-slate-500">No risks yet.</p>}
                    {run.risks.map((risk) => (
                      <div key={risk.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-white">
                            <span className="mr-2 text-slate-500">{risk.id}</span>
                            {risk.title}
                          </p>
                          <Pill value={risk.severity} />
                        </div>
                        <p className="mt-2 text-slate-300">{risk.description}</p>
                        <p className="mt-2 text-xs text-slate-400">Mitigation: {risk.mitigation}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="card p-5">
                  <h2 className="mb-4 text-lg font-semibold text-white">Missing documents ({run.missingDocuments.length})</h2>
                  <ul className="space-y-2 text-sm text-slate-300">
                    {run.missingDocuments.length === 0 && <li className="text-slate-500">None requested yet.</li>}
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
              </aside>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <section className="card p-5">
                <h2 className="mb-4 text-lg font-semibold text-white">Agent summaries</h2>
                <div className="space-y-3">
                  {pipelineStages
                    .filter((stage) => run.stages[stage.code]?.summary)
                    .map((stage) => (
                      <div key={stage.code} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                        <p className="text-sm font-medium text-white">{stage.agent}</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{run.stages[stage.code]?.summary}</p>
                      </div>
                    ))}
                </div>
              </section>

              <section className="card p-5">
                <h2 className="mb-4 text-lg font-semibold text-white">Audit log</h2>
                <ol className="space-y-1 text-xs text-slate-400">
                  {[...run.log].reverse().map((entry, index) => (
                    <li key={`${entry.at}-${index}`}>
                      <span className="text-slate-500">{entry.at.replace('T', ' ').slice(0, 19)}</span>{' '}
                      {entry.stage && <span className="text-slate-300">{entry.stage}</span>} {entry.message}
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
