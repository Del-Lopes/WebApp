// ============================================================
// Trilha Gain — Problemas diários: gerador de situações de mercado.
//
// Cada problema é gerado a partir de uma SEED (mulberry32), então o mesmo
// número reproduz o mesmo gráfico. A aleatoriedade vem de: tamanho e duração
// de cada perna do padrão, volatilidade, ruído dos candles, tolerância entre
// fundos/topos, número de toques, posição do final do gráfico e espelhamento
// (compra ↔ venda). Os extremos usados para stop/alvo são medidos nos candles
// reais gerados, nunca nos pontos "ideais" — por isso nenhum gráfico é igual.
//
// Preços são adimensionais (ATR ≈ 1); o gráfico se auto-ajusta ao domínio.
// ============================================================

export interface OHLC { o: number; h: number; l: number; c: number }
export type Side = 'buy' | 'sell';
export type ProblemKind = 'double_bottom' | 'support_pivot' | 'breakout';

export interface StopOption { price: number; label: string; why: string; correct: boolean }
export interface ChartLevel { price: number; label: string; tone: 'neutral' | 'good' | 'bad' }
export interface ChartMark { index: number; label: string }

export interface DailyProblem {
  seed: number;
  kind: ProblemKind;
  level: 1 | 2 | 3;
  side: Side;
  title: string;          // nome da formação (revelado só após responder)
  candles: OHLC[];        // o que o usuário vê
  future: OHLC[];         // revelado após a resposta
  entry: number;
  target: number;
  stopOptions: StopOption[]; // já embaralhadas
  levels: ChartLevel[];   // linhas reveladas (ex.: linha de pescoço)
  marks: ChartMark[];     // marcadores reveladas (índices em candles)
  explanation: string;
  wrongSideExplanation: string;
}

// --- PRNG ---

export function newSeed(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0];
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Rng {
  next: () => number;
  between: (a: number, b: number) => number;
  int: (a: number, b: number) => number; // inclusivo
  chance: (p: number) => boolean;
  gauss: () => number;
}

