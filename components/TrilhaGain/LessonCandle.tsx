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
        ? { wick: 'bg-amber-500', body: 'bg-gradient-to-b from-amber-400 to-amber-600' }
        : isLicao
          ? { wick: 'bg-rose-400', body: 'bg-gradient-to-b from-rose-300 to-rose-500' }
          : { wick: 'bg-emerald-500', body: 'bg-gradient-to-b from-emerald-400 to-emerald-600' };

  // anéis/sombras por tipo, para o estado disponível e concluído
  const ring = isRevisao ? 'ring-2 ring-amber-200' : isLicao ? 'ring-2 ring-rose-200' : 'ring-2 ring-emerald-200';
  const shadowAvail = isRevisao ? 'shadow-lg shadow-amber-500/40' : isLicao ? 'shadow-lg shadow-rose-400/40' : 'shadow-lg shadow-emerald-500/40';
  const shadowDone = isRevisao ? 'shadow shadow-amber-500/30' : isLicao ? 'shadow shadow-rose-400/30' : 'shadow shadow-emerald-500/30';

  // revisão é o candle mais largo/alto da trilha (destaque de "boss" da unidade)
  const w = isRevisao ? 40 : isLicao ? 34 : 26;
  const h = isRevisao ? 44 : isLicao ? 38 : 34;

  return (
    <button
      disabled={state === 'locked'}
      onClick={onClick}
      className={`group relative flex flex-col items-center transition-transform hover:scale-110 active:scale-95 disabled:hover:scale-100 ${
        state === 'available' ? 'animate-pulse' : ''
      }`}
    >
      {/* badge de XP nos candles que dão ganho (gain e revisão), quando disponível */}
      {state === 'available' && isCheckpoint && xp > 0 && (
        <span
          className={`absolute -top-2 -right-3 z-10 text-[9px] font-extrabold px-1 py-0.5 rounded-full shadow ${
            isRevisao ? 'bg-yellow-400 text-yellow-900' : 'bg-rose-400 text-white'
          }`}
        >
          +{xp}
        </span>
      )}

      {/* pavio superior */}
      <div className={`w-[2px] rounded-full ${color.wick}`} style={{ height: 9 }} />

      {/* corpo do candle (o "nó" clicável). */}
      <div
        className={`relative rounded flex items-center justify-center ${color.body} ${
          state === 'available' ? `${shadowAvail} ${ring}` : ''
        } ${state === 'done' ? shadowDone : ''}`}
        style={{ width: w, height: h }}
      >
        {state === 'locked' ? (
          <Lock size={13} className="text-slate-400" />
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
