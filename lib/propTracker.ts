import { supabase } from './supabase';

// Gestão manual das contas de mesa proprietária (lançamentos do próprio usuário).

export interface TrackAccount {
  id: string;
  label: string | null;
  size: number;
  cost: number;
  split_pct: number;
  opened_on: string;   // YYYY-MM-DD
  closed_on: string | null;
}
export interface TrackResult { id: string; account_id: string; day: string; amount: number }
export interface TrackWithdrawal { id: string; day: string; amount: number; note: string | null }

export interface TrackerData {
  accounts: TrackAccount[];
  results: TrackResult[];
  withdrawals: TrackWithdrawal[];
}

// ── Datas (YYYY-MM-DD, sempre no fuso local) ──
export const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const todayISO = () => toISO(new Date());
export const addDaysISO = (iso: string, n: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  return toISO(new Date(y, m - 1, d + n));
};
export const daysBetween = (a: string, b: string) => {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
};
export const shortDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

async function userId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('not_authenticated');
  return data.user.id;
}

// O PostgREST devolve no máximo 1000 linhas por chamada: pagina até acabar.
async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const num = (v: unknown) => Number(v);

export async function fetchTracker(): Promise<TrackerData> {
  const uid = await userId();
  const [accounts, results, withdrawals] = await Promise.all([
    fetchAll<TrackAccount>((f, t) => supabase.from('prop_tracker_accounts')
      .select('id, label, size, cost, split_pct, opened_on, closed_on').eq('user_id', uid)
      .order('opened_on').order('created_at').range(f, t)),
    fetchAll<TrackResult>((f, t) => supabase.from('prop_tracker_results')
      .select('id, account_id, day, amount').eq('user_id', uid).order('day').range(f, t)),
    fetchAll<TrackWithdrawal>((f, t) => supabase.from('prop_tracker_withdrawals')
      .select('id, day, amount, note').eq('user_id', uid).order('day').range(f, t)),
  ]);
  return {
    accounts: accounts.map((a) => ({ ...a, size: num(a.size), cost: num(a.cost), split_pct: num(a.split_pct) })),
    results: results.map((r) => ({ ...r, amount: num(r.amount) })),
    withdrawals: withdrawals.map((w) => ({ ...w, amount: num(w.amount) })),
  };
}

export async function addAccounts(
  n: number, v: { size: number; cost: number; split_pct: number; opened_on: string },
): Promise<void> {
  const uid = await userId();
  const rows = Array.from({ length: n }, () => ({ user_id: uid, ...v }));
  const { error } = await supabase.from('prop_tracker_accounts').insert(rows);
  if (error) throw error;
}

export async function updateAccount(id: string, patch: Partial<Omit<TrackAccount, 'id'>>): Promise<void> {
  const uid = await userId();
  const { error } = await supabase.from('prop_tracker_accounts').update(patch).eq('id', id).eq('user_id', uid);
  if (error) throw error;
}

export async function deleteAccount(id: string): Promise<void> {
  const uid = await userId();
  const { error } = await supabase.from('prop_tracker_accounts').delete().eq('id', id).eq('user_id', uid);
  if (error) throw error;
}

// Um resultado por conta e dia: lançar de novo no mesmo dia substitui.
export async function upsertResults(rows: { account_id: string; day: string; amount: number }[]): Promise<void> {
  if (rows.length === 0) return;
  const uid = await userId();
  const { error } = await supabase.from('prop_tracker_results')
    .upsert(rows.map((r) => ({ ...r, user_id: uid })), { onConflict: 'account_id,day' });
  if (error) throw error;
}

export async function deleteResults(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const uid = await userId();
  const { error } = await supabase.from('prop_tracker_results').delete().in('id', ids).eq('user_id', uid);
  if (error) throw error;
}

export async function addWithdrawal(v: { day: string; amount: number; note?: string }): Promise<void> {
  const uid = await userId();
  const { error } = await supabase.from('prop_tracker_withdrawals').insert({ user_id: uid, ...v, note: v.note || null });
  if (error) throw error;
}

