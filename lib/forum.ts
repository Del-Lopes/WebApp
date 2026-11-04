// ============================================================
// Fórum — categorias, tópicos e respostas.
//
// Autor, nome exibido e contadores são preenchidos por trigger no banco
// (20261031_forum_prop_firms.sql): o client manda só o conteúdo.
// ============================================================

import { supabase } from './supabase';

export interface ForumCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
}

export interface ForumTopic {
  id: string;
  category_id: string;
  /** null = autor excluiu a conta (a mensagem permanece, anônima). */
  author_id: string | null;
  author_name: string;
  author_role: string | null;
  title: string;
  body: string;
  is_pinned: boolean;
  is_locked: boolean;
  reply_count: number;
  last_reply_at: string;
  created_at: string;
  updated_at: string;
}

export interface ForumPost {
  id: string;
  topic_id: string;
  author_id: string | null;
  author_name: string;
  author_role: string | null;
  body: string;
  created_at: string;
  updated_at: string;
}

const TOPIC_COLUMNS =
  'id, category_id, author_id, author_name, author_role, title, body, is_pinned, is_locked, reply_count, last_reply_at, created_at, updated_at';
const POST_COLUMNS = 'id, topic_id, author_id, author_name, author_role, body, created_at, updated_at';

export const PAGE_SIZE = 20;

export async function fetchCategories(): Promise<ForumCategory[]> {
  const { data, error } = await supabase
    .from('forum_categories')
    .select('id, slug, name, description, sort_order')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ForumCategory[];
}

export async function fetchTopics(opts: { categoryId?: string | null; search?: string; page?: number }): Promise<ForumTopic[]> {
  const page = opts.page ?? 0;
  let q = supabase
    .from('forum_topics')
    .select(TOPIC_COLUMNS)
    .order('is_pinned', { ascending: false })
    .order('last_reply_at', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  if (opts.categoryId) q = q.eq('category_id', opts.categoryId);
  const term = opts.search?.trim().replace(/[%,()]/g, ' ');
  if (term) q = q.or(`title.ilike.%${term}%,body.ilike.%${term}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ForumTopic[];
}

export async function fetchTopic(id: string): Promise<ForumTopic | null> {
  const { data, error } = await supabase.from('forum_topics').select(TOPIC_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data as ForumTopic | null;
}

export async function fetchPosts(topicId: string): Promise<ForumPost[]> {
  const { data, error } = await supabase
    .from('forum_posts')
    .select(POST_COLUMNS)
    .eq('topic_id', topicId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ForumPost[];
}

export async function createTopic(categoryId: string, title: string, body: string): Promise<ForumTopic> {
  const { data, error } = await supabase
    .from('forum_topics')
    .insert({ category_id: categoryId, title: title.trim(), body: body.trim() })
    .select(TOPIC_COLUMNS)
    .single();
  if (error) throw error;
  return data as ForumTopic;
}

export async function updateTopic(id: string, patch: Partial<Pick<ForumTopic, 'title' | 'body' | 'is_pinned' | 'is_locked'>>): Promise<void> {
  const { error } = await supabase.from('forum_topics').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteTopic(id: string): Promise<void> {
  const { error } = await supabase.from('forum_topics').delete().eq('id', id);
  if (error) throw error;
}

export async function createPost(topicId: string, body: string): Promise<ForumPost> {
  const { data, error } = await supabase
    .from('forum_posts')
    .insert({ topic_id: topicId, body: body.trim() })
    .select(POST_COLUMNS)
    .single();
  if (error) throw error;
  return data as ForumPost;
}

export async function updatePost(id: string, body: string): Promise<void> {
  const { error } = await supabase.from('forum_posts').update({ body: body.trim() }).eq('id', id);
  if (error) throw error;
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await supabase.from('forum_posts').delete().eq('id', id);
  if (error) throw error;
}

// "há 5 min", "há 2 h", "há 3 dias", depois data curta.
export function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) {
    const d = Math.floor(diff / 86400);
    return `há ${d} ${d === 1 ? 'dia' : 'dias'}`;
  }
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function roleLabel(role: string | null): string | null {
  if (role === 'admin') return 'Equipe';
  if (role === 'first_mate') return 'Moderador';
  if (role === 'partner') return 'Parceiro';
  return null;
}
