import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { ChatWindow } from './ChatWindow';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {isOpen && <ChatWindow onClose={() => setIsOpen(false)} />}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-brand-green-bright to-brand-green text-brand-dark shadow-[0_12px_40px_-12px_rgba(34,197,94,0.7)] hover:brightness-110 hover:-translate-y-0.5 flex items-center justify-center transition-all duration-300 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-page"
        aria-label={isOpen ? 'Fechar chat' : 'Abrir chat de suporte'}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </>
  );
}
