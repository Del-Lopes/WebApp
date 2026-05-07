import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export type FeedbackRating = 'up' | 'down';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  /** Feedback do usuário atual sobre essa mensagem (apenas mensagens do assistant). null = sem feedback. */
  feedback?: FeedbackRating | null;
  /** Indica se o ID é temporário (mensagem ainda não persistida com ID real). Não permite feedback. */
  pending?: boolean;
}

interface UsageInfo {
  count: number;
  limit: number;
}

interface SendResult {
  ok: boolean;
  error?: string;
  warnHalf?: boolean;
  limitReached?: boolean;
}

const HISTORY_LIMIT = 50;

export function useChat() {
  const { user, session } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const halfWarnedTodayRef = useRef(false);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, role, content, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(HISTORY_LIMIT);
      if (error) {
        console.error('Erro ao carregar histórico:', error.message);
        setMessages([]);
        return;
      }
      const baseMessages = ((data ?? []) as ChatMessage[]).reverse();

      // Carrega feedbacks do próprio usuário sobre essas mensagens
      const assistantIds = baseMessages.filter((m) => m.role === 'assistant').map((m) => m.id);
      let feedbackMap = new Map<string, FeedbackRating>();
      if (assistantIds.length > 0) {
        const { data: fbData } = await supabase
          .from('chat_feedback')
          .select('message_id, rating')
          .eq('user_id', user.id)
          .in('message_id', assistantIds);
        feedbackMap = new Map((fbData ?? []).map((f: any) => [f.message_id, f.rating as FeedbackRating]));
      }

      setMessages(baseMessages.map((m) => ({
        ...m,
        feedback: m.role === 'assistant' ? feedbackMap.get(m.id) ?? null : undefined,
      })));
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadHistory();
    } else {
      setMessages([]);
      setUsage(null);
    }
  }, [user, loadHistory]);

  const sendMessage = useCallback(async (text: string): Promise<SendResult> => {
    if (!user || !session) {
      return { ok: false, error: 'Você precisa estar autenticado.' };
    }
    const trimmed = text.trim();
    if (!trimmed) return { ok: false, error: 'Mensagem vazia.' };
    if (trimmed.length > 2000) return { ok: false, error: 'Mensagem muito longa (máx. 2000 caracteres).' };

    setIsSending(true);

    // Otimista: adiciona a mensagem do usuário imediatamente
    const tempUserMsg: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const response = await fetch(`${supabaseUrl}/functions/v1/chat-assistant`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        let errMsg = 'Falha ao enviar a mensagem. Tente novamente.';
        let limitReached = false;
        if (data?.error === 'limit_reached') {
          limitReached = true;
          errMsg = data.message ?? errMsg;
          if (data.usage) setUsage({ count: data.usage.count, limit: data.usage.limit });
        } else if (data?.error) {
          errMsg = data.message ?? data.error;
        }
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
        return { ok: false, error: errMsg, limitReached };
      }

      if (!data?.reply) {
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
        return { ok: false, error: 'Resposta vazia do assistente.' };
      }

      // Substitui o ID temporário do usuário pelo real (se a função retornou)
      // e adiciona a resposta do assistant com o ID real (necessário para feedback).
      const realUserId: string | undefined = data.user_message_id ?? undefined;
      const realAssistantId: string | undefined = data.assistant_message_id ?? undefined;
      const assistantMsg: ChatMessage = {
        id: realAssistantId ?? `temp-assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        created_at: new Date().toISOString(),
        feedback: null,
        pending: !realAssistantId,
      };
      setMessages((prev) => {
        const next = prev.map((m) => (
          m.id === tempUserMsg.id && realUserId
            ? { ...m, id: realUserId, pending: false }
            : m
        ));
        next.push(assistantMsg);
        return next;
      });

      if (data.usage) {
        setUsage({ count: data.usage.count, limit: data.usage.limit });
      }

      const warnHalf = !!data.usage?.warn_half && !halfWarnedTodayRef.current;
      if (warnHalf) halfWarnedTodayRef.current = true;

      return { ok: true, warnHalf };
    } catch (e: any) {
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
      return { ok: false, error: e?.message ?? 'Erro inesperado.' };
    } finally {
      setIsSending(false);
    }
  }, [user, session]);

  const setMessageFeedback = useCallback(async (
    messageId: string,
    rating: FeedbackRating | null,
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!user) return { ok: false, error: 'Não autenticado' };
    if (messageId.startsWith('temp-')) {
      return { ok: false, error: 'Mensagem ainda não persistida — aguarde a próxima resposta.' };
    }

    // Atualização otimista
    const previous = messages.find((m) => m.id === messageId)?.feedback ?? null;
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, feedback: rating } : m)));

    try {
      if (rating === null) {
        const { error: err } = await supabase
          .from('chat_feedback')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', user.id);
        if (err) throw err;
      } else {
        // Upsert para "trocar" entre up/down sem duplicar
        const { error: err } = await supabase
          .from('chat_feedback')
          .upsert(
            { message_id: messageId, user_id: user.id, rating },
            { onConflict: 'message_id,user_id' },
          );
        if (err) throw err;
      }
      return { ok: true };
    } catch (e: any) {
      // Rollback
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, feedback: previous } : m)));
      return { ok: false, error: e?.message ?? 'Falha ao registrar feedback.' };
    }
  }, [user, messages]);

  const clearConversation = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    if (!user || !session) {
      return { ok: false, error: 'Você precisa estar autenticado.' };
    }
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const response = await fetch(`${supabaseUrl}/functions/v1/chat-assistant`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'clear' }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        return { ok: false, error: data?.error ?? 'Falha ao limpar a conversa.' };
      }
      setMessages([]);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'Erro inesperado.' };
    }
  }, [user, session]);

  return {
    messages,
    usage,
    isLoadingHistory,
    isSending,
    sendMessage,
    setMessageFeedback,
    clearConversation,
    reloadHistory: loadHistory,
  };
}
