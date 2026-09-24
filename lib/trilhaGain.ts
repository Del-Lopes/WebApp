import { supabase } from './supabase';
import {
  TrilhaTrack, TrilhaUnit, TrilhaLesson, TrilhaStep,
  TrilhaProgress, TrilhaStats,
} from '../types';

// ============================================================
// Camada de dados — Trilha Gain
// Leitura de conteúdo (tracks → units → lessons → steps),
// progresso por usuário e gamificação (XP / streak).
// ============================================================

// --- Conteúdo (leitura) ---

export async function fetchTracks(): Promise<TrilhaTrack[]> {
  const { data, error } = await supabase
    .from('trilha_tracks')
    .select('*')
    .eq('is_published', true)
    .order('sort_order', { ascending: true });
  if (error) { console.error('[trilhaGain] fetchTracks', error); return []; }
  return (data ?? []) as TrilhaTrack[];
}

// Busca a árvore completa de uma trilha (units → lessons → steps), já ordenada.
export async function fetchTrackTree(trackId: string): Promise<TrilhaTrack | null> {
  const { data, error } = await supabase
    .from('trilha_tracks')
    .select('*, trilha_units(*, trilha_lessons(*, trilha_steps(*)))')
    .eq('id', trackId)
    .maybeSingle();

  if (error) { console.error('[trilhaGain] fetchTrackTree', error); return null; }
  if (!data) return null;

  // Normaliza nomes das relações e ordena cada nível manualmente
  // (o sort dentro de relações aninhadas do PostgREST não é confiável).
  const units = ((data as any).trilha_units ?? [])
    .map((u: any): TrilhaUnit => ({
      ...u,
      lessons: (u.trilha_lessons ?? [])
        .map((l: any): TrilhaLesson => ({
          ...l,
          steps: (l.trilha_steps ?? [])
            .sort((a: TrilhaStep, b: TrilhaStep) => a.order_index - b.order_index),
        }))
        .sort((a: TrilhaLesson, b: TrilhaLesson) => a.order_index - b.order_index),
    }))
    .sort((a: TrilhaUnit, b: TrilhaUnit) => a.order_index - b.order_index);

  return { ...(data as any), units } as TrilhaTrack;
}

// --- Progresso (por usuário) ---

// Id do usuário logado a partir da sessão local (sem ida ao servidor de auth).
async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

// Retorna o conjunto de lesson_id já concluídos pelo usuário atual.
// Filtra pelo próprio id: staff enxerga o progresso de todos pela RLS, e sem o
// filtro as lições concluídas por outros apareceriam como concluídas.
export async function fetchCompletedLessonIds(): Promise<Set<string>> {
  const userId = await currentUserId();
  if (!userId) return new Set();
  const { data, error } = await supabase
    .from('trilha_progress')
    .select('lesson_id')
    .eq('user_id', userId);
  if (error) { console.error('[trilhaGain] fetchCompletedLessonIds', error); return new Set(); }
  return new Set((data ?? []).map((r: { lesson_id: string }) => r.lesson_id));
}

// Retorna o conjunto de unit_id que o usuário já desbloqueou gastando XP.
export async function fetchUnlockedUnitIds(): Promise<Set<string>> {
  const userId = await currentUserId();
  if (!userId) return new Set();
  const { data, error } = await supabase
    .from('trilha_unit_unlocks')
    .select('unit_id')
    .eq('user_id', userId);
  if (error) { console.error('[trilhaGain] fetchUnlockedUnitIds', error); return new Set(); }
  return new Set((data ?? []).map((r: { unit_id: string }) => r.unit_id));
}

// Resgata o desbloqueio de uma unidade paga gastando Coins. O débito é feito
// no servidor pela RPC redeem_unit_unlock (SECURITY DEFINER, transacional);
// nunca debitamos no client. Retorna o novo saldo (total_xp).
// Erros possíveis (message): 'insufficient_xp', 'not_redeemable', 'not_authenticated'.
export async function redeemUnitUnlock(unitId: string): Promise<number> {
  const { data, error } = await supabase.rpc('redeem_unit_unlock', { p_unit_id: unitId });
  if (error) { console.error('[trilhaGain] redeemUnitUnlock', error); throw new Error(error.message); }
  return data as number;
}

