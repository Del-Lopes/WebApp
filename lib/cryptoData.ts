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

// Janela de análise usada nas abas de mercado.
// Atenção: 24h e 7d/30d vêm de fontes diferentes — ver fetchTrending/topMovers.
export type CryptoPeriod = '24h' | '7d' | '30d';

export const PERIOD_LABEL: Record<CryptoPeriod, string> = {
  '24h': '24 horas',
  '7d': '7 dias',
  '30d': '30 dias',
};

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

// Só existe em 24h: o /search/trending do CoinGecko não aceita janela de tempo.
// Para 7d/30d use fetchMarkets + topMovers, que é performance de preço, não busca.
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
  change7d: number;
  change30d: number;
}

// Uma única chamada alimenta Trending (7d/30d) e Maiores altas. Cache curto para
// que trocar de aba ou de período não gaste requisição — o limite do CoinGecko
// free é apertado e o 429 já é tratado como erro visível ao usuário.
const MARKETS_TTL_MS = 60_000;
let marketsCache: { at: number; data: MarketCoin[] } | null = null;

// Busca as top-250 por market cap (1 chamada) e devolve já mapeado.
// O front filtra/ordena localmente (baixo cap, maiores altas) sem gastar chamadas.
export async function fetchMarkets(force = false): Promise<MarketCoin[]> {
  if (!force && marketsCache && Date.now() - marketsCache.at < MARKETS_TTL_MS) {
    return marketsCache.data;
  }

  const json = await getJson('/coins/markets', {
    vs_currency: 'usd',
    order: 'market_cap_desc',
    per_page: '250',
    page: '1',
    price_change_percentage: '24h,7d,30d',
  });
  const arr = Array.isArray(json) ? json : [];
  const data = arr.map((c: any): MarketCoin => ({
    id: c.id,
    name: c.name,
    symbol: (c.symbol ?? '').toUpperCase(),
    image: c.image ?? '',
    price: c.current_price ?? 0,
    rank: c.market_cap_rank ?? null,
    marketCap: c.market_cap ?? 0,
    volume24h: c.total_volume ?? 0,
    // Com price_change_percentage o CoinGecko devolve os campos *_in_currency;
    // o 24h simples continua vindo sempre, por isso serve de fallback.
    change24h: c.price_change_percentage_24h ?? c.price_change_percentage_24h_in_currency ?? 0,
    change7d: c.price_change_percentage_7d_in_currency ?? 0,
    change30d: c.price_change_percentage_30d_in_currency ?? 0,
  }));

  marketsCache = { at: Date.now(), data };
  return data;
}

// Cotação de moedas específicas (watchlist). Necessário porque uma moeda
// acompanhada pode estar fora das 250 maiores e não aparecer em fetchMarkets.
export async function fetchMarketsByIds(ids: string[]): Promise<MarketCoin[]> {
  if (ids.length === 0) return [];
  const json = await getJson('/coins/markets', {
    vs_currency: 'usd',
    ids: ids.join(','),
    per_page: String(Math.min(ids.length, 250)),
    page: '1',
    price_change_percentage: '24h,7d,30d',
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
    change24h: c.price_change_percentage_24h ?? c.price_change_percentage_24h_in_currency ?? 0,
    change7d: c.price_change_percentage_7d_in_currency ?? 0,
    change30d: c.price_change_percentage_30d_in_currency ?? 0,
  }));
}

export function changeFor(coin: MarketCoin, period: CryptoPeriod): number {
  if (period === '7d') return coin.change7d;
  if (period === '30d') return coin.change30d;
  return coin.change24h;
}

// Maiores altas na janela escolhida, opcionalmente só "baixo cap" (fora do top N).
export function topMovers(
  coins: MarketCoin[],
  period: CryptoPeriod,
  lowCapOnly: boolean,
  minRank = 50,
  limit = 30,
): MarketCoin[] {
  return coins
    .filter((c) => (lowCapOnly ? (c.rank ?? 0) > minRank : true))
    .filter((c) => c.volume24h > 0)
    .sort((a, b) => changeFor(b, period) - changeFor(a, period))
    .slice(0, limit);
}

// Mantido para não quebrar chamadas existentes: maiores altas em 24h.
export function topGainers(coins: MarketCoin[], lowCapOnly: boolean, minRank = 50, limit = 30): MarketCoin[] {
  return topMovers(coins, '24h', lowCapOnly, minRank, limit);
}

export const HAS_CRYPTO_SOURCE = true; // CoinGecko funciona keyless; a chave só melhora o limite.

// ─── Termômetro do mercado ───────────────────────────────────────────────────

export interface GlobalMarket {
  totalMarketCap: number;
  totalVolume: number;
  marketCapChange24h: number;
  btcDominance: number;
  ethDominance: number;
  stableDominance: number; // USDT + USDC: proxy de "dinheiro parado esperando"
}

