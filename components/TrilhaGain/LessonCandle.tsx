import React from 'react';
import { Lock, Trophy, Swords } from 'lucide-react';

type LessonState = 'done' | 'available' | 'locked';
type NodeKind = 'aula' | 'licao' | 'revisao';

interface Props {
  state: LessonState;
  kind?: NodeKind; // 'licao' = gain (2 aulas); 'revisao' = revisão geral da unidade
  xp: number;
  num?: number;            // número da aula dentro da unidade (só para aula)
  onClick: () => void;
}

// Nó da trilha em forma de candle (vela).
//   aula    → candle verde com o NÚMERO da aula
//   licao   → candle vermelho com espadas cruzadas (gain de 2 aulas)
//   revisao → candle dourado, maior, com troféu (revisão geral + XP bônus)
//   locked  → candle cinza com cadeado
export const LessonCandle: React.FC<Props> = ({ state, kind = 'aula', xp, num, onClick }) => {
  const isLicao = kind === 'licao';
  const isRevisao = kind === 'revisao';
  const isCheckpoint = isLicao || isRevisao; // qualquer nó que dá XP
  const color =
    state === 'locked'
      ? { wick: 'bg-slate-300', body: 'bg-gradient-to-b from-slate-200 to-slate-300' }
      : isRevisao
        ? { wick: 'bg-amber-500', body: 'bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600' }
        : isLicao
          ? { wick: 'bg-red-500', body: 'bg-gradient-to-b from-red-300 via-red-400 to-red-600' }
          : { wick: 'bg-emerald-500', body: 'bg-gradient-to-b from-emerald-300 via-emerald-400 to-emerald-600' };

  // anéis/sombras suaves por tipo (estado disponível) e brilho sutil (concluído)
  const ring = isRevisao ? 'ring-2 ring-amber-200/80' : isLicao ? 'ring-2 ring-red-200/80' : 'ring-2 ring-emerald-200/80';
  const glowAvail = isRevisao
    ? 'shadow-[0_8px_22px_-6px_rgba(245,158,11,0.6)]'
    : isLicao
      ? 'shadow-[0_8px_22px_-6px_rgba(244,63,94,0.55)]'
      : 'shadow-[0_8px_22px_-6px_rgba(16,185,129,0.55)]';
  const glowDone = isRevisao
    ? 'shadow-[0_4px_14px_-4px_rgba(245,158,11,0.4)]'
    : isLicao
      ? 'shadow-[0_4px_14px_-4px_rgba(244,63,94,0.35)]'
      : 'shadow-[0_4px_14px_-4px_rgba(16,185,129,0.4)]';

  // revisão é o candle mais largo/alto da trilha (destaque de "boss" da unidade)
  const w = isRevisao ? 40 : isLicao ? 34 : 26;
  const h = isRevisao ? 44 : isLicao ? 38 : 34;

  return (
    <button
      disabled={state === 'locked'}
      onClick={onClick}
      className="group relative flex flex-col items-center transition-transform duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.14] active:scale-95 disabled:hover:scale-100"
    >
      {/* halo de respiro no nó disponível (atrás do corpo) */}
      {state === 'available' && (
        <span
          className={`tg-breathe absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-md ${
            isRevisao ? 'bg-amber-400/40' : isLicao ? 'bg-red-400/40' : 'bg-emerald-400/40'
          }`}
          style={{ width: w + 14, height: h + 14 }}
        />
      )}

      {/* badge de XP nos candles que dão ganho (gain e revisão), quando disponível */}
      {state === 'available' && isCheckpoint && xp > 0 && (
        <span
          className={`absolute -top-2.5 -right-3.5 z-10 text-[9px] font-bold tabular-nums px-1.5 py-0.5 rounded-full ring-1 ring-white/70 shadow-md ${
            isRevisao ? 'bg-amber-400 text-amber-950' : 'bg-rose-500 text-white'
          }`}
        >
          +{xp}
        </span>
      )}

      {/* pavio superior */}
      <div className={`w-[2px] rounded-full ${color.wick}`} style={{ height: 9 }} />

      {/* corpo do candle (o "nó" clicável). */}
      <div
        className={`relative rounded-md flex items-center justify-center overflow-hidden ${color.body} ${
          state === 'available' ? `${glowAvail} ${ring}` : ''
        } ${state === 'done' ? glowDone : ''} ${state === 'locked' ? 'shadow-inner' : ''}`}
        style={{ width: w, height: h }}
      >
        {/* brilho especular no topo do corpo (profundidade) */}
        {state !== 'locked' && (
          <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent" />
        )}
        {state === 'locked' ? (
          <Lock size={13} className="text-slate-400" />
        ) : isRevisao ? (
          <Trophy size={20} className="text-white drop-shadow-sm" strokeWidth={2.5} />
        ) : isLicao ? (
          <Swords size={18} className="text-white drop-shadow-sm" strokeWidth={2.5} />
        ) : (
          <span className="relative text-white font-display font-bold text-sm leading-none drop-shadow-sm">{num}</span>
        )}
      </div>

      {/* pavio inferior */}
      <div className={`w-[2px] rounded-full ${color.wick}`} style={{ height: 9 }} />
    </button>
  );
};
