import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
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
      } else {
        setMessages(((data ?? []) as ChatMessage[]).reverse());
      }
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

      // Substitui a mensagem otimista e adiciona a resposta
      const assistantMsg: ChatMessage = {
        id: `temp-assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

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
    clearConversation,
    reloadHistory: loadHistory,
  };
}
