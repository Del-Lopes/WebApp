import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { QuizPayload } from '../../../types';

interface Props {
  payload: QuizPayload;
  // Reporta se acertou e libera o avanço. Sem "vidas": erro só mostra explicação
  // e permite tentar de novo.
  onResolved: (correct: boolean) => void;
}

export const QuizStep: React.FC<Props> = ({ payload, onResolved }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);

  const isCorrect = selected === payload.correctIndex;

  const handleCheck = () => {
    if (selected === null) return;
    setChecked(true);
  };

  const handleContinue = () => {
    if (isCorrect) {
      onResolved(true);
    } else {
      // Erro: reseta para nova tentativa (mantém feedback mostrado até reescolher)
      setChecked(false);
      setSelected(null);
      onResolved(false);
    }
  };

  const optionClass = (i: number): string => {
    const base = 'w-full text-left px-4 py-3 rounded-2xl border-2 font-medium transition-all';
    if (!checked) {
      return `${base} ${selected === i
        ? 'border-green-500 bg-green-50 text-green-800'
        : 'border-slate-200 hover:border-slate-300 text-slate-700'}`;
    }
    if (i === payload.correctIndex) return `${base} border-green-500 bg-green-50 text-green-800`;
    if (i === selected) return `${base} border-red-400 bg-red-50 text-red-700`;
    return `${base} border-slate-200 text-slate-400`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <h2 className="text-xl font-bold text-slate-800 mb-6">{payload.question}</h2>
        <div className="space-y-3">
          {payload.options.map((opt, i) => (
            <button
              key={i}
              disabled={checked}
              onClick={() => setSelected(i)}
              className={optionClass(i)}
            >
              {opt}
            </button>
          ))}
        </div>

        {checked && (
          <div className={`mt-5 p-4 rounded-2xl flex gap-3 ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className={`shrink-0 ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>
              {isCorrect ? <Check size={22} /> : <X size={22} />}
            </div>
            <div>
              <p className={`font-bold ${isCorrect ? 'text-green-800' : 'text-red-700'}`}>
                {isCorrect ? 'Correto!' : 'Não foi dessa vez.'}
              </p>
              {payload.explanation && (
                <p className="text-sm text-slate-600 mt-1">{payload.explanation}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {!checked ? (
        <button
          onClick={handleCheck}
          disabled={selected === null}
          className="mt-6 w-full py-4 rounded-2xl bg-green-600 hover:bg-green-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-lg transition-colors"
        >
          Verificar
        </button>
      ) : (
        <button
          onClick={handleContinue}
          className={`mt-6 w-full py-4 rounded-2xl text-white font-bold text-lg transition-colors ${
            isCorrect ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'
          }`}
        >
          {isCorrect ? 'Continuar' : 'Tentar de novo'}
        </button>
      )}
    </div>
  );
};
