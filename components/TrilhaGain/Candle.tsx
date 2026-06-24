import React from 'react';

interface Props {
  // true = aula concluída → candle colorido; false = cinza
  filled: boolean;
  // 'up' (verde/alta) ou 'down' (vermelho/baixa) quando colorido
  direction?: 'up' | 'down';
  // variação visual do tamanho do corpo (0..1)
  size?: number;
}

// Um candle de mercado desenhado em CSS: pavio superior, corpo, pavio inferior.
// Cinza enquanto a aula não foi feita; ganha cor quando concluída.
export const Candle: React.FC<Props> = ({ filled, direction = 'up', size = 0.6 }) => {
  const bodyHeight = 16 + Math.round(size * 22); // 16..38px
  const wick = 8;

  const bodyColor = !filled
    ? 'bg-slate-200'
    : direction === 'up'
      ? 'bg-gradient-to-b from-emerald-400 to-emerald-600'
      : 'bg-gradient-to-b from-rose-400 to-rose-600';

  const wickColor = !filled
    ? 'bg-slate-200'
    : direction === 'up' ? 'bg-emerald-500' : 'bg-rose-500';

  return (
    <div
      className="flex flex-col items-center justify-center transition-colors duration-500"
      aria-hidden
    >
      <div className={`w-[3px] rounded-full ${wickColor}`} style={{ height: wick }} />
      <div className={`w-3.5 rounded-[3px] ${bodyColor} ${filled ? 'shadow-sm' : ''}`} style={{ height: bodyHeight }} />
      <div className={`w-[3px] rounded-full ${wickColor}`} style={{ height: wick }} />
    </div>
  );
};
