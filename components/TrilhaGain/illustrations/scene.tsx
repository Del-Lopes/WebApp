import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../../lib/cn';

// ── Tipos do gráfico guiado ──────────────────────────────────────────────
export type Tone = 'up' | 'dn' | 'ac' | 'wn' | 'mu';
export type Pt = [number, number]; // [índice do candle, preço]
export interface Bar { o: number; h: number; l: number; c: number }

export type Ann =
  | { k: 'h'; y: number; l?: string; c?: Tone }
  | { k: 'z'; y: [number, number]; l?: string; c?: Tone }
  | { k: 'b'; x: [number, number]; y: [number, number]; l?: string; c?: Tone }
  | { k: 'ln'; a: Pt; b: Pt; l?: string; c?: Tone; ext?: boolean }
  | { k: 't'; at: Pt; s: string; c?: Tone }
  | { k: 'ar'; a: Pt; b: Pt; c?: Tone }
  | { k: 'pt'; at: Pt; c?: Tone; l?: string }
  | { k: 'ma'; n: number; e?: boolean; c?: Tone }
  | { k: 'bb'; n?: number; d?: number }
  | { k: 'fib'; a: Pt; b: Pt; lv?: number[]; ext?: boolean; gold?: boolean }
  | { k: 'vl'; i: number; l?: string }
  | { k: 'hl'; i: number[]; c?: Tone }
  | { k: 'rsi' } | { k: 'macd' } | { k: 'stoch' } | { k: 'adx' };

export interface Step { text: string; add: Ann[] }
export interface Scene {
  bars: Bar[];
  steps: Step[];
  /** Controle extra: período da média ou desvio das bandas. */
  ctrl?: 'ma' | 'bb';
  ctrlDef?: number;
  /** Volume por candle (opcional). */
  vol?: number[];
  /** Espaços vazios à direita (para projeções). */
  ext?: number;
}

