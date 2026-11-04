// ============================================================
// Diário › visão de calendário: datas, agrupamento por dia e relatório.
//
// Regra de data: o resultado de uma operação pertence ao dia em que ela foi
// FECHADA; operação em aberto aparece no dia em que foi aberta, sem resultado.
// Todas as datas seguem o fuso do navegador (o dia do trader).
// ============================================================

import type { TradeEntry } from '../hooks/useTradeJournal';

export type CalendarMode = 'month' | 'week' | 'day';

// --- Datas (sempre locais) ---

export const dayKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const addDays = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const addMonths = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth() + n, 1);

// Semana de domingo a sábado (calendário usado no Brasil).
export const startOfWeek = (d: Date): Date => addDays(startOfDay(d), -d.getDay());

// Dia em que a operação conta no calendário.
export const entryDate = (e: TradeEntry): Date => new Date(e.closed_at ?? e.opened_at);

// 42 dias (6 semanas) que cobrem o mês, começando no domingo.
export function monthGrid(cursor: Date): Date[] {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

// Intervalo [from, to) que precisa ser buscado para a visão atual.
export function fetchRange(mode: CalendarMode, cursor: Date): { from: Date; to: Date } {
  if (mode === 'month') {
    const grid = monthGrid(cursor);
    return { from: grid[0], to: addDays(grid[41], 1) };
  }
  if (mode === 'week') {
    const start = startOfWeek(cursor);
    return { from: start, to: addDays(start, 7) };
  }
  const day = startOfDay(cursor);
  return { from: day, to: addDays(day, 1) };
}

// Intervalo [from, to) do período exibido no relatório (o mês só vale pelos dias do próprio mês).
export function reportRange(mode: CalendarMode, cursor: Date): { from: Date; to: Date } {
  if (mode === 'month') {
    return { from: new Date(cursor.getFullYear(), cursor.getMonth(), 1), to: new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1) };
  }
  return fetchRange(mode, cursor);
}

// --- Agrupamento por dia ---

export interface DayStats {
  key: string;
  entries: TradeEntry[];
  /** Soma dos resultados das operações fechadas no dia. */
  net: number;
  /** Operações fechadas com resultado informado (entram no win rate). */
  decided: number;
  wins: number;
  losses: number;
  open: number;
  /** Resultado lançado direto no dia (já somado em `net`); null se não houver. */
  manual: number | null;
  /** O dia tem resultado: operações fechadas com valor ou resultado lançado no dia. */
  hasResult: boolean;
}

const emptyDay = (key: string): DayStats => ({
  key, entries: [], net: 0, decided: 0, wins: 0, losses: 0, open: 0, manual: null, hasResult: false,
});

/** Resultados lançados por dia ('YYYY-MM-DD' → valor). */
export type DayResults = Map<string, number>;

export function groupByDay(entries: TradeEntry[], dayResults?: DayResults): Map<string, DayStats> {
  const map = new Map<string, DayStats>();
  for (const e of entries) {
    const key = dayKey(entryDate(e));
    const day = map.get(key) ?? emptyDay(key);
    day.entries.push(e);
    if (!e.closed_at) {
      day.open += 1;
    } else if (e.result_amount !== null) {
      const r = Number(e.result_amount);
      day.net += r;
      day.decided += 1;
      if (r > 0) day.wins += 1;
      else if (r < 0) day.losses += 1;
    }
    day.hasResult = day.decided > 0;
    map.set(key, day);
  }
  // Resultado lançado direto no dia soma-se ao das operações.
  if (dayResults) {
    for (const [key, amount] of dayResults) {
      const day = map.get(key) ?? emptyDay(key);
      day.manual = amount;
      day.net += amount;
      day.hasResult = true;
      map.set(key, day);
    }
  }
  // Dentro do dia, a mais recente primeiro.
  for (const day of map.values()) {
    day.entries.sort((a, b) => entryDate(b).getTime() - entryDate(a).getTime());
  }
  return map;
}

// --- Relatório do período ---

export interface AssetLine { asset: string; trades: number; net: number; winRate: number }
export interface TagLine { tag: string; count: number; net: number }

export interface Report {
  trades: number;
  decided: number;
  open: number;
  wins: number;
  losses: number;
  net: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  /** Ganho médio ÷ perda média (null sem perdas ou sem ganhos). */
  payoff: number | null;
  /** Soma dos ganhos ÷ soma das perdas (null sem perdas). */
  profitFactor: number | null;
  tradedDays: number;
  bestDay: { key: string; net: number } | null;
  worstDay: { key: string; net: number } | null;
  bestTrade: TradeEntry | null;
  worstTrade: TradeEntry | null;
  byAsset: AssetLine[];
  tags: TagLine[];
}

