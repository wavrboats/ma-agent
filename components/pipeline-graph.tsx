'use client';

import { useEffect, useMemo, useState } from 'react';
import { pipelineStages } from '@/lib/pipeline';
import type { StageCode } from '@/lib/pipeline';
import type { TestRunState } from '@/lib/test-run';

// An Obsidian-style graph of the pipeline: each agent is a bubble, its results orbit it as small
// bubbles, and a glowing dot carries the task along the edges from agent to agent until the result.

// Small-bubble kinds, in the categorical order validated for the dark surface (blue, orange, aqua, yellow).
export const SATELLITE_KINDS = [
  { key: 'findings', label: 'Findings', color: '#3987e5' },
  { key: 'risks', label: 'Risks', color: '#d95926' },
  { key: 'documents', label: 'Missing documents', color: '#199e70' },
  { key: 'buyers', label: 'Buyers', color: '#c98500' },
] as const;

type SatelliteKey = (typeof SATELLITE_KINDS)[number]['key'];

const STEP_MS = 1100;
const MAX_SATELLITES = 14;
const WIDTH = 360;
const ROW_GAP = 150;
const TOP = 72;
// A slight fixed wobble per node so the graph reads as organic rather than a grid.
const JITTER: [number, number][] = [
  [0, 0], [6, -12], [-4, 10], [8, 6], [-6, -8], [4, 12], [-8, 4], [6, -10], [-2, 8], [4, -6], [-6, 10], [8, -4], [0, 6],
];

// A dark outline behind labels so the edges passing behind them never cut through the text.
const HALO = { stroke: '#0b1120', strokeWidth: 3, paintOrder: 'stroke' as const, strokeLinejoin: 'round' as const };

const RESULT = 'RESULT' as const;
type NodeId = StageCode | typeof RESULT;

const nodeIds: NodeId[] = [...pipelineStages.map((stage) => stage.code), RESULT];

// Three columns, snaking left to right then right to left, so it fits a phone screen.
function position(index: number) {
  const row = Math.floor(index / 3);
  const column = row % 2 === 0 ? index % 3 : 2 - (index % 3);
  const [dx, dy] = JITTER[index] ?? [0, 0];
  return { x: 60 + column * 120 + dx, y: TOP + row * ROW_GAP + dy };
}

function edgePath(from: { x: number; y: number }, to: { x: number; y: number }) {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  // Same row: a gentle arc. Row change: bow outwards past the edge of the column.
  const sameRow = Math.abs(from.y - to.y) < ROW_GAP / 2;
  const cx = sameRow ? midX : from.x < WIDTH / 2 ? from.x - 46 : from.x + 46;
  const cy = sameRow ? midY - 22 : midY;
  return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
}

function satelliteCounts(run: TestRunState, id: NodeId): Record<SatelliteKey, number> {
  if (id === RESULT) {
    return { findings: 0, risks: 0, documents: 0, buyers: run.buyers.length };
  }
  return {
    findings: run.findings.filter((item) => item.stage === id).length,
    risks: run.risks.filter((item) => item.stage === id).length,
    documents: run.missingDocuments.filter((item) => item.stage === id).length,
    buyers: id === 'BUYERS' ? run.buyers.length : 0,
  };
}

// Splits at most MAX_SATELLITES dots across the kinds, in proportion, keeping at least one per kind present.
function satellites(counts: Record<SatelliteKey, number>) {
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  if (total === 0) return [];
  const dots: { color: string; key: SatelliteKey }[] = [];
  for (const kind of SATELLITE_KINDS) {
    const count = counts[kind.key];
    if (count === 0) continue;
    const share = Math.max(1, Math.round((count / total) * Math.min(total, MAX_SATELLITES)));
    for (let i = 0; i < share; i += 1) dots.push({ color: kind.color, key: kind.key });
  }
  return dots.slice(0, MAX_SATELLITES);
}

