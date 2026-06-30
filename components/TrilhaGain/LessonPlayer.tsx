import React, { useState, useEffect, useCallback } from 'react';
import { X, Swords, Coins, Trophy, ChevronLeft } from 'lucide-react';
import {
  ConceptPayload, QuizPayload,
  TrueFalsePayload, OrderPayload, ChartPayload,
} from '../../types';
import { completeLesson } from '../../lib/trilhaGain';
import { TrackNode } from './unitNodes';
import { ConceptStep } from './steps/ConceptStep';
import { QuizStep } from './steps/QuizStep';
import { TrueFalseStep } from './steps/TrueFalseStep';
import { OrderStep } from './steps/OrderStep';
import { ChartStep } from './steps/ChartStep';

interface Props {
  // Sequência de nós da unidade (aulas + gains + revisão) e o índice inicial.
  nodes: TrackNode[];
  startIndex: number;
  onClose: () => void;
  onCompleted: (lessonId: string) => void;
}

// Roda os nós de uma unidade em sequência: começa no nó clicado e flui
// aula→aula→gain→…→revisão sem voltar ao lobby. Dá pra avançar (Continuar /
// acertar exercício) e voltar (passo anterior / nó anterior). Cada nó é
// concluído (XP salvo) ao terminar seus steps.
export const LessonPlayer: React.FC<Props> = ({ nodes, startIndex, onClose, onCompleted }) => {
  const [nodeIndex, setNodeIndex] = useState(startIndex);
  const [stepIndex, setStepIndex] = useState(0);
  const [finished, setFinished] = useState(false); // chegou ao fim do módulo
  const [saving, setSaving] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set()); // nós já gravados
  // Tela intersticial de XP ao concluir um gain (candle vermelho de exercício).
  const [reward, setReward] = useState<{ xp: number } | null>(null);

  const node = nodes[nodeIndex];
  const lesson = node?.lesson;
  const steps = lesson?.steps ?? [];
  const isRevisao = !!node && node.kind === 'revisao';
  const isLastNode = nodeIndex >= nodes.length - 1;

  // Grava a conclusão de um nó (idempotente; só salva XP na 1ª vez no back-end).
  const saveNode = useCallback(async (n: TrackNode) => {
    if (savedIds.has(n.id)) return;
    setSavedIds((prev) => new Set(prev).add(n.id));
    try {
      await completeLesson(n.lesson.id, n.lesson.xp_reward);
      onCompleted(n.lesson.id);
    } catch (e) {
      console.error('[LessonPlayer] completeLesson', e);
    }
  }, [savedIds, onCompleted]);

  // Move de fato para o próximo nó (ou tela final do módulo).
  const proceed = useCallback(() => {
    setReward(null);
    if (isLastNode) {
      setFinished(true);
    } else {
      setNodeIndex((i) => i + 1);
      setStepIndex(0);
    }
  }, [isLastNode]);

  // Conclui o nó atual; em gains (candle de exercício) mostra a tela de XP
  // antes de seguir. Aulas (0 XP) e o nó final fluem direto.
  const goNextNode = useCallback(async () => {
    if (node) {
      setSaving(true);
      await saveNode(node);
      setSaving(false);
      // Gain concluído no meio do módulo → celebra o XP ganho.
      if (node.kind === 'licao' && !isLastNode && (node.lesson.xp_reward || 0) > 0) {
        setReward({ xp: node.lesson.xp_reward });
        return;
      }
    }
    if (isLastNode) {
      setFinished(true);
    } else {
      setNodeIndex((i) => i + 1);
      setStepIndex(0);
    }
  }, [node, isLastNode, saveNode]);

  // Nó sem steps (ex.: aula sem concept) → conclui e segue direto.
  useEffect(() => {
    if (!finished && !saving && steps.length === 0 && node) {
      goNextNode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeIndex]);

  // Avança um passo; no último passo, conclui o nó e segue ao próximo.
  const advance = () => {
    if (stepIndex + 1 >= steps.length) {
      goNextNode();
    } else {
      setStepIndex((s) => s + 1);
    }
  };

  // Volta um passo; no primeiro passo, vai ao nó anterior (último passo dele).
  const canGoBack = nodeIndex > 0 || stepIndex > 0;
  const goBack = () => {
    if (finished) { setFinished(false); return; }
    if (stepIndex > 0) {
      setStepIndex((s) => s - 1);
    } else if (nodeIndex > 0) {
      const prev = nodes[nodeIndex - 1];
      const prevLen = prev.lesson.steps?.length ?? 0;
      setNodeIndex((i) => i - 1);
      setStepIndex(Math.max(0, prevLen - 1));
    }
  };

  // Progresso geral: nós concluídos + fração do nó atual.
  const total = nodes.length;
  const stepFrac = steps.length > 0 ? stepIndex / steps.length : 0;
  const progress = finished ? 100 : ((nodeIndex + stepFrac) / total) * 100;

  const current = steps[stepIndex];

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

  // XP total acumulado no módulo (para a tela final).
  const moduleXp = nodes.reduce((a, n) => a + (n.lesson.xp_reward || 0), 0);

  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col">
      {/* Header com voltar + progresso do MÓDULO */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100">
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Fechar">
          <X size={26} />
        </button>
        {!finished && !reward && (
          <button
            onClick={goBack}
            disabled={!canGoBack}
            className="text-slate-400 enabled:hover:text-slate-600 disabled:opacity-30 transition-colors"
            aria-label="Voltar"
          >
            <ChevronLeft size={26} />
          </button>
        )}
        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 max-w-xl w-full mx-auto px-5 py-6 overflow-hidden">
        {reward ? (
          /* XP ganho ao concluir um gain (candle de exercício) */
          <div className="relative flex flex-col h-full items-center justify-center text-center overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  'linear-gradient(#e11d48 1px, transparent 1px), linear-gradient(90deg, #e11d48 1px, transparent 1px)',
                backgroundSize: '28px 28px',
              }}
            />
            <div className="relative">
              <div className="w-28 h-28 rounded-full flex items-center justify-center mb-6 mx-auto shadow-xl bg-gradient-to-br from-red-400 to-red-600 shadow-red-500/30">
                <Swords size={50} className="text-white" strokeWidth={2.5} />
              </div>
              <p className="font-bold text-sm uppercase tracking-wider mb-1 text-red-500">
                Exercícios vencidos
              </p>
              <h2 className="text-3xl font-extrabold text-slate-800 mb-3">
                Gain concluído!
              </h2>
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border mb-8 bg-gradient-to-br from-yellow-50 to-amber-100 border-amber-200">
                <Coins size={24} className="text-amber-500" />
                <span className="text-3xl font-extrabold text-amber-600">
                  +{reward.xp} XP
                </span>
              </div>
              <button
                onClick={proceed}
                className="block w-full max-w-xs mx-auto py-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-lg transition-all shadow-lg shadow-emerald-500/30"
              >
                Continuar
              </button>
            </div>
          </div>
        ) : finished ? (
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
              <div className="w-28 h-28 rounded-full flex items-center justify-center mb-6 mx-auto shadow-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-500/30">
                <Trophy size={52} className="text-white" strokeWidth={2.5} />
              </div>
              <p className="font-bold text-sm uppercase tracking-wider mb-1 text-amber-600">
                Módulo dominado
              </p>
              <h2 className="text-3xl font-extrabold text-slate-800 mb-3">
                Módulo concluído!
              </h2>
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border mb-8 bg-gradient-to-br from-yellow-50 to-amber-100 border-amber-200">
                <Coins size={24} className="text-amber-500" />
                <span className="text-3xl font-extrabold text-amber-600">
                  +{moduleXp} XP
                </span>
              </div>
              <button
                onClick={onClose}
                className="block w-full max-w-xs mx-auto py-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-lg transition-all shadow-lg shadow-emerald-500/30"
              >
                Voltar à trilha
              </button>
            </div>
          </div>
        ) : saving ? (
          <div className="flex h-full items-center justify-center text-slate-400">Salvando…</div>
        ) : (
          <>
            {/* Título do nó atual, para situar dentro do módulo */}
            <p className={`text-[11px] font-bold uppercase tracking-wider mb-3 ${isRevisao ? 'text-amber-600' : node?.kind === 'licao' ? 'text-rose-500' : 'text-emerald-600'}`}>
              {isRevisao ? 'Revisão geral' : node?.kind === 'licao' ? 'Exercícios (Gain)' : `Aula ${node?.kind === 'aula' ? node.num : ''}`}
            </p>
            {renderStep()}
          </>
        )}
      </div>
    </div>
  );
};
