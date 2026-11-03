// Insígnias e patentes da Trilha Gain.
// Tudo é DERIVADO do progresso real (aulas concluídas e melhor sequência): não há
// nada para gravar nem como forjar. Se o progresso existe, a insígnia existe.

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'diamond';
export type BadgeGlyph = 'star' | 'flame';

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  tier: BadgeTier;
  glyph: BadgeGlyph;
  metric: 'lessons' | 'streak';
  threshold: number;
}

export const TIER_LABEL: Record<BadgeTier, string> = {
  bronze: 'Bronze', silver: 'Prata', gold: 'Ouro', diamond: 'Diamante',
};

export const BADGES: BadgeDef[] = [
  { id: 'lessons-1', name: 'Primeiro Passo', description: 'Concluiu a primeira aula da Trilha.', tier: 'bronze', glyph: 'star', metric: 'lessons', threshold: 1 },
  { id: 'lessons-5', name: 'Aquecimento', description: 'Concluiu 5 aulas da Trilha.', tier: 'bronze', glyph: 'star', metric: 'lessons', threshold: 5 },
  { id: 'lessons-15', name: 'Em Ritmo', description: 'Concluiu 15 aulas da Trilha.', tier: 'silver', glyph: 'star', metric: 'lessons', threshold: 15 },
  { id: 'lessons-30', name: 'Estudioso', description: 'Concluiu 30 aulas da Trilha.', tier: 'silver', glyph: 'star', metric: 'lessons', threshold: 30 },
  { id: 'lessons-60', name: 'Veterano', description: 'Concluiu 60 aulas da Trilha.', tier: 'gold', glyph: 'star', metric: 'lessons', threshold: 60 },
  { id: 'lessons-100', name: 'Mestre da Jornada', description: 'Concluiu 100 aulas da Trilha.', tier: 'diamond', glyph: 'star', metric: 'lessons', threshold: 100 },
  { id: 'streak-3', name: 'Constância', description: '3 dias seguidos estudando.', tier: 'bronze', glyph: 'flame', metric: 'streak', threshold: 3 },
  { id: 'streak-7', name: 'Semana de Fogo', description: '7 dias seguidos estudando.', tier: 'silver', glyph: 'flame', metric: 'streak', threshold: 7 },
  { id: 'streak-14', name: 'Disciplina de Aço', description: '14 dias seguidos estudando.', tier: 'gold', glyph: 'flame', metric: 'streak', threshold: 14 },
  { id: 'streak-30', name: 'Hábito Inabalável', description: '30 dias seguidos estudando.', tier: 'diamond', glyph: 'flame', metric: 'streak', threshold: 30 },
];

export interface BadgeStatus extends BadgeDef {
  earned: boolean;
  /** Valor atual da métrica (aulas ou dias), para mostrar o quanto falta. */
  value: number;
}

export interface ProgressMetrics { lessons: number; bestStreak: number }

export function computeBadges(m: ProgressMetrics): BadgeStatus[] {
  return BADGES.map((b) => {
    const value = b.metric === 'lessons' ? m.lessons : m.bestStreak;
    return { ...b, value, earned: value >= b.threshold };
  });
}

// Patentes pela quantidade de aulas concluídas.
const RANKS: { at: number; name: string }[] = [
  { at: 0, name: 'Novato' },
  { at: 1, name: 'Aprendiz' },
  { at: 5, name: 'Estudante' },
  { at: 15, name: 'Operador' },
  { at: 30, name: 'Trader' },
  { at: 60, name: 'Veterano' },
  { at: 100, name: 'Mestre' },
];

export function rankFor(lessons: number): { name: string; next: { name: string; at: number } | null } {
  let i = 0;
  for (let k = 0; k < RANKS.length; k++) if (lessons >= RANKS[k].at) i = k;
  const next = RANKS[i + 1];
  return { name: RANKS[i].name, next: next ? { name: next.name, at: next.at } : null };
}
