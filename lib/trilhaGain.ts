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

// Retorna o conjunto de lesson_id já concluídos pelo usuário atual.
export async function fetchCompletedLessonIds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('trilha_progress')
    .select('lesson_id');
  if (error) { console.error('[trilhaGain] fetchCompletedLessonIds', error); return new Set(); }
  return new Set((data ?? []).map((r: { lesson_id: string }) => r.lesson_id));
}

// Retorna o conjunto de unit_id que o usuário já desbloqueou gastando XP.
export async function fetchUnlockedUnitIds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('trilha_unit_unlocks')
    .select('unit_id');
  if (error) { console.error('[trilhaGain] fetchUnlockedUnitIds', error); return new Set(); }
  return new Set((data ?? []).map((r: { unit_id: string }) => r.unit_id));
}

// Resgata o desbloqueio de uma unidade paga gastando XP. O débito é feito
// no servidor pela RPC redeem_unit_unlock (SECURITY DEFINER, transacional);
// nunca debitamos no client. Retorna o novo total_xp.
// Erros possíveis (message): 'insufficient_xp', 'not_redeemable', 'not_authenticated'.
export async function redeemUnitUnlock(unitId: string): Promise<number> {
  const { data, error } = await supabase.rpc('redeem_unit_unlock', { p_unit_id: unitId });
  if (error) { console.error('[trilhaGain] redeemUnitUnlock', error); throw new Error(error.message); }
  return data as number;
}

export async function fetchStats(): Promise<TrilhaStats | null> {
  const { data, error } = await supabase
    .from('trilha_stats')
    .select('*')
    .maybeSingle();
  if (error) { console.error('[trilhaGain] fetchStats', error); return null; }
  return (data as TrilhaStats) ?? null;
}

// Marca uma lição como concluída e atualiza XP/streak.
// Idempotente: reconcluir não duplica progresso nem soma XP de novo.
export async function completeLesson(lessonId: string, xpReward: number, score = 100): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('not_authenticated');

  // Já concluída? então não soma XP de novo (apenas atualiza score se melhorou).
  const { data: existing } = await supabase
    .from('trilha_progress')
    .select('id, score')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .maybeSingle();

  const isFirstTime = !existing;

  await supabase
    .from('trilha_progress')
    .upsert(
      { user_id: userId, lesson_id: lessonId, score },
      { onConflict: 'user_id,lesson_id' },
    );

  if (isFirstTime) {
    await applyXpAndStreak(userId, xpReward);
  }
}

// Atualiza XP total e o streak diário. Cria a linha de stats se não existir.
async function applyXpAndStreak(userId: string, xpReward: number): Promise<void> {
  const { data: stats } = await supabase
    .from('trilha_stats')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)

  if (!stats) {
    await supabase.from('trilha_stats').insert({
      user_id: userId,
      total_xp: xpReward,
      current_streak: 1,
      best_streak: 1,
      last_activity_date: today,
    });
    return;
  }

  const last = stats.last_activity_date as string | null;
  let current = stats.current_streak as number;

  if (last !== today) {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    current = last === yesterday ? current + 1 : 1;
  }
  const best = Math.max(stats.best_streak as number, current);

  await supabase
    .from('trilha_stats')
    .update({
      total_xp: (stats.total_xp as number) + xpReward,
      current_streak: current,
      best_streak: best,
      last_activity_date: today,
    })
    .eq('user_id', userId);
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
