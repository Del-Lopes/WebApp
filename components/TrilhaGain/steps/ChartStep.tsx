import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { ChartPayload } from '../../../types';

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
    const base = 'tg-btn w-full text-left px-4 py-3.5 rounded-2xl border font-medium';
    if (!checked) {
      return `${base} ${selected === i
        ? 'border-emerald-400 bg-emerald-50/80 text-emerald-800 ring-2 ring-emerald-200/60 shadow-[0_6px_16px_-8px_rgba(16,185,129,0.45)]'
        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 shadow-[var(--tg-shadow-sm)]'}`;
    }
    if (i === payload.correctIndex) return `${base} border-emerald-400 bg-emerald-50/80 text-emerald-800 ring-2 ring-emerald-200/60`;
    if (i === selected) return `${base} border-rose-300 bg-rose-50/80 text-rose-700`;
    return `${base} border-slate-200 bg-white text-slate-400`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
        <img
          src={payload.image_url}
          alt="Gráfico"
          className="w-full rounded-3xl mb-5 object-cover max-h-72 bg-slate-100 ring-1 ring-slate-100 shadow-[var(--tg-shadow-sm)]"
        />
        <h2 className="font-display text-[20px] leading-snug font-bold text-slate-900 tracking-tight mb-5">{payload.question}</h2>

        <div className="space-y-2.5">
          {payload.options.map((opt, i) => (
            <button key={i} disabled={checked} onClick={() => setSelected(i)} className={`${optionClass(i)} tg-rise tg-rise-${Math.min(i + 1, 4)}`}>
              {opt}
            </button>
          ))}
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
