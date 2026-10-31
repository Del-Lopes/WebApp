import React, { useEffect, useId, useRef, useState } from 'react';

interface Props {
  title: string;
  /** Um valor por dia (índice = dia). */
  values: number[];
  kind: 'area' | 'bar';
  format: (v: number) => string;
  /** Dia em destaque (posição atual do simulador). */
  current: number;
  onSelectDay?: (day: number) => void;
}

const H = 180;
const PAD = { top: 12, right: 12, bottom: 24, left: 52 };

// Gráfico de uma série (sem legenda — o título nomeia). Linha 2px / barras
// com topo arredondado, grade discreta, crosshair + tooltip no hover.
export const SimChart: React.FC<Props> = ({ title, values, kind, format, current, onSelectDay }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [hover, setHover] = useState<number | null>(null);
  const gradId = `sim-grad-${useId().replace(/:/g, '')}`;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = values.length;
  const max = Math.max(1, ...values);
  const innerW = width - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const step = innerW / Math.max(1, kind === 'bar' ? n : n - 1);
  const x = (i: number) => PAD.left + (kind === 'bar' ? step * i + step / 2 : step * i);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;

  const ticks = [0, 0.5, 1].map((t) => t * max);
  const xTicks = [0, Math.round((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i);

  const linePath = values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ');
  const areaPath = `${linePath} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const barW = Math.max(1, Math.min(18, step - 2)); // 2px de respiro entre barras

  const indexAt = (clientX: number) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    const px = clientX - rect.left - PAD.left;
    const i = kind === 'bar' ? Math.floor(px / step) : Math.round(px / step);
    return Math.min(n - 1, Math.max(0, i));
  };

  const shown = hover ?? current;
  const tipLeft = Math.min(Math.max(x(shown), PAD.left + 50), width - 60);

  return (
    <figure className="glass-card p-4">
      <figcaption className="mb-2 flex items-baseline justify-between gap-2">
        <span className="eyebrow-muted">{title}</span>
        <span className="text-sm font-medium tabular-nums text-fg">
          Dia {shown}: {format(values[shown] ?? 0)}
        </span>
      </figcaption>
      <div
        ref={wrapRef}
        className="relative cursor-crosshair touch-none select-none"
        onPointerMove={(e) => setHover(indexAt(e.clientX))}
        onPointerLeave={() => setHover(null)}
        onClick={(e) => onSelectDay?.(indexAt(e.clientX))}
      >
        <svg width={width} height={H} role="img" aria-label={`${title}: de ${format(values[0] ?? 0)} no dia 0 a ${format(values[n - 1] ?? 0)} no dia ${n - 1}`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--color-tint)" strokeOpacity={0.08} />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-fg-subtle text-[10px] tabular-nums">{format(t)}</text>
            </g>
          ))}
          {xTicks.map((i) => (
            <text key={i} x={x(i)} y={H - 6} textAnchor="middle" className="fill-fg-subtle text-[10px] tabular-nums">Dia {i}</text>
          ))}

          {kind === 'area' ? (
            <>
              <defs>
                <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-brand-green)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="var(--color-brand-green)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <path d={areaPath} fill={`url(#${gradId})`} />
              <path d={linePath} fill="none" stroke="var(--color-brand-green)" strokeWidth={2} strokeLinejoin="round" />
            </>
          ) : (
            values.map((v, i) => {
              const h = Math.max(0, y(0) - y(v));
              return (
                <path
                  key={i}
                  d={roundedTop(x(i) - barW / 2, y(v), barW, h, Math.min(4, barW / 2))}
                  fill="var(--color-brand-green)"
                  fillOpacity={i <= current ? 1 : 0.25}
                />
              );
            })
          )}

          {/* Dia atual do simulador */}
          <line x1={x(current)} x2={x(current)} y1={PAD.top} y2={y(0)} stroke="var(--color-fg-subtle)" strokeDasharray="3 3" />
          {/* Crosshair */}
          {hover != null && (
            <>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={y(0)} stroke="var(--color-fg-muted)" strokeOpacity={0.5} />
              {kind === 'area' && (
                <circle cx={x(hover)} cy={y(values[hover])} r={4} fill="var(--color-brand-green)" stroke="var(--color-surface)" strokeWidth={2} />
              )}
            </>
          )}
        </svg>
        {hover != null && (
          <div
            className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg border border-tint/10 bg-surface px-2.5 py-1.5 text-xs shadow-lg"
            style={{ left: tipLeft }}
          >
            <span className="text-fg-subtle">Dia {hover}</span>{' '}
            <span className="font-medium tabular-nums text-fg">{format(values[hover])}</span>
          </div>
        )}
      </div>
    </figure>
  );
};

// Retângulo com só os cantos de cima arredondados (base reta na linha zero).
function roundedTop(x: number, y: number, w: number, h: number, r: number) {
  if (h <= 0) return '';
  const rr = Math.min(r, h);
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`;
}
