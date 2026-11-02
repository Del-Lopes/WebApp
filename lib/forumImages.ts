// ============================================================
// Imagens do Fórum (bucket R2 dedicado, Cloudflare).
//
// A imagem entra no texto do post como um marcador `[img:<user>/<uuid>.<ext>]`
// no fim da mensagem (sem coluna nova): splitBody separa texto e imagens para
// editar, joinBody junta de volta para salvar. O envio passa pela edge function
// forum-image-upload, que valida login/tipo/tamanho e guarda as chaves do R2.
//
// Só aparece se VITE_FORUM_IMAGES_URL (domínio público do bucket) estiver definida.
// ============================================================

import { supabase } from './supabase';

const BASE = ((import.meta.env.VITE_FORUM_IMAGES_URL as string | undefined) ?? '').replace(/\/+$/, '');

export const forumImagesEnabled = BASE.length > 0;
export const MAX_IMAGES_PER_POST = 4;
// Mensagem + 4 marcadores (~340 caracteres) cabem nos 10.000 do banco.
export const FORUM_TEXT_MAX = 9600;

const MAX_SIDE = 1920;
const MAX_BYTES = 1.8 * 1024 * 1024; // abaixo dos 2 MB aceitos pela function

const KEY = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(?:webp|jpg|png)';
const MARKER_RE = new RegExp(`\\[img:(${KEY})\\]`, 'g');

export const imageUrl = (key: string) => `${BASE}/${key}`;

// Separa o texto dos marcadores de imagem (sem repetir imagens).
export function splitBody(body: string): { text: string; images: string[] } {
  const images: string[] = [];
  const text = body.replace(MARKER_RE, (_m, key: string) => {
    if (!images.includes(key)) images.push(key);
    return '';
  });
  return { text: text.replace(/\n{3,}/g, '\n\n').trim(), images };
}

export function joinBody(text: string, images: string[]): string {
  const markers = images.map((k) => `[img:${k}]`).join('\n');
  return [text.trim(), markers].filter(Boolean).join('\n\n');
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

// Reduz para até 1920 px e comprime em WebP (print de tela costuma passar de 2 MB).
async function prepareImage(file: Blob): Promise<Blob> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error('unsupported_type');

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_unavailable');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  for (const quality of [0.85, 0.7, 0.55]) {
    const blob = await toBlob(canvas, 'image/webp', quality);
    if (blob && blob.size <= MAX_BYTES) return blob;
  }
  throw new Error('image_too_large');
}

// Envia uma imagem (arquivo ou colada) e devolve a chave para o marcador.
export async function uploadForumImage(file: Blob): Promise<string> {
  const blob = await prepareImage(file);
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('not_authenticated');

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/forum-image-upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': blob.type,
    },
    body: blob,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || typeof json.key !== 'string') throw new Error(json.error ?? 'upload_failed');
  return json.key;
}

// --- Monitoramento (Painel Admin › Storage) ---

export interface ForumImagesStats {
  total_count: number;
  total_bytes: number;
  count_24h: number;
  count_7d: number;
  count_month: number;
  users: number;
  recent: { object_key: string; bytes: number; created_at: string; author: string | null }[];
}

// Só staff (a função do banco recusa os demais).
export async function fetchForumImagesStats(): Promise<ForumImagesStats> {
  const { data, error } = await supabase.rpc('admin_forum_images_stats');
  if (error) throw error;
  return data as ForumImagesStats;
}

// Apaga a imagem no R2 e no registro. Só staff (a função recusa os demais).
export async function deleteForumImage(key: string): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('not_authenticated');

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/forum-image-delete`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ key }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? 'delete_failed');
}

export function forumImageDeleteErrorMessage(err: unknown): string {
  switch ((err as Error)?.message) {
    case 'forbidden': return 'Apenas a equipe pode apagar imagens.';
    case 'not_found': return 'Imagem não encontrada. Atualize a lista.';
    case 'not_authenticated': return 'Entre novamente para apagar imagens.';
    case 'storage_error': return 'O R2 recusou o pedido. Tente de novo.';
    default: return 'Não foi possível apagar a imagem. Tente novamente.';
  }
}

export function forumImageErrorMessage(err: unknown): string {
  switch ((err as Error)?.message) {
    case 'unsupported_type': return 'Use uma imagem PNG, JPG ou WebP.';
    case 'image_too_large':
    case 'invalid_image': return 'Não foi possível usar esta imagem. Tente uma menor.';
    case 'rate_limited': return 'Você atingiu o limite diário de imagens. Tente amanhã.';
    case 'not_authenticated': return 'Entre novamente para enviar imagens.';
    default: return 'Não foi possível enviar a imagem. Tente novamente.';
  }
}
