// ============================================================
// Mesas Proprietárias — catálogo (prop_firms) e simulador de alavancagem
// de contas da subseção Gestão.
// ============================================================

import { supabase } from './supabase';

export interface PropFirmPlan {
  size: number;   // tamanho da conta (ex.: 100000)
  price: number;  // valor pago pela avaliação
  currency: string;
}

export interface PropFirm {
  id: string;
  name: string;
  website: string | null;
  logo_url: string | null;
  description: string | null;
  markets: string[];
  platforms: string[];
  plans: PropFirmPlan[];
  evaluation_steps: number | null;
  profit_target_pct: number | null;
  daily_drawdown_pct: number | null;
  max_drawdown_pct: number | null;
  profit_split_pct: number | null;
  payout_frequency: string | null;
  max_accounts: number | null;
  rating: number | null;
  is_active: boolean;
  sort_order: number;
}

export type PropFirmInput = Omit<PropFirm, 'id'>;

const COLUMNS =
  'id, name, website, logo_url, description, markets, platforms, plans, evaluation_steps, profit_target_pct, daily_drawdown_pct, max_drawdown_pct, profit_split_pct, payout_frequency, max_accounts, rating, is_active, sort_order';

export async function fetchPropFirms(): Promise<PropFirm[]> {
  const { data, error } = await supabase
    .from('prop_firms')
    .select(COLUMNS)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PropFirm[];
}

export async function savePropFirm(input: PropFirmInput, adminId: string, id?: string): Promise<void> {
  const row = { ...input, updated_at: new Date().toISOString(), updated_by: adminId };
  const { error } = id
    ? await supabase.from('prop_firms').update(row).eq('id', id)
    : await supabase.from('prop_firms').insert(row);
  if (error) throw error;
}

export async function deletePropFirm(id: string): Promise<void> {
  const { error } = await supabase.from('prop_firms').delete().eq('id', id);
  if (error) throw error;
}

// Site da mesa: só https (evita javascript: e afins no href).
export function isSafeUrl(url: string | null): url is string {
  if (!url) return false;
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

export const formatMoney = (v: number, currency = 'USD', digits = 0) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency, maximumFractionDigits: digits, minimumFractionDigits: digits }).format(v);

export const formatSize = (v: number) =>
  v >= 1000 ? `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(v / 1000)}k` : String(v);

// ─── Simulador de alavancagem (Gestão) ─────────────────────────────────────
//
// Cada conta ativa gera `profitPerAccount` por dia (já líquido do split).
// A parte reinvestida do lucro enche o "loading" da próxima conta; quando o
// fundo cobre o custo, a conta é comprada e entra no copy no dia seguinte.

export interface SimAccount {
  id: string;
  size: number;
  cost: number;
  /** Dia em que entrou (0 = conta inicial). */
  day: number;
}

export interface SimParams {
  profitPerAccount: number; // resultado bruto por conta por dia
  splitPct: number;         // % do lucro que fica com o trader
  reinvestPct: number;      // % do lucro líquido que vai para novas contas
  nextSize: number;         // conta comprada automaticamente
  nextCost: number;
  maxAccounts: number;
  days: number;
}

export interface SimDay {
  day: number;
  accounts: number;
  dayProfit: number;   // líquido (após split) do dia
  totalProfit: number; // líquido acumulado
  fund: number;        // saldo acumulado para a próxima conta
  withdrawn: number;   // parte não reinvestida (saque)
  invested: number;    // total gasto em contas (iniciais + compradas)
  bought: number;      // contas compradas neste dia
}

export interface SimResult {
  timeline: SimDay[]; // índice 0 = situação inicial (dia 0)
  accounts: SimAccount[];
}

export function simulate(initial: SimAccount[], p: SimParams): SimResult {
  const accounts = initial.map((a) => ({ ...a, day: 0 }));
  const net = Math.max(0, p.profitPerAccount) * (Math.min(100, Math.max(0, p.splitPct)) / 100);
  const reinvest = Math.min(100, Math.max(0, p.reinvestPct)) / 100;
  const cap = Math.max(accounts.length, p.maxAccounts);

  let fund = 0;
  let withdrawn = 0;
  let totalProfit = 0;
  let invested = accounts.reduce((s, a) => s + a.cost, 0);

  const timeline: SimDay[] = [
    { day: 0, accounts: accounts.length, dayProfit: 0, totalProfit: 0, fund: 0, withdrawn: 0, invested, bought: 0 },
  ];

  for (let day = 1; day <= p.days; day++) {
    const dayProfit = accounts.length * net;
    totalProfit += dayProfit;
    fund += dayProfit * reinvest;
    withdrawn += dayProfit * (1 - reinvest);

    let bought = 0;
    while (p.nextCost > 0 && fund >= p.nextCost && accounts.length < cap) {
      fund -= p.nextCost;
      invested += p.nextCost;
      accounts.push({ id: `auto-${day}-${bought}`, size: p.nextSize, cost: p.nextCost, day });
      bought++;
    }
    // Teto atingido: o que sobraria para novas contas vira saque.
    if (accounts.length >= cap && fund > 0) {
      withdrawn += fund;
      fund = 0;
    }

    timeline.push({ day, accounts: accounts.length, dayProfit, totalProfit, fund, withdrawn, invested, bought });
  }

  return { timeline, accounts };
}
