import React from 'react';
import { TFResult, richStateName } from '../../lib/trendMeter';

// Gauge de um timeframe — versão web (SVG) do medidor do MT5.
// Arco de 240° com 3 zonas (vermelho/amarelo/verde) e um ponteiro que varre
// conforme o `needle` (-1..+1). Cor do ponteiro = cor do sinal.

interface Props {
  result: TFResult;
}

const ARC_START = 150; // graus (igual ao MT5)
const ARC_TOTAL = 240;

// Converte posição do ponteiro (-1..+1) em ângulo no arco.
// needle=-1 → início do arco; 0 → meio; +1 → fim.
function needleAngle(needle: number): number {
  const clamped = Math.max(-1, Math.min(1, needle));
  return ARC_START + ((clamped + 1) / 2) * ARC_TOTAL;
}

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const [x1, y1] = polar(cx, cy, r, startDeg);
  const [x2, y2] = polar(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

// Cores via tokens semânticos (CSS vars) → legíveis nos temas escuro e claro.
const SIGNAL_META: Record<number, { label: string; color: string; chip: string }> = {
  1:    { label: 'BUY',     color: 'var(--ds-success-fg)', chip: 'bg-success/10 border-success/20 text-success-fg' },
  [-1]: { label: 'SELL',    color: 'var(--ds-danger-fg)',  chip: 'bg-danger/10 border-danger/20 text-danger-fg' },
  0:    { label: 'NEUTRAL', color: 'var(--ds-warning-fg)', chip: 'bg-warning/10 border-warning/20 text-warning-fg' },
};

const GAP = 5; // graus entre as zonas

export const TFGauge: React.FC<Props> = ({ result }) => {
  const w = 120;
  const h = 84;
  const cx = w / 2;
  const cy = 56;
  const r = 44;

  const third = ARC_TOTAL / 3;
  const zones = [
    { from: ARC_START, to: ARC_START + third, color: 'var(--ds-danger)' },
    { from: ARC_START + third, to: ARC_START + 2 * third, color: 'var(--ds-warning)' },
    { from: ARC_START + 2 * third, to: ARC_START + ARC_TOTAL, color: 'var(--ds-success)' },
  ];

  const sig = SIGNAL_META[result.signal] ?? SIGNAL_META[0];
  const ang = needleAngle(result.needle);
  const activeZone = result.needle < -1 / 3 ? 0 : result.needle > 1 / 3 ? 2 : 1;
  const [tx, ty] = polar(cx, cy, r - 9, ang);   // ponta do ponteiro
  const [bx, by] = polar(cx, cy, 7, ang);       // início (fora do cubo)

  return (
    <div className="flex w-[148px] flex-col items-center rounded-xl border border-tint/6 bg-tint/3 px-2 pb-3 pt-2.5 transition-colors hover:bg-tint/5">
      <p className="font-mono text-sm font-semibold tracking-wide text-fg">{result.label}</p>

      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${result.label}: ${sig.label}, ${richStateName(result.state)}`}>
        {/* Trilho de fundo */}
        <path d={arcPath(cx, cy, r, ARC_START, ARC_START + ARC_TOTAL)} fill="none" style={{ stroke: 'var(--ds-line, currentColor)' }} strokeWidth={9} strokeLinecap="round" opacity={0.35} />
        {/* Zonas — só a ativa fica em destaque */}
        {zones.map((z, i) => (
          <path
            key={i}
            d={arcPath(cx, cy, r, z.from + GAP / 2, z.to - GAP / 2)}
            fill="none"
            style={{ stroke: z.color }}
            strokeWidth={6}
            strokeLinecap="round"
            opacity={i === activeZone ? 1 : 0.28}
          />
        ))}
        {/* Ponteiro */}
        <line x1={bx} y1={by} x2={tx} y2={ty} style={{ stroke: sig.color }} strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={5.5} fill="none" style={{ stroke: sig.color }} strokeWidth={2} />
        <circle cx={cx} cy={cy} r={2} style={{ fill: sig.color }} />
      </svg>

      <span className={`-mt-1 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-bold tracking-[0.12em] ${sig.chip}`}>{sig.label}</span>
      <p className="mt-1.5 text-center text-[11px] leading-tight text-fg-muted">{richStateName(result.state)}</p>
    </div>
  );
};
