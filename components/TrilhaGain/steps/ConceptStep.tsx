import React from 'react';
import { ConceptPayload } from '../../../types';

interface Props {
  payload: ConceptPayload;
  onContinue: () => void;
}

// Card de conceito: apenas leitura, botão "Continuar" sempre habilitado.
export const ConceptStep: React.FC<Props> = ({ payload, onContinue }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
        <h2 className="font-display text-[26px] leading-tight font-bold text-slate-900 tracking-tight mb-4">{payload.title}</h2>
        {payload.image_url && (
          <img
            src={payload.image_url}
            alt={payload.title}
            className="w-full rounded-3xl mb-5 object-contain max-h-64 bg-white ring-1 ring-slate-100 shadow-[var(--tg-shadow-sm)]"
          />
        )}
        <p className="text-[15px] text-slate-600 leading-[1.7] whitespace-pre-line">{payload.body}</p>
      </div>
      <button
        onClick={onContinue}
        className="tg-btn mt-6 w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-lg shadow-[var(--tg-shadow-glow)]"
      >
        Continuar
      </button>
    </div>
  );
};
