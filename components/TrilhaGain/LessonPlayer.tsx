import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Coins, Trophy } from 'lucide-react';
import {
  TrilhaLesson, ConceptPayload, QuizPayload,
  TrueFalsePayload, OrderPayload, ChartPayload,
} from '../../types';
import { completeLesson } from '../../lib/trilhaGain';
import { ConceptStep } from './steps/ConceptStep';
import { QuizStep } from './steps/QuizStep';
import { TrueFalseStep } from './steps/TrueFalseStep';
import { OrderStep } from './steps/OrderStep';
import { ChartStep } from './steps/ChartStep';

interface Props {
  lesson: TrilhaLesson;
  onClose: () => void;
  onCompleted: (lessonId: string) => void;
}

// Roda os steps de uma lição em sequência, com barra de progresso e tela final.
export const LessonPlayer: React.FC<Props> = ({ lesson, onClose, onCompleted }) => {
  const steps = lesson.steps ?? [];
  const isRevisao = lesson.id.startsWith('revisao-'); // revisão geral da unidade
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);

  // Lição/aula sem steps (ex.: aula sem concept) → conclui direto.
  useEffect(() => {
    if (steps.length === 0 && !finished && !saving) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      case 'truefalse':
        return (
          <TrueFalseStep
            payload={current.payload as TrueFalsePayload}
            onResolved={(correct) => { if (correct) advance(); }}
          />
        );
      case 'order':
        return (
          <OrderStep
            payload={current.payload as OrderPayload}
            onResolved={(correct) => { if (correct) advance(); }}
          />
        );
      case 'chart':
        return (
          <ChartStep
            payload={current.payload as ChartPayload}
            onResolved={(correct) => { if (correct) advance(); }}
          />
        );
      default:
        return (
          <div className="flex flex-col h-full items-center justify-center text-slate-400">
            <p>Tipo de exercício desconhecido: {current.type}</p>
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
            className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${finished ? 100 : progress}%` }}
          />
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 max-w-xl w-full mx-auto px-5 py-6 overflow-hidden">
        {finished ? (
          <div className="relative flex flex-col h-full items-center justify-center text-center overflow-hidden">
            {/* fundo grid de gráfico */}
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  'linear-gradient(#059669 1px, transparent 1px), linear-gradient(90deg, #059669 1px, transparent 1px)',
                backgroundSize: '28px 28px',
              }}
            />
            <div className="relative">
              <div
                className={`w-28 h-28 rounded-full flex items-center justify-center mb-6 mx-auto shadow-xl ${
                  isRevisao
                    ? 'bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-500/30'
                    : 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30'
                }`}
              >
                {isRevisao
                  ? <Trophy size={52} className="text-white" strokeWidth={2.5} />
                  : <TrendingUp size={52} className="text-white" strokeWidth={2.5} />}
              </div>
              <p className={`font-bold text-sm uppercase tracking-wider mb-1 ${isRevisao ? 'text-amber-600' : 'text-emerald-600'}`}>
                {isRevisao ? 'Módulo dominado' : 'Lucro realizado'}
              </p>
              <h2 className="text-3xl font-extrabold text-slate-800 mb-3">
                {isRevisao ? 'Revisão geral concluída!' : 'Lição concluída!'}
              </h2>
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border mb-8 bg-gradient-to-br from-yellow-50 to-amber-100 border-amber-200">
                <Coins size={24} className="text-amber-500" />
                <span className="text-3xl font-extrabold text-amber-600">
                  +{lesson.xp_reward} XP
                </span>
              </div>
              <button
                onClick={onClose}
                className="block w-full max-w-xs mx-auto py-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-lg transition-all shadow-lg shadow-emerald-500/30"
              >
                Continuar
              </button>
            </div>
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
