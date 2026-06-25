import React from 'react';

interface Props {
  // true = aula concluída → colorido; false = cinza
  filled: boolean;
  // coordenadas verticais em px (0 = topo da faixa, cresce para baixo)
  high: number;   // topo do pavio superior
  open: number;
  close: number;
  low: number;    // base do pavio inferior
}

// Candle posicional: desenhado por coordenadas OHLC, para encaixar
// numa sequência contínua (o close de um vira ~o open do próximo).
// Verde se fecha acima da abertura (close < open em px → subiu), senão vermelho.
export const Candle: React.FC<Props> = ({ filled, high, open, close, low }) => {
  // Em px, menor y = preço maior. Candle de alta: close acima de open → close < open.
  const isUp = close <= open;
  const bodyTop = Math.min(open, close);
  const bodyH = Math.max(Math.abs(open - close), 2);

  const bodyColor = !filled
    ? 'bg-slate-200'
    : isUp ? 'bg-gradient-to-b from-emerald-400 to-emerald-500'
           : 'bg-gradient-to-b from-rose-400 to-rose-500';
  const wickColor = !filled
    ? 'bg-slate-200'
    : isUp ? 'bg-emerald-500' : 'bg-rose-500';

  return (
    <div className="relative w-3 h-full transition-all duration-500" aria-hidden>
      {/* pavio (linha vertical da máxima à mínima) */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 w-[2px] rounded-full ${wickColor}`}
        style={{ top: high, height: Math.max(low - high, 2) }}
      />
      {/* corpo */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 w-[7px] rounded-[2px] ${bodyColor}`}
        style={{ top: bodyTop, height: bodyH }}
      />
    </div>
  );
};
