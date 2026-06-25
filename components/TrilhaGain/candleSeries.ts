// Gera uma sequência de candles OHLC contínua e determinística,
// em coordenadas de PIXEL dentro de uma faixa vertical [0, range].
// O close de um candle vira o open do próximo (gráfico realista),
// e a série caminha de startLvl até endLvl ligando as duas aulas.

export interface CandlePx {
  high: number;
  open: number;
  close: number;
  low: number;
}

// Pseudo-aleatório determinístico (mesma seed → mesmo valor).
const rand = (seed: number): number => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x); // 0..1
};

// `count` candles, em faixa [margin, range-margin].
// startLvl/endLvl: níveis (px) onde a série começa e termina — conectam a
// posição vertical da aula de origem à da aula de destino.
export function makeCandleSeries(
  count: number,
  seed: number,
  range = 56,
  startLvl?: number,
  endLvl?: number,
): CandlePx[] {
  const margin = 6;
  const lo = margin, hi = range - margin;
  const clamp = (v: number) => Math.max(lo, Math.min(hi, v));

  const start = clamp(startLvl ?? (lo + hi) / 2);
  const end = clamp(endLvl ?? (lo + hi) / 2);

  const out: CandlePx[] = [];
  let price = start;

  for (let i = 0; i < count; i++) {
    const r = (k: number) => rand(seed * 31 + i * 7 + k);
    const open = price;

    // alvo interpolado para este candle (caminha do start ao end)
    const t = count > 1 ? (i + 1) / count : 1;
    const target = start + (end - start) * t;
    // fechamento puxa em direção ao alvo, com ruído para parecer natural
    const noise = (r(1) - 0.5) * 16;
    let close = clamp(target + noise);

    // garante um corpo mínimo visível
    if (Math.abs(close - open) < 3) close = clamp(open + (close >= open ? 3 : -3));

    // pavios estendem além do corpo
    const upWick = 2 + r(3) * 7;
    const dnWick = 2 + r(4) * 7;
    const high = clamp(Math.min(open, close) - upWick);
    const low = clamp(Math.max(open, close) + dnWick);

    out.push({ high, open, close, low });
    price = close; // próximo abre onde este fechou
  }
  return out;
}
