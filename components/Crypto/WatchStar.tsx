import React from 'react';
import { Star } from 'lucide-react';
import { useWatchlist, WatchableCoin } from './useWatchlist';

// Estrela de acompanhar/parar de acompanhar, usada nas listas de moedas.
export const WatchStar: React.FC<{ coin: WatchableCoin }> = ({ coin }) => {
  const { has, toggle } = useWatchlist();
  const active = has(coin.id);

  return (
    <button
      onClick={(e) => { e.stopPropagation(); void toggle(coin); }}
      title={active ? 'Parar de acompanhar' : 'Acompanhar'}
      aria-label={active ? `Parar de acompanhar ${coin.name}` : `Acompanhar ${coin.name}`}
      aria-pressed={active}
      className={`p-1.5 rounded-lg transition-colors shrink-0 ${
        active ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-300 hover:text-amber-500 hover:bg-slate-50'
      }`}
    >
      <Star size={15} fill={active ? 'currentColor' : 'none'} />
    </button>
  );
};
