import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  onClick: () => void;
  className?: string; // Allow custom styling
}

export const BackButton: React.FC<BackButtonProps> = ({ onClick, className = "" }) => {
  return (
    <button
      onClick={onClick}
      aria-label="Voltar"
      className={`p-2 rounded-lg border border-tint/10 bg-tint/3 text-fg-muted hover:text-fg hover:border-accent/40 hover:bg-accent/5 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 ${className}`}
    >
      <ArrowLeft size={20} />
    </button>
  );
};
