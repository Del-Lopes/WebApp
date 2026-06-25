import React from 'react';
import { Star, TrendingUp, Lock } from 'lucide-react';
import { TrilhaTrack, TrilhaLesson } from '../../types';
import { Candle } from './Candle';
import { LessonCandle } from './LessonCandle';

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

  // Conjunto de lições que pertencem a unidades bloqueadas (pagas).
  const lockedLessonIds = new Set<string>();
  for (const u of units) {
    if (u.is_locked) for (const l of (u.lessons ?? [])) lockedLessonIds.add(l.id);
  }

  // Lições "operáveis" = as de unidades desbloqueadas (entram na progressão/contagem).
  const flat: TrilhaLesson[] = units
    .filter((u) => !u.is_locked)
    .flatMap((u) => u.lessons ?? []);

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
  // Lições de unidades bloqueadas → sempre travadas.
  for (const id of lockedLessonIds) stateMap.set(id, 'locked');

  const doneCount = flat.filter((l) => completed.has(l.id)).length;
  const pct = flat.length ? Math.round((doneCount / flat.length) * 100) : 0;

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
          {/* Cabeçalho da unidade — banner com cena temática (SVG) */}
          <div className="relative overflow-hidden rounded-2xl mb-10 shadow-lg h-[120px] bg-gradient-to-r from-slate-800 to-slate-900">
            {unit.image_url && (
              <img
                src={unit.image_url}
                alt=""
                className={`absolute inset-0 w-full h-full object-cover ${unit.is_locked ? 'grayscale' : ''}`}
              />
            )}
            {/* leve escurecimento para legibilidade do texto */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/40 to-transparent" />
            <div className="relative h-full flex items-center justify-between px-5 text-white">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-300 font-bold mb-0.5">
                  {unit.subtitle || 'Unidade'}
                </p>
                <h3 className="text-lg font-bold drop-shadow">{unit.title}</h3>
              </div>
              {unit.is_locked && (
                <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-400/90 text-yellow-900 text-xs font-extrabold shadow">
                  <Lock size={13} /> Premium
                </span>
              )}
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
                    <LessonCandle
                      state={state}
                      xp={lesson.xp_reward}
                      title={lesson.title}
                      onClick={() => onSelectLesson(lesson)}
                    />
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