// ── Construção de candles ────────────────────────────────────────────────
const rnd = (s: number): number => {
  const x = Math.sin(s * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** Candles a partir dos fechamentos: abertura = fechamento anterior. Item pode ser [fechamento, pavioCima, pavioBaixo]. */
export function cs(start: number, items: (number | [number, number?, number?])[], wk = 1): Bar[] {
  let p = start;
  return items.map((it, i) => {
    const [c, uw, lw] = Array.isArray(it) ? it : [it, undefined, undefined];
    const o = p;
    p = c;
    const u = uw ?? (0.5 + rnd(i * 2 + start) * 1.5) * wk;
    const d = lw ?? (0.5 + rnd(i * 2 + start + 1) * 1.5) * wk;
    return { o, c, h: Math.max(o, c) + u, l: Math.min(o, c) - d };
  });
}

/** Candle explícito [abertura, fechamento, pavioCima, pavioBaixo]. */
export const cd = (o: number, c: number, u = 1, d = 1): Bar => ({ o, c, h: Math.max(o, c) + u, l: Math.min(o, c) - d });

/** Caminha de `from` até `to` em `n` candles com ruído (tendência com serrilhado). */
export function trend(from: number, to: number, n: number, noise = 2, seed = 1): number[] {
  return Array.from({ length: n }, (_, i) => {
    const base = from + ((to - from) * (i + 1)) / n;
    return base + (rnd(seed * 17 + i * 3.1) - 0.5) * 2 * noise;
  });
}

// ── Indicadores ──────────────────────────────────────────────────────────
export const sma = (v: number[], n: number): (number | null)[] =>
  v.map((_, i) => (i < n - 1 ? null : v.slice(i - n + 1, i + 1).reduce((a, b) => a + b, 0) / n));

export const ema = (v: number[], n: number): (number | null)[] => {
  const k = 2 / (n + 1);
  const out: (number | null)[] = [];
  let prev: number | null = null;
  v.forEach((x, i) => {
    if (i < n - 1) { out.push(null); return; }
    prev = prev === null ? v.slice(0, n).reduce((a, b) => a + b, 0) / n : x * k + prev * (1 - k);
    out.push(prev);
  });
  return out;
};

function rsiCalc(c: number[], n = 14): (number | null)[] {
  const out: (number | null)[] = c.map(() => null);
  if (c.length <= n) return out;
  let g = 0, l = 0;
  for (let i = 1; i <= n; i++) { const d = c[i] - c[i - 1]; if (d >= 0) g += d; else l -= d; }
  g /= n; l /= n;
  out[n] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
  for (let i = n + 1; i < c.length; i++) {
    const d = c[i] - c[i - 1];
    g = (g * (n - 1) + Math.max(d, 0)) / n;
    l = (l * (n - 1) + Math.max(-d, 0)) / n;
    out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
  }
  return out;
}

function stochCalc(b: Bar[], n = 14, s = 3): { k: (number | null)[]; d: (number | null)[] } {
  const k = b.map((_, i) => {
    if (i < n - 1) return null;
    const w = b.slice(i - n + 1, i + 1);
    const hi = Math.max(...w.map((x) => x.h)), lo = Math.min(...w.map((x) => x.l));
    return hi === lo ? 50 : ((b[i].c - lo) / (hi - lo)) * 100;
  });
  const d = k.map((_, i) => {
    const w = k.slice(Math.max(0, i - s + 1), i + 1);
    return w.some((x) => x === null) || w.length < s ? null : (w as number[]).reduce((a, x) => a + x, 0) / s;
  });
  return { k, d };
}

function adxCalc(b: Bar[], n = 14): (number | null)[] {
  const out: (number | null)[] = b.map(() => null);
  if (b.length < n * 2) return out;
  const tr: number[] = [], pdm: number[] = [], mdm: number[] = [];
  for (let i = 1; i < b.length; i++) {
    const up = b[i].h - b[i - 1].h, dn = b[i - 1].l - b[i].l;
    pdm.push(up > dn && up > 0 ? up : 0);
    mdm.push(dn > up && dn > 0 ? dn : 0);
    tr.push(Math.max(b[i].h - b[i].l, Math.abs(b[i].h - b[i - 1].c), Math.abs(b[i].l - b[i - 1].c)));
  }
  let atr = tr.slice(0, n).reduce((a, x) => a + x, 0), p = pdm.slice(0, n).reduce((a, x) => a + x, 0), m = mdm.slice(0, n).reduce((a, x) => a + x, 0);
  const dx: number[] = [];
  for (let i = n; i <= tr.length; i++) {
    if (i > n) { atr = atr - atr / n + tr[i - 1]; p = p - p / n + pdm[i - 1]; m = m - m / n + mdm[i - 1]; }
    const pi = (p / atr) * 100, mi = (m / atr) * 100;
    dx.push(pi + mi === 0 ? 0 : (Math.abs(pi - mi) / (pi + mi)) * 100);
  }
  let a = dx.slice(0, n).reduce((s, x) => s + x, 0) / n;
  const first = n * 2 - 1;
  out[first] = a;
  for (let i = n; i < dx.length; i++) { a = (a * (n - 1) + dx[i]) / n; if (first + (i - n + 1) < b.length) out[first + (i - n + 1)] = a; }
  return out;
}

// ── Cores ────────────────────────────────────────────────────────────────
const UP = '#10b981';
const DN = '#f43f5e';
const toneCls: Record<Tone, string> = {
  up: 'text-emerald-500', dn: 'text-rose-500', ac: 'text-accent-fg', wn: 'text-warning-fg', mu: 'text-fg-muted',
};
const tc = (t?: Tone) => toneCls[t ?? 'ac'];

// ── Widget: gráfico guiado ───────────────────────────────────────────────
const W = 340, H = 168, PL = 8, PR = 8, PT = 12, PB = 10;
const PANEL = 52, VOLH = 30;

export const SceneChart: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { bars, steps } = scene;
  const [si, setSi] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const [maKind, setMaKind] = useState<'sma' | 'ema'>('sma');
  const [ctrl, setCtrl] = useState<number>(scene.ctrlDef ?? (scene.ctrl === 'bb' ? 2 : 9));

  // Cumulativo: o passo N mostra tudo dos passos anteriores; anotações idênticas não são desenhadas duas vezes.
  const anns = useMemo(() => {
    const seen = new Set<string>();
    return steps.slice(0, si + 1).flatMap((s) => s.add).filter((a) => { const k = JSON.stringify(a); if (seen.has(k)) return false; seen.add(k); return true; });
  }, [steps, si]);
  const closes = useMemo(() => bars.map((b) => b.c), [bars]);
  const n = bars.length + (scene.ext ?? 2);
  const cw = (W - PL - PR) / n;
  const xi = (i: number) => PL + (i + 0.5) * cw;

  const hasPanel = useMemo(() => steps.some((s) => s.add.some((a) => ['rsi', 'macd', 'stoch', 'adx'].includes(a.k))), [steps]);
  const hasVol = !!scene.vol;
  const extra = (hasPanel ? PANEL + 8 : 0) + (hasVol ? VOLH + 6 : 0);
  const totalH = H + extra;

  // Escala vertical: candles + pontos das anotações de todos os passos (não "pula" entre passos).
  const [lo, hi] = useMemo(() => {
    let a = Math.min(...bars.map((b) => b.l)), z = Math.max(...bars.map((b) => b.h));
    const take = (y: number) => { if (y < a) a = y; if (y > z) z = y; };
    steps.forEach((s) => s.add.forEach((an) => {
      if (an.k === 'h') take(an.y);
      else if (an.k === 'z' || an.k === 'b') { take(an.y[0]); take(an.y[1]); }
      else if (an.k === 'ln' || an.k === 'ar') { take(an.a[1]); take(an.b[1]); }
      else if (an.k === 't' || an.k === 'pt') take(an.at[1]);
      else if (an.k === 'fib') {
        const lv = an.lv ?? [0, 0.382, 0.5, 0.618, 1];
        lv.forEach((L) => take(an.ext ? an.a[1] + (an.b[1] - an.a[1]) * L : an.b[1] - (an.b[1] - an.a[1]) * L));
      }
    }));
    const pad = (z - a) * 0.08 || 1;
    return [a - pad, z + pad];
  }, [bars, steps]);
  const y = (v: number) => PT + (1 - (v - lo) / (hi - lo)) * (H - PT - PB);

  const maSeries = (an: { n: number; e?: boolean }) => (an.e ? ema(closes, an.n) : sma(closes, an.n));
  const path = (vals: (number | null)[], map: (v: number) => number) => {
    let d = '';
    vals.forEach((v, i) => { if (v !== null) d += `${d ? 'L' : 'M'}${xi(i).toFixed(1)} ${map(v).toFixed(1)}`; });
    return d;
  };

  const has = (k: Ann['k']) => anns.some((a) => a.k === k);
  const panelTop = H + 8;
  const volTop = H + (hasPanel ? PANEL + 8 : 0) + 6;

  // Painel de indicador (o último pedido vence)
  const panelKind = ([...anns].reverse().find((a) => ['rsi', 'macd', 'stoch', 'adx'].includes(a.k))?.k ?? null) as 'rsi' | 'macd' | 'stoch' | 'adx' | null;
  const py = (v: number, a: number, b: number) => panelTop + 4 + (1 - (v - a) / (b - a)) * (PANEL - 8);

  const sel_ = sel !== null ? bars[sel] : null;
  const ctrlMa = scene.ctrl === 'ma' ? (maKind === 'ema' ? ema(closes, ctrl) : sma(closes, ctrl)) : null;
  const bbN = 20;
  const bbCalc = (nn: number, d: number) => {
    const m = sma(closes, nn);
    return closes.map((_, i) => {
      if (m[i] === null) return null;
      const w = closes.slice(i - nn + 1, i + 1);
      const sd = Math.sqrt(w.reduce((a, x) => a + (x - (m[i] as number)) ** 2, 0) / nn);
      return { m: m[i] as number, u: (m[i] as number) + d * sd, l: (m[i] as number) - d * sd };
    });
  };
  const bbN2 = Math.min(bbN, Math.max(5, Math.floor(bars.length / 2)));

  const renderBB = (nn: number, d: number) => {
    const b = bbCalc(nn, d);
    const mk = (f: 'u' | 'm' | 'l') => path(b.map((x) => (x ? x[f] : null)), y);
    const up = b.map((x, i) => (x ? `${xi(i)} ${y(x.u)}` : null)).filter(Boolean) as string[];
    const lw = b.map((x, i) => (x ? `${xi(i)} ${y(x.l)}` : null)).filter(Boolean) as string[];
    return (
      <g className="text-accent-fg animate-in fade-in duration-300">
        {up.length > 1 && <polygon points={[...up, ...lw.reverse()].join(' ')} fill="currentColor" opacity={0.08} />}
        <path d={mk('u')} fill="none" stroke="currentColor" strokeWidth={1.2} />
        <path d={mk('l')} fill="none" stroke="currentColor" strokeWidth={1.2} />
        <path d={mk('m')} fill="none" stroke="currentColor" strokeWidth={1} strokeDasharray="3 3" opacity={0.7} />
      </g>
    );
  };

  return (
    <div>
      <div className="rounded-xl border border-tint/8 bg-tint/3 p-2">
        <svg viewBox={`0 0 ${W} ${totalH}`} className="w-full h-auto select-none" role="img" aria-label="Gráfico ilustrativo interativo">
          {/* grade */}
          <g className="text-fg-subtle" opacity={0.25}>
            {[0.25, 0.5, 0.75].map((f) => (
              <line key={f} x1={PL} x2={W - PR} y1={PT + f * (H - PT - PB)} y2={PT + f * (H - PT - PB)} stroke="currentColor" strokeDasharray="2 4" />
            ))}
          </g>

          {/* destaques de candles */}
          {anns.filter((a) => a.k === 'hl').map((a, ai) => (a as Extract<Ann, { k: 'hl' }>).i.map((i) => (
            <rect key={`hl${ai}-${i}`} x={xi(i) - cw / 2} y={PT - 6} width={cw} height={H - PT - PB + 12} rx={3}
              className={cn(tc((a as Extract<Ann, { k: 'hl' }>).c), 'animate-in fade-in duration-300')} fill="currentColor" opacity={0.14} />
          )))}

          {/* zonas e caixas (atrás dos candles) */}
          {anns.map((a, i) => {
            if (a.k === 'z') {
              return (
                <g key={i} className={cn(tc(a.c), 'animate-in fade-in duration-300')}>
                  <rect x={PL} y={y(a.y[1])} width={W - PL - PR} height={Math.max(2, y(a.y[0]) - y(a.y[1]))} fill="currentColor" opacity={0.16} />
                  {a.l && <text x={W - PR - 3} y={y(a.y[1]) + 9} textAnchor="end" fontSize={8.5} fontWeight={600} fill="currentColor">{a.l}</text>}
                </g>
              );
            }
            if (a.k === 'b') {
              const x1 = xi(a.x[0]) - cw / 2, x2 = xi(a.x[1]) + cw / 2;
              return (
                <g key={i} className={cn(tc(a.c), 'animate-in fade-in duration-300')}>
                  <rect x={x1} y={y(a.y[1])} width={x2 - x1} height={Math.max(2, y(a.y[0]) - y(a.y[1]))} rx={2} fill="currentColor" opacity={0.16} stroke="currentColor" strokeOpacity={0.6} />
                  {a.l && <text x={x1 + 3} y={y(a.y[1]) - 3} fontSize={8.5} fontWeight={600} fill="currentColor">{a.l}</text>}
                </g>
              );
            }
            return null;
          })}

          {/* bandas de Bollinger */}
          {scene.ctrl !== 'bb' && anns.filter((a) => a.k === 'bb').slice(-1).map((a) => <React.Fragment key="bb">{renderBB((a as any).n ?? bbN2, (a as any).d ?? 2)}</React.Fragment>)}
          {scene.ctrl === 'bb' && renderBB(bbN2, ctrl)}

          {/* candles */}
          {bars.map((b, i) => {
            const up = b.c >= b.o;
            const col = up ? UP : DN;
            const top = y(Math.max(b.o, b.c)), bh = Math.max(1.6, Math.abs(y(b.o) - y(b.c)));
            return (
              <g key={i} onClick={() => setSel(sel === i ? null : i)} className="cursor-pointer">
                <rect x={xi(i) - cw / 2} y={0} width={cw} height={H} fill="transparent" />
                <line x1={xi(i)} x2={xi(i)} y1={y(b.h)} y2={y(b.l)} stroke={col} strokeWidth={1.2} />
                <rect x={xi(i) - Math.min(cw * 0.36, 6)} y={top} width={Math.min(cw * 0.72, 12)} height={bh} rx={1} fill={col} />
                {sel === i && <rect x={xi(i) - cw / 2} y={PT - 6} width={cw} height={H - PT - PB + 12} rx={3} fill="currentColor" className="text-fg" opacity={0.1} />}
              </g>
            );
          })}

          {/* médias móveis fixas e controladas */}
          {anns.filter((a) => a.k === 'ma').map((a, i) => (
            <path key={`ma${i}`} d={path(maSeries(a as any), y)} fill="none" strokeWidth={1.8} stroke="currentColor"
              className={cn(tc((a as any).c ?? 'wn'), 'animate-in fade-in duration-300')} strokeLinecap="round" />
          ))}
          {ctrlMa && <path d={path(ctrlMa, y)} fill="none" strokeWidth={2} stroke="currentColor" className="text-warning-fg" strokeLinecap="round" />}

          {/* fibonacci */}
          {anns.filter((a) => a.k === 'fib').map((a, i) => {
            const f = a as Extract<Ann, { k: 'fib' }>;
            const lv = f.lv ?? [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
            const price = (L: number) => (f.ext ? f.a[1] + (f.b[1] - f.a[1]) * L : f.b[1] - (f.b[1] - f.a[1]) * L);
            const x0 = xi(Math.min(f.a[0], f.b[0]));
            return (
              <g key={`fib${i}`} className="text-warning-fg animate-in fade-in duration-300">
                {f.gold && (
                  <rect x={x0} y={Math.min(y(price(0.5)), y(price(0.618)))} width={W - PR - x0} height={Math.abs(y(price(0.618)) - y(price(0.5)))}
                    fill="currentColor" opacity={0.2} />
                )}
                {lv.map((L) => (
                  <g key={L}>
                    <line x1={x0} x2={W - PR} y1={y(price(L))} y2={y(price(L))} stroke="currentColor" strokeWidth={0.9} strokeDasharray="4 3" opacity={0.85} />
                    <text x={W - PR - 2} y={y(price(L)) - 2} textAnchor="end" fontSize={8} fill="currentColor" fontWeight={600}>{L}</text>
                  </g>
                ))}
              </g>
            );
          })}

          {/* linhas, níveis, setas, textos, pontos */}
          {anns.map((a, i) => {
            if (a.k === 'h') {
              return (
                <g key={i} className={cn(tc(a.c), 'animate-in fade-in duration-300')}>
                  <line x1={PL} x2={W - PR} y1={y(a.y)} y2={y(a.y)} stroke="currentColor" strokeWidth={1.4} strokeDasharray="5 3" />
                  {a.l && <text x={PL + 3} y={y(a.y) - 3} fontSize={8.5} fontWeight={700} fill="currentColor">{a.l}</text>}
                </g>
              );
            }
            if (a.k === 'ln') {
              const [x1, y1] = [xi(a.a[0]), y(a.a[1])], [x2, y2] = [xi(a.b[0]), y(a.b[1])];
              let ex = x2, ey = y2;
              if (a.ext && x2 !== x1) { const s = (y2 - y1) / (x2 - x1); ex = W - PR; ey = y1 + s * (ex - x1); }
              return (
                <g key={i} className={cn(tc(a.c), 'animate-in fade-in duration-300')}>
                  <line x1={x1} y1={y1} x2={ex} y2={ey} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
                  {a.l && <text x={x2 + 3} y={y2 + (y2 > y1 ? 11 : -4)} fontSize={8.5} fontWeight={700} fill="currentColor">{a.l}</text>}
                </g>
              );
            }
            if (a.k === 'ar') {
              const [x1, y1] = [xi(a.a[0]), y(a.a[1])], [x2, y2] = [xi(a.b[0]), y(a.b[1])];
              const ang = Math.atan2(y2 - y1, x2 - x1);
              const hx = (r: number) => `${x2 - 7 * Math.cos(ang - r)},${y2 - 7 * Math.sin(ang - r)}`;
              return (
                <g key={i} className={cn(tc(a.c), 'animate-in fade-in duration-300')}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                  <polygon points={`${x2},${y2} ${hx(0.45)} ${hx(-0.45)}`} fill="currentColor" />
                </g>
              );
            }
            if (a.k === 't') {
              return <text key={i} x={xi(a.at[0])} y={y(a.at[1])} fontSize={9} fontWeight={700} fill="currentColor" className={cn(tc(a.c), 'animate-in fade-in duration-300')}>{a.s}</text>;
            }
            if (a.k === 'pt') {
              return (
                <g key={i} className={cn(tc(a.c), 'animate-in zoom-in-50 duration-300')}>
                  <circle cx={xi(a.at[0])} cy={y(a.at[1])} r={4.2} fill="currentColor" />
                  <circle cx={xi(a.at[0])} cy={y(a.at[1])} r={7.5} fill="none" stroke="currentColor" strokeOpacity={0.4} />
                  {a.l && <text x={xi(a.at[0]) + 9} y={y(a.at[1]) + 3} fontSize={8.5} fontWeight={700} fill="currentColor">{a.l}</text>}
                </g>
              );
            }
            if (a.k === 'vl') {
              return (
                <g key={i} className="text-fg-muted animate-in fade-in duration-300">
                  <line x1={xi(a.i)} x2={xi(a.i)} y1={PT - 4} y2={H - PB + 4} stroke="currentColor" strokeDasharray="3 3" />
                  {a.l && <text x={xi(a.i) + 3} y={PT + 4} fontSize={8.5} fontWeight={700} fill="currentColor">{a.l}</text>}
                </g>
              );
            }
            return null;
          })}

          {/* painel do indicador */}
          {hasPanel && (
            <g>
              <rect x={PL} y={panelTop} width={W - PL - PR} height={PANEL} rx={4} className="text-tint" fill="currentColor" opacity={0.06} />
              {panelKind === 'rsi' && (() => {
                const r = rsiCalc(closes);
                return (
                  <g className="animate-in fade-in duration-300">
                    <rect x={PL} y={py(100, 0, 100)} width={W - PL - PR} height={py(70, 0, 100) - py(100, 0, 100)} fill={DN} opacity={0.1} />
                    <rect x={PL} y={py(30, 0, 100)} width={W - PL - PR} height={py(0, 0, 100) - py(30, 0, 100)} fill={UP} opacity={0.1} />
                    <g className="text-fg-subtle"><line x1={PL} x2={W - PR} y1={py(70, 0, 100)} y2={py(70, 0, 100)} stroke="currentColor" strokeDasharray="3 3" /><line x1={PL} x2={W - PR} y1={py(30, 0, 100)} y2={py(30, 0, 100)} stroke="currentColor" strokeDasharray="3 3" /></g>
                    <path d={path(r, (v) => py(v, 0, 100))} fill="none" stroke="currentColor" className="text-accent-fg" strokeWidth={1.6} />
                    <text x={PL + 3} y={panelTop + 9} fontSize={8} fontWeight={700} className="fill-current text-fg-muted">RSI · 70 sobrecomprado · 30 sobrevendido</text>
                  </g>
                );
              })()}
              {panelKind === 'stoch' && (() => {
                const s = stochCalc(bars);
                return (
                  <g className="animate-in fade-in duration-300">
                    <rect x={PL} y={py(100, 0, 100)} width={W - PL - PR} height={py(80, 0, 100) - py(100, 0, 100)} fill={DN} opacity={0.1} />
                    <rect x={PL} y={py(20, 0, 100)} width={W - PL - PR} height={py(0, 0, 100) - py(20, 0, 100)} fill={UP} opacity={0.1} />
                    <path d={path(s.k, (v) => py(v, 0, 100))} fill="none" stroke="currentColor" className="text-accent-fg" strokeWidth={1.5} />
                    <path d={path(s.d, (v) => py(v, 0, 100))} fill="none" stroke="currentColor" className="text-warning-fg" strokeWidth={1.3} strokeDasharray="3 2" />
                    <text x={PL + 3} y={panelTop + 9} fontSize={8} fontWeight={700} className="fill-current text-fg-muted">Estocástico · 80 / 20</text>
                  </g>
                );
              })()}
              {panelKind === 'adx' && (() => {
                const a = adxCalc(bars);
                return (
                  <g className="animate-in fade-in duration-300">
                    <g className="text-fg-subtle"><line x1={PL} x2={W - PR} y1={py(25, 0, 60)} y2={py(25, 0, 60)} stroke="currentColor" strokeDasharray="3 3" /></g>
                    <path d={path(a, (v) => py(Math.min(v, 60), 0, 60))} fill="none" stroke="currentColor" className="text-accent-fg" strokeWidth={1.7} />
                    <text x={PL + 3} y={panelTop + 9} fontSize={8} fontWeight={700} className="fill-current text-fg-muted">ADX · acima de 25 = tendência forte</text>
                  </g>
                );
              })()}
              {panelKind === 'macd' && (() => {
                const e12 = ema(closes, 12), e26 = ema(closes, 26);
                const line = closes.map((_, i) => (e12[i] !== null && e26[i] !== null ? (e12[i] as number) - (e26[i] as number) : null));
                const valid = line.filter((v) => v !== null) as number[];
                const sig = (() => {
                  const k = 2 / 10; let prev: number | null = null;
                  return line.map((v) => { if (v === null) return null; prev = prev === null ? v : v * k + prev * (1 - k); return prev; });
                })();
                const m = Math.max(0.0001, ...valid.map(Math.abs));
                const mp = (v: number) => py(v, -m, m);
                return (
                  <g className="animate-in fade-in duration-300">
                    {line.map((v, i) => (v === null ? null : (
                      <rect key={i} x={xi(i) - cw * 0.3} width={cw * 0.6} y={Math.min(mp(v - (sig[i] as number)), mp(0))} height={Math.abs(mp(v - (sig[i] as number)) - mp(0)) || 0.5}
                        fill={v - (sig[i] as number) >= 0 ? UP : DN} opacity={0.5} />
                    )))}
                    <path d={path(line, mp)} fill="none" stroke="currentColor" className="text-accent-fg" strokeWidth={1.5} />
                    <path d={path(sig, mp)} fill="none" stroke="currentColor" className="text-warning-fg" strokeWidth={1.3} />
                    <text x={PL + 3} y={panelTop + 9} fontSize={8} fontWeight={700} className="fill-current text-fg-muted">MACD · linha, sinal e histograma</text>
                  </g>
                );
              })()}
            </g>
          )}

          {/* volume */}
          {hasVol && (() => {
            const vol = scene.vol!.slice(0, bars.length);
            const vmax = Math.max(...vol);
            return (
              <g>
                {vol.map((v, i) => (
                  <rect key={i} x={xi(i) - cw * 0.34} width={cw * 0.68} y={volTop + VOLH - (v / vmax) * VOLH} height={(v / vmax) * VOLH}
                    fill={bars[i].c >= bars[i].o ? UP : DN} opacity={0.55} />
                ))}
                <text x={PL + 2} y={volTop + 8} fontSize={8} fontWeight={700} className="fill-current text-fg-muted">Volume</text>
              </g>
            );
          })()}
        </svg>

        {sel_ && (
          <p className="mt-1 text-center font-mono text-[11px] text-fg-muted tabular-nums">
            A {sel_.o.toFixed(1)} · Máx {sel_.h.toFixed(1)} · Mín {sel_.l.toFixed(1)} · F {sel_.c.toFixed(1)}{' '}
            <span className={sel_.c >= sel_.o ? 'text-emerald-500' : 'text-rose-500'}>{sel_.c >= sel_.o ? '▲ alta' : '▼ baixa'}</span>
          </p>
        )}
        {!sel_ && <p className="mt-1 text-center text-[10px] text-fg-subtle">Toque em um candle para ver abertura, máxima, mínima e fechamento</p>}
      </div>

      {/* controles extras */}
      {scene.ctrl === 'ma' && (
        <div className="mt-2 flex flex-wrap items-center gap-3 rounded-xl border border-tint/8 bg-tint/3 px-3 py-2">
          <div className="flex gap-1">
            {(['sma', 'ema'] as const).map((k) => (
              <button key={k} type="button" onClick={() => setMaKind(k)}
                className={cn('rounded-lg border px-2.5 py-1 text-xs font-semibold', maKind === k ? 'border-accent/40 bg-accent/10 text-accent-fg' : 'border-tint/10 text-fg-muted')}>
                {k.toUpperCase()}
              </button>
            ))}
          </div>
          <label className="flex min-w-[140px] flex-1 items-center gap-2 text-xs text-fg-muted">
            Período <span className="w-5 font-mono font-bold text-fg tabular-nums">{ctrl}</span>
            <input type="range" min={2} max={Math.max(10, Math.floor(bars.length / 2))} value={ctrl} onChange={(e) => setCtrl(+e.target.value)} className="flex-1 accent-[var(--color-accent)]" />
          </label>
        </div>
      )}
      {scene.ctrl === 'bb' && (
        <label className="mt-2 flex items-center gap-2 rounded-xl border border-tint/8 bg-tint/3 px-3 py-2 text-xs text-fg-muted">
          Desvios padrão <span className="w-6 font-mono font-bold text-fg tabular-nums">{ctrl.toFixed(1)}</span>
          <input type="range" min={1} max={3} step={0.5} value={ctrl} onChange={(e) => setCtrl(+e.target.value)} className="flex-1 accent-[var(--color-accent)]" />
        </label>
      )}

      {/* passos */}
      <div className="mt-2 rounded-xl border border-accent/20 bg-accent/5 px-3 py-2.5">
        <p className="min-h-[2.5rem] text-sm leading-snug text-fg">{steps[si].text}</p>
        {steps.length > 1 && (
          <div className="mt-2 flex items-center justify-between">
            <button type="button" onClick={() => setSi(Math.max(0, si - 1))} disabled={si === 0} aria-label="Passo anterior"
              className="rounded-lg border border-tint/10 p-1.5 text-fg-muted disabled:opacity-30"><ChevronLeft size={16} /></button>
            <div className="flex items-center gap-1.5">
              {steps.map((_, i) => (
                <button key={i} type="button" onClick={() => setSi(i)} aria-label={`Passo ${i + 1}`}
                  className={cn('h-2 rounded-full transition-all', i === si ? 'w-5 bg-accent' : 'w-2 bg-tint/20 hover:bg-tint/30')} />
              ))}
            </div>
            <button type="button" onClick={() => setSi(Math.min(steps.length - 1, si + 1))} disabled={si === steps.length - 1} aria-label="Próximo passo"
              className="rounded-lg border border-tint/10 p-1.5 text-fg-muted disabled:opacity-30"><ChevronRight size={16} /></button>
          </div>
        )}
      </div>
    </div>
  );
};
