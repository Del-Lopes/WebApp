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
      ? { wick: 'bg-tint/15', body: 'bg-tint/10 border border-tint/10' }
      : isRevisao
        ? { wick: 'bg-amber-500', body: 'bg-gradient-to-b from-amber-400 to-amber-600' }
        : isLicao
          ? { wick: 'bg-red-500', body: 'bg-gradient-to-b from-red-400 to-red-600' }
          : { wick: 'bg-emerald-500', body: 'bg-gradient-to-b from-emerald-400 to-emerald-600' };

  // anéis/sombras por tipo, para o estado disponível e concluído
  const ring = isRevisao ? 'ring-2 ring-amber-400/40' : isLicao ? 'ring-2 ring-red-400/40' : 'ring-2 ring-emerald-400/40';
  const shadowAvail = isRevisao ? 'shadow-md shadow-amber-500/30' : isLicao ? 'shadow-md shadow-red-500/30' : 'shadow-md shadow-emerald-500/30';
  const shadowDone = isRevisao ? 'shadow-sm shadow-amber-500/30' : isLicao ? 'shadow-sm shadow-red-500/30' : 'shadow-sm shadow-emerald-500/30';

  // revisão é o candle mais largo/alto da trilha (destaque de "boss" da unidade)
  const w = isRevisao ? 40 : isLicao ? 34 : 26;
  const h = isRevisao ? 44 : isLicao ? 38 : 34;

  return (
    <button
      disabled={state === 'locked'}
      onClick={onClick}
      className={`group relative flex flex-col items-center rounded-md transition-transform hover:scale-110 active:scale-95 disabled:hover:scale-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-page ${
        state === 'available' ? 'animate-pulse' : ''
      }`}
    >
      {/* badge de XP nos candles que dão ganho (gain e revisão), quando disponível */}
      {state === 'available' && isCheckpoint && xp > 0 && (
        <span
          className={`absolute -top-2 -right-3 z-10 text-[9px] font-extrabold font-mono tabular-nums px-1 py-0.5 rounded-full ${
            isRevisao ? 'bg-yellow-400 text-yellow-900' : 'bg-red-500 text-white'
          }`}
        >
          +{xp}
        </span>
      )}

      {/* pavio superior */}
      <div className={`w-[2px] rounded-full ${color.wick}`} style={{ height: 9 }} />

      {/* corpo do candle (o "nó" clicável). */}
      <div
        className={`relative rounded-sm flex items-center justify-center ${color.body} ${
          state === 'available' ? `${shadowAvail} ${ring}` : ''
        } ${state === 'done' ? shadowDone : ''}`}
        style={{ width: w, height: h }}
      >
        {state === 'locked' ? (
          <Lock size={13} className="text-fg-subtle" />
        ) : isRevisao ? (
          <Trophy size={20} className="text-white" strokeWidth={2.5} />
        ) : isLicao ? (
          <Swords size={18} className="text-white" strokeWidth={2.5} />
        ) : (
          <span className="text-white font-extrabold text-sm leading-none">{num}</span>
        )}
      </div>

      {/* pavio inferior */}
      <div className={`w-[2px] rounded-full ${color.wick}`} style={{ height: 9 }} />
    </button>
  );
};
