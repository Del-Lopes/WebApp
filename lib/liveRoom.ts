// ============================================================
// Sala ao Vivo — estado para o usuário e gestão pelo admin.
//
// O link da sala nunca é lido direto da tabela pelo usuário comum: vem da RPC
// get_live_room(), que só o devolve a quem tem acesso liberado (ou staff).
// ============================================================

import { supabase } from './supabase';

export interface LiveRoomState {
  has_access: boolean;
  configured: boolean;
  schedule: string | null;
  url: string | null;
}

export async function fetchLiveRoom(): Promise<LiveRoomState> {
  const { data, error } = await supabase.rpc('get_live_room');
  if (error) throw error;
  return data as LiveRoomState;
}

// ─── Admin ────────────────────────────────────────────────────────────────

export interface LiveRoomConfig {
  url: string | null;
  schedule: string | null;
  updated_at: string | null;
}

export async function fetchLiveRoomConfig(): Promise<LiveRoomConfig> {
  const { data, error } = await supabase
    .from('live_room_config')
    .select('url, schedule, updated_at')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  return (data as LiveRoomConfig) ?? { url: null, schedule: null, updated_at: null };
}

export async function saveLiveRoomConfig(url: string, schedule: string, adminId: string): Promise<void> {
  const { error } = await supabase
    .from('live_room_config')
    .upsert({
      id: 1,
      url: url.trim() || null,
      schedule: schedule.trim() || null,
      updated_at: new Date().toISOString(),
      updated_by: adminId,
    });
  if (error) throw error;
}

// Link da sala: só https (evita javascript:/http e links quebrados).
export function isValidRoomUrl(url: string): boolean {
  if (!url.trim()) return true; // vazio = sala sem link configurado
  try {
    return new URL(url.trim()).protocol === 'https:';
  } catch {
    return false;
  }
}

export async function fetchLiveRoomAccessIds(): Promise<Set<string>> {
  const { data, error } = await supabase.from('live_room_access').select('user_id');
  if (error) throw error;
  return new Set((data ?? []).map((r: { user_id: string }) => r.user_id));
}

export async function grantLiveRoomAccess(userId: string, adminId: string): Promise<void> {
  const { error } = await supabase
    .from('live_room_access')
    .upsert({ user_id: userId, granted_by: adminId }, { onConflict: 'user_id', ignoreDuplicates: true });
  if (error) throw error;
}

export async function revokeLiveRoomAccess(userId: string): Promise<void> {
  const { error } = await supabase.from('live_room_access').delete().eq('user_id', userId);
  if (error) throw error;
}
