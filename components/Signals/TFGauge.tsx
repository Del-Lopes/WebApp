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

const SIGNAL_META: Record<number, { label: string; color: string }> = {
  1:  { label: 'BUY',     color: '#16a34a' },
  [-1]: { label: 'SELL',  color: '#e11d48' },
  0:  { label: 'NEUTRAL', color: '#eab308' },
};

export const TFGauge: React.FC<Props> = ({ result }) => {
  const size = 132;
  const cx = size / 2;
  const cy = size * 0.56;
  const r = size / 2 - 12;

  const third = ARC_TOTAL / 3;
  const zones = [
    { from: ARC_START, to: ARC_START + third, color: '#dc2626' },              // vermelho
    { from: ARC_START + third, to: ARC_START + 2 * third, color: '#e0b400' },  // amarelo
    { from: ARC_START + 2 * third, to: ARC_START + ARC_TOTAL, color: '#16a34a' }, // verde
  ];

  const sig = SIGNAL_META[result.signal] ?? SIGNAL_META[0];
  const ang = needleAngle(result.needle);
  const [nx, ny] = polar(cx, cy, r * 0.82, ang);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size * 0.82} viewBox={`0 0 ${size} ${size * 0.82}`}>
        {zones.map((z, i) => (
          <path key={i} d={arcPath(cx, cy, r, z.from, z.to)} fill="none" stroke={z.color} strokeWidth={9} strokeLinecap="butt" opacity={0.85} />
        ))}
        {/* Ponteiro */}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={sig.color} strokeWidth={3.5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={6} fill={sig.color} />
        {/* Rótulo do sinal */}
        <text x={cx} y={cy + 22} textAnchor="middle" fontSize={12} fontWeight="700" fill={sig.color}>{sig.label}</text>
      </svg>
      <div className="text-center -mt-1">
        <p className="text-sm font-bold text-slate-700">{result.label}</p>
        <p className="text-[11px] text-slate-400 leading-tight">{richStateName(result.state)}</p>
      </div>
    </div>
  );
};
