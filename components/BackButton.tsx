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
      className={`p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-green-600 transition-colors ${className}`}
    >
      <ArrowLeft size={24} />
    </button>
  );
};
