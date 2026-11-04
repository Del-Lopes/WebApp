// ============================================================
// Foto de perfil.
//
// A imagem vai para o bucket R2 do Fórum (mesma function de upload); o perfil guarda só a chave
// (profiles.avatar_key). Como profiles só é legível pelo dono e pela equipe, a foto dos outros
// usuários vem pela função forum_avatars (id → chave), pedida em lotes e guardada em cache.
// ============================================================

import { useEffect, useSyncExternalStore } from 'react';
import { supabase } from './supabase';
import { forumImagesEnabled, imageUrl, uploadForumImage } from './forumImages';

export const avatarsEnabled = forumImagesEnabled;
export const avatarSrc = (key: string): string => imageUrl(key);

const AVATAR_SIZE = 384;

// ── cache + pedido em lote ───────────────────────────────────────────────
const cache = new Map<string, string | null>();
const inflight = new Set<string>();
let queue = new Set<string>();
let timer: number | null = null;
let version = 0;
const listeners = new Set<() => void>();

const notify = () => { version += 1; listeners.forEach((l) => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

async function flush() {
  timer = null;
  const ids = [...queue];
  queue = new Set();
  if (ids.length === 0) return;
  ids.forEach((id) => inflight.add(id));
  try {
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      const { data, error } = await supabase.rpc('forum_avatars', { p_ids: chunk });
      const found = new Map<string, string>();
      if (!error) for (const r of (data ?? []) as { id: string; avatar_key: string }[]) found.set(r.id, r.avatar_key);
      // Em erro (função ainda não criada no banco) assume "sem foto" para não repetir o pedido a cada render.
      chunk.forEach((id) => cache.set(id, found.get(id) ?? null));
    }
  } finally {
    ids.forEach((id) => inflight.delete(id));
    notify();
  }
}

function request(id: string) {
  if (cache.has(id) || inflight.has(id) || queue.has(id)) return;
  queue.add(id);
  if (timer === null) timer = window.setTimeout(() => { void flush(); }, 25);
}

/** Atualiza a foto de um usuário no cache (ex.: logo depois de trocar a própria foto). */
export function setCachedAvatar(userId: string, key: string | null) {
  cache.set(userId, key);
  notify();
}

/** Chave da foto de um usuário (null = sem foto ou ainda carregando). Vários componentes pedem juntos: um único pedido ao banco. */
export function useAvatarKey(userId?: string | null): string | null {
  useSyncExternalStore(subscribe, () => version, () => 0);
  useEffect(() => { if (userId && avatarsEnabled) request(userId); }, [userId]);
  return userId ? cache.get(userId) ?? null : null;
}

// ── envio ────────────────────────────────────────────────────────────────

/** Recorte quadrado central, 384 px, WebP: foto de perfil pequena e leve. */
async function squareAvatar(file: File): Promise<Blob> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error('unsupported_type');
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE; canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_unavailable');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.86));
  if (!blob) throw new Error('render_failed');
  return blob;
}

/** Envia a foto, grava a chave no perfil e atualiza o cache. Devolve a chave. */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const key = await uploadForumImage(await squareAvatar(file));
  const { error } = await supabase.from('profiles').update({ avatar_key: key }).eq('id', userId);
  if (error) throw error;
  setCachedAvatar(userId, key);
  return key;
}

export async function removeAvatar(userId: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ avatar_key: null }).eq('id', userId);
  if (error) throw error;
  setCachedAvatar(userId, null);
}

export function avatarErrorMessage(err: unknown): string {
  const m = (err as { message?: string })?.message ?? '';
  if (m === 'unsupported_type') return 'Use uma imagem PNG, JPG ou WebP.';
  if (/rate|limit|too_many/i.test(m)) return 'Limite diário de envio de imagens atingido. Tente amanhã.';
  if (m === 'not_authenticated') return 'Sua sessão expirou. Entre novamente.';
  if (/avatar_key|constraint|violates/i.test(m)) return 'Não foi possível salvar a foto no perfil. Tente de novo.';
  return 'Não foi possível enviar a foto. Tente novamente.';
}
