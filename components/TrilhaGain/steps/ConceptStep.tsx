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
      <div className="flex-1 overflow-y-auto">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">{payload.title}</h2>
        {payload.image_url && (
          <img
            src={payload.image_url}
            alt={payload.title}
            className="w-full rounded-2xl mb-4 object-contain max-h-64 bg-slate-50 border border-slate-100"
          />
        )}
        <p className="text-slate-600 leading-relaxed whitespace-pre-line">{payload.body}</p>
      </div>
      <button
        onClick={onContinue}
        className="mt-6 w-full py-4 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold text-lg transition-colors shadow-lg shadow-green-900/20"
      >
        Continuar
      </button>
    </div>
  );
};
