import { supabase } from './supabase';
import { Signal, SignalSource } from '../types';

// ============================================================
// Camada de dados — Sinais
// Leitura dos sinais (por origem), análise on-demand paga em Coins
// e criação manual do setup (admin).
// ============================================================

// Custo em Coins de uma análise automática (signal_config.analysis_cost).
export async function fetchAnalysisCost(): Promise<number> {
  const { data, error } = await supabase
    .from('signal_config')
    .select('value')
    .eq('key', 'analysis_cost')
    .maybeSingle();
  if (error || !data) return 500;
  return (data as { value: number }).value;
}

export interface AnalysisResult {
  new_balance: number;
  has_entry: boolean;
  signal: Signal;
}

// Solicita uma análise on-demand. A edge function cobra os Coins (débito
// transacional no servidor), gera o parecer por IA e grava um sinal privado.
// Lança Error('insufficient_coins') quando o saldo não cobre o custo.
export async function requestSignalAnalysis(): Promise<AnalysisResult> {
  const { data, error } = await supabase.functions.invoke('signals-generate', {
    body: {},
  });
  if (error) {
    // supabase-js embrulha o corpo do erro; tentamos extrair o código.
    let code = '';
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') code = (await ctx.json())?.error ?? '';
    } catch { /* ignore */ }
    throw new Error(code || error.message || 'analysis_failed');
  }
  return data as AnalysisResult;
}

// Lista os sinais mais recentes. `source` filtra 'auto' (estratégia própria)
// ou 'setup' (setup manual do time). Sem filtro, traz ambos.
export async function fetchSignals(source?: SignalSource, limit = 50): Promise<Signal[]> {
  let query = supabase
    .from('signals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (source) query = query.eq('source', source);

  const { data, error } = await query;
  if (error) { console.error('[signals] fetchSignals', error); return []; }
  return (data ?? []) as Signal[];
}

// Cria um sinal manual do setup (source='setup'). Escrita gated por RLS = admin.
export async function createSetupSignal(input: {
  action: Signal['action'];
  symbol?: string;
  entry_price: number;
  stop_loss?: number | null;
  take_profit?: number | null;
  timeframe?: string | null;
  rationale?: string | null;
  confidence?: number | null;
}): Promise<Signal | null> {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('signals')
    .insert({
      source: 'setup',
      symbol: input.symbol ?? 'XAUUSD',
      action: input.action,
      entry_price: input.entry_price,
      stop_loss: input.stop_loss ?? null,
      take_profit: input.take_profit ?? null,
      timeframe: input.timeframe ?? null,
      rationale: input.rationale ?? null,
      confidence: input.confidence ?? null,
      created_by: auth.user?.id ?? null,
    })
    .select()
    .single();
  if (error) { console.error('[signals] createSetupSignal', error); throw error; }
  return data as Signal;
}

// Atualiza o status de um sinal (admin): encerrar em TP/SL ou cancelar.
export async function updateSignalStatus(id: string, status: Signal['status']): Promise<void> {
  const { error } = await supabase.from('signals').update({ status }).eq('id', id);
  if (error) { console.error('[signals] updateSignalStatus', error); throw error; }
}

// ─── Painel de Tendência Multi-TF ────────────────────────────────────────────

// Custo (Coins) de abrir o painel de um ativo (signal_config.trend_panel_cost).
export async function fetchTrendPanelCost(): Promise<number> {
  const { data, error } = await supabase
    .from('signal_config')
    .select('value')
    .eq('key', 'trend_panel_cost')
    .maybeSingle();
  if (error || !data) return 200;
  return (data as { value: number }).value;
}

// Símbolos que o usuário já abriu HOJE (não serão cobrados de novo).
export async function fetchTodayPanelAccess(): Promise<Set<string>> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  const { data, error } = await supabase
    .from('trend_panel_access')
    .select('symbol')
    .eq('access_day', today);
  if (error) { console.error('[signals] fetchTodayPanelAccess', error); return new Set(); }
  return new Set((data ?? []).map((r: { symbol: string }) => r.symbol));
}

// Abre (libera) o painel de um ativo. Cobra Coins só na 1ª vez do dia.
// Retorna o novo saldo. Lança Error('insufficient_coins') se faltar saldo.
export async function openTrendPanel(symbol: string): Promise<number> {
  const { data, error } = await supabase.rpc('open_trend_panel', { p_symbol: symbol });
  if (error) { console.error('[signals] openTrendPanel', error); throw new Error(error.message); }
  return data as number;
}
