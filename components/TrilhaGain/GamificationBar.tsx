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
    <div className="flex items-center gap-2.5">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-br from-yellow-50 to-amber-100 text-amber-700 font-extrabold text-sm border border-amber-200/60 shadow-sm">
        <Coins size={16} className="text-amber-500" />
        {xp.toLocaleString('pt-BR')}
      </div>
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold text-sm border shadow-sm ${
        streak > 0
          ? 'bg-gradient-to-br from-orange-50 to-red-100 text-orange-600 border-orange-200/60'
          : 'bg-slate-50 text-slate-400 border-slate-200/60'
      }`}>
        <Flame size={16} className={streak > 0 ? 'text-orange-500 fill-orange-400' : 'text-slate-300'} />
        {streak}
      </div>
    </div>
  );
};
