import React from 'react';
import { Flame, Coins, Plus } from 'lucide-react';
import { TrilhaStats } from '../../types';

interface Props {
  stats: TrilhaStats | null;
  onBuy?: () => void;
}

// Header com XP total (moedas) e streak diário (chama), estilo HUD de mercado.
export const GamificationBar: React.FC<Props> = ({ stats, onBuy }) => {
  const xp = stats?.total_xp ?? 0;
  const streak = stats?.current_streak ?? 0;

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-warning/10 text-warning-fg font-bold font-mono tabular-nums whitespace-nowrap text-sm border border-warning/20">
        <Coins size={16} className="text-warning" />
        {xp.toLocaleString('pt-BR')}
        {onBuy && (
          <button
            type="button"
            onClick={onBuy}
            aria-label="Comprar Coins"
            title="Comprar Coins"
            className="-mr-1 ml-0.5 flex h-5 w-5 items-center justify-center rounded-md bg-warning/20 text-warning-fg transition-colors hover:bg-warning/30 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-warning/60"
          >
            <Plus size={13} strokeWidth={3} />
          </button>
        )}
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
