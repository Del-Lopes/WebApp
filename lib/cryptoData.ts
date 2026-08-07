// ============================================================
// Crypto data — CoinGecko (free). Chamado direto do browser.
// Chave demo opcional (VITE_COINGECKO_KEY) com fallback keyless.
// Central de inteligência: trending, narrativas (setores) e maiores altas.
// ============================================================

const CG_KEY = import.meta.env.VITE_COINGECKO_KEY ?? '';
const CG_BASE = 'https://api.coingecko.com/api/v3';

// Anexa a chave demo se houver (header via query param, aceito pelo CoinGecko).
function withKey(url: URL): URL {
  if (CG_KEY) url.searchParams.set('x_cg_demo_api_key', CG_KEY);
  return url;
}

async function getJson(path: string, params: Record<string, string> = {}): Promise<any> {
  const url = new URL(CG_BASE + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(withKey(url).toString());
  if (res.status === 429) throw new Error('rate_limited');
  if (!res.ok) throw new Error(`coingecko_http_${res.status}`);
  return res.json();
}

// ─── Trending (mais buscadas em 24h) ─────────────────────────────────────────

export interface TrendingCoin {
  id: string;
  name: string;
  symbol: string;
  rank: number | null;
  thumb: string;
  price: number | null;
  change24h: number | null;
}

export async function fetchTrending(): Promise<TrendingCoin[]> {
  const json = await getJson('/search/trending');
  const coins = Array.isArray(json?.coins) ? json.coins : [];
  return coins.map((c: any): TrendingCoin => ({
    id: c.item?.id,
    name: c.item?.name,
    symbol: (c.item?.symbol ?? '').toUpperCase(),
    rank: c.item?.market_cap_rank ?? null,
    thumb: c.item?.thumb ?? c.item?.small ?? '',
    price: c.item?.data?.price ?? null,
    change24h: c.item?.data?.price_change_percentage_24h?.usd ?? null,
  }));
}

// ─── Narrativas / setores ────────────────────────────────────────────────────

export interface Narrative {
  id: string;
  name: string;
  marketCap: number;
  change24h: number;          // variação % do market cap do setor em 24h
  volume24h: number;
  topCoins: string[];         // urls de imagens das 3 maiores
}

export async function fetchNarratives(): Promise<Narrative[]> {
  const json = await getJson('/coins/categories', { order: 'market_cap_change_24h_desc' });
  const arr = Array.isArray(json) ? json : [];
  return arr
    .filter((c: any) => typeof c.market_cap_change_24h === 'number' && c.market_cap > 0)
    .map((c: any): Narrative => ({
      id: c.id,
      name: c.name,
      marketCap: c.market_cap ?? 0,
      change24h: c.market_cap_change_24h ?? 0,
      volume24h: c.volume_24h ?? 0,
      topCoins: Array.isArray(c.top_3_coins) ? c.top_3_coins : [],
    }));
}

// ─── Mercado (maiores altas + baixo valor de mercado) ────────────────────────

export interface MarketCoin {
  id: string;
  name: string;
  symbol: string;
  image: string;
  price: number;
  rank: number | null;
  marketCap: number;
  volume24h: number;
  change24h: number;
}

// Busca as top-250 por market cap (1 chamada) e devolve já mapeado.
// O front filtra/ordena localmente (baixo cap, maiores altas) sem gastar chamadas.
export async function fetchMarkets(): Promise<MarketCoin[]> {
  const json = await getJson('/coins/markets', {
    vs_currency: 'usd',
    order: 'market_cap_desc',
    per_page: '250',
    page: '1',
    price_change_percentage: '24h',
  });
  const arr = Array.isArray(json) ? json : [];
  return arr.map((c: any): MarketCoin => ({
    id: c.id,
    name: c.name,
    symbol: (c.symbol ?? '').toUpperCase(),
    image: c.image ?? '',
    price: c.current_price ?? 0,
    rank: c.market_cap_rank ?? null,
    marketCap: c.market_cap ?? 0,
    volume24h: c.total_volume ?? 0,
    change24h: c.price_change_percentage_24h ?? 0,
  }));
}

// Maiores altas em 24h, opcionalmente só "baixo cap" (fora do top N por market cap).
export function topGainers(coins: MarketCoin[], lowCapOnly: boolean, minRank = 50, limit = 30): MarketCoin[] {
  return coins
    .filter((c) => (lowCapOnly ? (c.rank ?? 0) > minRank : true))
    .filter((c) => c.volume24h > 0)
    .sort((a, b) => b.change24h - a.change24h)
    .slice(0, limit);
}

export const HAS_CRYPTO_SOURCE = true; // CoinGecko funciona keyless; a chave só melhora o limite.

// ─── Relatório de Narrativa por IA (pago em Coins) ───────────────────────────

import { supabase } from './supabase';

export interface CryptoReport {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  meta: { top_sectors?: { name: string; change24h: number }[]; trending?: string[] } | null;
  created_at: string;
}

// Custo do relatório (signal_config.crypto_report_cost).
export async function fetchReportCost(): Promise<number> {
  const { data, error } = await supabase
    .from('signal_config')
    .select('value')
    .eq('key', 'crypto_report_cost')
    .maybeSingle();
  if (error || !data) return 500;
  return (data as { value: number }).value;
}

// Relatórios do próprio usuário (mais recentes primeiro).
export async function fetchMyReports(limit = 20): Promise<CryptoReport[]> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return [];
  const { data, error } = await supabase
    .from('crypto_reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { console.error('[crypto] fetchMyReports', error); return []; }
  return (data ?? []) as CryptoReport[];
}

export interface ReportResult { new_balance: number; report: CryptoReport; }

// Solicita um novo relatório. A edge function cobra Coins, gera e grava.
// Lança Error('insufficient_coins') se o saldo não cobrir.
export async function requestNarrativeReport(): Promise<ReportResult> {
  const { data, error } = await supabase.functions.invoke('crypto-narrative', { body: {} });
  if (error) {
    let code = '';
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') code = (await ctx.json())?.error ?? '';
    } catch { /* ignore */ }
    throw new Error(code || error.message || 'report_failed');
  }
  return data as ReportResult;
}