export function buildReport(entries: TradeEntry[], dayResults?: DayResults): Report {
  const days = groupByDay(entries, dayResults);
  const closed = entries.filter((e) => e.closed_at && e.result_amount !== null);
  const results = closed.map((e) => Number(e.result_amount));
  const winsArr = results.filter((r) => r > 0);
  const lossArr = results.filter((r) => r < 0);
  const grossWin = winsArr.reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(lossArr.reduce((a, b) => a + b, 0));
  const avgWin = winsArr.length ? grossWin / winsArr.length : 0;
  const avgLoss = lossArr.length ? grossLoss / lossArr.length : 0;

  const decidedDays = [...days.values()].filter((d) => d.hasResult);
  const bestDay = decidedDays.length ? decidedDays.reduce((a, b) => (b.net > a.net ? b : a)) : null;
  const worstDay = decidedDays.length ? decidedDays.reduce((a, b) => (b.net < a.net ? b : a)) : null;

  const byAssetMap = new Map<string, { trades: number; net: number; wins: number; decided: number }>();
  for (const e of entries) {
    const line = byAssetMap.get(e.asset) ?? { trades: 0, net: 0, wins: 0, decided: 0 };
    line.trades += 1;
    if (e.closed_at && e.result_amount !== null) {
      const r = Number(e.result_amount);
      line.net += r;
      line.decided += 1;
      if (r > 0) line.wins += 1;
    }
    byAssetMap.set(e.asset, line);
  }

  const tagMap = new Map<string, TagLine>();
  for (const e of entries) {
    const r = e.closed_at && e.result_amount !== null ? Number(e.result_amount) : 0;
    for (const tag of e.emotional_tags ?? []) {
      const line = tagMap.get(tag) ?? { tag, count: 0, net: 0 };
      line.count += 1;
      line.net += r;
      tagMap.set(tag, line);
    }
  }

  const byResult = (a: TradeEntry, b: TradeEntry) => Number(b.result_amount) - Number(a.result_amount);
  const sorted = [...closed].sort(byResult);

  return {
    trades: entries.length,
    decided: closed.length,
    open: entries.filter((e) => !e.closed_at).length,
    wins: winsArr.length,
    losses: lossArr.length,
    net: [...days.values()].reduce((a, d) => a + d.net, 0),
    winRate: closed.length ? winsArr.length / closed.length : 0,
    avgWin,
    avgLoss,
    payoff: avgLoss > 0 && avgWin > 0 ? avgWin / avgLoss : null,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : null,
    tradedDays: days.size,
    bestDay: bestDay ? { key: bestDay.key, net: bestDay.net } : null,
    worstDay: worstDay ? { key: worstDay.key, net: worstDay.net } : null,
    bestTrade: sorted.length && Number(sorted[0].result_amount) > 0 ? sorted[0] : null,
    worstTrade: sorted.length && Number(sorted[sorted.length - 1].result_amount) < 0 ? sorted[sorted.length - 1] : null,
    byAsset: [...byAssetMap.entries()]
      .map(([asset, l]) => ({ asset, trades: l.trades, net: l.net, winRate: l.decided ? l.wins / l.decided : 0 }))
      .sort((a, b) => b.net - a.net),
    tags: [...tagMap.values()].sort((a, b) => b.count - a.count).slice(0, 8),
  };
}

// --- Formatação ---

// Moeda de exibição do Diário. Os valores gravados são números simples (o trader lança no que opera): trocar entre
// real e dólar muda só o símbolo, não converte nada. Fica num pequeno "store" para toda a tela reagir à troca.
export type JournalCurrency = 'BRL' | 'USD';
const CURRENCY_KEY = 'journal_currency';
let currentCurrency: JournalCurrency = (() => {
  try { return localStorage.getItem(CURRENCY_KEY) === 'USD' ? 'USD' : 'BRL'; } catch { return 'BRL'; }
})();
const currencyListeners = new Set<() => void>();

export const getJournalCurrency = (): JournalCurrency => currentCurrency;
export function setJournalCurrency(c: JournalCurrency) {
  if (c === currentCurrency) return;
  currentCurrency = c;
  try { localStorage.setItem(CURRENCY_KEY, c); } catch { /* storage indisponível */ }
  currencyListeners.forEach((l) => l());
}
export function subscribeJournalCurrency(l: () => void): () => void {
  currencyListeners.add(l);
  return () => { currencyListeners.delete(l); };
}
export const currencySymbol = (c: JournalCurrency = currentCurrency): string => (c === 'USD' ? 'US$' : 'R$');

