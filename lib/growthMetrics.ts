// ============================================================
// Métricas de crescimento da plataforma (Painel Admin › Crescimento).
// Tudo é calculado pela RPC admin_growth_metrics (só admin).
// ============================================================

import { supabase } from './supabase';

export type GrowthBucket = 'day' | 'week' | 'month';
/** 'auto' = o banco escolhe pelo tamanho do intervalo. */
export type GrowthBucketChoice = GrowthBucket | 'auto';

export interface GrowthPoint {
  bucket: string; // YYYY-MM-DD (início do período)
  signups: number;
  cumulative: number;
}

export interface GrowthMetrics {
  series: GrowthPoint[];
  roles: { role: string; count: number }[];
  totals: {
    total_users: number;
    new_in_range: number;
    new_prev_range: number;
    active_7d: number;
    active_30d: number;
    never_signed_in: number;
    new_today: number;
  };
  /** Agrupamento efetivamente usado (resolve o 'auto'). */
  bucket: GrowthBucket;
  from: string;
  to: string;
  first_signup: string | null;
}

// from nulo = desde o primeiro cadastro (histórico completo).
export async function fetchGrowthMetrics(from: string | null, to: string, bucket: GrowthBucketChoice): Promise<GrowthMetrics> {
  const { data, error } = await supabase.rpc('admin_growth_metrics', { p_from: from, p_to: to, p_bucket: bucket });
  if (error) throw error;
  return data as GrowthMetrics;
}

// Data local (Brasília no uso real) em YYYY-MM-DD, sem passar por UTC.
export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function bucketLabel(iso: string, bucket: GrowthBucket): string {
  const [y, m, d] = iso.split('-');
  if (bucket === 'month') return `${MONTHS[Number(m) - 1]}/${y.slice(2)}`;
  if (bucket === 'week') return `sem. ${d}/${m}`;
  return `${d}/${m}`;
}

export const ROLE_LABELS: Record<string, string> = {
  client: 'Usuários',
  partner: 'Parceiros',
  first_mate: 'First Mates',
  admin: 'Admins',
  sem_perfil: 'Sem perfil',
};

export function toCsv(series: GrowthPoint[], bucket: GrowthBucket): string {
  const head = 'periodo,inicio,novos_usuarios,total_acumulado';
  const rows = series.map((p) => `${bucketLabel(p.bucket, bucket)},${p.bucket},${p.signups},${p.cumulative}`);
  return [head, ...rows].join('\n');
}
