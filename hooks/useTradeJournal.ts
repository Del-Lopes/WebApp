import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { uploadToSupabase } from '../lib/storage';

export type TradeSide = 'buy' | 'sell';

export const EMOTIONAL_TAGS = [
  'Confiante',
  'Ansioso',
  'Ganancioso',
  'Indeciso',
  'Calmo',
  'Eufórico',
  'FOMO',
  'Frustrado',
  'Disciplinado',
  'Impaciente',
] as const;

export type EmotionalTag = typeof EMOTIONAL_TAGS[number];

export interface TradeEntry {
  id: string;
  user_id: string;
  asset: string;
  side: TradeSide;
  volume: number;
  entry_price: number | null;
  exit_price: number | null;
  opened_at: string;
  closed_at: string | null;
  result_amount: number | null;
  result_pips: number | null;
  entry_reason: string | null;
  exit_reason: string | null;
  analysis: string | null;
  emotional_tags: string[];
  emotional_note: string | null;
  rating: number | null;
  conclusion: string | null;
  screenshot_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface TradeInput {
  asset: string;
  side: TradeSide;
  volume: number;
  entry_price?: number | null;
  exit_price?: number | null;
  opened_at: string;
  closed_at?: string | null;
  result_amount?: number | null;
  result_pips?: number | null;
  entry_reason?: string | null;
  exit_reason?: string | null;
  analysis?: string | null;
  emotional_tags?: string[];
  emotional_note?: string | null;
  rating?: number | null;
  conclusion?: string | null;
  screenshot_url?: string | null;
}

export interface JournalStats {
  totalTrades: number;
  closedTrades: number;
  winRate: number; // 0..1
  resultSum: number;
  averageRating: number; // 0..5
}

const PAGE_SIZE = 200;

export function useTradeJournal() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TradeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('trade_journal')
      .select('*')
      .eq('user_id', user.id)
      .order('opened_at', { ascending: false })
      .limit(PAGE_SIZE);
    if (err) {
      setError(err.message);
      setEntries([]);
    } else {
      setEntries((data ?? []) as TradeEntry[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchEntries();
    else setEntries([]);
  }, [user, fetchEntries]);

  const uploadScreenshot = useCallback(async (file: File): Promise<string> => {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Imagem maior que 5MB. Reduza o tamanho antes de enviar.');
    }
    if (!file.type.startsWith('image/')) {
      throw new Error('O arquivo precisa ser uma imagem.');
    }
    setUploading(true);
    try {
      return await uploadToSupabase(file, 'trade-journal');
    } finally {
      setUploading(false);
    }
  }, []);

  const createEntry = useCallback(async (input: TradeInput): Promise<{ ok: boolean; error?: string; id?: string }> => {
    if (!user) return { ok: false, error: 'Não autenticado' };
    const payload = {
      user_id: user.id,
      asset: input.asset.trim().toUpperCase(),
      side: input.side,
      volume: input.volume,
      entry_price: input.entry_price ?? null,
      exit_price: input.exit_price ?? null,
      opened_at: input.opened_at,
      closed_at: input.closed_at ?? null,
      result_amount: input.result_amount ?? null,
      result_pips: input.result_pips ?? null,
      entry_reason: input.entry_reason?.trim() || null,
      exit_reason: input.exit_reason?.trim() || null,
      analysis: input.analysis?.trim() || null,
      emotional_tags: input.emotional_tags ?? [],
      emotional_note: input.emotional_note?.trim() || null,
      rating: input.rating ?? null,
      conclusion: input.conclusion?.trim() || null,
      screenshot_url: input.screenshot_url ?? null,
    };
    const { data, error: err } = await supabase
      .from('trade_journal')
      .insert(payload)
      .select('id')
      .single();
    if (err) return { ok: false, error: err.message };
    await fetchEntries();
    return { ok: true, id: data?.id };
  }, [user, fetchEntries]);

  const updateEntry = useCallback(async (id: string, input: Partial<TradeInput>): Promise<{ ok: boolean; error?: string }> => {
    const patch: Record<string, unknown> = {};
    if (input.asset !== undefined) patch.asset = input.asset.trim().toUpperCase();
    if (input.side !== undefined) patch.side = input.side;
    if (input.volume !== undefined) patch.volume = input.volume;
    if (input.entry_price !== undefined) patch.entry_price = input.entry_price;
    if (input.exit_price !== undefined) patch.exit_price = input.exit_price;
    if (input.opened_at !== undefined) patch.opened_at = input.opened_at;
    if (input.closed_at !== undefined) patch.closed_at = input.closed_at;
    if (input.result_amount !== undefined) patch.result_amount = input.result_amount;
    if (input.result_pips !== undefined) patch.result_pips = input.result_pips;
    if (input.entry_reason !== undefined) patch.entry_reason = input.entry_reason?.trim() || null;
    if (input.exit_reason !== undefined) patch.exit_reason = input.exit_reason?.trim() || null;
    if (input.analysis !== undefined) patch.analysis = input.analysis?.trim() || null;
    if (input.emotional_tags !== undefined) patch.emotional_tags = input.emotional_tags;
    if (input.emotional_note !== undefined) patch.emotional_note = input.emotional_note?.trim() || null;
    if (input.rating !== undefined) patch.rating = input.rating;
    if (input.conclusion !== undefined) patch.conclusion = input.conclusion?.trim() || null;
    if (input.screenshot_url !== undefined) patch.screenshot_url = input.screenshot_url;
    const { error: err } = await supabase.from('trade_journal').update(patch).eq('id', id);
    if (err) return { ok: false, error: err.message };
    await fetchEntries();
    return { ok: true };
  }, [fetchEntries]);

  const deleteEntry = useCallback(async (id: string): Promise<{ ok: boolean; error?: string }> => {
    const { error: err } = await supabase.from('trade_journal').delete().eq('id', id);
    if (err) return { ok: false, error: err.message };
    setEntries((prev) => prev.filter((e) => e.id !== id));
    return { ok: true };
  }, []);

  const stats: JournalStats = useMemo(() => {
    const closed = entries.filter((e) => e.result_amount !== null && e.closed_at !== null);
    const wins = closed.filter((e) => (e.result_amount ?? 0) > 0).length;
    const sum = entries.reduce((acc, e) => acc + (e.result_amount ?? 0), 0);
    const ratings = entries.map((e) => e.rating).filter((r): r is number => r != null);
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    return {
      totalTrades: entries.length,
      closedTrades: closed.length,
      winRate: closed.length > 0 ? wins / closed.length : 0,
      resultSum: sum,
      averageRating: avgRating,
    };
  }, [entries]);

  return {
    entries,
    stats,
    loading,
    error,
    uploading,
    refresh: fetchEntries,
    createEntry,
    updateEntry,
    deleteEntry,
    uploadScreenshot,
  };
}
