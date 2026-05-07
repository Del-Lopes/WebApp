import React, { useEffect, useState } from 'react';
import { X, Loader2, Trash2, Bot, User as UserIcon, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { ConversationSummary } from '../../../hooks/useChatStats';

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
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-200">
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 text-lg truncate">
              {conversation.full_name || 'Sem nome'}
            </h3>
            <p className="text-sm text-slate-500 truncate">{conversation.email ?? '—'}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-500">
              <span className="px-2 py-0.5 rounded-full bg-slate-100 capitalize">{conversation.role ?? 'cliente'}</span>
              <span>{conversation.message_count} mensagens</span>
              <span>•</span>
              <span>Última: {formatTimestamp(conversation.last_message_at)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteAll}
              disabled={deletingAll || messages.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {deletingAll ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
              Apagar conversa
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Fechar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 bg-slate-50">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="animate-spin text-green-600" size={28} />
            </div>
          ) : error ? (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-slate-500 py-10">Nenhuma mensagem.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Bot size={16} className="text-green-600" />
                    </div>
                  )}
                  <div className={`group max-w-[75%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        msg.role === 'user'
                          ? 'bg-green-600 text-white rounded-br-md'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md'
                      }`}
                    >
                      {msg.content}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                      <span>{formatTimestamp(msg.created_at)}</span>
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        disabled={deletingId === msg.id}
                        className="opacity-0 group-hover:opacity-100 hover:text-red-600 transition-opacity disabled:opacity-50"
                        title="Apagar mensagem"
                      >
                        {deletingId === msg.id ? <Loader2 className="animate-spin" size={11} /> : <Trash2 size={11} />}
                      </button>
                    </div>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                      <UserIcon size={16} className="text-slate-600" />
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
