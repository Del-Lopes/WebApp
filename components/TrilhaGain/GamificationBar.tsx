import React from 'react';
import { Flame, Coins } from 'lucide-react';
import { TrilhaStats } from '../../types';

interface Props {
  stats: TrilhaStats | null;
}

// Header com XP total (moedas) e streak diário (chama), estilo HUD de mercado.
export const GamificationBar: React.FC<Props> = ({ stats }) => {
  const xp = stats?.total_xp ?? 0;
  const streak = stats?.current_streak ?? 0;

  return (
    <div className="flex items-center gap-2">
      {/* XP — base sóbria, acento dourado só no ícone */}
      <div className="flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full bg-white/80 ring-1 ring-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.05)]">
        <span className="grid place-items-center w-6 h-6 rounded-full bg-amber-100">
          <Coins size={14} className="text-amber-500" />
        </span>
        <span className="font-display text-sm font-bold text-slate-800 tabular-nums tracking-tight">
          {xp.toLocaleString('pt-BR')}
        </span>
      </div>
      {/* Streak — acende em laranja só quando ativo */}
      <div className="flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full bg-white/80 ring-1 ring-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.05)]">
        <span className={`grid place-items-center w-6 h-6 rounded-full ${streak > 0 ? 'bg-orange-100' : 'bg-slate-100'}`}>
          <Flame size={14} className={streak > 0 ? 'text-orange-500 fill-orange-400' : 'text-slate-300'} />
        </span>
        <span className={`font-display text-sm font-bold tabular-nums tracking-tight ${streak > 0 ? 'text-slate-800' : 'text-slate-400'}`}>
          {streak}
        </span>
      </div>
    </div>
  );
};
