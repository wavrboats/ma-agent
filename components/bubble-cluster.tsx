'use client';

import type { InnerTone } from '@/lib/test-run-layers';

// Labelled bubbles packed inside one big bubble. Colours follow the map's small bubbles, and every
// bubble carries a text label, so colour is never the only cue.
export const TONES: Record<InnerTone, { stroke: string; fill: string; text: string; name: string }> = {
  finding: { stroke: '#3987e5', fill: '#3987e533', text: '#bfdbfe', name: 'Findings' },
  risk: { stroke: '#d95926', fill: '#d9592633', text: '#fed7aa', name: 'Risks' },
  document: { stroke: '#199e70', fill: '#199e7033', text: '#a7f3d0', name: 'Documents / needs data' },
  buyer: { stroke: '#c98500', fill: '#c9850033', text: '#fde68a', name: 'Buyers' },
  asset: { stroke: '#94a3b8', fill: '#94a3b833', text: '#e2e8f0', name: 'Asset' },
  output: { stroke: '#818cf8', fill: '#818cf833', text: '#e0e7ff', name: 'Outputs' },
  gate: { stroke: '#f59e0b', fill: '#f59e0b22', text: '#fde68a', name: 'Gate' },
  workstream: { stroke: '#64748b', fill: '#64748b33', text: '#cbd5e1', name: 'Workstreams' },
  outcome: { stroke: '#93c5fd', fill: '#3b82f655', text: '#eff6ff', name: 'Outcome' },
};

export type ClusterItem = { id: string; label: string; tone: InnerTone; count?: number };

const SIZE = 320;
const OUTER = 154;

function layout(count: number) {
  let r = count <= 4 ? 46 : count <= 7 ? 40 : count <= 12 ? 32 : count <= 19 ? 26 : 19;
  const gap = r * 2 + 8;
  const points: { x: number; y: number }[] = [{ x: 0, y: 0 }];
  let extent = r;
  for (let ring = 1; points.length < count; ring += 1) {
    const radius = ring * gap;
    // A partly filled outer ring is spread evenly all the way round, so the cluster stays centred.
    const capacity = Math.min(Math.max(1, Math.floor((2 * Math.PI * radius) / gap)), count - points.length);
    for (let i = 0; i < capacity; i += 1) {
      const angle = (i / capacity) * Math.PI * 2 - Math.PI / 2 + ring * 0.35;
      points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
    }
    extent = radius + r;
  }
  // Shrink everything to fit inside the outer bubble.
  const scale = Math.min(1, (OUTER - 6) / extent);
  r *= scale;
  return { r, points: points.map((p) => ({ x: p.x * scale, y: p.y * scale })) };
}

// Splits a label into at most three short lines.
function wrap(label: string, width: number) {
  const words = label.split(/\s+/);
  const lines: string[] = [];
  for (const word of words) {
    const last = lines[lines.length - 1];
    if (last && (last + ' ' + word).length <= width) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  if (lines.length > 3) return [...lines.slice(0, 2), `${lines[2].slice(0, width - 1)}…`];
  return lines.map((line) => (line.length > width + 2 ? `${line.slice(0, width)}…` : line));
}

export function BubbleCluster({
  items,
  picked,
  onPick,
  centreLabel,
}: {
  items: ClusterItem[];
  picked: string | null;
  onPick: (id: string) => void;
  centreLabel?: string;
}) {
  const { r, points } = layout(items.length);
  const font = Math.max(7, Math.min(11, r / 3.6));
  const width = Math.max(6, Math.round((r * 2) / (font * 0.62)));

  return (
    <svg viewBox={`${-SIZE / 2} ${-SIZE / 2} ${SIZE} ${SIZE}`} className="mx-auto block w-full max-w-md">
      <circle r={OUTER} fill="#0b1324" stroke="#334155" strokeWidth="1.5" />
      {centreLabel && items.length === 0 && (
        <text textAnchor="middle" fontSize="12" fill="#94a3b8">
          {centreLabel}
        </text>
      )}
      {items.map((item, index) => {
        const { x, y } = points[index];
        const tone = TONES[item.tone];
        const lines = wrap(item.label, width);
        const top = y - ((lines.length - 1) * font * 1.1) / 2 - (item.count ? font * 0.5 : 0);
        return (
          <g
            key={item.id}
            role="button"
            tabIndex={0}
            aria-label={`${item.label}${item.count ? `, ${item.count} items` : ''}`}
            onClick={() => onPick(item.id)}
            onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && onPick(item.id)}
            className="cursor-pointer outline-none"
          >
            <circle cx={x} cy={y} r={r + 3} fill="transparent" />
            <circle cx={x} cy={y} r={r} fill={tone.fill} stroke={picked === item.id ? '#f8fafc' : tone.stroke} strokeWidth={picked === item.id ? 2.5 : 1.3} />
            {lines.map((line, lineIndex) => (
              <text key={lineIndex} x={x} y={top + lineIndex * font * 1.1 + font * 0.35} textAnchor="middle" fontSize={font} fontWeight="600" fill={tone.text}>
                {line}
              </text>
            ))}
            {item.count !== undefined && (
              <text x={x} y={top + lines.length * font * 1.1 + font * 0.45} textAnchor="middle" fontSize={font * 0.9} fill={tone.stroke}>
                {item.count}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
