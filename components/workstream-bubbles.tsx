'use client';

import { useState } from 'react';
import type { ChecklistItem, ChecklistStatus } from '@/lib/test-run-checklists';

// A stage's workstreams as small bubbles packed inside one big bubble. Tap one to see what was done.
const LOOK: Record<ChecklistStatus, { fill: string; text: string; symbol: string; label: string }> = {
  covered: { fill: '#065f46', text: '#6ee7b7', symbol: '✓', label: 'Covered by your material' },
  produced: { fill: '#1e3a8a', text: '#93c5fd', symbol: '◆', label: 'Produced by the run' },
  'needs-data': { fill: '#78350f', text: '#fcd34d', symbol: '!', label: 'Needs data' },
  'not-applicable': { fill: '#334155', text: '#cbd5e1', symbol: '–', label: 'Not relevant' },
  'not-reached': { fill: '#1e293b', text: '#64748b', symbol: '○', label: 'Not reached yet' },
};

const SIZE = 300;
const OUTER = 142;

// Places n bubbles on rings from the centre outwards.
function layout(count: number) {
  const r = count <= 15 ? 22 : 16;
  const gap = r * 2 + 8;
  const points: { x: number; y: number }[] = [{ x: 0, y: 0 }];
  for (let ring = 1; points.length < count; ring += 1) {
    const radius = ring * gap;
    const capacity = Math.max(1, Math.floor((2 * Math.PI * radius) / gap));
    for (let i = 0; i < capacity && points.length < count; i += 1) {
      const angle = (i / capacity) * Math.PI * 2 - Math.PI / 2 + ring * 0.3;
      points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
    }
  }
  return { r, points };
}

export function WorkstreamBubbles({ title, items, ownStage }: { title: string; items: ChecklistItem[]; ownStage: string }) {
  const [picked, setPicked] = useState<number | null>(null);
  const { r, points } = layout(items.length);
  const active = items.find((item) => item.number === picked);

  return (
    <div className="mt-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <svg viewBox={`${-SIZE / 2} ${-SIZE / 2} ${SIZE} ${SIZE}`} className="mx-auto mt-2 block w-full max-w-sm">
        <circle r={OUTER} fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
        {items.map((item, index) => {
          const { x, y } = points[index];
          const look = LOOK[item.status];
          const mine = item.stage === ownStage;
          return (
            <g
              key={item.number}
              role="button"
              tabIndex={0}
              aria-label={`${item.number} ${item.name}: ${look.label}`}
              onClick={() => setPicked(item.number)}
              onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && setPicked(item.number)}
              className="cursor-pointer outline-none"
              opacity={mine ? 1 : 0.55}
            >
              <circle cx={x} cy={y} r={r + 4} fill="transparent" />
              <circle
                cx={x}
                cy={y}
                r={r}
                fill={look.fill}
                stroke={picked === item.number ? '#f8fafc' : look.text}
                strokeWidth={picked === item.number ? 2.5 : 1}
              />
              <text x={x} y={y - (r > 18 ? 2 : 1)} textAnchor="middle" fontSize={r > 18 ? 11 : 9} fontWeight="700" fill={look.text}>
                {item.number}
              </text>
              <text x={x} y={y + (r > 18 ? 11 : 9)} textAnchor="middle" fontSize={r > 18 ? 11 : 9} fill={look.text}>
                {look.symbol}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
        {(Object.keys(LOOK) as ChecklistStatus[]).map((status) => (
          <span key={status} className="inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: LOOK[status].text }} />
            {LOOK[status].symbol} {LOOK[status].label}
          </span>
        ))}
      </div>

      {active ? (
        <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm">
          <p className="font-medium text-white">
            {String(active.number).padStart(2, '0')} {active.name}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.12em]" style={{ color: LOOK[active.status].text }}>
            {LOOK[active.status].symbol} {LOOK[active.status].label}
          </p>
          <p className="mt-2 text-slate-300">{active.note}</p>
        </div>
      ) : (
        <p className="mt-3 text-center text-xs text-slate-500">Tap a small bubble to see what was done. Faded bubbles belong to another agent in this group.</p>
      )}
    </div>
  );
}
