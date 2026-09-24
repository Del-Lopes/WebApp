// ============================================================
// Calendário Econômico — leitura das tabelas alimentadas pela edge
// econ-calendar-sync (TradingView, 2 e 3 estrelas pela nossa régua, com
// interpretação IA).
//
// O browser não fala com a fonte: a coleta e a classificação de importância
// ficam no servidor. Aqui só lemos o banco e pedimos um sync (no-op se rodou
// há < 60s).
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
  titulo: string;
  tipo: 'dado' | 'qualitativo';
  resumo: string;
  contexto: string;
  cenarios: Record<ScenarioKey, Scenario>;
  atencao: string;
}

export interface EconEvent {
  occurrence_id: string;
  event_key: string;
  occurs_at: string;
  country: string;
  currency: string;
  title: string;
  variant: string | null;
  importance: number;
  unit: string | null;
  precision: number | null;
  reference_period: string | null;
  actual: number | null;
  forecast: number | null;
  previous: number | null;
}

export interface EconProfile {
  event_key: string;
  country: string;
  title: string;
  title_pt: string | null;
  currency: string;
  category: string | null;
  event_type: string | null;
  importance: number;
  description: string | null;
  source: string | null;
  source_url: string | null;
  interpretation: Interpretation | null;
}

export interface SyncStatus {
  last_ok_at: string | null;
  last_error: string | null;
}

const EVENT_COLS = 'occurrence_id, event_key, occurs_at, country, currency, title, variant, importance, unit, precision, reference_period, actual, forecast, previous';

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

export async function fetchProfiles(keys: string[]): Promise<Map<string, EconProfile>> {
  const map = new Map<string, EconProfile>();
  if (keys.length === 0) return map;
  const { data, error } = await supabase
    .from('econ_event_profile')
    .select('event_key, country, title, title_pt, currency, category, event_type, importance, description, source, source_url, interpretation')
    .in('event_key', keys);
  if (error) throw error;
  for (const p of data ?? []) map.set(p.event_key, p as EconProfile);
  return map;
}

// Últimas divulgações já ocorridas do mesmo indicador — mostra se o dado
// costuma surpreender para cima ou para baixo.
export async function fetchHistory(eventKey: string, before: string, limit = 6): Promise<EconEvent[]> {
  const { data, error } = await supabase
    .from('econ_calendar_event')
    .select(EVENT_COLS)
    .eq('event_key', eventKey)
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

// Coleta mais nova que isso: não vale invocar a function (cada invocação é
// cobrada mesmo quando a trava de 60s dela recusa o trabalho).
export const SYNC_MIN_AGE_MS = 90_000;

// Decide pelo last_ok_at já lido em fetchSyncStatus. Sem leitura ou sem
// coleta ok registrada, pede a coleta.
export function isSyncDue(status: SyncStatus | null, now = Date.now()): boolean {
  if (!status?.last_ok_at) return true;
  return now - new Date(status.last_ok_at).getTime() > SYNC_MIN_AGE_MS;
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

// A fonte traz o título em inglês; o português vem com a interpretação da IA.
// Nos países do euro o país entra no nome, já que a moeda não o identifica.
export function displayTitle(e: EconEvent, p: EconProfile | undefined): string {
  const base = p?.title_pt ? `${p.title_pt}${e.variant ? ` (${e.variant})` : ''}` : e.title;
  const country = e.currency === 'EUR' && e.country !== 'EU' ? COUNTRY_LABEL[e.country] : null;
  return country ? `${country} · ${base}` : base;
}

// Leitura do "atual" para a moeda, a partir do cenário que se concretizou:
// 1 = favorável, -1 = desfavorável, 0 = neutro/indefinido.
export function actualBias(e: EconEvent, p: EconProfile | undefined): number {
  const o = evaluateOutcome(e);
  const s = o && p?.interpretation ? p.interpretation.cenarios[o.scenario] : null;
  return s?.moeda === 'alta' ? 1 : s?.moeda === 'baixa' ? -1 : 0;
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

export const COUNTRY_LABEL: Record<string, string> = {
  DE: 'Alemanha', FR: 'França', IT: 'Itália', ES: 'Espanha',
};

export const CURRENCY_LABEL: Record<string, string> = {
  USD: 'EUA', EUR: 'Zona do Euro', GBP: 'Reino Unido', JPY: 'Japão', CNY: 'China',
  BRL: 'Brasil', AUD: 'Austrália', CAD: 'Canadá', CHF: 'Suíça', NZD: 'Nova Zelândia',
  MXN: 'México', ZAR: 'África do Sul', SEK: 'Suécia', NOK: 'Noruega', SGD: 'Singapura',
  IDR: 'Indonésia', INR: 'Índia', KRW: 'Coreia do Sul', HKD: 'Hong Kong', TRY: 'Turquia',
};
