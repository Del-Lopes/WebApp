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
      <div className="flex-1 overflow-y-auto">
        <h2 className="text-xl font-bold text-slate-800 mb-6">{payload.prompt}</h2>

        <div className="space-y-3">
          {order.map((it, i) => {
            const rowState = checked
              ? (it.correctPos === i ? 'border-green-400 bg-green-50' : 'border-red-300 bg-red-50')
              : 'border-slate-200 bg-white';
            return (
              <div key={it.text} className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 ${rowState}`}>
                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-sm font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="flex-1 font-medium text-slate-700">{it.text}</span>
                {!checked && (
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="text-slate-400 hover:text-green-600 disabled:opacity-30"
                    >
                      <ChevronUp size={18} />
                    </button>
                    <button
                      onClick={() => move(i, 1)}
                      disabled={i === order.length - 1}
                      className="text-slate-400 hover:text-green-600 disabled:opacity-30"
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
          <div className={`mt-5 p-4 rounded-2xl flex gap-3 ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className={`shrink-0 ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>
              {isCorrect ? <Check size={22} /> : <X size={22} />}
            </div>
            <p className={`font-bold ${isCorrect ? 'text-green-800' : 'text-red-700'}`}>
              {isCorrect ? 'Ordem correta!' : 'A ordem não está certa ainda.'}
            </p>
          </div>
        )}
      </div>

      {!checked ? (
        <button
          onClick={() => setChecked(true)}
          className="mt-6 w-full py-4 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold text-lg transition-colors"
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
