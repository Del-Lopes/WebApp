import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface ChatStatsOverview {
  totalMessages: number;
  messagesInPeriod: number;
  activeUsersInPeriod: number;
  messagesToday: number;
  activeUsersToday: number;
  perDay: { date: string; count: number }[];
}

export interface ConversationSummary {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  message_count: number;
  last_message_at: string;
}

export interface ChatTopicSummary {
  id: string;
  topic: string;
  description: string | null;
  message_count: number;
  user_count: number;
  sample_messages: string[];
  period_days: number;
  generated_at: string;
}

const startOfDayUtc = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

function buildDateBuckets(periodDays: number): { date: string; count: number }[] {
  const buckets: { date: string; count: number }[] = [];
  const today = startOfDayUtc(new Date());
  for (let i = periodDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    buckets.push({ date: d.toISOString().slice(0, 10), count: 0 });
  }
  return buckets;
}

export function useChatStats(periodDays: number) {
  const [overview, setOverview] = useState<ChatStatsOverview | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [topics, setTopics] = useState<ChatTopicSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sinceDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
      const sinceIso = sinceDate.toISOString();
      const todayStart = startOfDayUtc(new Date()).toISOString();

      // 1. Mensagens no período (puxa user_id + created_at + content para agregar localmente)
      const { data: msgs, error: msgsError } = await supabase
        .from('chat_messages')
        .select('user_id, role, created_at')
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false })
        .limit(5000);
      if (msgsError) throw new Error(msgsError.message);

      // 2. Total geral (count exato)
      const { count: totalAll, error: countError } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true });
      if (countError) throw new Error(countError.message);

      const all = msgs ?? [];
      const messagesInPeriod = all.length;
      const activeUsersInPeriod = new Set(all.map((m) => m.user_id)).size;
      const todayMsgs = all.filter((m) => m.created_at >= todayStart);
      const messagesToday = todayMsgs.length;
      const activeUsersToday = new Set(todayMsgs.map((m) => m.user_id)).size;

      const buckets = buildDateBuckets(periodDays);
      const bucketIndex = new Map(buckets.map((b, i) => [b.date, i]));
      for (const m of all) {
        const date = m.created_at.slice(0, 10);
        const idx = bucketIndex.get(date);
        if (idx !== undefined) buckets[idx].count++;
      }

      setOverview({
        totalMessages: totalAll ?? 0,
        messagesInPeriod,
        activeUsersInPeriod,
        messagesToday,
        activeUsersToday,
        perDay: buckets,
      });

      // 3. Lista de conversas: agrupa por user_id, traz nome/email/role
      const conversationsMap = new Map<string, { count: number; last: string }>();
      for (const m of all) {
        const cur = conversationsMap.get(m.user_id);
        if (cur) {
          cur.count++;
          if (m.created_at > cur.last) cur.last = m.created_at;
        } else {
          conversationsMap.set(m.user_id, { count: 1, last: m.created_at });
        }
      }

      const userIds = Array.from(conversationsMap.keys());
      let profiles: { id: string; full_name: string | null; email: string | null; role: string | null }[] = [];
      if (userIds.length > 0) {
        const { data: profData, error: profError } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .in('id', userIds);
        if (profError) throw new Error(profError.message);
        profiles = profData ?? [];
      }
      const profileMap = new Map(profiles.map((p) => [p.id, p]));

      const conversationsList: ConversationSummary[] = userIds
        .map((uid) => {
          const stats = conversationsMap.get(uid)!;
          const p = profileMap.get(uid);
          return {
            user_id: uid,
            full_name: p?.full_name ?? null,
            email: p?.email ?? null,
            role: p?.role ?? null,
            message_count: stats.count,
            last_message_at: stats.last,
          };
        })
        .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at));
      setConversations(conversationsList);

      // 4. Tópicos (lê do que estiver salvo, mais recente primeiro)
      const { data: topicsData, error: topicsError } = await supabase
        .from('chat_topic_summaries')
        .select('*')
        .order('message_count', { ascending: false });
      if (topicsError) throw new Error(topicsError.message);
      setTopics((topicsData ?? []) as ChatTopicSummary[]);
    } catch (e: any) {
      setError(e?.message ?? 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  }, [periodDays]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { overview, conversations, topics, loading, error, refresh: fetchAll };
}
