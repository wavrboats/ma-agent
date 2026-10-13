'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PipelineGraph, RESULT_NODE } from '@/components/pipeline-graph';
import { BubbleCluster, TONES } from '@/components/bubble-cluster';
import { WorkstreamBubbles } from '@/components/workstream-bubbles';
import { innerBubbles } from '@/lib/test-run-layers';
import type { GraphNodeId } from '@/components/pipeline-graph';
import { listDeviceDrafts } from '@/lib/device-drafts';
import type { DeviceDraft } from '@/lib/device-drafts';
import { getGate, pipelineStages } from '@/lib/pipeline';
import type { GateCode, StageCode } from '@/lib/pipeline';
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
  // Layers: the map, then an agent bubble (zoom), then an inner bubble, then a workstream cluster.
  const [zoom, setZoom] = useState<GraphNodeId | null>(null);
  const [inner, setInner] = useState<string | null>(null);
  const [workstream, setWorkstream] = useState<number | null>(null);
  const [autoRun, setAutoRun] = useState(true);
  // True once the graph animation has caught up with the run, so an automatic decision lands after the dot arrives.
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    listDeviceDrafts()
      .then((drafts) => {
        const found = drafts.find((item) => item.id === draftId) ?? null;
        setDraft(found);
        if (found) setRun(runTestPipeline(found.id, found.fields, found.savedAt));
      })
      .catch(() => setDraft(null));
  }, [draftId]);

  // Automatic run: once the dot has reached a gate that is waiting, approve it after a short pause.
  useEffect(() => {
    if (!autoRun || !settled || !run || !draft || run.status !== 'AWAITING_APPROVAL') return;
    const gate = pipelineStages.find((item) => item.code === run.currentStage)?.exitGate;
    if (!gate) return;
    const timer = setTimeout(() => {
      const next = { ...decisions, [gate]: { decision: 'APPROVED' as const, decidedBy: 'Automatic approval (test run)', decidedAt: new Date().toISOString() } };
      setDecisions(next);
      setSettled(false);
      setRun(runTestPipeline(draft.id, draft.fields, draft.savedAt, next));
    }, 900);
    return () => clearTimeout(timer);
  }, [autoRun, settled, run, draft, decisions]);

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
  const decide = (decision: 'APPROVED' | 'REJECTED', decidedBy: string) => {
    if (!pendingGate) return;
    const next = { ...decisions, [pendingGate.code]: { decision, decidedBy, decidedAt: new Date().toISOString() } };
    setDecisions(next);
    setSettled(false);
    setRun(runTestPipeline(draft.id, draft.fields, draft.savedAt, next));
  };

  const zoomStage = zoom && zoom !== RESULT_NODE ? pipelineStages.find((item) => item.code === zoom) : undefined;
  const bubbles = zoom ? innerBubbles(run, zoom as StageCode | 'RESULT', draft.files) : [];
  const pickedBubble = bubbles.find((bubble) => bubble.id === inner);
  const openNode = (id: GraphNodeId) => {
    setZoom(id);
    setInner(null);
    setWorkstream(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 md:px-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <header className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-amber-300">Test run · rules only, no AI</p>
            <h1 className="truncate text-xl font-semibold text-white">{draft.fields.name || 'Untitled asset'}</h1>
          </div>
          <Link href="/assets" className="shrink-0 rounded-xl border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200">
            Portfolio
          </Link>
        </header>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
          <p className="text-xs text-slate-300">
            {autoRun ? 'Running automatically: gates are approved after a short pause.' : 'Approve each gate to move the task on.'}
          </p>
          <button
            type="button"
            role="switch"
            aria-checked={autoRun}
            onClick={() => setAutoRun((value) => !value)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${autoRun ? 'bg-emerald-600' : 'bg-slate-700'}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${autoRun ? 'left-[22px]' : 'left-0.5'}`} />
            <span className="sr-only">Run automatically</span>
          </button>
        </div>

        {!autoRun && pendingGate && (
          <section className="sticky top-2 z-10 rounded-xl border border-amber-500/40 bg-slate-900/95 p-3">
            <p className="text-sm font-semibold text-white">
              {pendingGate.code} {pendingGate.title}: recommends {pendingState?.recommendation ?? '—'}
            </p>
            <p className="mt-1 text-xs text-slate-400">{pendingState?.rationale}</p>
            <div className="mt-2 grid grid-cols-[1fr_auto_auto] gap-2">
              <input
                value={approver}
                onChange={(event) => setApprover(event.target.value)}
                placeholder="Your name"
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
              />
              <button
                disabled={!approver.trim()}
                onClick={() => decide('APPROVED', `${approver.trim()} (test run)`)}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                Approve
              </button>
              <button
                disabled={!approver.trim()}
                onClick={() => decide('REJECTED', `${approver.trim()} (test run)`)}
                className="rounded-lg border border-red-500/40 px-3 py-1.5 text-sm font-semibold text-red-200 disabled:opacity-40"
              >
                Reject
              </button>
            </div>
          </section>
        )}

        {/* Layer 1: the map. It stays mounted while zoomed in, so the animation keeps its place. */}
        <section className={zoom ? 'hidden' : 'block'}>
          <PipelineGraph run={run} selected={null} onSelect={openNode} onSettled={() => setSettled(true)} />
        </section>

        {/* Layer 2: inside an agent bubble. Layer 3: inside an inner bubble. */}
        {zoom && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <button onClick={() => setZoom(null)} className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-200">
                ← Map
              </button>
              {workstream !== null && pickedBubble && (
                <button onClick={() => setWorkstream(null)} className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-200">
                  ← {zoomStage?.agent}
                </button>
              )}
              <span className="text-slate-400">
                {zoom === RESULT_NODE ? 'Result' : `${String(zoomStage!.number).padStart(2, '0')} ${zoomStage!.agent}`}
                {pickedBubble && workstream !== null ? ` › ${pickedBubble.label}` : ''}
              </span>
            </div>

            {zoomStage && run.stages[zoomStage.code]?.summary && workstream === null && (
              <p className="text-sm text-slate-300">{run.stages[zoomStage.code]!.summary}</p>
            )}
            {zoomStage && !run.stages[zoomStage.code] && <p className="text-sm text-slate-400">This agent has not run yet.</p>}

            {workstream !== null && pickedBubble?.checklist ? (
              <WorkstreamBubbles key={`${zoom}-ws`} title={pickedBubble.checklist.title} items={pickedBubble.checklist.items} ownStage={zoom as string} />
            ) : (
              <>
                <BubbleCluster
                  items={bubbles}
                  picked={inner}
                  onPick={(id) => {
                    setInner(id);
                    if (bubbles.find((bubble) => bubble.id === id)?.checklist) setWorkstream(0);
                  }}
                  centreLabel="Nothing here yet"
                />
                {pickedBubble && !pickedBubble.checklist ? (
                  <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-3">
                    <p className="text-sm font-semibold" style={{ color: TONES[pickedBubble.tone].text }}>
                      {pickedBubble.label}
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                      {pickedBubble.lines.map((line, index) => (
                        <li key={index}>{line}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-center text-xs text-slate-500">Tap a bubble to open it.</p>
                )}
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