function makeRng(seed: number): Rng {
  const next = mulberry32(seed);
  return {
    next,
    between: (a, b) => a + (b - a) * next(),
    int: (a, b) => Math.floor(a + (b - a + 1) * next()),
    chance: (p) => next() < p,
    gauss: () => {
      const u = Math.max(next(), 1e-9), v = next();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
  };
}

// --- Construção de candles ---

// Caminha de `from` até `to` em n candles, com ruído, pavios variados e
// open = close anterior (série contínua). `vol` escala corpo e pavio.
function walk(rng: Rng, from: number, to: number, n: number, vol: number): OHLC[] {
  const out: OHLC[] = [];
  let prev = from;
  const curve = rng.between(0.75, 1.3); // <1 acelera no começo, >1 no fim
  for (let i = 0; i < n; i++) {
    const t = (i + 1) / n;
    const base = from + (to - from) * Math.pow(t, curve);
    const last = i === n - 1;
    const close = last ? to + rng.gauss() * 0.08 * vol : base + rng.gauss() * 0.5 * vol;
    const open = prev + rng.gauss() * 0.06 * vol;
    const top = Math.max(open, close), bot = Math.min(open, close);
    out.push({
      o: open,
      c: close,
      h: top + Math.abs(rng.gauss()) * 0.32 * vol + 0.04,
      l: bot - Math.abs(rng.gauss()) * 0.32 * vol - 0.04,
    });
    prev = close;
  }
  return out;
}

const minLow = (cs: OHLC[]) => Math.min(...cs.map((c) => c.l));
const maxHigh = (cs: OHLC[]) => Math.max(...cs.map((c) => c.h));
const argMinLow = (cs: OHLC[], from = 0, to = cs.length) => {
  let best = from;
  for (let i = from; i < to; i++) if (cs[i].l < cs[best].l) best = i;
  return best;
};

function clampFloor(cs: OHLC[], floor: number) {
  for (const c of cs) {
    c.o = Math.max(c.o, floor + 0.03);
    c.c = Math.max(c.c, floor + 0.03);
    c.l = Math.max(Math.min(c.l, Math.min(c.o, c.c) - 0.02), floor);
    c.h = Math.max(c.h, c.o, c.c);
  }
}
function clampCeil(cs: OHLC[], ceil: number) {
  for (const c of cs) {
    c.o = Math.min(c.o, ceil - 0.03);
    c.c = Math.min(c.c, ceil - 0.03);
    c.h = Math.min(Math.max(c.h, Math.max(c.o, c.c) + 0.02), ceil);
    c.l = Math.min(c.l, c.o, c.c);
  }
}

// Espelha preço (compra ↔ venda): p' = -p.
const mirrorC = (c: OHLC): OHLC => ({ o: -c.o, c: -c.c, h: -c.l, l: -c.h });

// Continuação do preço depois da resposta: (talvez) um recuo e depois a
// corrida até o alvo, sem nunca tocar o stop correto. Em orientação de COMPRA.
function buildFuture(
  rng: Rng, entry: number, pullback: number | null, target: number, safeFloor: number, vol: number,
): OHLC[] {
  const out: OHLC[] = [];
  let at = entry;
  if (pullback !== null) {
    const pb = walk(rng, at, pullback, rng.int(2, 4), vol * 0.9);
    out.push(...pb);
    at = pb[pb.length - 1].c;
  }
  out.push(...walk(rng, at, target, rng.int(5, 9), vol));
  clampFloor(out, safeFloor);
  return out;
}

// Gera as 4 opções de stop (compra): correta, curta demais, longe demais e do
// lado errado. Devolve na orientação de compra; o espelhamento ocorre depois.
function buildStops(rng: Rng, entry: number, stop: number, atr: number, tightWhy: string): StopOption[] {
  const R = entry - stop;
  return [
    {
      price: stop, correct: true, label: 'Abaixo da estrutura',
      why: 'Fica além do ponto que invalidaria a ideia: se o preço chegar aqui, a formação falhou.',
    },
    {
      price: entry - R * rng.between(0.32, 0.45), correct: false, label: 'Curto, dentro do ruído',
      why: tightWhy,
    },
    {
      price: stop - Math.max(R * rng.between(1.4, 2.0), 2.2 * atr), correct: false, label: 'Longe demais',
      why: 'Aceita um risco enorme para a mesma recompensa — a relação risco/retorno fica ruim.',
    },
    {
      price: entry + atr * rng.between(0.7, 1.1), correct: false, label: 'Acima da entrada',
      why: 'Numa compra o stop precisa ficar ABAIXO da entrada; acima dela é o lado errado do trade.',
    },
  ];
}

function shuffle<T>(rng: Rng, arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- Geradores de formação (todos em orientação de COMPRA) ---

interface Built {
  candles: OHLC[];
  stop: number;
  atr: number;
  vol: number;
  pullback: number | null;
  levels: ChartLevel[];
  marks: ChartMark[];
  title: string;
  tightWhy: string;
  explanation: string;
  level: 1 | 2 | 3;
}

function genDoubleBottom(rng: Rng): Built {
  const vol = rng.between(0.75, 1.5);
  const H = rng.between(5.5, 10);          // altura do padrão (linha de pescoço)
  const L = 0;
  const L2 = L + H * rng.between(-0.1, 0.2); // 2º fundo: um pouco abaixo ou acima do 1º
  const N = L + H;

  const cs: OHLC[] = [];
  const startPrice = L + H * rng.between(1.1, 1.7);
  cs.push(...walk(rng, startPrice, L, rng.int(6, 12), vol));
  const bottom1 = cs.length - 1;
  cs.push(...walk(rng, L, N, rng.int(4, 8), vol));
  if (rng.chance(0.45)) cs.push(...walk(rng, N, N - H * rng.between(0.05, 0.2), rng.int(2, 3), vol * 0.7));
  const necklineEnd = cs.length;
  cs.push(...walk(rng, cs[cs.length - 1].c, L2, rng.int(4, 8), vol));
  const bottom2 = cs.length - 1;
  const e = L2 + (N - L2) * rng.between(0.35, 0.62);
  cs.push(...walk(rng, L2, e, rng.int(3, 5), vol));

  const lowIdx1 = argMinLow(cs, Math.max(0, bottom1 - 2), bottom1 + 3);
  const lowIdx2 = argMinLow(cs, bottom2 - 2, bottom2 + 2);
  const struct = Math.min(cs[lowIdx1].l, cs[lowIdx2].l);
  const neck = maxHigh(cs.slice(bottom1, necklineEnd));

  return {
    candles: cs, vol, atr: 1,
    stop: struct - rng.between(0.25, 0.5),
    pullback: rng.chance(0.7) ? e - (e - struct) * rng.between(0.28, 0.5) : null,
    levels: [{ price: neck, label: 'Linha de pescoço', tone: 'neutral' }],
    marks: [{ index: lowIdx1, label: '1º fundo' }, { index: lowIdx2, label: '2º fundo' }],
    title: 'Fundo duplo',
    tightWhy: 'Um stop colado na entrada é varrido por qualquer recuo normal — você sai antes do movimento acontecer.',
    explanation:
      'Fundo duplo: o preço testou duas vezes a mesma região de mínimas e foi rejeitado nas duas. A leitura é de que a venda perdeu força e a compra assume. O stop vai logo abaixo do fundo mais baixo, o ponto que invalidaria o padrão.',
    level: 1,
  };
}

function genSupportPivot(rng: Rng): Built {
  const vol = rng.between(0.7, 1.4);
  const H = rng.between(4.5, 8.5);
  const Lv = 0;
  const floor = Lv - 0.3;
  const touches = rng.chance(0.5) ? 3 : 2;

  const cs: OHLC[] = [];
  cs.push(...walk(rng, Lv + H * rng.between(0.9, 1.5), Lv + rng.between(0.0, 0.25), rng.int(6, 10), vol));
  const touchIdx: number[] = [cs.length - 1];
  for (let t = 1; t < touches; t++) {
    const up = Lv + H * rng.between(0.45, 0.95);
    cs.push(...walk(rng, cs[cs.length - 1].c, up, rng.int(3, 6), vol));
    cs.push(...walk(rng, up, Lv + rng.between(0.0, 0.3), rng.int(3, 6), vol));
    touchIdx.push(cs.length - 1);
  }
  const up2 = Lv + H * rng.between(0.4, 0.85);
  cs.push(...walk(rng, cs[cs.length - 1].c, up2, rng.int(3, 5), vol));
  cs.push(...walk(rng, up2, Lv + rng.between(0.3, 0.6), rng.int(3, 5), vol));
  clampFloor(cs, floor);

  // candle de rejeição: pavio inferior longo, fecha de volta acima do suporte
  const prev = cs[cs.length - 1].c;
  const close = Lv + rng.between(0.9, 1.6);
  cs.push({
    o: prev, c: close, l: Lv - rng.between(0.05, 0.25), h: close + rng.between(0.05, 0.25),
  });
  touchIdx.push(cs.length - 1);

  const struct = minLow(cs);
  const e = close;
  return {
    candles: cs, vol, atr: 1,
    stop: struct - rng.between(0.25, 0.5),
    pullback: rng.chance(0.6) ? e - (e - struct) * rng.between(0.3, 0.5) : null,
    levels: [{ price: Lv, label: 'Suporte', tone: 'neutral' }],
    marks: touchIdx.map((index, i) => ({ index, label: `Toque ${i + 1}` })),
    title: 'Pivot de suporte',
    tightWhy: 'O preço costuma voltar a testar o suporte antes de subir; um stop curto morre nesse teste.',
    explanation:
      'Pivot de suporte: o preço respeitou a mesma região várias vezes e o último candle fechou de volta acima dela com pavio inferior longo — compradores defendendo o nível. O stop vai abaixo do suporte, onde a defesa deixa de existir.',
    level: 1,
  };
}

function genBreakout(rng: Rng): Built {
  const vol = rng.between(0.7, 1.3);
  const H = rng.between(4, 7);
  const Rl = 0, Rh = H;

  const cs: OHLC[] = [];
  cs.push(...walk(rng, Rl + H * rng.between(0.2, 0.8), Rl + H * rng.between(0.3, 0.7), rng.int(4, 6), vol));
  const swings = rng.int(3, 5);
  let goTop = rng.chance(0.5);
  for (let s = 0; s < swings; s++) {
    const tgt = goTop ? Rh - rng.between(0.05, 0.45) : Rl + rng.between(0.05, 0.45);
    cs.push(...walk(rng, cs[cs.length - 1].c, tgt, rng.int(3, 6), vol));
    goTop = !goTop;
  }
  // termina perto do topo para o rompimento fazer sentido
  cs.push(...walk(rng, cs[cs.length - 1].c, Rh - rng.between(0.1, 0.5), rng.int(2, 4), vol * 0.8));
  clampCeil(cs, Rh + 0.25);
  clampFloor(cs, Rl - 0.25);

  // candle de rompimento
  const prev = cs[cs.length - 1].c;
  const close = Rh + rng.between(0.8, 1.7);
  cs.push({ o: prev, c: close, l: prev - rng.between(0.05, 0.3), h: close + rng.between(0.05, 0.3) });
  // às vezes um candle de continuação pequeno depois
  let e = close;
  if (rng.chance(0.4)) {
    const c2 = close + rng.between(-0.2, 0.5);
    cs.push({ o: close, c: c2, l: Math.min(close, c2) - rng.between(0.05, 0.3), h: Math.max(close, c2) + rng.between(0.05, 0.3) });
    e = c2;
  }
  const swingHigh = maxHigh(cs.slice(0, cs.length - (e === close ? 1 : 2)));

  return {
    candles: cs, vol, atr: 1,
    stop: Rh - rng.between(0.55, 0.85),
    pullback: rng.chance(0.8) ? Rh + rng.between(0.0, 0.25) : null, // reteste da região rompida
    levels: [{ price: Math.max(Rh, swingHigh - 0.2), label: 'Resistência rompida', tone: 'neutral' }],
    marks: [{ index: cs.length - (e === close ? 1 : 2), label: 'Rompimento' }],
    title: 'Rompimento de resistência',
    tightWhy: 'Depois do rompimento o preço costuma voltar para testar a região rompida; um stop curto é varrido nesse reteste.',
    explanation:
      'Rompimento: o preço andou de lado batendo na mesma resistência e finalmente fechou acima dela. Quem estava vendendo ali é obrigado a sair, o que alimenta a alta. O stop vai logo abaixo da região rompida — se o preço voltar para dentro do lateral, o rompimento falhou.',
    level: 1,
  };
}

const GENERATORS: Record<ProblemKind, (rng: Rng) => Built> = {
  double_bottom: genDoubleBottom,
  support_pivot: genSupportPivot,
  breakout: genBreakout,
};

export const PROBLEM_KINDS = Object.keys(GENERATORS) as ProblemKind[];

const MIRROR_TITLE: Record<ProblemKind, string> = {
  double_bottom: 'Topo duplo',
  support_pivot: 'Pivot de resistência',
  breakout: 'Rompimento de suporte',
};

// Troca termos de compra pelos de venda na explicação espelhada.
function mirrorText(kind: ProblemKind, text: string): string {
  const map: Record<ProblemKind, string> = {
    double_bottom:
      'Topo duplo: o preço testou duas vezes a mesma região de máximas e foi rejeitado nas duas. A leitura é de que a compra perdeu força e a venda assume. O stop vai logo acima do topo mais alto, o ponto que invalidaria o padrão.',
    support_pivot:
      'Pivot de resistência: o preço respeitou a mesma região várias vezes e o último candle fechou de volta abaixo dela com pavio superior longo — vendedores defendendo o nível. O stop vai acima da resistência, onde a defesa deixa de existir.',
    breakout:
      'Rompimento de suporte: o preço andou de lado batendo no mesmo suporte e finalmente fechou abaixo dele. Quem estava comprando ali é obrigado a sair, o que alimenta a queda. O stop vai logo acima da região rompida — se o preço voltar para dentro do lateral, o rompimento falhou.',
  };
  return map[kind] ?? text;
}

const MIRROR_TIGHT_WHY = 'Um stop colado na entrada é varrido por qualquer repique normal — você sai antes do movimento acontecer.';

export function generateProblem(seed: number, avoid: ProblemKind[] = []): DailyProblem {
  const rng = makeRng(seed);
  // evita repetir as últimas formações (sorteio entre as que sobram)
  const pool = PROBLEM_KINDS.filter((k) => !avoid.includes(k));
  const kinds = pool.length > 0 ? pool : PROBLEM_KINDS;
  const kind = kinds[rng.int(0, kinds.length - 1)];
  const built = GENERATORS[kind](rng);

  const entry = built.candles[built.candles.length - 1].c;
  const R = entry - built.stop;
  const target = entry + R * rng.between(1.7, 3);
  const future = buildFuture(rng, entry, built.pullback, target, built.stop + 0.12, built.vol);

  let stopOptions = buildStops(rng, entry, built.stop, built.atr, built.tightWhy);
  const mirror = rng.chance(0.5);

  let candles = built.candles;
  let levels = built.levels;
  let fut = future;
  let tgt = target;
  let ent = entry;
  let title = built.title;
  let explanation = built.explanation;

  if (mirror) {
    candles = candles.map(mirrorC);
    fut = fut.map(mirrorC);
    levels = levels.map((l) => ({ ...l, price: -l.price, label: l.label === 'Suporte' ? 'Resistência' : l.label === 'Resistência rompida' ? 'Suporte rompido' : l.label }));
    tgt = -target;
    ent = -entry;
    title = MIRROR_TITLE[kind];
    explanation = mirrorText(kind, built.explanation);
    stopOptions = stopOptions.map((o) => ({
      ...o,
      price: -o.price,
      why: o.label === 'Curto, dentro do ruído' ? MIRROR_TIGHT_WHY
        : o.label === 'Acima da entrada' ? 'Numa venda o stop precisa ficar ACIMA da entrada; abaixo dela é o lado errado do trade.'
        : o.label === 'Abaixo da estrutura' ? 'Fica além do ponto que invalidaria a ideia: se o preço chegar aqui, a formação falhou.'
        : o.why,
      label: o.label === 'Abaixo da estrutura' ? 'Acima da estrutura'
        : o.label === 'Acima da entrada' ? 'Abaixo da entrada'
        : o.label,
    }));
  }

  const marks = built.marks.map((m) => ({
    index: m.index,
    label: mirror ? m.label.replace('fundo', 'topo').replace('Fundo', 'Topo') : m.label,
  }));
  const side: Side = mirror ? 'sell' : 'buy';
  return {
    seed,
    kind,
    level: built.level,
    side,
    title,
    candles,
    future: fut,
    entry: ent,
    target: tgt,
    stopOptions: shuffle(rng, stopOptions),
    levels,
    marks,
    explanation,
    wrongSideExplanation:
      side === 'buy'
        ? 'Aqui a leitura é de COMPRA: a estrutura mostra defesa de compradores e o preço tende a seguir para cima.'
        : 'Aqui a leitura é de VENDA: a estrutura mostra defesa de vendedores e o preço tende a seguir para baixo.',
  };
}
