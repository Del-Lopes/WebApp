import React from 'react';
import { Check, Lock, Star, Play } from 'lucide-react';
import { TrilhaTrack, TrilhaLesson } from '../../types';

interface Props {
  track: TrilhaTrack;
  completed: Set<string>;
  onSelectLesson: (lesson: TrilhaLesson) => void;
}

type LessonState = 'done' | 'available' | 'locked';

// Trilha vertical serpenteante de nós. Uma lição fica disponível quando
// todas as lições anteriores (na ordem global da trilha) estão concluídas.
export const TrackMap: React.FC<Props> = ({ track, completed, onSelectLesson }) => {
  const units = track.units ?? [];

  // Lista plana ordenada de lições para calcular desbloqueio sequencial.
  const flat: TrilhaLesson[] = units.flatMap((u) => u.lessons ?? []);

  // Pré-computa estados na ordem plana para que "available" seja só a próxima.
  const stateMap = new Map<string, LessonState>();
  {
    let unlocked = true;
    for (const l of flat) {
      if (completed.has(l.id)) { stateMap.set(l.id, 'done'); continue; }
      stateMap.set(l.id, unlocked ? 'available' : 'locked');
      unlocked = false; // só a primeira não-concluída fica disponível
    }
  }

  const nodeStyle = (state: LessonState): string => {
    switch (state) {
      case 'done':      return 'bg-yellow-400 text-white shadow-lg shadow-yellow-500/30';
      case 'available': return 'bg-green-500 text-white shadow-lg shadow-green-500/40 animate-pulse';
      case 'locked':    return 'bg-slate-200 text-slate-400';
    }
  };

  return (
    <div className="max-w-md mx-auto pb-16">
      {units.map((unit) => (
        <div key={unit.id} className="mb-8">
          {/* Cabeçalho da unidade */}
          <div className="bg-green-600 text-white rounded-2xl px-5 py-4 mb-8 shadow-md">
            <p className="text-xs uppercase tracking-wider opacity-80">{unit.subtitle || 'Unidade'}</p>
            <h3 className="text-lg font-bold">{unit.title}</h3>
          </div>

          {/* Nós da unidade, serpenteando */}
          <div className="flex flex-col items-center gap-6">
            {(unit.lessons ?? []).map((lesson, i) => {
              const state = stateMap.get(lesson.id) ?? 'locked';
              // Deslocamento horizontal alternado para efeito de trilha
              const offset = [0, 48, 64, 48, 0, -48, -64, -48][i % 8];
              return (
                <div key={lesson.id} style={{ transform: `translateX(${offset}px)` }}>
                  <button
                    disabled={state === 'locked'}
                    onClick={() => onSelectLesson(lesson)}
                    title={lesson.title}
                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-105 disabled:hover:scale-100 ${nodeStyle(state)}`}
                  >
                    {state === 'done' && <Check size={28} />}
                    {state === 'available' && <Play size={26} />}
                    {state === 'locked' && <Lock size={24} />}
                  </button>
                  <p className="text-center text-xs font-medium text-slate-500 mt-2 w-24 -ml-4">
                    {lesson.title}
                  </p>
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
