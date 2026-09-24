import { supabase } from './supabase';
import type { Article } from '../types';

// Colunas que os cards de listagem exibem. O HTML completo (content) pode ter
// dezenas de KB por artigo e só é buscado ao abrir ou editar um artigo.
export const ARTICLE_LIST_COLUMNS = 'id, title, excerpt, image_url, gallery_urls, category, created_at';

// Artigo vindo da listagem não tem `content`; completa antes de ler/editar.
export async function withArticleContent(article: Article): Promise<Article> {
  if (article.content !== undefined) return article;
  const { data, error } = await supabase
    .from('articles')
    .select('content')
    .eq('id', article.id)
    .maybeSingle();
  if (error) throw error;
  return { ...article, content: data?.content ?? '' };
}
