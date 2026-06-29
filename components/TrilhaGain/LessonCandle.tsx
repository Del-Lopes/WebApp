import React from 'react';
import { Lock, TrendingUp, BarChart3, LineChart, CandlestickChart, Trophy } from 'lucide-react';

type LessonState = 'done' | 'available' | 'locked';

interface Props {
  state: LessonState;
  kind?: 'aula' | 'licao'; // 'licao' = checkpoint de revisão (visual distinto)
  xp: number;
  iconSeed: string; // estável por aula (usa o id) para escolher o símbolo
  onClick: () => void;
}

// Hash simples e estável de uma string → inteiro não-negativo.
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Símbolos de mercado dentro do candle. Mistura de texto (moedas/cripto/tickers)
// e ícones (gráficos). Escolhido de forma determinística por aula.
type Sym =
  | { kind: 'text'; v: string }
  | { kind: 'icon'; C: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }> };

const SYMBOLS: Sym[] = [
  { kind: 'text', v: '$' },        // dólar
  { kind: 'text', v: '€' },        // euro
  { kind: 'text', v: '£' },        // libra
  { kind: 'text', v: '¥' },        // iene
  { kind: 'text', v: '₿' },        // bitcoin
  { kind: 'text', v: 'Ξ' },        // ethereum
  { kind: 'icon', C: TrendingUp },
  { kind: 'icon', C: BarChart3 },
  { kind: 'icon', C: LineChart },
  { kind: 'icon', C: CandlestickChart },
];

// Nó da trilha em forma de candle (vela), com um símbolo de mercado dentro.
//   done      → candle verde com símbolo branco
//   available → candle verde pulsando + badge de XP
//   locked    → candle cinza com cadeado
export const LessonCandle: React.FC<Props> = ({ state, kind = 'aula', xp, iconSeed, onClick }) => {
  const isLicao = kind === 'licao';
  const color =
    state === 'locked'
      ? { wick: 'bg-slate-300', body: 'bg-gradient-to-b from-slate-200 to-slate-300' }
      : isLicao
        ? { wick: 'bg-amber-500', body: 'bg-gradient-to-b from-amber-400 to-amber-600' }
        : { wick: 'bg-emerald-500', body: 'bg-gradient-to-b from-emerald-400 to-emerald-600' };

  const sym = SYMBOLS[hash(iconSeed) % SYMBOLS.length];

  return (
    <button
      disabled={state === 'locked'}
      onClick={onClick}
      className={`group relative flex flex-col items-center transition-transform hover:scale-110 active:scale-95 disabled:hover:scale-100 ${
        state === 'available' ? 'animate-pulse' : ''
      }`}
    >
      {/* badge de XP só no candle de lição (o "gain"), quando disponível */}
      {state === 'available' && isLicao && xp > 0 && (
        <span className="absolute -top-2 -right-3 z-10 bg-yellow-400 text-yellow-900 text-[9px] font-extrabold px-1 py-0.5 rounded-full shadow">
          +{xp}
        </span>
      )}

      {/* pavio superior */}
      <div className={`w-[2px] rounded-full ${color.wick}`} style={{ height: 9 }} />

      {/* corpo do candle (o "nó" clicável). Lição é mais larga, com troféu. */}
      <div
        className={`relative rounded flex items-center justify-center ${color.body} ${
          state === 'available'
            ? (isLicao ? 'shadow-lg shadow-amber-500/40 ring-2 ring-amber-200' : 'shadow-lg shadow-emerald-500/40 ring-2 ring-emerald-200')
            : ''
        } ${state === 'done' ? (isLicao ? 'shadow shadow-amber-500/30' : 'shadow shadow-emerald-500/30') : ''}`}
        style={{ width: isLicao ? 34 : 26, height: isLicao ? 38 : 34 }}
      >
        {state === 'locked' ? (
          <Lock size={13} className="text-slate-400" />
        ) : isLicao ? (
          <Trophy size={18} className="text-white" strokeWidth={2.5} />
        ) : sym.kind === 'text' ? (
          <span className="text-white font-extrabold text-sm leading-none">{sym.v}</span>
        ) : (
          <sym.C size={16} className="text-white" strokeWidth={2.5} />
        )}
      </div>

      {/* pavio inferior */}
      <div className={`w-[2px] rounded-full ${color.wick}`} style={{ height: 9 }} />
    </button>
  );
};
