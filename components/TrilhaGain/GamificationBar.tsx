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
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-warning/10 text-warning-fg font-bold font-mono tabular-nums whitespace-nowrap text-sm border border-warning/20">
        <Coins size={16} className="text-warning" />
        {xp.toLocaleString('pt-BR')}
      </div>
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold font-mono tabular-nums whitespace-nowrap text-sm border ${
        streak > 0
          ? 'bg-orange-500/10 text-fg border-orange-500/25'
          : 'bg-tint/3 text-fg-subtle border-tint/10'
      }`}>
        <Flame size={16} className={streak > 0 ? 'text-orange-500 fill-orange-400' : 'text-fg-subtle'} />
        {streak}
      </div>
    </div>
  );
};
