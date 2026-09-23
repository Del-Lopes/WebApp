// ============================================================
// Calendário Econômico — leitura das tabelas alimentadas pela edge
// econ-calendar-sync (Investing.com, 2 e 3 estrelas, com interpretação IA).
//
// O browser não fala com o Investing: o Cloudflare bloqueia chamadas de outra
// origem. Aqui só lemos o banco e pedimos um sync (no-op se rodou há < 60s).
// ============================================================

import { supabase } from './supabase';

export type Dir = 'alta' | 'baixa' | 'neutra';
export type ScenarioKey = 'acima' | 'abaixo' | 'em_linha';

export interface Scenario {
  rotulo: string;
  moeda: Dir;
  intensidade: 'forte' | 'moderada' | 'fraca';
  leitura: string;
  ativos: { ativo: string; direcao: Dir }[];
}

export interface Interpretation {
  tipo: 'dado' | 'qualitativo';
  resumo: string;
  contexto: string;
  cenarios: Record<ScenarioKey, Scenario>;
  atencao: string;
}

export interface EconEvent {
  occurrence_id: number;
  event_id: number;
  occurs_at: string;
  currency: string;
  title: string;
  importance: number;
  unit: string | null;
  precision: number | null;
  reference_period: string | null;
  preliminary: boolean;
  actual: number | null;
  forecast: number | null;
  previous: number | null;
  actual_to_forecast: 'positive' | 'negative' | 'neutral' | null;
}

export interface EconProfile {
  event_id: number;
  title: string;
  currency: string;
  category: string | null;
  event_type: string | null;
  importance: number;
  description: string | null;
  source: string | null;
  source_url: string | null;
  page_link: string | null;
  polarity: number | null;
  interpretation: Interpretation | null;
}

export interface SyncStatus {
  last_ok_at: string | null;
  last_error: string | null;
}

const EVENT_COLS = 'occurrence_id, event_id, occurs_at, currency, title, importance, unit, precision, reference_period, preliminary, actual, forecast, previous, actual_to_forecast';

// numeric do Postgres chega como string pelo PostgREST quando tem casas decimais.
function toNum(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapEvent(r: any): EconEvent {
  return { ...r, actual: toNum(r.actual), forecast: toNum(r.forecast), previous: toNum(r.previous) };
}

export async function fetchEvents(from: Date, to: Date): Promise<EconEvent[]> {
  const { data, error } = await supabase
    .from('econ_calendar_event')
    .select(EVENT_COLS)
    .gte('occurs_at', from.toISOString())
    .lt('occurs_at', to.toISOString())
    .order('occurs_at', { ascending: true })
    .limit(1000);
  if (error) throw error;
  return (data ?? []).map(mapEvent);
}

export async function fetchProfiles(eventIds: number[]): Promise<Map<number, EconProfile>> {
  const map = new Map<number, EconProfile>();
  if (eventIds.length === 0) return map;
  const { data, error } = await supabase
    .from('econ_event_profile')
    .select('event_id, title, currency, category, event_type, importance, description, source, source_url, page_link, polarity, interpretation')
    .in('event_id', eventIds);
  if (error) throw error;
  for (const p of data ?? []) map.set(p.event_id, p as EconProfile);
  return map;
}

// Últimas divulgações já ocorridas do mesmo indicador — mostra se o dado
// costuma surpreender para cima ou para baixo.
export async function fetchHistory(eventId: number, before: string, limit = 6): Promise<EconEvent[]> {
  const { data, error } = await supabase
    .from('econ_calendar_event')
    .select(EVENT_COLS)
    .eq('event_id', eventId)
    .lt('occurs_at', before)
    .not('actual', 'is', null)
    .order('occurs_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(mapEvent);
}

export async function fetchSyncStatus(): Promise<SyncStatus | null> {
  const { data } = await supabase.from('econ_calendar_sync').select('last_ok_at, last_error').eq('id', 1).maybeSingle();
  return (data as SyncStatus) ?? null;
}

// Pede uma coleta. A function tem trava global de 60s, então chamar a cada
// minuto enquanto a tela está aberta não multiplica requisições à fonte.
export async function requestSync(): Promise<void> {
  try {
    await supabase.functions.invoke('econ-calendar-sync', { body: {} });
  } catch (e) {
    console.warn('[econ] sync skip', e);
  }
}

// ─── Leitura do resultado ────────────────────────────────────────────────────

export interface Outcome {
  scenario: ScenarioKey;
  // base de comparação: projeção quando há, senão o dado anterior
  baseline: 'forecast' | 'previous';
  diff: number;
}

// Compara o atual com a projeção (ou com o anterior, se não houver projeção),
// usando a precisão do próprio dado como tolerância de "em linha".
export function evaluateOutcome(e: EconEvent): Outcome | null {
  if (e.actual == null) return null;
  const baseValue = e.forecast ?? e.previous;
  if (baseValue == null) return null;
  const precision = e.precision ?? 2;
  const tol = 0.5 * Math.pow(10, -precision);
  const diff = e.actual - baseValue;
  const scenario: ScenarioKey = Math.abs(diff) < tol ? 'em_linha' : diff > 0 ? 'acima' : 'abaixo';
  return { scenario, baseline: e.forecast != null ? 'forecast' : 'previous', diff };
}

export function fmtValue(v: number | null, unit: string | null, precision: number | null): string {
  if (v == null) return '—';
  const p = precision ?? 2;
  return `${v.toLocaleString('pt-BR', { minimumFractionDigits: p, maximumFractionDigits: p })}${unit ?? ''}`;
}

export function fmtDiff(diff: number, unit: string | null, precision: number | null): string {
  return `${diff > 0 ? '+' : diff < 0 ? '−' : ''}${fmtValue(Math.abs(diff), unit, precision)}`;
}

// "em 2h 15min", "em 8min", "agora"
export function fmtCountdown(iso: string, now: number): string {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return 'agora';
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'em menos de 1min';
  if (min < 60) return `em ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `em ${h}h ${String(min % 60).padStart(2, '0')}min`;
  const d = Math.floor(h / 24);
  return `em ${d}d ${h % 24}h`;
}

// Horário "cheio" (00:00 local) costuma ser evento de dia inteiro/sem hora exata.
export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const CURRENCY_LABEL: Record<string, string> = {
  USD: 'EUA', EUR: 'Zona do Euro', GBP: 'Reino Unido', JPY: 'Japão', CNY: 'China',
  BRL: 'Brasil', AUD: 'Austrália', CAD: 'Canadá', CHF: 'Suíça', NZD: 'Nova Zelândia',
  MXN: 'México', ZAR: 'África do Sul', SEK: 'Suécia', NOK: 'Noruega', SGD: 'Singapura',
  IDR: 'Indonésia', INR: 'Índia', KRW: 'Coreia do Sul', HKD: 'Hong Kong', TRY: 'Turquia',
};
