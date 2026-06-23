import React, { useState } from 'react';
import { X, Trophy } from 'lucide-react';
import { TrilhaLesson, ConceptPayload, QuizPayload } from '../../types';
import { completeLesson } from '../../lib/trilhaGain';
import { ConceptStep } from './steps/ConceptStep';
import { QuizStep } from './steps/QuizStep';

interface Props {
  lesson: TrilhaLesson;
  onClose: () => void;
  onCompleted: (lessonId: string) => void;
}

// Roda os steps de uma lição em sequência, com barra de progresso e tela final.
export const LessonPlayer: React.FC<Props> = ({ lesson, onClose, onCompleted }) => {
  const steps = lesson.steps ?? [];
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);

  const advance = () => {
    if (index + 1 >= steps.length) {
      finish();
    } else {
      setIndex(index + 1);
    }
  };

  const finish = async () => {
    setSaving(true);
    try {
      await completeLesson(lesson.id, lesson.xp_reward);
      onCompleted(lesson.id);
    } catch (e) {
      console.error('[LessonPlayer] completeLesson', e);
    } finally {
      setSaving(false);
      setFinished(true);
    }
  };

  const progress = steps.length > 0 ? (index / steps.length) * 100 : 0;
  const current = steps[index];

  const renderStep = () => {
    if (!current) return null;
    switch (current.type) {
      case 'concept':
        return <ConceptStep payload={current.payload as ConceptPayload} onContinue={advance} />;
      case 'quiz':
        return (
          <QuizStep
            payload={current.payload as QuizPayload}
            onResolved={(correct) => { if (correct) advance(); }}
          />
        );
      // Fase 2: truefalse, order, chart
      default:
        return (
          <div className="flex flex-col h-full items-center justify-center text-slate-400">
            <p>Tipo de exercício ainda não suportado: {current.type}</p>
            <button onClick={advance} className="mt-4 px-6 py-3 rounded-2xl bg-green-600 text-white font-bold">
              Pular
            </button>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col">
      {/* Header com progresso */}
      <div className="flex items-center gap-4 px-4 py-4 border-b border-slate-100">
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X size={26} />
        </button>
        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-300"
            style={{ width: `${finished ? 100 : progress}%` }}
          />
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 max-w-xl w-full mx-auto px-5 py-6 overflow-hidden">
        {finished ? (
          <div className="flex flex-col h-full items-center justify-center text-center">
            <div className="w-24 h-24 rounded-full bg-yellow-100 flex items-center justify-center mb-6">
              <Trophy size={48} className="text-yellow-500" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Lição concluída!</h2>
            <p className="text-slate-500 mb-1">Você ganhou</p>
            <p className="text-4xl font-extrabold text-green-600 mb-8">+{lesson.xp_reward} XP</p>
            <button
              onClick={onClose}
              className="w-full max-w-xs py-4 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold text-lg transition-colors"
            >
              Continuar
            </button>
          </div>
        ) : saving ? (
          <div className="flex h-full items-center justify-center text-slate-400">Salvando…</div>
        ) : (
          renderStep()
        )}
      </div>
    </div>
  );
};
