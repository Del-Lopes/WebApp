import React from 'react';
import { Lock } from 'lucide-react';

type LessonState = 'done' | 'available' | 'locked';

interface Props {
  state: LessonState;
  xp: number;
  title: string;
  onClick: () => void;
}

// Nó da trilha em forma de candle (vela). Integra com os candles conectores,
// fazendo a trilha inteira parecer um gráfico de mercado.
//   done      → candle verde cheio (com brilho)
//   available → candle verde pulsando + badge de XP
//   locked    → candle cinza com cadeado
export const LessonCandle: React.FC<Props> = ({ state, xp, title, onClick }) => {
  const color =
    state === 'locked'
      ? { wick: 'bg-slate-300', body: 'bg-gradient-to-b from-slate-200 to-slate-300', ring: '' }
      : { wick: 'bg-emerald-500', body: 'bg-gradient-to-b from-emerald-400 to-emerald-600', ring: '' };

  return (
    <button
      disabled={state === 'locked'}
      onClick={onClick}
      title={title}
      className={`group relative flex flex-col items-center transition-transform hover:scale-110 active:scale-95 disabled:hover:scale-100 ${
        state === 'available' ? 'animate-pulse' : ''
      }`}
    >
      {/* badge de XP no nó disponível */}
      {state === 'available' && (
        <span className="absolute -top-2 -right-3 z-10 bg-yellow-400 text-yellow-900 text-[9px] font-extrabold px-1 py-0.5 rounded-full shadow">
          +{xp}
        </span>
      )}

      {/* pavio superior */}
      <div className={`w-[2px] rounded-full ${color.wick}`} style={{ height: 9 }} />

      {/* corpo do candle (o "nó" clicável) */}
      <div
        className={`relative w-[26px] rounded flex items-center justify-center ${color.body} ${
          state === 'available' ? 'shadow-lg shadow-emerald-500/40 ring-2 ring-emerald-200' : ''
        } ${state === 'done' ? 'shadow shadow-emerald-500/30' : ''}`}
        style={{ height: 34 }}
      >
        {state === 'done' && (
          <span className="text-white font-extrabold text-sm leading-none">$</span>
        )}
        {state === 'available' && (
          <span className="text-white font-extrabold text-xs leading-none">▲</span>
        )}
        {state === 'locked' && <Lock size={13} className="text-slate-400" />}
      </div>

      {/* pavio inferior */}
      <div className={`w-[2px] rounded-full ${color.wick}`} style={{ height: 9 }} />

      {/* título da aula */}
      <p className={`text-center text-[11px] font-semibold mt-1 w-24 leading-tight ${
        state === 'locked' ? 'text-slate-300' : 'text-slate-600'
      }`}>
        {title}
      </p>
    </button>
  );
};
