import React, { useMemo, useState } from 'react';
import { Check, X, ChevronUp, ChevronDown } from 'lucide-react';
import { OrderPayload } from '../../../types';

interface Props {
  payload: OrderPayload;
  onResolved: (correct: boolean) => void;
}

// Embaralha mantendo um índice estável para cada item (permite comparar com a ordem correta).
interface Item { text: string; correctPos: number; }

export const OrderStep: React.FC<Props> = ({ payload, onResolved }) => {
  // Ordem correta = ordem do array no payload.
  const initial = useMemo<Item[]>(() => {
    const items = payload.items.map((text, i) => ({ text, correctPos: i }));
    // Embaralho determinístico-leve: inverte e rotaciona para nunca começar certo.
    const shuffled = [...items].reverse();
    if (shuffled.length > 1 && shuffled.every((it, i) => it.correctPos === i)) {
      shuffled.push(shuffled.shift() as Item);
    }
    return shuffled;
  }, [payload]);

  const [order, setOrder] = useState<Item[]>(initial);
  const [checked, setChecked] = useState(false);

  const isCorrect = order.every((it, i) => it.correctPos === i);

  const move = (from: number, dir: -1 | 1) => {
    const to = from + dir;
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    [next[from], next[to]] = [next[to], next[from]];
    setOrder(next);
  };

  const handleContinue = () => {
    if (isCorrect) {
      onResolved(true);
    } else {
      setChecked(false);
      onResolved(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
        <h2 className="font-display text-[21px] leading-snug font-bold text-slate-900 tracking-tight mb-6">{payload.prompt}</h2>

        <div className="space-y-2.5">
          {order.map((it, i) => {
            const rowState = checked
              ? (it.correctPos === i ? 'border-emerald-400 bg-emerald-50/80 ring-1 ring-emerald-100' : 'border-rose-300 bg-rose-50/80')
              : 'border-slate-200 bg-white shadow-[var(--tg-shadow-sm)]';
            return (
              <div key={it.text} className={`tg-rise flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors ${rowState}`}>
                <span className="w-7 h-7 rounded-full bg-slate-900 text-white text-[13px] font-display font-bold flex items-center justify-center shrink-0 tabular-nums">
                  {i + 1}
                </span>
                <span className="flex-1 font-medium text-slate-700">{it.text}</span>
                {!checked && (
                  <div className="flex flex-col">
                    <button
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="text-slate-300 hover:text-emerald-600 disabled:opacity-20 transition-colors"
                      aria-label="Mover para cima"
                    >
                      <ChevronUp size={18} />
                    </button>
                    <button
                      onClick={() => move(i, 1)}
                      disabled={i === order.length - 1}
                      className="text-slate-300 hover:text-emerald-600 disabled:opacity-20 transition-colors"
                      aria-label="Mover para baixo"
                    >
                      <ChevronDown size={18} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {checked && (
          <div className={`tg-rise mt-5 p-4 rounded-2xl flex items-center gap-3 ring-1 ${isCorrect ? 'bg-emerald-50/80 ring-emerald-100' : 'bg-rose-50/80 ring-rose-100'}`}>
            <div className={`grid place-items-center w-7 h-7 rounded-full shrink-0 ${isCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'}`}>
              {isCorrect ? <Check size={16} strokeWidth={3} /> : <X size={16} strokeWidth={3} />}
            </div>
            <p className={`font-bold tracking-tight ${isCorrect ? 'text-emerald-800' : 'text-rose-700'}`}>
              {isCorrect ? 'Ordem correta!' : 'A ordem não está certa ainda.'}
            </p>
          </div>
        )}
      </div>

      {!checked ? (
        <button
          onClick={() => setChecked(true)}
          className="tg-btn mt-6 w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-lg shadow-[var(--tg-shadow-glow)]"
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