export async function deleteWithdrawal(id: string): Promise<void> {
  const uid = await userId();
  const { error } = await supabase.from('prop_tracker_withdrawals').delete().eq('id', id).eq('user_id', uid);
  if (error) throw error;
}

// ── Cálculo da linha do tempo ──
export interface TrackDay {
  date: string;
  accounts: number;     // contas ativas no dia
  dayNet: number;       // resultado do dia, já após split
  cumNet: number;       // acumulado após split
  invested: number;     // custo acumulado das contas abertas
  withdrawn: number;    // saques acumulados
}

export const accountIsActive = (a: TrackAccount, date: string) =>
  a.opened_on <= date && (!a.closed_on || a.closed_on > date);

export function buildTimeline(data: TrackerData, today: string, maxDays = 400): TrackDay[] {
  const dates = [
    ...data.accounts.map((a) => a.opened_on),
    ...data.results.map((r) => r.day),
    ...data.withdrawals.map((w) => w.day),
  ];
  if (dates.length === 0) return [];
  let start = dates.reduce((m, d) => (d < m ? d : m));
  const last = dates.reduce((m, d) => (d > m ? d : m), today);
  const end = last > today ? last : today;
  if (daysBetween(start, end) + 1 > maxDays) start = addDaysISO(end, -(maxDays - 1));

  const split = new Map(data.accounts.map((a) => [a.id, a.split_pct / 100]));
  const netByDay = new Map<string, number>();
  for (const r of data.results) netByDay.set(r.day, (netByDay.get(r.day) ?? 0) + r.amount * (split.get(r.account_id) ?? 1));
  const wdByDay = new Map<string, number>();
  for (const w of data.withdrawals) wdByDay.set(w.day, (wdByDay.get(w.day) ?? 0) + w.amount);
  const costByDay = new Map<string, number>();
  for (const a of data.accounts) costByDay.set(a.opened_on, (costByDay.get(a.opened_on) ?? 0) + a.cost);

  // Tudo que veio antes da janela entra como saldo inicial.
  let cumNet = 0, invested = 0, withdrawn = 0;
  for (const [d, v] of netByDay) if (d < start) cumNet += v;
  for (const [d, v] of costByDay) if (d < start) invested += v;
  for (const [d, v] of wdByDay) if (d < start) withdrawn += v;

  const out: TrackDay[] = [];
  for (let date = start; date <= end; date = addDaysISO(date, 1)) {
    const dayNet = netByDay.get(date) ?? 0;
    cumNet += dayNet;
    invested += costByDay.get(date) ?? 0;
    withdrawn += wdByDay.get(date) ?? 0;
    out.push({
      date,
      accounts: data.accounts.filter((a) => accountIsActive(a, date)).length,
      dayNet, cumNet, invested, withdrawn,
    });
  }
  return out;
}

// ── Objetivo / padrões do usuário (uma linha por usuário) ──
export interface TrackSettings {
  next_size: number;
  next_cost: number;
  split_pct: number;
  reinvest_pct: number;
  max_accounts: number;
}

export async function fetchSettings(): Promise<TrackSettings | null> {
  const uid = await userId();
  const { data, error } = await supabase.from('prop_tracker_settings')
    .select('next_size, next_cost, split_pct, reinvest_pct, max_accounts').eq('user_id', uid).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    next_size: Number(data.next_size), next_cost: Number(data.next_cost), split_pct: Number(data.split_pct),
    reinvest_pct: Number(data.reinvest_pct), max_accounts: Number(data.max_accounts),
  };
}

export async function saveSettings(s: TrackSettings): Promise<void> {
  const uid = await userId();
  const { error } = await supabase.from('prop_tracker_settings').upsert({ user_id: uid, ...s }, { onConflict: 'user_id' });
  if (error) throw error;
}
