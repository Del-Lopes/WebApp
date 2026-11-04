import React, { useMemo, useState } from 'react';
import { Chip, Note, Panel } from './widgets';

// Laboratório de timeframes: UMA série de preços (10 dias em ticks de 1 min) agregada em M1, M5, M15, H1, H4 e D1.
// Assim dá para ver que é o MESMO mercado, só visto em escalas diferentes.
const N = 14400;
const rnd = (s: number) => { const x = Math.sin(s * 12.9898 + 4.1414) * 43758.5453; return x - Math.floor(x); };

const SERIES: number[] = (() => {
  const out: number[] = [];
  let p = 100;
  let drift = 0.01;
  for (let i = 0; i < N; i++) {
    if (i % 1700 === 0) drift = (rnd(i / 1700 + 3) - 0.38) * 0.03;
    p += drift + (rnd(i + 1) - 0.5) * 0.7;
    out.push(p);
  }
  return out;
})();

export const TF_FACTOR: Record<string, number> = { M1: 1, M5: 5, M15: 15, H1: 60, H4: 240, D1: 1440 };

function aggregate(tf: string, count: number) {
  const f = TF_FACTOR[tf];
  const cnt = Math.min(count, Math.floor((N - 1) / f));
  const bars: { o: number; h: number; l: number; c: number }[] = [];
  for (let j = 0; j < cnt; j++) {
    const end = N - (cnt - 1 - j) * f; // exclusivo
    const start = end - f;
    let h = -Infinity, l = Infinity;
    for (let i = start; i < end; i++) { if (SERIES[i] > h) h = SERIES[i]; if (SERIES[i] < l) l = SERIES[i]; }
    bars.push({ o: SERIES[start - 1], c: SERIES[end - 1], h, l });
  }
  return bars;
}

const MiniChart: React.FC<{ tf: string; count?: number; label?: string }> = ({ tf, count = 48, label }) => {
  const bars = useMemo(() => aggregate(tf, count), [tf, count]);
  const lo = Math.min(...bars.map((b) => b.l)), hi = Math.max(...bars.map((b) => b.h));
  const W = 340, H = 118, pad = 8;
  const cw = (W - pad * 2) / bars.length;
  const y = (v: number) => 8 + (1 - (v - lo) / (hi - lo || 1)) * (H - 16);
  const first = bars[0].o, last = bars[bars.length - 1].c;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Gráfico ${tf}`}>
      {bars.map((b, i) => {
        const up = b.c >= b.o, col = up ? '#10b981' : '#f43f5e', x = pad + (i + 0.5) * cw;
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={y(b.h)} y2={y(b.l)} stroke={col} strokeWidth={Math.min(1.2, cw * 0.25)} />
            <rect x={x - cw * 0.34} width={cw * 0.68} y={y(Math.max(b.o, b.c))} height={Math.max(1, Math.abs(y(b.o) - y(b.c)))} fill={col} />
          </g>
        );
      })}
      <g className="text-accent-fg"><line x1={pad} x2={W - pad} y1={y(first)} y2={y(last)} stroke="currentColor" strokeWidth={1.4} strokeDasharray="5 4" opacity={0.8} /></g>
      <text x={pad + 2} y={12} fontSize={10} fontWeight={800} className="fill-current text-fg">{label ?? tf}</text>
    </svg>
  );
};

const ALL = ['M1', 'M5', 'M15', 'H1', 'H4', 'D1'];
const SPAN: Record<string, string> = {
  M1: 'cada candle = 1 minuto', M5: 'cada candle = 5 minutos', M15: 'cada candle = 15 minutos',
  H1: 'cada candle = 1 hora', H4: 'cada candle = 4 horas', D1: 'cada candle = 1 dia',
};

export const TfLab: React.FC<{
  tfs?: string[]; init?: string; dual?: [string, string]; desc?: Record<string, string>; foot?: string; count?: number;
}> = ({ tfs = ALL, init, dual, desc, foot, count = 48 }) => {
  const [tf, setTf] = useState(init ?? tfs[Math.min(1, tfs.length - 1)]);
  const [hi, setHi] = useState(dual?.[0] ?? 'H4');
  const [lo, setLo] = useState(dual?.[1] ?? 'M15');

  if (dual) {
    return (
      <div className="space-y-2.5">
        <Panel>
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5"><span className="text-[11px] font-semibold text-fg-muted">Visão ampla</span>{tfs.map((t) => <Chip key={t} on={hi === t} onClick={() => setHi(t)}>{t}</Chip>)}</div>
          <MiniChart tf={hi} count={count} />
        </Panel>
        <Panel>
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5"><span className="text-[11px] font-semibold text-fg-muted">Visão de entrada</span>{tfs.map((t) => <Chip key={t} on={lo === t} onClick={() => setLo(t)}>{t}</Chip>)}</div>
          <MiniChart tf={lo} count={count} />
        </Panel>
        <Note>{foot ?? 'Primeiro olhe o tempo maior para ver a direção; depois desça para o tempo menor e procure a entrada a favor dela.'}</Note>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-1.5">{tfs.map((t) => <Chip key={t} on={tf === t} onClick={() => setTf(t)}>{t}</Chip>)}</div>
      <Panel><MiniChart tf={tf} count={count} /></Panel>
      <p className="text-center text-xs text-fg-muted">{SPAN[tf]} · últimos {Math.min(count, Math.floor((N - 1) / TF_FACTOR[tf]))} candles</p>
      <Note>{desc?.[tf] ?? foot ?? 'É o mesmo mercado em escalas diferentes. Quanto menor o tempo, mais ruído; quanto maior, mais clara a direção. A linha tracejada liga o início ao fim.'}</Note>
    </div>
  );
};
