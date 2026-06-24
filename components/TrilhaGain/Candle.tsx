import React from 'react';

interface Props {
  // true = aula concluída → candle verde; false = vermelho/cinza
  filled: boolean;
  // variação visual do tamanho do corpo (0..1)
  size?: number;
  // deslocamento vertical (px) para formar a escada de baixa
  drop?: number;
}

// Candle de mercado pequeno (pavio + corpo + pavio) para a trilha em escada.
// Vermelho enquanto a aula não foi feita; verde quando concluída.
export const Candle: React.FC<Props> = ({ filled, size = 0.6, drop = 0 }) => {
  const bodyHeight = 12 + Math.round(size * 14); // 12..26px
  const wick = 5;

  const bodyColor = filled
    ? 'bg-gradient-to-b from-emerald-400 to-emerald-500'
    : 'bg-gradient-to-b from-rose-300 to-rose-400';
  const wickColor = filled ? 'bg-emerald-500' : 'bg-rose-400';

  return (
    <div
      className="flex flex-col items-center justify-center transition-all duration-500"
      style={{ transform: `translateY(${drop}px)` }}
      aria-hidden
    >
      <div className={`w-[2px] rounded-full ${wickColor}`} style={{ height: wick }} />
      <div className={`w-2.5 rounded-[2px] ${bodyColor}`} style={{ height: bodyHeight }} />
      <div className={`w-[2px] rounded-full ${wickColor}`} style={{ height: wick }} />
    </div>
  );
};
