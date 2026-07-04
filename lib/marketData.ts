// ============================================================
// Market data — busca de candles OHLC direto do browser (Twelve Data).
// Usa key PÚBLICA (VITE_TWELVEDATA_KEY) por decisão de projeto: o cálculo
// do Trendmeter roda 100% no cliente, sem tocar servidor/banco.
// ============================================================

import { Candle } from './trendMeter';

const TD_KEY = import.meta.env.VITE_TWELVEDATA_KEY ?? '';
const TD_BASE = 'https://api.twelvedata.com/time_series';

// Ativos pré-programados oferecidos na lista suspensa do painel.
// `td` = símbolo no formato Twelve Data.
export interface AssetOption {
  value: string;   // id interno / armazenado (ex.: 'XAUUSD')
  label: string;   // exibição (ex.: 'Ouro — XAU/USD')
  td: string;      // símbolo Twelve Data (ex.: 'XAU/USD')
}

export const ASSETS: AssetOption[] = [
  { value: 'XAUUSD', label: 'Ouro — XAU/USD',      td: 'XAU/USD' },
  { value: 'EURUSD', label: 'Euro — EUR/USD',      td: 'EUR/USD' },
  { value: 'GBPUSD', label: 'Libra — GBP/USD',     td: 'GBP/USD' },
  { value: 'USDJPY', label: 'Iene — USD/JPY',      td: 'USD/JPY' },
  { value: 'BTCUSD', label: 'Bitcoin — BTC/USD',   td: 'BTC/USD' },
  { value: 'ETHUSD', label: 'Ethereum — ETH/USD',  td: 'ETH/USD' },
];

export function findAsset(value: string): AssetOption | undefined {
  return ASSETS.find((a) => a.value === value);
}

// Timeframes do painel (curto → longo). `td` = intervalo Twelve Data.
export interface TimeframeOption { label: string; td: string; }

export const DEFAULT_TIMEFRAMES: TimeframeOption[] = [
  { label: 'M5',  td: '5min' },
  { label: 'M15', td: '15min' },
  { label: 'M30', td: '30min' },
  { label: 'H1',  td: '1h' },
  { label: 'H4',  td: '4h' },
];

// Alternativas selecionáveis (parâmetro ajustável).
export const AVAILABLE_TIMEFRAMES: TimeframeOption[] = [
  { label: 'M1',  td: '1min' },
  { label: 'M5',  td: '5min' },
  { label: 'M15', td: '15min' },
  { label: 'M30', td: '30min' },
  { label: 'H1',  td: '1h' },
  { label: 'H2',  td: '2h' },
  { label: 'H4',  td: '4h' },
  { label: 'D1',  td: '1day' },
];

// Quantos candles buscar por TF (suficiente para SMA(period) estabilizar).
const OUTPUTSIZE = 60;

async function fetchOneTF(tdSymbol: string, tdInterval: string): Promise<Candle[]> {
  const url = new URL(TD_BASE);
  url.searchParams.set('symbol', tdSymbol);
  url.searchParams.set('interval', tdInterval);
  url.searchParams.set('outputsize', String(OUTPUTSIZE));
  url.searchParams.set('apikey', TD_KEY);
  url.searchParams.set('format', 'JSON');

  const res = await fetch(url.toString());
  const json = await res.json();
  if (json.status === 'error' || !Array.isArray(json.values)) {
    throw new Error(json.message || 'Falha ao buscar cotações');
  }
  // Twelve Data devolve do mais novo → cronológico (mais antigo primeiro).
  return (json.values as Array<Record<string, string>>)
    .map((v) => ({
      time: new Date(v.datetime).getTime(),
      open: Number(v.open),
      high: Number(v.high),
      low: Number(v.low),
      close: Number(v.close),
    }))
    .reverse();
}

// Busca os candles de todos os TFs de um ativo, em paralelo.
// Twelve Data free permite ~8 req/min — 5 TFs cabem numa atualização.
export async function fetchCandlesForTFs(
  tdSymbol: string,
  timeframes: TimeframeOption[],
): Promise<Candle[][]> {
  return Promise.all(timeframes.map((tf) => fetchOneTF(tdSymbol, tf.td)));
}

export const HAS_MARKET_KEY = !!TD_KEY;
