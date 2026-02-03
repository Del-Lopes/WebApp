
import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  onClick: () => void;
  label?: string;
  className?: string; // Allow custom styling positioning
}

export const BackButton: React.FC<BackButtonProps> = ({ onClick, label = "Voltar para o Início", className = "mb-6" }) => {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 text-slate-500 hover:text-green-600 transition-colors group ${className}`}
    >
      <div className="p-2 rounded-full bg-white border border-slate-200 group-hover:border-green-200 group-hover:bg-green-50 transition-all">
        <ArrowLeft size={20} />
      </div>
      <span className="font-medium">{label}</span>
    </button>
  );
};
