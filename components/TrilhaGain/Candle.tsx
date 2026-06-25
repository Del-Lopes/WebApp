import React from 'react';

interface Props {
  // true = aula concluída → candle colorido (verde/vermelho); false = cinza
  filled: boolean;
  // direção do candle quando colorido: 'up' verde, 'down' vermelho
  direction?: 'up' | 'down';
  // tamanho do corpo (0..1)
  size?: number;
  // tamanhos dos pavios superior/inferior (0..1)
  topWick?: number;
  bottomWick?: number;
  // deslocamento vertical (px) para formar a escada
  drop?: number;
}

// Candle de mercado fino e realista (pavios variáveis + corpo).
// Cinza enquanto a aula não foi feita; verde/vermelho quando concluída.
export const Candle: React.FC<Props> = ({
  filled, direction = 'up', size = 0.6, topWick = 0.5, bottomWick = 0.5, drop = 0,
}) => {
  const bodyHeight = 10 + Math.round(size * 20);     // 10..30px
  const topW = 3 + Math.round(topWick * 9);          // 3..12px
  const botW = 3 + Math.round(bottomWick * 9);       // 3..12px

  const bodyColor = !filled
    ? 'bg-slate-200'
    : direction === 'up'
      ? 'bg-gradient-to-b from-emerald-400 to-emerald-500'
      : 'bg-gradient-to-b from-rose-400 to-rose-500';
  const wickColor = !filled
    ? 'bg-slate-200'
    : direction === 'up' ? 'bg-emerald-500' : 'bg-rose-500';

  return (
    <div
      className="flex flex-col items-center justify-center transition-all duration-500"
      style={{ transform: `translateY(${drop}px)` }}
      aria-hidden
    >
      <div className={`w-[2px] rounded-full ${wickColor}`} style={{ height: topW }} />
      <div className={`w-[7px] rounded-[2px] ${bodyColor}`} style={{ height: bodyHeight }} />
      <div className={`w-[2px] rounded-full ${wickColor}`} style={{ height: botW }} />
    </div>
  );
};