// Pula (libera o acesso a) uma unidade à frente gastando Coins. Custo = skip_cost
// (1000); se a unidade também for Premium e ainda não paga, o pulo embute o
// unlock_cost (ex.: Método APP = 5000 + 1000 = 6000). Não move a progressão.
// Retorna o novo saldo. Erros: 'insufficient_xp', 'not_authenticated'.
export async function redeemUnitSkip(unitId: string): Promise<number> {
  const { data, error } = await supabase.rpc('redeem_unit_skip', { p_unit_id: unitId });
  if (error) { console.error('[trilhaGain] redeemUnitSkip', error); throw new Error(error.message); }
  return data as number;
}

// Custo do pulo de progressão (trilha_config.skip_cost). Default 1000.
export async function fetchSkipCost(): Promise<number> {
  const { data, error } = await supabase
    .from('trilha_config')
    .select('value')
    .eq('key', 'skip_cost')
    .maybeSingle();
  if (error || !data) { return 1000; }
  return (data as { value: number }).value;
}

export async function fetchStats(): Promise<TrilhaStats | null> {
  // Filtra pela própria identidade em vez de confiar na RLS para isolar a linha:
  // admin/first_mate enxergam TODAS as linhas de trilha_stats (policy select_own_or_staff),
  // então sem o .eq(user_id) o .maybeSingle() traria várias linhas e falharia (PGRST116),
  // fazendo o saldo aparecer como 0 para quem é staff.
  const userId = await currentUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from('trilha_stats')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) { console.error('[trilhaGain] fetchStats', error); return null; }
  return (data as TrilhaStats) ?? null;
}

// Marca uma lição como concluída e credita os Coins/streak.
// Tudo acontece no servidor (RPC complete_lesson, SECURITY DEFINER): o XP vem
// da própria lição no banco, credita uma única vez por lição mesmo com cliques
// simultâneos, e unidade Premium só credita para quem a desbloqueou. O cliente
// não escreve mais em trilha_stats — antes o saldo podia ser forjado pelo console.
// `xpReward` fica na assinatura por compatibilidade; o valor usado é o do banco.
export async function completeLesson(lessonId: string, _xpReward?: number, score = 100): Promise<void> {
  const { error } = await supabase.rpc('complete_lesson', { p_lesson_id: lessonId, p_score: score });
  if (error) {
    console.error('[trilhaGain] completeLesson', error);
    throw new Error(error.message || 'complete_lesson_failed');
  }
}

// --- CRUD admin (usado pelo painel; escrita gated por RLS = admin) ---

export async function saveTrack(track: Partial<TrilhaTrack>): Promise<TrilhaTrack | null> {
  const { data, error } = await supabase
    .from('trilha_tracks')
    .upsert(track)
    .select()
    .single();
  if (error) { console.error('[trilhaGain] saveTrack', error); throw error; }
  return data as TrilhaTrack;
}

export async function deleteTrack(id: string): Promise<void> {
  const { error } = await supabase.from('trilha_tracks').delete().eq('id', id);
  if (error) throw error;
}

export async function saveUnit(unit: Partial<TrilhaUnit>): Promise<TrilhaUnit | null> {
  const { data, error } = await supabase.from('trilha_units').upsert(unit).select().single();
  if (error) { console.error('[trilhaGain] saveUnit', error); throw error; }
  return data as TrilhaUnit;
}

export async function deleteUnit(id: string): Promise<void> {
  const { error } = await supabase.from('trilha_units').delete().eq('id', id);
  if (error) throw error;
}

export async function saveLesson(lesson: Partial<TrilhaLesson>): Promise<TrilhaLesson | null> {
  const { data, error } = await supabase.from('trilha_lessons').upsert(lesson).select().single();
  if (error) { console.error('[trilhaGain] saveLesson', error); throw error; }
  return data as TrilhaLesson;
}

export async function deleteLesson(id: string): Promise<void> {
  const { error } = await supabase.from('trilha_lessons').delete().eq('id', id);
  if (error) throw error;
}

export async function saveStep(step: Partial<TrilhaStep>): Promise<TrilhaStep | null> {
  const { data, error } = await supabase.from('trilha_steps').upsert(step).select().single();
  if (error) { console.error('[trilhaGain] saveStep', error); throw error; }
  return data as TrilhaStep;
}

export async function deleteStep(id: string): Promise<void> {
  const { error } = await supabase.from('trilha_steps').delete().eq('id', id);
  if (error) throw error;
}
