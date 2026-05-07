import React, { useEffect, useRef, useState } from 'react';
import { X, Send, Loader2, Bot, AlertTriangle } from 'lucide-react';
import { useChat } from '../../hooks/useChat';

interface ChatWindowProps {
  onClose: () => void;
}

export function ChatWindow({ onClose }: ChatWindowProps) {
  const { messages, usage, isLoadingHistory, isSending, sendMessage } = useChat();
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'info' | 'error'; text: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    const text = input;
    setInput('');
    setFeedback(null);

    const result = await sendMessage(text);

    if (!result.ok) {
      setFeedback({ type: 'error', text: result.error ?? 'Erro ao enviar.' });
    } else if (result.warnHalf) {
      setFeedback({
        type: 'info',
        text: 'Você atingiu 50% do seu limite diário de mensagens.',
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const limitReached = usage ? usage.count >= usage.limit : false;

  return (
    <div className="fixed bottom-24 right-4 md:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 max-w-md h-[32rem] max-h-[calc(100vh-8rem)] flex flex-col rounded-2xl shadow-2xl border border-slate-200 bg-white overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <Bot size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-sm leading-tight">Assistente Trader AFK</h3>
            <p className="text-xs text-green-50/90">Suporte da plataforma</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 bg-slate-50">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="animate-spin text-green-600" size={28} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-3">
              <Bot className="text-green-600" size={26} />
            </div>
            <h4 className="font-semibold text-slate-800 mb-1">Olá! Como posso ajudar?</h4>
            <p className="text-sm text-slate-500 leading-relaxed">
              Tire dúvidas sobre licenças, robôs, navegação e demais recursos da plataforma Trader AFK.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    msg.role === 'user'
                      ? 'bg-green-600 text-white rounded-br-md'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-3.5 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Feedback bar */}
      {feedback && (
        <div
          className={`px-4 py-2 text-xs flex items-start gap-2 border-t ${
            feedback.type === 'error'
              ? 'bg-red-50 text-red-700 border-red-100'
              : 'bg-amber-50 text-amber-800 border-amber-100'
          }`}
        >
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <span className="leading-snug">{feedback.text}</span>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-slate-200 bg-white p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={limitReached ? 'Limite diário atingido' : 'Digite sua dúvida…'}
            disabled={isSending || limitReached}
            rows={1}
            maxLength={2000}
            className="flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-400 max-h-32 custom-scrollbar"
            style={{ minHeight: '40px' }}
          />
          <button
            onClick={handleSend}
            disabled={isSending || !input.trim() || limitReached}
            className="h-10 w-10 flex-shrink-0 rounded-xl bg-green-600 text-white flex items-center justify-center hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            aria-label="Enviar"
          >
            {isSending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          </button>
        </div>
        {usage && (
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              {usage.count} / {usage.limit} mensagens hoje
            </span>
            <span>Pressione Enter para enviar</span>
          </div>
        )}
      </div>
    </div>
  );
}
