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
import { Button } from '../ui';

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
          <div className="flex flex-col h-full items-center justify-center text-fg-muted">
            <p>Tipo de exercício desconhecido: {current.type}</p>
            <Button size="lg" onClick={advance} className="mt-4">
              Pular
            </Button>
          </div>
        );
    }
  };

  // XP total acumulado no módulo (para a tela final).
  const moduleXp = nodes.reduce((a, n) => a + (n.lesson.xp_reward || 0), 0);

  return (
    <div className="fixed inset-0 z-[60] bg-page text-fg flex flex-col">
      {/* Header com voltar + progresso do MÓDULO */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-tint/6">
        <button onClick={onClose} className="rounded-lg text-fg-muted hover:text-fg transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60" aria-label="Fechar">
          <X size={26} />
        </button>
        {!finished && !reward && (
          <button
            onClick={goBack}
            disabled={!canGoBack}
            className="rounded-lg text-fg-muted enabled:hover:text-fg disabled:opacity-30 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
            aria-label="Voltar"
          >
            <ChevronLeft size={26} />
          </button>
        )}
        <div className="flex-1 h-3 bg-tint/6 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-green-bright to-brand-green rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 max-w-xl w-full mx-auto px-4 sm:px-5 py-6 overflow-hidden">
        {reward ? (
          /* XP ganho ao concluir um gain (candle de exercício) */
          <div className="relative flex flex-col h-full items-center justify-center text-center overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-grid-fade" aria-hidden />
            <div className="relative">
              <div className="w-28 h-28 rounded-full flex items-center justify-center mb-6 mx-auto bg-gradient-to-br from-red-400 to-red-600 ring-8 ring-danger/10">
                <Swords size={50} className="text-white" strokeWidth={2.5} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] mb-2 text-danger-fg">
                Exercícios vencidos
              </p>
              <h2 className="font-display text-3xl font-semibold text-fg mb-3">
                Gain concluído!
              </h2>
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border mb-8 bg-warning/10 border-warning/25">
                <Coins size={24} className="text-warning" />
                <span className="font-display text-3xl font-bold tabular-nums whitespace-nowrap text-warning-fg">
                  +{reward.xp} Coins
                </span>
              </div>
              <Button
                size="lg"
                onClick={proceed}
                className="flex w-full max-w-xs mx-auto h-14 rounded-2xl text-lg"
              >
                Continuar
              </Button>
            </div>
          </div>
        ) : finished ? (
          <div className="relative flex flex-col h-full items-center justify-center text-center overflow-hidden">
            {/* fundo grid de gráfico */}
            <div className="pointer-events-none absolute inset-0 bg-grid-fade" aria-hidden />
            <div className="relative">
              <div className="w-28 h-28 rounded-full flex items-center justify-center mb-6 mx-auto bg-gradient-to-br from-amber-400 to-amber-600 ring-8 ring-warning/10">
                <Trophy size={52} className="text-white" strokeWidth={2.5} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] mb-2 text-warning-fg">
                Módulo dominado
              </p>
              <h2 className="font-display text-3xl font-semibold text-fg mb-3">
                Módulo concluído!
              </h2>
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border mb-8 bg-warning/10 border-warning/25">
                <Coins size={24} className="text-warning" />
                <span className="font-display text-3xl font-bold tabular-nums whitespace-nowrap text-warning-fg">
                  +{moduleXp} Coins
                </span>
              </div>
              <Button
                size="lg"
                onClick={onClose}
                className="flex w-full max-w-xs mx-auto h-14 rounded-2xl text-lg"
              >
                Voltar à trilha
              </Button>
            </div>
          </div>
        ) : saving ? (
          <div className="flex h-full items-center justify-center text-fg-muted">Salvando…</div>
        ) : (
          <>
            {/* Título do nó atual, para situar dentro do módulo */}
            <p className={`text-[11px] font-bold uppercase tracking-wider mb-3 ${isRevisao ? 'text-warning-fg' : node?.kind === 'licao' ? 'text-danger-fg' : 'text-accent-fg'}`}>
              {isRevisao ? 'Revisão geral' : node?.kind === 'licao' ? 'Exercícios (Gain)' : `Aula ${node?.kind === 'aula' ? node.num : ''}`}
            </p>
            {renderStep()}
          </>
        )}
      </div>
    </div>
  );
};
