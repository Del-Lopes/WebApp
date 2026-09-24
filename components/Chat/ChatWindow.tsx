import React, { useEffect, useRef, useState } from 'react';
import { X, Send, Loader2, AlertTriangle, Trash2, ThumbsUp, ThumbsDown, Home } from 'lucide-react';

const ASSISTANT_AVATAR_SRC = '/images/logo-icon.png';
import { useChat, type FeedbackRating } from '../../hooks/useChat';

interface ChatWindowProps {
  onClose: () => void;
}

const QUICK_PROMPTS = [
  'Como ativo minha licença?',
  'Mensagem de Licença inválida no metatrader',
  'Como Permitir WebRequest?',
  'Como instalar um robô?',
];

export function ChatWindow({ onClose }: ChatWindowProps) {
  const { messages, usage, isLoadingHistory, isSending, sendMessage, setMessageFeedback, clearConversation, resetToHome } = useChat();
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'info' | 'error'; text: string } | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  const submit = async (text: string) => {
    if (!text.trim() || isSending) return;
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

  const handleSend = () => submit(input);

  const handleFeedback = async (messageId: string, target: FeedbackRating, current: FeedbackRating | null) => {
    // Toggle: clicar no mesmo remove o feedback
    const newRating: FeedbackRating | null = current === target ? null : target;
    const result = await setMessageFeedback(messageId, newRating);
    if (!result.ok) {
      setFeedback({ type: 'error', text: result.error ?? 'Falha ao registrar avaliação.' });
    }
  };

  const handleClear = async () => {
    if (isClearing || messages.length === 0) return;
    if (!window.confirm('Apagar todo o histórico desta conversa? Esta ação não pode ser desfeita.')) return;
    setIsClearing(true);
    setFeedback(null);
    const result = await clearConversation();
    setIsClearing(false);
    if (!result.ok) {
      setFeedback({ type: 'error', text: result.error ?? 'Falha ao limpar.' });
    }
  };

  const handleResetToHome = () => {
    if (messages.length === 0) return;
    setFeedback(null);
    setInput('');
    resetToHome();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const limitReached = usage ? usage.count >= usage.limit : false;

  return (
    <div className="fixed bottom-24 right-4 md:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 max-w-md h-[32rem] max-h-[calc(100vh-8rem)] flex flex-col rounded-2xl shadow-2xl border border-tint/10 bg-surface text-fg overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="relative flex items-center justify-between px-4 py-3 border-b border-tint/6 bg-elevated">
        <div className="hairline absolute inset-x-0 top-0" aria-hidden />
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center overflow-hidden">
            <img src={ASSISTANT_AVATAR_SRC} alt="Assistente Trader AFK" className="w-7 h-7 object-contain" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-sm leading-tight text-fg">Assistente Trader AFK</h3>
            <p className="text-xs text-fg-muted flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-brand-green" aria-hidden />Suporte da plataforma</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={handleResetToHome}
              className="p-1.5 rounded-lg text-fg-subtle hover:text-fg hover:bg-tint/5 transition-colors"
              aria-label="Voltar ao início"
              title="Voltar ao início"
            >
              <Home size={16} />
            </button>
          )}
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              disabled={isClearing}
              className="p-1.5 rounded-lg text-fg-subtle hover:text-fg hover:bg-tint/5 transition-colors disabled:opacity-50"
              aria-label="Apagar histórico"
              title="Apagar histórico"
            >
              {isClearing ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-fg-subtle hover:text-fg hover:bg-tint/5 transition-colors"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto ds-scrollbar px-4 py-4 bg-page">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="animate-spin text-accent" size={28} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-2">
            <div className="w-14 h-14 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mb-3 overflow-hidden">
              <img src={ASSISTANT_AVATAR_SRC} alt="Assistente Trader AFK" className="w-10 h-10 object-contain" />
            </div>
            <h4 className="font-display font-semibold text-fg mb-1">Olá! Como posso ajudar?</h4>
            <p className="text-sm text-fg-muted leading-relaxed mb-4 px-2">
              Tire dúvidas sobre licenças, robôs, navegação e demais recursos da plataforma Trader AFK.
            </p>
            <div className="w-full flex flex-col gap-2 mt-2">
              <span className="eyebrow-muted">Sugestões</span>
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  onClick={() => submit(q)}
                  disabled={isSending}
                  className="text-left text-sm text-fg bg-tint/3 border border-tint/10 hover:border-accent/50 hover:bg-accent/5 rounded-xl px-3 py-2 transition-colors disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    msg.role === 'user'
                      ? 'bg-accent/15 border border-accent/25 text-fg rounded-br-md'
                      : 'bg-surface border border-tint/10 text-fg rounded-bl-md'
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === 'assistant' && !msg.pending && (
                  <div className="flex items-center gap-1 mt-1 ml-1">
                    <button
                      onClick={() => handleFeedback(msg.id, 'up', msg.feedback ?? null)}
                      className={`p-1 rounded-sm transition-colors ${
                        msg.feedback === 'up'
                          ? 'text-success-fg bg-success/10'
                          : 'text-fg-subtle hover:text-success-fg hover:bg-tint/5'
                      }`}
                      aria-label="Resposta útil"
                      title={msg.feedback === 'up' ? 'Remover avaliação' : 'Útil'}
                    >
                      <ThumbsUp size={13} />
                    </button>
                    <button
                      onClick={() => handleFeedback(msg.id, 'down', msg.feedback ?? null)}
                      className={`p-1 rounded-sm transition-colors ${
                        msg.feedback === 'down'
                          ? 'text-danger-fg bg-danger/10'
                          : 'text-fg-subtle hover:text-danger-fg hover:bg-tint/5'
                      }`}
                      aria-label="Resposta não foi útil"
                      title={msg.feedback === 'down' ? 'Remover avaliação' : 'Não foi útil'}
                    >
                      <ThumbsDown size={13} />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div className="bg-surface border border-tint/10 rounded-2xl rounded-bl-md px-3.5 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-fg-subtle animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-fg-subtle animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-fg-subtle animate-bounce" />
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
              ? 'bg-danger/10 text-danger-fg border-danger/20'
              : 'bg-warning/10 text-warning-fg border-warning/20'
          }`}
        >
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span className="leading-snug">{feedback.text}</span>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-tint/6 bg-surface p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={limitReached ? 'Limite diário atingido' : 'Digite sua dúvida…'}
            disabled={isSending || limitReached}
            rows={1}
            maxLength={2000}
            className="flex-1 resize-none rounded-xl border border-tint/10 bg-tint/3 px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:outline-hidden focus:border-accent/60 focus:ring-3 focus:ring-accent/20 disabled:opacity-50 max-h-32 ds-scrollbar"
            style={{ minHeight: '40px' }}
          />
          <button
            onClick={handleSend}
            disabled={isSending || !input.trim() || limitReached}
            className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-brand-green-bright to-brand-green text-brand-dark flex items-center justify-center hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            aria-label="Enviar"
          >
            {isSending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          </button>
        </div>
        {usage && (
          <div className="mt-2 flex items-center justify-between text-[11px] text-fg-subtle">
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
