import { TrilhaLesson, TrilhaStep } from '../../types';

// Um nó da trilha pode ser uma AULA (lição real do banco) ou uma LIÇÃO
// (checkpoint sintético que revisa as 2 aulas anteriores).
export type TrackNode =
  | { kind: 'aula'; id: string; lesson: TrilhaLesson; xp: number }
  | { kind: 'licao'; id: string; lesson: TrilhaLesson; xp: number; coversIds: string[] };

// Só exercícios entram na revisão (concept é conteúdo, não vale como quiz).
const isExercise = (s: TrilhaStep) => s.type !== 'concept';

// Monta a sequência de nós de uma unidade:
//   aula, aula, LIÇÃO(revisa 2), aula, aula, LIÇÃO(revisa 2), ...
// A unidade SEMPRE termina com uma lição (mesmo que cubra só 1 aula no fim).
export function buildUnitNodes(unitId: string, lessons: TrilhaLesson[]): TrackNode[] {
  const nodes: TrackNode[] = [];
  let bucket: TrilhaLesson[] = []; // aulas acumuladas desde a última lição

  const flushLicao = (idx: number) => {
    if (bucket.length === 0) return;
    const steps: TrilhaStep[] = bucket
      .flatMap((l) => l.steps ?? [])
      .filter(isExercise)
      .map((s, i) => ({ ...s, order_index: i }));
    const xp = bucket.reduce((a, l) => a + (l.xp_reward || 0), 0);
    nodes.push({
      kind: 'licao',
      id: `licao-${unitId}-${idx}`,
      coversIds: bucket.map((l) => l.id),
      xp: Math.max(20, Math.round(xp / 2)),
      lesson: {
        id: `licao-${unitId}-${idx}`,
        unit_id: unitId,
        title: 'Lição — Revisão',
        xp_reward: Math.max(20, Math.round(xp / 2)),
        order_index: idx,
        steps,
      },
    });
    bucket = [];
  };

  lessons.forEach((l, i) => {
    nodes.push({ kind: 'aula', id: l.id, lesson: l, xp: l.xp_reward });
    bucket.push(l);
    if (bucket.length === 2) flushLicao(i);
  });
  // Sobrou 1 aula no fim → fecha numa lição mesmo assim (a última é sempre lição).
  flushLicao(lessons.length);

  return nodes;
}
