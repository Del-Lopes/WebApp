import React from 'react';
import { ConceptPayload } from '../../../types';
import { Button } from '../../ui';

interface Props {
  payload: ConceptPayload;
  onContinue: () => void;
}

// Card de conceito: apenas leitura, botão "Continuar" sempre habilitado.
export const ConceptStep: React.FC<Props> = ({ payload, onContinue }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <h2 className="font-display text-2xl font-semibold text-fg mb-4">{payload.title}</h2>
        {payload.image_url && (
          <img
            src={payload.image_url}
            alt={payload.title}
            className="w-full rounded-2xl mb-4 object-contain max-h-64 bg-tint/3 border border-tint/8"
          />
        )}
        <p className="text-fg-muted leading-relaxed whitespace-pre-line">{payload.body}</p>
      </div>
      <Button
        size="lg"
        onClick={onContinue}
        className="mt-6 w-full h-14 rounded-2xl text-lg font-bold"
      >
        Continuar
      </Button>
    </div>
  );
};
