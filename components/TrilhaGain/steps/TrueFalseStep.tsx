import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { TrueFalsePayload } from '../../../types';

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
    const base = 'tg-btn flex-1 py-7 rounded-3xl border font-display font-bold text-lg tracking-tight';
    if (!checked) {
      return `${base} ${selected === value
        ? 'border-emerald-400 bg-emerald-50/80 text-emerald-800 ring-2 ring-emerald-200/60 shadow-[0_8px_22px_-8px_rgba(16,185,129,0.45)]'
        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 shadow-[var(--tg-shadow-sm)]'}`;
    }
    if (value === payload.answer) return `${base} border-emerald-400 bg-emerald-50/80 text-emerald-800 ring-2 ring-emerald-200/60`;
    if (value === selected) return `${base} border-rose-300 bg-rose-50/80 text-rose-700`;
    return `${base} border-slate-200 bg-white text-slate-400`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 font-semibold mb-3">Verdadeiro ou Falso?</p>
        <h2 className="font-display text-[21px] leading-snug font-bold text-slate-900 tracking-tight mb-8">{payload.statement}</h2>

        <div className="flex gap-4">
          <button disabled={checked} onClick={() => setSelected(true)} className={`${btnClass(true)} tg-rise tg-rise-1`}>
            Verdadeiro
          </button>
          <button disabled={checked} onClick={() => setSelected(false)} className={`${btnClass(false)} tg-rise tg-rise-2`}>
            Falso
          </button>
        </div>

        {checked && (
          <div className={`tg-rise mt-5 p-4 rounded-2xl flex gap-3 ring-1 ${isCorrect ? 'bg-emerald-50/80 ring-emerald-100' : 'bg-rose-50/80 ring-rose-100'}`}>
            <div className={`grid place-items-center w-7 h-7 rounded-full shrink-0 ${isCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'}`}>
              {isCorrect ? <Check size={16} strokeWidth={3} /> : <X size={16} strokeWidth={3} />}
            </div>
            <div>
              <p className={`font-bold tracking-tight ${isCorrect ? 'text-emerald-800' : 'text-rose-700'}`}>
                {isCorrect ? 'Correto!' : 'Não foi dessa vez.'}
              </p>
              {payload.explanation && (
                <p className="text-sm text-slate-600 leading-relaxed mt-1">{payload.explanation}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {!checked ? (
        <button
          onClick={() => selected !== null && setChecked(true)}
          disabled={selected === null}
          className="tg-btn mt-6 w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:shadow-none text-white font-semibold text-lg shadow-[var(--tg-shadow-glow)]"
        >
          Verificar
        </button>
      ) : (
        <button
          onClick={handleContinue}
          className={`tg-btn mt-6 w-full py-4 rounded-2xl text-white font-semibold text-lg ${
            isCorrect
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-[var(--tg-shadow-glow)]'
              : 'bg-gradient-to-r from-rose-500 to-red-500 shadow-[0_8px_28px_-8px_rgba(244,63,94,0.5)]'
          }`}
        >
          {isCorrect ? 'Continuar' : 'Tentar de novo'}
        </button>
      )}
    </div>
  );
};
