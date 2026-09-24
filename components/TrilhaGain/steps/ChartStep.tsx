import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { ChartPayload } from '../../../types';
import { Button } from '../../ui';

interface Props {
  payload: ChartPayload;
  onResolved: (correct: boolean) => void;
}

// Desafio de gráfico: print do gráfico + pergunta de múltipla escolha.
export const ChartStep: React.FC<Props> = ({ payload, onResolved }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);

  const isCorrect = selected === payload.correctIndex;

  const handleContinue = () => {
    if (isCorrect) {
      onResolved(true);
    } else {
      setChecked(false);
      setSelected(null);
      onResolved(false);
    }
  };

  const optionClass = (i: number): string => {
    const base = 'w-full text-left px-4 py-3 rounded-2xl border-2 font-medium transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60';
    if (!checked) {
      return `${base} ${selected === i
        ? 'border-accent/60 bg-accent/10 text-fg'
        : 'border-tint/10 bg-tint/3 hover:border-tint/20 hover:bg-tint/5 text-fg'}`;
    }
    if (i === payload.correctIndex) return `${base} border-success/60 bg-success/10 text-success-fg`;
    if (i === selected) return `${base} border-danger/60 bg-danger/10 text-danger-fg`;
    return `${base} border-tint/8 bg-tint/2 text-fg-subtle`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <img
          src={payload.image_url}
          alt="Gráfico"
          className="w-full rounded-2xl mb-4 object-cover max-h-72 bg-tint/5 border border-tint/8"
        />
        <h2 className="font-display text-lg font-semibold text-fg mb-5">{payload.question}</h2>

        <div className="space-y-3">
          {payload.options.map((opt, i) => (
            <button key={i} disabled={checked} onClick={() => setSelected(i)} className={optionClass(i)}>
              {opt}
            </button>
          ))}
        </div>

        {checked && (
          <div className={`mt-5 p-4 rounded-2xl border flex gap-3 ${isCorrect ? 'bg-success/10 border-success/20' : 'bg-danger/10 border-danger/20'}`}>
            <div className={`shrink-0 ${isCorrect ? 'text-success-fg' : 'text-danger-fg'}`}>
              {isCorrect ? <Check size={22} /> : <X size={22} />}
            </div>
            <div>
              <p className={`font-bold ${isCorrect ? 'text-success-fg' : 'text-danger-fg'}`}>
                {isCorrect ? 'Correto!' : 'Não foi dessa vez.'}
              </p>
              {payload.explanation && (
                <p className="text-sm text-fg-muted mt-1">{payload.explanation}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {!checked ? (
        <Button
          size="lg"
          onClick={() => selected !== null && setChecked(true)}
          disabled={selected === null}
          className="mt-6 w-full h-14 rounded-2xl text-lg font-bold"
        >
          Verificar
        </Button>
      ) : (
        <Button
          size="lg"
          variant={isCorrect ? 'primary' : 'danger'}
          onClick={handleContinue}
          className="mt-6 w-full h-14 rounded-2xl text-lg font-bold"
        >
          {isCorrect ? 'Continuar' : 'Tentar de novo'}
        </Button>
      )}
    </div>
  );
};
