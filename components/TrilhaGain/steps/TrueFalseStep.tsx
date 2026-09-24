import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { TrueFalsePayload } from '../../../types';
import { Button } from '../../ui';

interface Props {
  payload: TrueFalsePayload;
  // Sem "vidas": erro mostra explicação e permite tentar de novo.
  onResolved: (correct: boolean) => void;
}

export const TrueFalseStep: React.FC<Props> = ({ payload, onResolved }) => {
  const [selected, setSelected] = useState<boolean | null>(null);
  const [checked, setChecked] = useState(false);

  const isCorrect = selected === payload.answer;

  const handleContinue = () => {
    if (isCorrect) {
      onResolved(true);
    } else {
      setChecked(false);
      setSelected(null);
      onResolved(false);
    }
  };

  const btnClass = (value: boolean): string => {
    const base = 'flex-1 py-6 rounded-2xl border-2 font-bold text-lg transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60';
    if (!checked) {
      return `${base} ${selected === value
        ? 'border-accent/60 bg-accent/10 text-fg'
        : 'border-tint/10 bg-tint/3 hover:border-tint/20 hover:bg-tint/5 text-fg'}`;
    }
    if (value === payload.answer) return `${base} border-success/60 bg-success/10 text-success-fg`;
    if (value === selected) return `${base} border-danger/60 bg-danger/10 text-danger-fg`;
    return `${base} border-tint/8 bg-tint/2 text-fg-subtle`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <p className="eyebrow-muted mb-3">Verdadeiro ou Falso?</p>
        <h2 className="font-display text-xl font-semibold text-fg mb-8">{payload.statement}</h2>

        <div className="flex gap-3 sm:gap-4">
          <button disabled={checked} onClick={() => setSelected(true)} className={btnClass(true)}>
            Verdadeiro
          </button>
          <button disabled={checked} onClick={() => setSelected(false)} className={btnClass(false)}>
            Falso
          </button>
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