export function PipelineGraph({
  run,
  selected,
  onSelect,
}: {
  run: TestRunState;
  selected: NodeId | null;
  onSelect: (id: NodeId) => void;
}) {
  const positions = useMemo(() => nodeIds.map((_, index) => position(index)), []);
  const height = positions[positions.length - 1].y + 90;
  const finished = run.gates.G5?.decision === 'APPROVED';

  // How far the run actually got, in pipeline order; the result node counts once G5 is approved.
  const target = useMemo(() => {
    let reached = 0;
    for (const stage of pipelineStages) {
      if (run.stages[stage.code]?.status !== 'COMPLETED') break;
      reached += 1;
    }
    return finished ? reached + 1 : reached;
  }, [run, finished]);

  // The animation replays progress one node at a time and keeps its place when the run continues.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown > target) setShown(target);
    if (shown >= target) return;
    const timer = setTimeout(() => setShown((value) => value + 1), shown === 0 ? 300 : STEP_MS);
    return () => clearTimeout(timer);
  }, [shown, target]);

  const animating = shown < target && shown > 0;
  const waitingIndex = run.status === 'AWAITING_APPROVAL' && shown === target ? target - 1 : -1;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${WIDTH} ${height}`} className="mx-auto block w-full max-w-3xl" role="group" aria-label="Pipeline agents graph">
        <defs>
          <radialGradient id="node-done" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#064e3b" stopOpacity="0.9" />
          </radialGradient>
          <radialGradient id="node-idle" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#334155" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
          </radialGradient>
          <radialGradient id="node-result" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.95" />
          </radialGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Edges */}
        {positions.slice(0, -1).map((from, index) => {
          const done = index + 1 < shown;
          return (
            <path
              key={`edge-${index}`}
              d={edgePath(from, positions[index + 1])}
              fill="none"
              stroke={done ? '#64748b' : '#1e293b'}
              strokeWidth={done ? 1.6 : 1.2}
              strokeDasharray={done ? undefined : '3 4'}
            />
          );
        })}

        {/* The task travelling to the node that is being revealed */}
        {animating && (
          <circle key={`token-${shown}`} r="5" fill="#93c5fd" filter="url(#glow)">
            <animateMotion dur={`${STEP_MS / 1000}s`} fill="freeze" path={edgePath(positions[shown - 1], positions[shown])} />
          </circle>
        )}

        {/* Nodes */}
        {nodeIds.map((id, index) => {
          const { x, y } = positions[index];
          const revealed = index < shown;
          const waiting = index === waitingIndex;
          const isResult = id === RESULT;
          const stage = isResult ? null : pipelineStages[index];
          const dots = revealed ? satellites(satelliteCounts(run, id)) : [];
          const radius = isResult ? 32 : 24;
          const status = waiting ? 'Waiting for a gate decision' : revealed ? 'Completed' : 'Not run yet';
          const label = isResult ? 'Result' : `${String(stage!.number).padStart(2, '0')} ${stage!.code}`;

          return (
            <g
              key={id}
              role="button"
              tabIndex={0}
              aria-label={`${label}: ${status}`}
              onClick={() => onSelect(id)}
              onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && onSelect(id)}
              className="cursor-pointer outline-none"
            >
              {/* Bigger invisible hit target than the bubble */}
              <circle cx={x} cy={y} r={radius + 22} fill="transparent" />

              <g className={revealed ? 'graph-drift' : undefined} style={{ animationDelay: `${(index % 5) * 0.7}s` }}>
                {dots.map((dot, dotIndex) => {
                  const angle = (dotIndex / dots.length) * Math.PI * 2 + index * 0.6;
                  const orbit = radius + 14 + (dotIndex % 2) * 7;
                  const dx = Math.cos(angle) * orbit;
                  const dy = Math.sin(angle) * orbit;
                  return (
                    <g key={dotIndex}>
                      <line x1={x} y1={y} x2={x + dx} y2={y + dy} stroke="#1e293b" strokeWidth="0.8" />
                      <circle
                        cx={x + dx}
                        cy={y + dy}
                        r={dot.key === 'buyers' ? 4.5 : 3.5}
                        fill={dot.color}
                        stroke="#0b1120"
                        strokeWidth="1.5"
                        className="graph-pop"
                        style={{ animationDelay: `${dotIndex * 40}ms` }}
                      />
                    </g>
                  );
                })}
              </g>

              {waiting && (
                <circle cx={x} cy={y} r={radius + 7} fill="none" stroke="#f59e0b" strokeWidth="2" className="graph-pulse" />
              )}
              {selected === id && <circle cx={x} cy={y} r={radius + 4} fill="none" stroke="#e2e8f0" strokeWidth="1.5" />}
              <circle
                cx={x}
                cy={y}
                r={radius}
                fill={revealed ? (isResult ? 'url(#node-result)' : 'url(#node-done)') : 'url(#node-idle)'}
                stroke={revealed ? (isResult ? '#93c5fd' : '#34d399') : '#334155'}
                strokeWidth="1.5"
                filter={revealed ? 'url(#glow)' : undefined}
              />
              {/* Status symbol so state never relies on colour alone */}
              <text x={x} y={y + 5} textAnchor="middle" fontSize={isResult ? 16 : 14} fill={revealed ? '#ecfdf5' : '#64748b'}>
                {isResult ? (revealed ? '★' : '☆') : waiting ? '⏸' : revealed ? '✓' : '·'}
              </text>
              <text x={x} y={y + radius + (dots.length ? 34 : 16)} textAnchor="middle" fontSize="10" fontWeight="600" fill={revealed ? '#e2e8f0' : '#64748b'} {...HALO}>
                {label}
              </text>
              {!isResult && (
                <text x={x} y={y + radius + (dots.length ? 46 : 28)} textAnchor="middle" fontSize="8.5" fill="#94a3b8" {...HALO}>
                  {stage!.agent}
                </text>
              )}
              {stage?.exitGate && (
                <text x={x + radius - 2} y={y - radius + 2} textAnchor="middle" fontSize="8" fontWeight="700" fill={waiting ? '#f59e0b' : '#94a3b8'}>
                  {stage.exitGate}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend: what the small bubbles and the symbols mean */}
      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-slate-300">
        {SATELLITE_KINDS.map((kind) => (
          <span key={kind.key} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: kind.color }} />
            {kind.label}
          </span>
        ))}
        <span className="text-slate-400">✓ done · ⏸ waiting for you · · not run</span>
      </div>
    </div>
  );
}

export type GraphNodeId = NodeId;
export const RESULT_NODE = RESULT;
