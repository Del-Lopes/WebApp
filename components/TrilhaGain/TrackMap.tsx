import React from 'react';
import { Star } from 'lucide-react';
import { TrilhaTrack, TrilhaLesson } from '../../types';
import { LessonNode, IconTheme } from './LessonNode';

interface Props {
  track: TrilhaTrack;
  completed: Set<string>;
  onSelectLesson: (lesson: TrilhaLesson) => void;
}

type LessonState = 'done' | 'available' | 'locked';

// Trilha minimalista: nós temáticos por unidade, conectados por uma linha
// pontilhada leve. Uma lição abre quando a anterior é concluída.
export const TrackMap: React.FC<Props> = ({ track, completed, onSelectLesson }) => {
  const units = track.units ?? [];
  const flat: TrilhaLesson[] = units.flatMap((u) => u.lessons ?? []);

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

  // serpentina suave: começa à esquerda e ondula
  const offsets = [-64, -32, 24, 56, 24, -32];

  return (
    <div className="max-w-md mx-auto pb-20">
      {/* Progresso — minimalista */}
      {flat.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-slate-400">
              {doneCount} de {flat.length} lições
            </span>
            <span className="text-xs font-bold text-emerald-600">{pct}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {units.map((unit) => {
        const theme = (unit.icon_theme ?? 'default') as IconTheme;
        const lessons = unit.lessons ?? [];
        return (
          <div key={unit.id} className="mb-12">
            {/* Cabeçalho da unidade — leve, com cena temática discreta */}
            <div className="relative overflow-hidden rounded-xl mb-8 h-20 bg-slate-900">
              {unit.image_url && (
                <img src={unit.image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900/70 to-slate-900/10" />
              <div className="relative h-full flex flex-col justify-center px-4 text-white">
                <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-300/90 font-semibold">
                  {unit.subtitle || 'Unidade'}
                </p>
                <h3 className="text-base font-bold">{unit.title}</h3>
              </div>
            </div>

            {/* Nós da unidade — ícones temáticos, contagem crescente */}
            <div className="relative flex flex-col items-center gap-7">
              {lessons.map((lesson, i) => {
                const state = stateMap.get(lesson.id) ?? 'locked';
                const offset = offsets[i % offsets.length];
                const isLast = i === lessons.length - 1;
                return (
                  <div key={lesson.id} className="relative flex flex-col items-center">
                    <div style={{ transform: `translateX(${offset}px)` }}>
                      <LessonNode
                        state={state}
                        theme={theme}
                        count={i + 1}
                        xp={lesson.xp_reward}
                        title={lesson.title}
                        onClick={() => onSelectLesson(lesson)}
                      />
                    </div>

                    {/* conector pontilhado leve */}
                    {!isLast && (
                      <div className="mt-3 h-6 w-px border-l-2 border-dashed border-slate-200" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {flat.length === 0 && (
        <div className="text-center text-slate-400 py-12 flex flex-col items-center gap-3">
          <Star size={40} className="opacity-40" />
          <p>Esta trilha ainda não tem lições.</p>
        </div>
      )}
    </div>
  );
};
