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

export interface FeedbackItem {
  id: string;
  message_id: string;
  user_id: string;
  rating: 'up' | 'down';
  created_at: string;
  /** Resposta do bot (mensagem que recebeu o feedback) */
  assistant_content: string;
  assistant_created_at: string;
  /** Pergunta do usuário que precedeu a resposta */
  preceding_user_content: string | null;
  /** Perfil de quem deu o feedback */
  user_full_name: string | null;
  user_email: string | null;
}

export interface FeedbackOverview {
  total: number;
  up: number;
  down: number;
  approvalRate: number; // 0..1
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
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [feedbackOverview, setFeedbackOverview] = useState<FeedbackOverview | null>(null);
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

      // 5. Feedback no período
      const { data: fbData, error: fbError } = await supabase
        .from('chat_feedback')
        .select('id, message_id, user_id, rating, created_at')
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false })
        .limit(500);
      if (fbError) throw new Error(fbError.message);
      const feedbackRows = fbData ?? [];

      const upCount = feedbackRows.filter((f: any) => f.rating === 'up').length;
      const downCount = feedbackRows.filter((f: any) => f.rating === 'down').length;
      const totalFb = upCount + downCount;
      setFeedbackOverview({
        total: totalFb,
        up: upCount,
        down: downCount,
        approvalRate: totalFb > 0 ? upCount / totalFb : 0,
      });

      // Hidrata os items com a mensagem e a pergunta precedente.
      // Uma única query por user traz todas as mensagens necessárias — sem N+1.
      if (feedbackRows.length === 0) {
        setFeedbackItems([]);
      } else {
        const messageIds = feedbackRows.map((f: any) => f.message_id);
        const fbUserIds = Array.from(new Set(feedbackRows.map((f: any) => f.user_id))) as string[];

        // Busca em paralelo: mensagens do feedback + profiles
        const [{ data: msgsForFb }, { data: profsForFb }] = await Promise.all([
          supabase
            .from('chat_messages')
            .select('id, user_id, content, role, created_at')
            .in('id', messageIds),
          supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', fbUserIds),
        ]);
        const msgMap = new Map(((msgsForFb ?? []) as any[]).map((m) => [m.id, m]));
        const profMap = new Map(((profsForFb ?? []) as any[]).map((p) => [p.id, p]));

        // Para cada usuário que tem feedback, busca todas as mensagens 'user' de uma vez
        // (substitui N queries individuais por 1 query com .in('user_id', ...))
        const { data: allUserMsgs } = await supabase
          .from('chat_messages')
          .select('id, user_id, content, created_at')
          .in('user_id', fbUserIds)
          .eq('role', 'user')
          .order('created_at', { ascending: false });
        // Agrupa por user_id para lookup local O(1)
        const userMsgsByUser = new Map<string, any[]>();
        for (const m of (allUserMsgs ?? []) as any[]) {
          const arr = userMsgsByUser.get(m.user_id) ?? [];
          arr.push(m);
          userMsgsByUser.set(m.user_id, arr);
        }

        const itemsWithPreceding: FeedbackItem[] = [];
        for (const fb of feedbackRows as any[]) {
          const msg = msgMap.get(fb.message_id);
          if (!msg) continue;
          // Encontra a última mensagem do user antes do timestamp do bot — lookup local
          const userMsgs = userMsgsByUser.get(msg.user_id) ?? [];
          const prevMsg = userMsgs.find((m) => m.created_at < msg.created_at) ?? null;
          const prof = profMap.get(fb.user_id);
          itemsWithPreceding.push({
            id: fb.id,
            message_id: fb.message_id,
            user_id: fb.user_id,
            rating: fb.rating,
            created_at: fb.created_at,
            assistant_content: msg.content,
            assistant_created_at: msg.created_at,
            preceding_user_content: prevMsg?.content ?? null,
            user_full_name: prof?.full_name ?? null,
            user_email: prof?.email ?? null,
          });
        }
        setFeedbackItems(itemsWithPreceding);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  }, [periodDays]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    overview, conversations, topics,
    feedbackOverview, feedbackItems,
    loading, error,
    refresh: fetchAll,
  };
}
