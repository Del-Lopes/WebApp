import React from 'react';
import { Check, Lock, Star, Play, TrendingUp } from 'lucide-react';
import { TrilhaTrack, TrilhaLesson } from '../../types';
import { Candle } from './Candle';

interface Props {
  track: TrilhaTrack;
  completed: Set<string>;
  onSelectLesson: (lesson: TrilhaLesson) => void;
}

type LessonState = 'done' | 'available' | 'locked';

// Pseudo-aleatório determinístico (mesma seed → mesmo valor, estável entre renders).
const rand = (seed: number): number => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x); // 0..1
};

// Trilha vertical serpenteante de nós, com linha de conexão e tema de mercado.
// Uma lição fica disponível quando a anterior (ordem global) está concluída.
export const TrackMap: React.FC<Props> = ({ track, completed, onSelectLesson }) => {
  const units = track.units ?? [];
  const flat: TrilhaLesson[] = units.flatMap((u) => u.lessons ?? []);

  // Estados na ordem plana: só a primeira não-concluída fica disponível.
  const stateMap = new Map<string, LessonState>();
  {
    let unlocked = true;
    for (const l of flat) {
      if (completed.has(l.id)) { stateMap.set(l.id, 'done'); continue; }
      stateMap.set(l.id, unlocked ? 'available' : 'locked');
      unlocked = false;
    }
  }

  const doneCount = flat.filter((l) => completed.has(l.id)).length;
  const pct = flat.length ? Math.round((doneCount / flat.length) * 100) : 0;

  const nodeStyle = (state: LessonState): string => {
    switch (state) {
      case 'done':      return 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white ring-4 ring-emerald-100';
      case 'available': return 'bg-gradient-to-br from-green-500 to-emerald-600 text-white ring-4 ring-green-100 shadow-xl shadow-green-500/40';
      case 'locked':    return 'bg-slate-100 text-slate-300 ring-4 ring-slate-50';
    }
  };

  // offsets serpenteando: cada unidade COMEÇA pela esquerda e ondula para a direita.
  const offsets = [-72, -36, 24, 72, 36, -24];

  return (
    <div className="max-w-md mx-auto pb-20">
      {/* Barra de progresso geral da trilha */}
      {flat.length > 0 && (
        <div className="mb-8 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-600 flex items-center gap-1.5">
              <TrendingUp size={16} className="text-emerald-500" />
              Progresso da trilha
            </span>
            <span className="text-sm font-bold text-emerald-600">{pct}%</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2">{doneCount} de {flat.length} lições concluídas</p>
        </div>
      )}

      {units.map((unit) => (
        <div key={unit.id} className="mb-10">
          {/* Cabeçalho da unidade — banner com grid de "gráfico" */}
          <div className="relative overflow-hidden bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-2xl px-5 py-5 mb-10 shadow-lg">
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />
            <div className="relative">
              <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-bold mb-0.5">
                {unit.subtitle || 'Unidade'}
              </p>
              <h3 className="text-lg font-bold">{unit.title}</h3>
            </div>
          </div>

          {/* Nós da unidade, conectados por candles */}
          <div className="relative flex flex-col items-center gap-0">
            {(unit.lessons ?? []).map((lesson, i) => {
              const state = stateMap.get(lesson.id) ?? 'locked';
              const offset = offsets[i % offsets.length];
              const lessons = unit.lessons ?? [];
              const isLast = i === lessons.length - 1;
              // Candles entre esta aula e a próxima: coloriam quando ESTA aula foi concluída.
              const candleFilled = state === 'done';
              // Quantidade de candles alterna entre os pares de aulas (3, 4, 3, 4...)
              const candleCount = i % 2 === 0 ? 3 : 4;

              return (
                <div key={lesson.id} className="relative flex flex-col items-center">
                  <div style={{ transform: `translateX(${offset}px)` }} className="flex flex-col items-center">
                    <button
                      disabled={state === 'locked'}
                      onClick={() => onSelectLesson(lesson)}
                      title={lesson.title}
                      className={`relative w-[72px] h-[72px] rounded-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 disabled:hover:scale-100 ${nodeStyle(state)}`}
                    >
                      {state === 'done' && <Check size={32} strokeWidth={3} />}
                      {state === 'available' && <Play size={28} strokeWidth={2.5} className="ml-0.5" />}
                      {state === 'locked' && <Lock size={26} />}

                      {state === 'available' && (
                        <span className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shadow">
                          +{lesson.xp_reward}
                        </span>
                      )}
                    </button>

                    <p className={`text-center text-xs font-semibold mt-2 w-28 ${
                      state === 'locked' ? 'text-slate-300' : 'text-slate-600'
                    }`}>
                      {lesson.title}
                    </p>
                  </div>

                  {/* Candles conectores realistas, em leve escada (quantidade alternada) */}
                  {!isLast && (
                    <div className="my-2 flex items-start gap-[3px]">
                      {Array.from({ length: candleCount }).map((_, c) => {
                        const seed = i * 17 + c * 7 + 1;
                        return (
                          <Candle
                            key={c}
                            filled={candleFilled}
                            direction={rand(seed) > 0.5 ? 'up' : 'down'}
                            size={0.25 + rand(seed + 1) * 0.75}
                            topWick={rand(seed + 2)}
                            bottomWick={rand(seed + 3)}
                            drop={c * 7}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {flat.length === 0 && (
        <div className="text-center text-slate-400 py-12 flex flex-col items-center gap-3">
          <Star size={40} className="opacity-40" />
          <p>Esta trilha ainda não tem lições.</p>
        </div>
      )}
    </div>
  );
};