export async function fetchGlobalMarket(): Promise<GlobalMarket> {
  const json = await getJson('/global');
  const d = json?.data ?? {};
  const pct = d.market_cap_percentage ?? {};
  return {
    totalMarketCap: d.total_market_cap?.usd ?? 0,
    totalVolume: d.total_volume?.usd ?? 0,
    marketCapChange24h: d.market_cap_change_percentage_24h_usd ?? 0,
    btcDominance: pct.btc ?? 0,
    ethDominance: pct.eth ?? 0,
    stableDominance: (pct.usdt ?? 0) + (pct.usdc ?? 0),
  };
}

// Fear & Greed — alternative.me, público e sem chave. Fonte diferente do
// CoinGecko de propósito: se uma cair, a outra continua alimentando a tela.
export interface FearGreed {
  value: number;              // 0 (medo extremo) a 100 (ganância extrema)
  classification: string;
  previous: number | null;    // leitura do dia anterior, para mostrar a direção
}

export async function fetchFearGreed(): Promise<FearGreed> {
  const res = await fetch('https://api.alternative.me/fng/?limit=2');
  if (!res.ok) throw new Error(`fng_http_${res.status}`);
  const json = await res.json();
  const arr = Array.isArray(json?.data) ? json.data : [];
  if (arr.length === 0) throw new Error('fng_empty');
  return {
    value: Number(arr[0]?.value ?? 0),
    classification: arr[0]?.value_classification ?? '—',
    previous: arr[1]?.value != null ? Number(arr[1].value) : null,
  };
}

// Tradução do índice para português — a API só devolve em inglês.
export function fearGreedLabel(classification: string): string {
  const map: Record<string, string> = {
    'Extreme Fear': 'Medo extremo',
    'Fear': 'Medo',
    'Neutral': 'Neutro',
    'Greed': 'Ganância',
    'Extreme Greed': 'Ganância extrema',
  };
  return map[classification] ?? classification;
}

// ─── DeFi — DefiLlama (público, sem chave) ───────────────────────────────────

export interface ChainTvl {
  name: string;
  tvl: number;
  symbol: string | null;
  share: number; // % do TVL total de DeFi
}

const LLAMA_BASE = 'https://api.llama.fi';

export async function fetchChainsTvl(limit = 15): Promise<ChainTvl[]> {
  const res = await fetch(`${LLAMA_BASE}/v2/chains`);
  if (!res.ok) throw new Error(`llama_http_${res.status}`);
  const arr = await res.json();
  if (!Array.isArray(arr)) return [];

  const total = arr.reduce((acc: number, c: any) => acc + (c?.tvl ?? 0), 0);
  return arr
    .filter((c: any) => (c?.tvl ?? 0) > 0)
    .sort((a: any, b: any) => (b.tvl ?? 0) - (a.tvl ?? 0))
    .slice(0, limit)
    .map((c: any): ChainTvl => ({
      name: c.name ?? '—',
      tvl: c.tvl ?? 0,
      symbol: c.tokenSymbol ?? null,
      share: total > 0 ? ((c.tvl ?? 0) / total) * 100 : 0,
    }));
}

export interface DefiTvl {
  total: number;
  change7d: number;
  change30d: number;
}

// Série histórica do TVL agregado de DeFi. Uma chamada devolve tudo; calculamos
// as variações localmente em vez de pedir uma requisição por janela.
export async function fetchDefiTvl(): Promise<DefiTvl> {
  const res = await fetch(`${LLAMA_BASE}/v2/historicalChainTvl`);
  if (!res.ok) throw new Error(`llama_http_${res.status}`);
  const arr = await res.json();
  if (!Array.isArray(arr) || arr.length === 0) throw new Error('llama_empty');

  const last = arr[arr.length - 1]?.tvl ?? 0;
  const at = (daysAgo: number): number => {
    const idx = arr.length - 1 - daysAgo;
    return idx >= 0 ? (arr[idx]?.tvl ?? 0) : 0;
  };
  const pct = (from: number): number => (from > 0 ? ((last - from) / from) * 100 : 0);

  return { total: last, change7d: pct(at(7)), change30d: pct(at(30)) };
}

// ─── Histórico próprio: recorrência no trending ──────────────────────────────

export interface TrendingPersistence {
  coin_id: string;
  name: string;
  symbol: string;
  thumb: string | null;
  market_cap_rank: number | null;
  days_seen: number;
  avg_position: number;
  last_seen: string;
}

export interface SnapshotCoverage {
  days_available: number;
  first_date: string | null;
  last_date: string | null;
}

