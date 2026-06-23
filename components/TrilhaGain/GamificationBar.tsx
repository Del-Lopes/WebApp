import React from 'react';
import { Flame, Star } from 'lucide-react';
import { TrilhaStats } from '../../types';

interface Props {
  stats: TrilhaStats | null;
}

// Header com XP total e streak diário.
export const GamificationBar: React.FC<Props> = ({ stats }) => {
  const xp = stats?.total_xp ?? 0;
  const streak = stats?.current_streak ?? 0;

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-50 text-yellow-700 font-bold text-sm">
        <Star size={16} className="fill-yellow-400 text-yellow-400" />
        {xp} XP
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 text-orange-600 font-bold text-sm">
        <Flame size={16} className={streak > 0 ? 'fill-orange-400 text-orange-400' : 'text-slate-300'} />
        {streak}
      </div>
    </div>
  );
};
