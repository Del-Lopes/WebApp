import { Ann, Bar, Pt, Scene, Step, Tone, cs, sma } from './scene';
export { cs, cd } from './scene';
import type { CompareSide, ForkOpt, Region, RevealItem } from './widgets';

// ── Ilustração por aula: o que o registro guarda ─────────────────────────
export type Illu =
  | { t: 'scene'; scene: Scene }
  | { t: 'candle'; start?: string; presets?: string[]; hint?: string }
  | { t: 'tf'; tfs?: string[]; init?: string; dual?: [string, string]; desc?: Record<string, string>; foot?: string; count?: number }
  | { t: 'reveal'; items: RevealItem[]; lead?: string; mode?: 'grid' | 'flow' | 'check' }
  | { t: 'fork'; q: string; opts: ForkOpt[]; takeaway?: string }
  | { t: 'compare'; a: CompareSide; b: CompareSide; foot?: string }
  | { t: 'map'; regions: Region[]; title?: string }
  | { t: 'calc'; k: 'spread' | 'commission' | 'lot' | 'pip' | 'lev' | 'margin' | 'risk' | 'size' | 'sl' | 'tp' | 'rr' | 'dd' | 'mart' | 'hours' | 'kz' | 'slip' | 'overfit' | 'balance' | 'fibseq' };

// ── Construtores de anotação ─────────────────────────────────────────────
export const H = (y: number, l?: string, c?: Tone): Ann => ({ k: 'h', y, l, c });
export const Z = (y1: number, y2: number, l?: string, c?: Tone): Ann => ({ k: 'z', y: [y1, y2], l, c });
export const BOX = (x1: number, x2: number, y1: number, y2: number, l?: string, c?: Tone): Ann => ({ k: 'b', x: [x1, x2], y: [y1, y2], l, c });
export const LN = (a: Pt, b: Pt, l?: string, c?: Tone, ext = false): Ann => ({ k: 'ln', a, b, l, c, ext });
export const T = (i: number, y: number, s: string, c?: Tone): Ann => ({ k: 't', at: [i, y], s, c });
export const AR = (a: Pt, b: Pt, c?: Tone): Ann => ({ k: 'ar', a, b, c });
export const PT = (i: number, y: number, l?: string, c?: Tone): Ann => ({ k: 'pt', at: [i, y], l, c });
export const MA = (n: number, e = false, c: Tone = 'wn'): Ann => ({ k: 'ma', n, e, c });
export const BB = (n?: number, d?: number): Ann => ({ k: 'bb', n, d });
export const FIB = (a: Pt, b: Pt, o: { lv?: number[]; ext?: boolean; gold?: boolean } = {}): Ann => ({ k: 'fib', a, b, ...o });
export const VL = (i: number, l?: string): Ann => ({ k: 'vl', i, l });
export const HL = (i: number[], c?: Tone): Ann => ({ k: 'hl', i, c });
export const IND = (k: 'rsi' | 'macd' | 'stoch' | 'adx'): Ann => ({ k });

export const st = (text: string, ...add: Ann[]): Step => ({ text, add });
export const S = (bars: Bar[], steps: Step[], o: Partial<Scene> = {}): Illu => ({ t: 'scene', scene: { bars, steps, ...o } });

const rnd = (s: number) => { const x = Math.sin(s * 91.3458 + 17.17) * 43758.5453; return x - Math.floor(x); };

/** Candles que passam por pivôs [índice, preço] (o preço é o fechamento do candle do pivô). */
export function zz(pivots: number[][], noise = 1, wk = 1, seed = 1): Bar[] {
  const wick = (i: number, k: number, m: number) => (0.5 + rnd(i * 2 + seed * 7 + k) * 1.5) * wk * m;
  const items: [number, number, number][] = [[pivots[0][1], wick(0, 0, 1), wick(0, 1, 1)]];
  const last = pivots[pivots.length - 1][0];
  for (let i = 1; i <= last; i++) {
    const idx = pivots.findIndex((p) => p[0] >= i);
    const [i1, p1] = pivots[idx - 1] ?? pivots[0];
    const [i2, p2, mult = 1] = pivots[idx];
    const base = p1 + ((p2 - p1) * (i - i1)) / (i2 - i1);
    const isPivot = pivots.some((p) => p[0] === i);
    const close = isPivot ? p2 : base + (rnd(seed * 31 + i * 1.7) - 0.5) * 2 * noise * mult;
    items.push([close, wick(i, 0, mult), wick(i, 1, mult)]);
  }
  return cs(pivots[0][1] - 0.6, items); // o candle de índice i fecha em items[i]
}

/** Pontos de cruzamento entre duas médias (SMA) como anotações. */
export function crossPts(bars: Bar[], fast: number, slow: number, labels?: [string, string]): Ann[] {
  const c = bars.map((b) => b.c), f = sma(c, fast), s = sma(c, slow), out: Ann[] = [];
  for (let i = 1; i < c.length; i++) {
    if (f[i] === null || s[i] === null || f[i - 1] === null || s[i - 1] === null) continue;
    const prev = (f[i - 1] as number) - (s[i - 1] as number), cur = (f[i] as number) - (s[i] as number);
    if (prev <= 0 && cur > 0) out.push(PT(i, f[i] as number, labels?.[0], 'up'));
    if (prev >= 0 && cur < 0) out.push(PT(i, f[i] as number, labels?.[1], 'dn'));
  }
  return out;
}

/** Candles em que a mínima toca a média (tolerância relativa) e o candle fecha acima dela: "quicadas" na média. */
export function bounceIdx(bars: Bar[], n: number, tol = 0.012): number[] {
  const m = sma(bars.map((b) => b.c), n), out: number[] = [];
  bars.forEach((b, i) => { const v = m[i]; if (v !== null && b.l <= v * (1 + tol) && b.c > v && (out.length === 0 || i - out[out.length - 1] > 3)) out.push(i); });
  return out;
}

export const concat = (...parts: Bar[][]): Bar[] => parts.flat();
export type { Bar, Pt, Scene };
