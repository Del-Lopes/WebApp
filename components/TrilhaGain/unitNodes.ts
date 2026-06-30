import { TrilhaLesson, TrilhaStep } from '../../types';

// Um nó da trilha pode ser uma AULA (só conteúdo/leitura, 0 XP), uma LIÇÃO
// (candle amarelo = "gain": agrupa os exercícios de 2 aulas e dá o XP) ou a
// REVISÃO geral (candle final da unidade: exercícios de TODAS as aulas + XP bônus).
export type TrackNode =
  | { kind: 'aula'; id: string; lesson: TrilhaLesson; xp: number; num: number }
  | { kind: 'licao'; id: string; lesson: TrilhaLesson; xp: number; coversIds: string[] }
  | { kind: 'revisao'; id: string; lesson: TrilhaLesson; xp: number; coversIds: string[] };

const isExercise = (s: TrilhaStep) => s.type !== 'concept'; // quiz/truefalse/order/chart
const isConcept = (s: TrilhaStep) => s.type === 'concept';

// Multiplicador de XP da revisão geral sobre a soma das aulas da unidade.
const REVISAO_XP_MULT = 1.5;

// Monta a sequência de nós de uma unidade:
//   aula(só leitura), aula, LIÇÃO(exercícios das 2 + XP), aula, aula, LIÇÃO, ...
// e fecha SEMPRE com uma REVISÃO geral: candle final com os exercícios de TODAS
// as aulas da unidade e XP bônus (soma das aulas × 1.5).
// XP: 0 nas aulas; o ganho é liberado nas lições (gains) e na revisão final.
export function buildUnitNodes(unitId: string, lessons: TrilhaLesson[]): TrackNode[] {
  const nodes: TrackNode[] = [];
  let bucket: TrilhaLesson[] = []; // aulas acumuladas desde a última lição

  const flushLicao = (idx: number) => {
    if (bucket.length === 0) return;
    // exercícios de todas as aulas cobertas (sem os concepts)
    const steps: TrilhaStep[] = bucket
      .flatMap((l) => l.steps ?? [])
      .filter(isExercise)
      .map((s, i) => ({ ...s, order_index: i }));
    // XP do gain = soma do XP das aulas cobertas (todo o ganho concentrado aqui)
    const xp = Math.max(10, bucket.reduce((a, l) => a + (l.xp_reward || 0), 0));
    const id = `licao-${unitId}-${idx}`;
    nodes.push({
      kind: 'licao',
      id,
      coversIds: bucket.map((l) => l.id),
      xp,
      lesson: { id, unit_id: unitId, title: 'Gain — Exercícios', xp_reward: xp, order_index: idx, steps },
    });
    bucket = [];
  };

  // Quantas aulas, no fim, ficam sem gain próprio e são absorvidas pela revisão.
  // (gains fecham de 2 em 2; o que sobra no final entra na revisão geral.)
  const tailUncovered = lessons.length % 2 === 0 ? 2 : 1;
  const lastGainIdx = lessons.length - tailUncovered; // nº de aulas cobertas por gains

  lessons.forEach((l, i) => {
    // Aula = só os concepts (conteúdo), 0 XP. Numerada a partir de 1 na unidade.
    const conceptSteps = (l.steps ?? []).filter(isConcept).map((s, k) => ({ ...s, order_index: k }));
    nodes.push({
      kind: 'aula',
      id: l.id,
      xp: 0,
      num: i + 1,
      lesson: { ...l, xp_reward: 0, steps: conceptSteps },
    });
    // só acumula aulas que serão cobertas por um gain de 2; o resto vai pra revisão.
    if (i < lastGainIdx) {
      bucket.push(l);
      if (bucket.length === 2) flushLicao(i);
    }
  });

  // REVISÃO geral: exercícios de TODAS as aulas da unidade + XP bônus.
  if (lessons.length > 0) {
    const steps: TrilhaStep[] = lessons
      .flatMap((l) => l.steps ?? [])
      .filter(isExercise)
      .map((s, i) => ({ ...s, order_index: i }));
    const baseXp = lessons.reduce((a, l) => a + (l.xp_reward || 0), 0);
    const xp = Math.max(20, Math.round(baseXp * REVISAO_XP_MULT));
    const id = `revisao-${unitId}`;
    nodes.push({
      kind: 'revisao',
      id,
      coversIds: lessons.map((l) => l.id),
      xp,
      lesson: { id, unit_id: unitId, title: 'Revisão Geral', xp_reward: xp, order_index: lessons.length, steps },
    });
  }

  return nodes;
}
