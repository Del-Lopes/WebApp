import React, { useEffect, useState } from 'react';
import { X, Loader2, Trash2, Bot, User as UserIcon, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { ConversationSummary } from '../../../hooks/useChatStats';
import { Badge, Button, EmptyState, Skeleton } from '../../ui';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface ConversationDetailProps {
  conversation: ConversationSummary;
  onClose: () => void;
  onChanged: () => void;
}

export function ConversationDetail({ conversation, onClose, onChanged }: ConversationDetailProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('chat_messages')
      .select('id, role, content, created_at')
      .eq('user_id', conversation.user_id)
      .order('created_at', { ascending: true });
    if (err) {
      setError(err.message);
    } else {
      setMessages((data ?? []) as Message[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.user_id]);

  const handleDeleteMessage = async (id: string) => {
    if (!window.confirm('Apagar esta mensagem definitivamente?')) return;
    setDeletingId(id);
    const { error: err } = await supabase.from('chat_messages').delete().eq('id', id);
    setDeletingId(null);
    if (err) {
      setError(err.message);
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== id));
      onChanged();
    }
  };

  const handleDeleteAll = async () => {
    const name = conversation.full_name || conversation.email || 'este usuário';
    if (!window.confirm(`Apagar TODA a conversa de ${name} definitivamente? Esta ação não pode ser desfeita.`)) return;
    setDeletingAll(true);
    const { error: err } = await supabase
      .from('chat_messages')
      .delete()
      .eq('user_id', conversation.user_id);
    setDeletingAll(false);
    if (err) {
      setError(err.message);
    } else {
      setMessages([]);
      onChanged();
      onClose();
    }
  };

  const formatTimestamp = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="relative overflow-hidden bg-surface text-fg border border-tint/10 rounded-t-2xl sm:rounded-2xl w-full max-w-3xl max-h-[92dvh] sm:max-h-[90vh] flex flex-col"
      >
        <div className="hairline absolute inset-x-0 top-0" aria-hidden />
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-tint/6">
          <div className="min-w-0">
            <h3 className="font-display font-semibold text-fg text-lg truncate">
              {conversation.full_name || 'Sem nome'}
            </h3>
            <p className="text-sm text-fg-muted truncate">{conversation.email ?? '—'}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-fg-muted">
              <Badge className="capitalize">{conversation.role ?? 'cliente'}</Badge>
              <span className="whitespace-nowrap"><span className="font-mono tabular-nums">{conversation.message_count}</span> mensagens</span>
              <span aria-hidden>•</span>
              <span className="whitespace-nowrap">Última: <span className="font-mono tabular-nums">{formatTimestamp(conversation.last_message_at)}</span></span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteAll}
              disabled={deletingAll || messages.length === 0}
              title="Apagar conversa"
            >
              {deletingAll ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
              <span className="hidden sm:inline">Apagar conversa</span>
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-fg-subtle hover:text-fg hover:bg-tint/5 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
              aria-label="Fechar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto ds-scrollbar p-5 bg-page/40">
          {loading ? (
            <div className="flex flex-col gap-3" aria-busy="true">
              <Skeleton className="h-12 w-2/3 rounded-2xl" />
              <Skeleton className="h-10 w-1/2 rounded-2xl self-end" />
              <Skeleton className="h-16 w-3/4 rounded-2xl" />
            </div>
          ) : error ? (
            <div role="alert" className="flex items-start gap-2 p-3 rounded-lg bg-danger/10 text-danger-fg border border-danger/20 text-sm">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : messages.length === 0 ? (
            <EmptyState title="Nenhuma mensagem." className="py-10" />
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                      <Bot size={16} className="text-accent-fg" />
                    </div>
                  )}
                  <div className={`group max-w-[75%] min-w-0 flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words text-fg ${
                        msg.role === 'user'
                          ? 'bg-tint/5 border border-tint/8 rounded-br-md'
                          : 'bg-accent/10 border border-accent/20 rounded-bl-md'
                      }`}
                    >
                      {msg.content}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-fg-subtle">
                      <span className="font-mono tabular-nums">{formatTimestamp(msg.created_at)}</span>
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        disabled={deletingId === msg.id}
                        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-danger-fg transition-opacity disabled:opacity-50 rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                        title="Apagar mensagem"
                        aria-label="Apagar mensagem"
                      >
                        {deletingId === msg.id ? <Loader2 className="animate-spin" size={11} /> : <Trash2 size={11} />}
                      </button>
                    </div>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-tint/8 border border-tint/10 flex items-center justify-center shrink-0">
                      <UserIcon size={16} className="text-fg-muted" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
