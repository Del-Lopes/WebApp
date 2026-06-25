// Gera uma sequência de candles OHLC contínua e determinística,
// em coordenadas de PIXEL dentro de uma faixa vertical [0, range].
// O close de um candle vira o open do próximo (gráfico realista).

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

// Gera `count` candles. `seed` garante variação por trecho.
// `range` é a altura útil em px (corpo+pavios cabem dentro).
export function makeCandleSeries(count: number, seed: number, range = 56): CandlePx[] {
  const margin = 8;                 // respiro p/ pavios não estourarem a faixa
  const lo = margin, hi = range - margin;
  const clamp = (v: number) => Math.max(lo, Math.min(hi, v));

  const out: CandlePx[] = [];
  // ponto de partida no meio da faixa
  let price = (lo + hi) / 2;

  for (let i = 0; i < count; i++) {
    const r = (k: number) => rand(seed * 31 + i * 7 + k);
    const open = price;
    // passo do fechamento: caminha para cima ou para baixo (em px; menor = preço maior)
    const dir = r(1) > 0.5 ? -1 : 1;          // -1 sobe (px menor), 1 desce
    const step = 6 + r(2) * 14;                // 6..20 px de corpo
    let close = clamp(open + dir * step);

    // se bateu na borda, inverte para manter o gráfico vivo
    if (close === lo || close === hi) close = clamp(open - dir * step);

    // pavios: estendem um pouco além do corpo
    const upWick = 2 + r(3) * 8;
    const dnWick = 2 + r(4) * 8;
    const high = clamp(Math.min(open, close) - upWick);
    const low = clamp(Math.max(open, close) + dnWick);

    out.push({ high, open, close, low });
    price = close; // próximo abre onde este fechou
  }
  return out;
}
