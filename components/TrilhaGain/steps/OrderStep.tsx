import React, { useMemo, useState } from 'react';
import { Check, X, ChevronUp, ChevronDown } from 'lucide-react';
import { OrderPayload } from '../../../types';
import { Button } from '../../ui';

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
        <h2 className="font-display text-xl font-semibold text-fg mb-6">{payload.prompt}</h2>

        <div className="space-y-3">
          {order.map((it, i) => {
            const rowState = checked
              ? (it.correctPos === i ? 'border-success/60 bg-success/10' : 'border-danger/60 bg-danger/10')
              : 'border-tint/10 bg-tint/3';
            return (
              <div key={it.text} className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 ${rowState}`}>
                <span className="w-6 h-6 rounded-full bg-tint/8 text-fg-muted text-sm font-bold font-mono tabular-nums flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="flex-1 min-w-0 font-medium text-fg">{it.text}</span>
                {!checked && (
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="rounded text-fg-muted hover:text-accent-fg disabled:opacity-30 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                    >
                      <ChevronUp size={18} />
                    </button>
                    <button
                      onClick={() => move(i, 1)}
                      disabled={i === order.length - 1}
                      className="rounded text-fg-muted hover:text-accent-fg disabled:opacity-30 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
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
          <div className={`mt-5 p-4 rounded-2xl border flex gap-3 ${isCorrect ? 'bg-success/10 border-success/20' : 'bg-danger/10 border-danger/20'}`}>
            <div className={`shrink-0 ${isCorrect ? 'text-success-fg' : 'text-danger-fg'}`}>
              {isCorrect ? <Check size={22} /> : <X size={22} />}
            </div>
            <p className={`font-bold ${isCorrect ? 'text-success-fg' : 'text-danger-fg'}`}>
              {isCorrect ? 'Ordem correta!' : 'A ordem não está certa ainda.'}
            </p>
          </div>
        )}
      </div>

      {!checked ? (
        <Button
          size="lg"
          onClick={() => setChecked(true)}
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
