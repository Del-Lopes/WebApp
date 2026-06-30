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
    <div className="tg-scope fixed inset-0 z-[60] flex flex-col bg-gradient-to-b from-white to-slate-50">
      {/* Header com voltar + progresso do MÓDULO */}
      <div className="flex items-center gap-2.5 px-4 py-3.5 bg-white/80 backdrop-blur-md border-b border-slate-100/80">
        <button
          onClick={onClose}
          className="grid place-items-center w-9 h-9 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Fechar"
        >
          <X size={22} />
        </button>
        {!finished && !reward && (
          <button
            onClick={goBack}
            disabled={!canGoBack}
            className="grid place-items-center w-9 h-9 rounded-full text-slate-400 enabled:hover:text-slate-700 enabled:hover:bg-slate-100 disabled:opacity-25 transition-colors"
            aria-label="Voltar"
          >
            <ChevronLeft size={22} />
          </button>
        )}
        <div className="relative flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 rounded-full transition-[width] duration-500 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]"
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
              className="absolute inset-0 opacity-[0.035]"
              style={{
                backgroundImage:
                  'linear-gradient(#e11d48 1px, transparent 1px), linear-gradient(90deg, #e11d48 1px, transparent 1px)',
                backgroundSize: '32px 32px',
                maskImage: 'radial-gradient(70% 60% at 50% 45%, #000 30%, transparent 75%)',
              }}
            />
            <div className="relative">
              <div className="relative w-28 h-28 mb-6 mx-auto tg-rise tg-rise-1">
                <span className="absolute inset-0 rounded-full bg-rose-400/30 blur-2xl" />
                <div className="tg-sheen relative w-28 h-28 rounded-full grid place-items-center bg-gradient-to-br from-rose-400 to-red-600 shadow-[0_16px_40px_-10px_rgba(244,63,94,0.6)] ring-1 ring-white/30 overflow-hidden">
                  <Swords size={50} className="text-white drop-shadow" strokeWidth={2.5} />
                </div>
              </div>
              <p className="tg-rise tg-rise-2 font-semibold text-[13px] uppercase tracking-[0.18em] mb-1.5 text-rose-500">
                Exercícios vencidos
              </p>
              <h2 className="tg-rise tg-rise-2 font-display text-[28px] font-bold text-slate-900 tracking-tight mb-4">
                Gain concluído!
              </h2>
              <div className="tg-rise tg-rise-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl mb-8 bg-gradient-to-br from-amber-50 to-amber-100 ring-1 ring-amber-200/80 shadow-[0_6px_18px_-6px_rgba(245,158,11,0.45)]">
                <Coins size={22} className="text-amber-500" />
                <span className="font-display text-2xl font-bold text-amber-600 tabular-nums">
                  +{reward.xp} XP
                </span>
              </div>
              <button
                onClick={proceed}
                className="tg-btn tg-rise tg-rise-4 block w-full max-w-xs mx-auto py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-lg shadow-[var(--tg-shadow-glow)]"
              >
                Continuar
              </button>
            </div>
          </div>
        ) : finished ? (
          <div className="relative flex flex-col h-full items-center justify-center text-center overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.035]"
              style={{
                backgroundImage:
                  'linear-gradient(#059669 1px, transparent 1px), linear-gradient(90deg, #059669 1px, transparent 1px)',
                backgroundSize: '32px 32px',
                maskImage: 'radial-gradient(70% 60% at 50% 45%, #000 30%, transparent 75%)',
              }}
            />
            <div className="relative">
              <div className="relative w-28 h-28 mb-6 mx-auto tg-rise tg-rise-1">
                <span className="absolute inset-0 rounded-full bg-amber-400/30 blur-2xl" />
                <div className="tg-sheen relative w-28 h-28 rounded-full grid place-items-center bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_16px_40px_-10px_rgba(245,158,11,0.6)] ring-1 ring-white/30 overflow-hidden">
                  <Trophy size={52} className="text-white drop-shadow" strokeWidth={2.5} />
                </div>
              </div>
              <p className="tg-rise tg-rise-2 font-semibold text-[13px] uppercase tracking-[0.18em] mb-1.5 text-amber-600">
                Módulo dominado
              </p>
              <h2 className="tg-rise tg-rise-2 font-display text-[28px] font-bold text-slate-900 tracking-tight mb-4">
                Módulo concluído!
              </h2>
              <div className="tg-rise tg-rise-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl mb-8 bg-gradient-to-br from-amber-50 to-amber-100 ring-1 ring-amber-200/80 shadow-[0_6px_18px_-6px_rgba(245,158,11,0.45)]">
                <Coins size={22} className="text-amber-500" />
                <span className="font-display text-2xl font-bold text-amber-600 tabular-nums">
                  +{moduleXp} XP
                </span>
              </div>
              <button
                onClick={onClose}
                className="tg-btn tg-rise tg-rise-4 block w-full max-w-xs mx-auto py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-lg shadow-[var(--tg-shadow-glow)]"
              >
                Voltar à trilha
              </button>
            </div>
          </div>
        ) : saving ? (
          <div className="flex h-full items-center justify-center text-slate-400">Salvando…</div>
        ) : (
          <div key={`${nodeIndex}-${stepIndex}`} className="flex flex-col h-full tg-rise tg-rise-1">
            {/* Título do nó atual, para situar dentro do módulo */}
            <div className="flex items-center gap-2 mb-4">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${isRevisao ? 'bg-amber-500' : node?.kind === 'licao' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
              <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isRevisao ? 'text-amber-600' : node?.kind === 'licao' ? 'text-rose-500' : 'text-emerald-600'}`}>
                {isRevisao ? 'Revisão geral' : node?.kind === 'licao' ? 'Exercícios (Gain)' : `Aula ${node?.kind === 'aula' ? node.num : ''}`}
              </p>
            </div>
            <div className="flex-1 min-h-0">{renderStep()}</div>
          </div>
        )}
      </div>
    </div>
  );
};
