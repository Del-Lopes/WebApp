import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const KNOWLEDGE_CATEGORIES = [
  'Licenças',
  'Robôs',
  'Pagamentos',
  'Educação',
  'Jornada',
  'Marketing',
  'Outros',
] as const;

export type KnowledgeCategory = typeof KNOWLEDGE_CATEGORIES[number];

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: KnowledgeCategory;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeInput {
  title: string;
  content: string;
  category: KnowledgeCategory;
  is_active?: boolean;
}

export function useKnowledge() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('chat_knowledge_base')
      .select('*')
      .order('category', { ascending: true })
      .order('updated_at', { ascending: false });
    if (err) {
      setError(err.message);
      setEntries([]);
    } else {
      setEntries((data ?? []) as KnowledgeEntry[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const createEntry = useCallback(async (input: KnowledgeInput): Promise<{ ok: boolean; error?: string }> => {
    if (!user) return { ok: false, error: 'Não autenticado' };
    const { error: err } = await supabase.from('chat_knowledge_base').insert({
      title: input.title.trim(),
      content: input.content.trim(),
      category: input.category,
      is_active: input.is_active ?? true,
      created_by: user.id,
    });
    if (err) return { ok: false, error: err.message };
    await fetchEntries();
    return { ok: true };
  }, [user, fetchEntries]);

  const updateEntry = useCallback(async (id: string, input: Partial<KnowledgeInput>): Promise<{ ok: boolean; error?: string }> => {
    const patch: Record<string, unknown> = {};
    if (input.title !== undefined) patch.title = input.title.trim();
    if (input.content !== undefined) patch.content = input.content.trim();
    if (input.category !== undefined) patch.category = input.category;
    if (input.is_active !== undefined) patch.is_active = input.is_active;
    const { error: err } = await supabase
      .from('chat_knowledge_base')
      .update(patch)
      .eq('id', id);
    if (err) return { ok: false, error: err.message };
    await fetchEntries();
    return { ok: true };
  }, [fetchEntries]);

  const toggleActive = useCallback(async (id: string, is_active: boolean) => {
    return updateEntry(id, { is_active });
  }, [updateEntry]);

  const deleteEntry = useCallback(async (id: string): Promise<{ ok: boolean; error?: string }> => {
    const { error: err } = await supabase.from('chat_knowledge_base').delete().eq('id', id);
    if (err) return { ok: false, error: err.message };
    setEntries((prev) => prev.filter((e) => e.id !== id));
    return { ok: true };
  }, []);

  return {
    entries,
    loading,
    error,
    refresh: fetchEntries,
    createEntry,
    updateEntry,
    toggleActive,
    deleteEntry,
  };
}
