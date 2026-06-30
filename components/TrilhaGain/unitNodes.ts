import { TrilhaLesson, TrilhaStep } from '../../types';

// Um nó da trilha pode ser uma AULA (só conteúdo/leitura, 0 XP) ou uma LIÇÃO
// (candle amarelo = "gain": agrupa os exercícios das aulas anteriores e dá o XP).
export type TrackNode =
  | { kind: 'aula'; id: string; lesson: TrilhaLesson; xp: number; num: number }
  | { kind: 'licao'; id: string; lesson: TrilhaLesson; xp: number; coversIds: string[] };

const isExercise = (s: TrilhaStep) => s.type !== 'concept'; // quiz/truefalse/order/chart
const isConcept = (s: TrilhaStep) => s.type === 'concept';

// Monta a sequência de nós de uma unidade:
//   aula(só leitura), aula, LIÇÃO(exercícios das 2 + XP), aula, aula, LIÇÃO, ...
// A unidade SEMPRE termina com uma lição (mesmo cobrindo só 1 aula no fim).
// XP: 0 nas aulas; todo o XP é liberado ao concluir a lição (candle amarelo).
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
    bucket.push(l);
    if (bucket.length === 2) flushLicao(i);
  });
  flushLicao(lessons.length); // sobra 1 aula → fecha numa lição mesmo assim

  return nodes;
}