// Quantos dias de histórico já acumulamos. O front usa para decidir se mostra a
// recorrência ou avisa que ainda está juntando dado.
export async function fetchSnapshotCoverage(): Promise<SnapshotCoverage> {
  const { data, error } = await supabase.rpc('crypto_snapshot_coverage');
  if (error) { console.error('[crypto] coverage', error); return { days_available: 0, first_date: null, last_date: null }; }
  const row = Array.isArray(data) ? data[0] : data;
  return row ?? { days_available: 0, first_date: null, last_date: null };
}

// Moedas que mais apareceram no trending na janela. days_seen é o sinal:
// persistir no radar vale mais que um pico isolado.
export async function fetchTrendingPersistence(days: number): Promise<TrendingPersistence[]> {
  const { data, error } = await supabase.rpc('crypto_trending_persistence', { p_days: days });
  if (error) { console.error('[crypto] persistence', error); return []; }
  return (data ?? []) as TrendingPersistence[];
}

export interface CategoryTrend {
  category_id: string;
  name: string;
  market_cap: number;
  sum_change: number;
  days_seen: number;
}

export async function fetchCategoryTrend(days: number): Promise<CategoryTrend[]> {
  const { data, error } = await supabase.rpc('crypto_category_trend', { p_days: days });
  if (error) { console.error('[crypto] category trend', error); return []; }
  return (data ?? []) as CategoryTrend[];
}

// Garante que o retrato de hoje foi capturado. A function é idempotente por dia,
// então chamar a cada abertura da sessão é barato e faz o histórico começar a
// acumular mesmo antes de existir um agendador configurado.
export async function ensureTodaySnapshot(): Promise<void> {
  try {
    await supabase.functions.invoke('crypto-snapshot', { body: {} });
  } catch (e) {
    console.warn('[crypto] snapshot skip', e);
  }
}

// ─── Desbloqueio de tokens (unlocks) ─────────────────────────────────────────

export interface UpcomingUnlock {
  protocol_slug: string;
  name: string;
  gecko_id: string | null;
  next_unlock_at: string;
  next_unlock_tokens: number;
  next_unlock_category: string | null;
  next_unlock_type: string | null;
  // Peso do lote sobre o supply em circulação — o que separa um desbloqueio
  // relevante de um irrelevante. Null quando não sabemos o supply.
  dilution_pct: number | null;
}

export interface UnlockCoverage {
  protocols: number;
  with_future: number;
  oldest_refresh: string | null;
}

export async function fetchUpcomingUnlocks(days = 30): Promise<UpcomingUnlock[]> {
  const { data, error } = await supabase.rpc('crypto_upcoming_unlocks', { p_days: days });
  if (error) { console.error('[crypto] unlocks', error); return []; }
  return (data ?? []) as UpcomingUnlock[];
}

export async function fetchUnlockCoverage(): Promise<UnlockCoverage> {
  const { data, error } = await supabase.rpc('crypto_unlock_coverage');
  if (error) { console.error('[crypto] unlock coverage', error); return { protocols: 0, with_future: 0, oldest_refresh: null }; }
  const row = Array.isArray(data) ? data[0] : data;
  return row ?? { protocols: 0, with_future: 0, oldest_refresh: null };
}

// Avança a varredura do calendário. Como a function processa um lote por
// execução, chamar ao abrir a sessão acelera o bootstrap sem precisar esperar
// o agendador — e ela mesma ignora protocolos lidos recentemente.
export async function advanceUnlockScan(): Promise<void> {
  try {
    await supabase.functions.invoke('crypto-unlocks', { body: {} });
  } catch (e) {
    console.warn('[crypto] unlock scan skip', e);
  }
}

// Dias até o desbloqueio (0 = hoje). Usado para ordenar e para os selos.
export function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

// ─── Watchlist ───────────────────────────────────────────────────────────────

export interface WatchItem {
  id: string;
  coin_id: string;
  symbol: string;
  name: string;
  image: string | null;
  created_at: string;
}

export async function fetchWatchlist(): Promise<WatchItem[]> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return [];
  const { data, error } = await supabase
    .from('crypto_watchlist')
    .select('id, coin_id, symbol, name, image, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) { console.error('[crypto] watchlist', error); return []; }
  return (data ?? []) as WatchItem[];
}

export async function addToWatchlist(coin: {
  id: string; symbol: string; name: string; image?: string | null;
}): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('not_authenticated');
  const { error } = await supabase.from('crypto_watchlist').insert({
    user_id: userId,
    coin_id: coin.id,
    symbol: coin.symbol,
    name: coin.name,
    image: coin.image ?? null,
  });
  // Já estar na lista não é erro para quem clicou.
  if (error && !String(error.message).includes('duplicate')) throw error;
}

export async function removeFromWatchlist(coinId: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('not_authenticated');
  const { error } = await supabase
    .from('crypto_watchlist')
    .delete()
    .eq('user_id', userId)
    .eq('coin_id', coinId);
  if (error) throw error;
}

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
