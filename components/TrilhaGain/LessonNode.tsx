import React from 'react';
import { Lock } from 'lucide-react';

type LessonState = 'done' | 'available' | 'locked';
export type IconTheme = 'candle' | 'coin' | 'crypto' | 'default';

interface Props {
  state: LessonState;
  theme: IconTheme;
  count: number;     // quantidade de ícones (posição da aula na unidade)
  xp: number;
  title: string;
  onClick: () => void;
}

// Cores por estado
const tone = (state: LessonState) => {
  if (state === 'locked') return { fg: 'text-slate-300', sub: 'text-slate-300' };
  if (state === 'available') return { fg: 'text-emerald-500', sub: 'text-slate-700' };
  return { fg: 'text-amber-500', sub: 'text-slate-500' }; // done
};

// --- Ícones temáticos (SVG inline, leves) ---

const Candle: React.FC<{ active: boolean; size: number }> = ({ active, size }) => (
  <svg width={size} height={size * 1.6} viewBox="0 0 12 20" fill="none">
    <line x1="6" y1="0" x2="6" y2="20" stroke={active ? '#10b981' : '#cbd5e1'} strokeWidth="1.5" />
    <rect x="2" y="5" width="8" height="10" rx="1.5" fill={active ? '#10b981' : '#cbd5e1'} />
  </svg>
);

const Coin: React.FC<{ active: boolean; size: number }> = ({ active, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill={active ? '#fbbf24' : '#e2e8f0'} stroke={active ? '#d97706' : '#cbd5e1'} strokeWidth="1.5" />
    <circle cx="12" cy="12" r="6.5" fill="none" stroke={active ? '#d97706' : '#cbd5e1'} strokeWidth="1" opacity="0.6" />
    <text x="12" y="16" textAnchor="middle" fontSize="9" fontWeight="bold" fill={active ? '#92400e' : '#94a3b8'}>$</text>
  </svg>
);

const Crypto: React.FC<{ active: boolean; size: number }> = ({ active, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill={active ? '#f59e0b' : '#e2e8f0'} stroke={active ? '#b45309' : '#cbd5e1'} strokeWidth="1.5" />
    <text x="12" y="16.5" textAnchor="middle" fontSize="11" fontWeight="bold" fill={active ? '#fff' : '#94a3b8'}>₿</text>
  </svg>
);

const ThemedIcon: React.FC<{ theme: IconTheme; active: boolean; size: number }> = ({ theme, active, size }) => {
  switch (theme) {
    case 'candle': return <Candle active={active} size={size} />;
    case 'coin':   return <Coin active={active} size={size} />;
    case 'crypto': return <Crypto active={active} size={size} />;
    default:       return <Coin active={active} size={size} />;
  }
};

// Nó minimalista: um cluster de N ícones do tema da unidade.
// Concluído/disponível = ícones coloridos; bloqueado = cinza com cadeado.
export const LessonNode: React.FC<Props> = ({ state, theme, count, xp, title, onClick }) => {
  const t = tone(state);
  const active = state !== 'locked';
  const n = Math.min(Math.max(count, 1), 6); // teto visual de 6 ícones
  const size = theme === 'candle' ? 16 : 22;

  return (
    <button
      disabled={state === 'locked'}
      onClick={onClick}
      title={title}
      className="group flex flex-col items-center gap-1.5 transition-transform hover:scale-105 active:scale-95 disabled:hover:scale-100"
    >
      <div
        className={`relative flex items-center justify-center rounded-2xl px-3 py-2 transition-colors ${
          state === 'available'
            ? 'bg-emerald-50 ring-2 ring-emerald-200'
            : state === 'done'
              ? 'bg-amber-50'
              : 'bg-slate-50'
        }`}
      >
        {state === 'locked' ? (
          <Lock size={20} className="text-slate-300" />
        ) : (
          <div className="flex items-center -space-x-1">
            {Array.from({ length: n }).map((_, i) => (
              <ThemedIcon key={i} theme={theme} active={active} size={size} />
            ))}
          </div>
        )}

        {state === 'available' && (
          <span className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shadow">
            +{xp}
          </span>
        )}
      </div>

      <p className={`text-center text-xs font-medium w-28 ${t.sub}`}>{title}</p>
    </button>
  );
};