/** Valor absoluto na moeda atual, ex.: "R$ 5,38" ou "US$ 5,38". */
export const formatMoneyAbs = (value: number): string =>
  Math.abs(value).toLocaleString('pt-BR', { style: 'currency', currency: currentCurrency });

export function formatMoney(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString('pt-BR', { style: 'currency', currency: currentCurrency })}`;
}

export const formatPercent = (v: number): string => `${Math.round(v * 100)}%`;

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function periodLabel(mode: CalendarMode, cursor: Date): string {
  if (mode === 'month') return `${MONTHS[cursor.getMonth()]} de ${cursor.getFullYear()}`;
  if (mode === 'day') {
    return cursor.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  const start = startOfWeek(cursor);
  const end = addDays(start, 6);
  const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '').replace(' de ', ' ');
  return `${fmt(start)} – ${fmt(end)} de ${end.getFullYear()}`;
}

export function keyToLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

// Relatório em texto simples, para copiar e colar (WhatsApp, anotações, mentoria).
export function reportToText(r: Report, label: string): string {
  const lines = [
    `Relatório do Diário — ${label}`,
    '',
    `Resultado: ${formatMoney(r.net)}`,
    `Operações: ${r.trades} (${r.decided} fechadas com resultado, ${r.open} em aberto) em ${r.tradedDays} dia(s)`,
    `Win rate: ${formatPercent(r.winRate)} (${r.wins} ganhos / ${r.losses} perdas)`,
    `Ganho médio: ${formatMoney(r.avgWin)} · Perda média: ${formatMoney(-r.avgLoss)}`,
    `Payoff: ${r.payoff !== null ? r.payoff.toFixed(2) : '—'} · Fator de lucro: ${r.profitFactor !== null ? r.profitFactor.toFixed(2) : '—'}`,
  ];
  if (r.bestDay) lines.push(`Melhor dia: ${keyToLabel(r.bestDay.key)} (${formatMoney(r.bestDay.net)})`);
  if (r.worstDay) lines.push(`Pior dia: ${keyToLabel(r.worstDay.key)} (${formatMoney(r.worstDay.net)})`);
  if (r.byAsset.length) {
    lines.push('', 'Por ativo:');
    for (const a of r.byAsset) lines.push(`- ${a.asset}: ${a.trades} op., ${formatMoney(a.net)}, win rate ${formatPercent(a.winRate)}`);
  }
  if (r.tags.length) {
    lines.push('', 'Estado emocional:');
    for (const t of r.tags) lines.push(`- ${t.tag}: ${t.count}x, ${formatMoney(t.net)}`);
  }
  return lines.join('\n');
}

// Soma do resultado dos 7 dias a partir de `start` (semana domingo–sábado).
export function weekNet(days: Map<string, DayStats>, start: Date): { net: number; hasResult: boolean } {
  let net = 0;
  let hasResult = false;
  for (let i = 0; i < 7; i++) {
    const d = days.get(dayKey(addDays(start, i)));
    if (d?.hasResult) { net += d.net; hasResult = true; }
  }
  return { net, hasResult };
}

// Resultado líquido por dia ('YYYY-MM-DD' → valor) para os gráficos de evolução.
export function dailyNet(
  trades: Pick<TradeEntry, 'closed_at' | 'opened_at' | 'result_amount'>[],
  dayResults: DayResults,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of trades) {
    if (!t.closed_at || t.result_amount === null) continue;
    const key = dayKey(new Date(t.closed_at));
    map.set(key, (map.get(key) ?? 0) + Number(t.result_amount));
  }
  for (const [key, amount] of dayResults) map.set(key, (map.get(key) ?? 0) + amount);
  return map;
}

export const keyToDate = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

// Busca os resultados lançados no dia entre [from, to).
export async function fetchDayResults(supabaseClient: { from: (t: string) => any }, userId: string, from?: Date, to?: Date): Promise<DayResults> {
  let q = supabaseClient.from('journal_day_results').select('day, amount').eq('user_id', userId);
  if (from) q = q.gte('day', dayKey(from));
  if (to) q = q.lt('day', dayKey(to));
  const { data, error } = await q.limit(5000);
  if (error) throw error;
  const map: DayResults = new Map();
  for (const r of (data ?? []) as { day: string; amount: number | string }[]) map.set(r.day, Number(r.amount));
  return map;
}
