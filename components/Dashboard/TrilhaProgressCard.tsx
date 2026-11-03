import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Lock, Milestone } from 'lucide-react';
import { Button, Card, EmptyState, Skeleton } from '../ui';
import { ProgressPanel, isRealLesson } from '../TrilhaGain/ProgressPanel';
import { buildUnitNodes } from '../TrilhaGain/unitNodes';
import {
  fetchCompletedLessonIds, fetchStats, fetchTrackOutline, fetchTracks, fetchUnlockedUnitIds,
} from '../../lib/trilhaGain';
import { TrilhaStats } from '../../types';

interface UnitProgress {
  id: string;
  title: string;
  done: number;
  total: number;
  /** Premium ainda não desbloqueada: não entra na porcentagem geral. */
  locked: boolean;
}

interface Progress {
  units: UnitProgress[];
  stats: TrilhaStats | null;
  /** Aulas reais (sem Gain/Revisão) concluídas e total, para patente e insígnias. */
  lessons: number;
  totalLessons: number;
}

interface Props {
  onOpen: () => void;
}

// Painel "Sua Trilha" da página inicial: progresso geral, unidade a unidade, e
// Coins/streak. Conta os mesmos nós do mapa (aulas + Gains + Revisão), então o
// número bate com o que o aluno vê dentro da Trilha Gain.
export const TrilhaProgressCard: React.FC<Props> = ({ onOpen }) => {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [tracks, completed, unlocked, stats] = await Promise.all([
          fetchTracks(), fetchCompletedLessonIds(), fetchUnlockedUnitIds(), fetchStats(),
        ]);
        // Mesma escolha da tela da Trilha: a primeira trilha gratuita.
        const track = tracks.find((t) => !t.is_locked) ?? tracks[0];
        const outline = track ? await fetchTrackOutline(track.id) : [];
        if (!alive) return;

        setProgress({
          stats,
          lessons: [...completed].filter(isRealLesson).length,
          totalLessons: outline.reduce((t, u) => t + (u.lessons?.length ?? 0), 0),
          units: outline.map((u) => {
            const nodes = buildUnitNodes(u.id, u.lessons ?? []);
            return {
              id: u.id,
              title: u.title,
              total: nodes.length,
              done: nodes.filter((n) => completed.has(n.id)).length,
              locked: !!u.is_locked && !unlocked.has(u.id),
            };
          }),
        });
      } catch (e) {
        console.error('[TrilhaProgressCard]', e);
        if (alive) setFailed(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const open = progress?.units.filter((u) => !u.locked) ?? [];
  const total = open.reduce((a, u) => a + u.total, 0);
  const done = open.reduce((a, u) => a + u.done, 0);
  const pct = total ? Math.round((done / total) * 100) : 0;
  const current = open.find((u) => u.done < u.total);

  return (
    <Card>
      <div className="mb-6">
        <h3 className="font-display text-lg font-semibold text-fg">Sua Trilha</h3>
      </div>

      {loading ? (
        <div className="space-y-3" role="status">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <span className="sr-only">Carregando...</span>
        </div>
      ) : failed || !progress || progress.units.length === 0 ? (
        <EmptyState
          className="py-8"
          icon={Milestone}
          title={failed ? 'Não foi possível carregar sua trilha.' : 'Nenhuma trilha publicada ainda.'}
        />
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl border border-tint/8 bg-tint/3 p-4 sm:p-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="eyebrow-muted">Progresso geral</p>
                <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-fg">{pct}%</p>
              </div>
              <p className="pb-1 text-xs text-fg-subtle tabular-nums">{done} de {total} etapas</p>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-tint/6">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-green-bright to-brand-green transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            {current && (
              <p className="mt-3 text-xs text-fg-muted">
                {done === 0 ? 'Comece por ' : 'Continue em '}
                <span className="font-semibold text-fg">{current.title}</span>
              </p>
            )}
          </div>

          <ProgressPanel lessons={progress.lessons} totalLessons={progress.totalLessons} stats={progress.stats} />

          <ul className="max-h-[260px] space-y-2 overflow-y-auto pr-1 ds-scrollbar">
            {progress.units.map((u) => {
              const complete = !u.locked && u.total > 0 && u.done >= u.total;
              const unitPct = u.total ? Math.round((u.done / u.total) * 100) : 0;
              return (
                <li key={u.id} className="rounded-xl border border-tint/8 bg-tint/3 px-3.5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className={`min-w-0 truncate text-sm font-medium ${u.locked ? 'text-fg-subtle' : 'text-fg'}`}>{u.title}</p>
                    {u.locked ? (
                      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                        <Lock size={12} aria-hidden /> Premium
                      </span>
                    ) : complete ? (
                      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-success-fg">
                        <CheckCircle2 size={13} aria-hidden /> Concluída
                      </span>
                    ) : (
                      <span className="shrink-0 font-mono text-xs tabular-nums text-fg-muted">{u.done}/{u.total}</span>
                    )}
                  </div>
                  {!u.locked && !complete && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-tint/6">
                      <div className="h-full rounded-full bg-accent/70 transition-all duration-500" style={{ width: `${unitPct}%` }} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <Button onClick={onOpen} className="w-full">
            {done === 0 ? 'Começar a Trilha' : 'Continuar a Trilha'} <ArrowRight size={16} />
          </Button>
        </div>
      )}
    </Card>
  );
};
