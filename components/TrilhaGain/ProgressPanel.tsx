import React, { useMemo, useState } from 'react';
import { Flame, Lock, Star, Trophy } from 'lucide-react';
import { TrilhaStats, TrilhaTrack } from '../../types';
import { BadgeStatus, TIER_LABEL, computeBadges, rankFor } from '../../lib/badges';
import type { CardSpec } from '../../lib/shareCard';
import { ShareButton, ShareCardModal } from '../Share/ShareCardModal';
import { Card } from '../ui';

interface Props {
  track: TrilhaTrack | null;
  completed: Set<string>;
  stats: TrilhaStats | null;
}

const TIER_BG: Record<BadgeStatus['tier'], string> = {
  bronze: 'linear-gradient(135deg,#f5c9a0,#b9722f)',
  silver: 'linear-gradient(135deg,#f1f5f9,#94a3b8)',
  gold: 'linear-gradient(135deg,#fde68a,#d4a017)',
  diamond: 'linear-gradient(135deg,#a5f3fc,#22d3ee)',
};

// Gain e Revisão têm id sintético (ver unitNodes.ts) e não contam como aula.
const isRealLesson = (id: string) => !id.startsWith('licao-') && !id.startsWith('revisao-');

type Sharing = { kind: 'progress' } | { kind: 'badge'; badge: BadgeStatus } | null;

export const ProgressPanel: React.FC<Props> = ({ track, completed, stats }) => {
  const [sharing, setSharing] = useState<Sharing>(null);

  const lessons = useMemo(() => [...completed].filter(isRealLesson).length, [completed]);
  const totalLessons = useMemo(
    () => (track?.units ?? []).reduce((t, u) => t + (u.lessons?.length ?? 0), 0),
    [track],
  );
  const streak = stats?.current_streak ?? 0;
  const bestStreak = Math.max(stats?.best_streak ?? 0, streak);
  const badges = useMemo(() => computeBadges({ lessons, bestStreak }), [lessons, bestStreak]);
  const earned = badges.filter((b) => b.earned).length;
  const rank = rankFor(lessons);
  const nextBadge = badges.find((b) => !b.earned && b.metric === 'lessons');

  const toNext = rank.next ? Math.min(100, Math.round(((lessons) / rank.next.at) * 100)) : 100;

  const build = (): CardSpec => {
    if (sharing?.kind === 'badge') {
      const b = sharing.badge;
      return {
        kind: 'badge',
        badge: { name: b.name, description: b.description, tier: b.tier, glyph: b.glyph, tierLabel: TIER_LABEL[b.tier] },
        rank: rank.name, lessons, bestStreak,
      };
    }
    return {
      kind: 'progress', rank: rank.name, lessons, totalLessons, streak, bestStreak,
      badges: badges.map((b) => ({ name: b.name, tier: b.tier, glyph: b.glyph, earned: b.earned })),
    };
  };

  const caption = sharing?.kind === 'badge'
    ? `🏅 Conquistei a insígnia "${sharing.badge.name}" na Trilha Gain do Trader AFK! Aprendendo a operar um dia de cada vez. traderafk.com`
    : `📈 Patente ${rank.name} na Trilha Gain: ${lessons} aulas concluídas e ${bestStreak} dias de melhor sequência. Aprendendo a operar um dia de cada vez. traderafk.com`;

  return (
    <Card className="mb-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow-muted inline-flex items-center gap-1.5"><Trophy size={12} /> Seu progresso</p>
          <p className="mt-1 font-display text-2xl font-semibold text-fg">{rank.name}</p>
          <p className="text-sm text-fg-muted">
            {lessons} {lessons === 1 ? 'aula concluída' : 'aulas concluídas'}
            {totalLessons > 0 ? ` de ${totalLessons}` : ''} · {earned}/{badges.length} insígnias
          </p>
        </div>
        <ShareButton label="Compartilhar progresso" onClick={() => setSharing({ kind: 'progress' })} />
      </div>

      {rank.next && (
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs text-fg-subtle">
            <span>Próxima patente: <strong className="text-fg-muted">{rank.next.name}</strong></span>
            <span className="font-mono tabular-nums">{lessons}/{rank.next.at} aulas</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-tint/6" role="progressbar" aria-valuenow={toNext} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso para a próxima patente">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-green-bright to-brand-green transition-all" style={{ width: `${toNext}%` }} />
          </div>
        </div>
      )}

      <div>
        <p className="eyebrow-muted mb-2">Insígnias</p>
        <ul className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          {badges.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                disabled={!b.earned}
                onClick={() => setSharing({ kind: 'badge', badge: b })}
                title={b.earned
                  ? `${b.name} (${TIER_LABEL[b.tier]}) — toque para compartilhar`
                  : `${b.name}: ${b.description} (${b.value}/${b.threshold})`}
                aria-label={b.earned ? `Compartilhar insígnia ${b.name}` : `Insígnia bloqueada: ${b.name}`}
                className="group flex w-full flex-col items-center gap-1 focus-visible:outline-hidden"
              >
                <span
                  className={`flex aspect-square w-full max-w-12 items-center justify-center rounded-full border transition-transform group-focus-visible:ring-2 group-focus-visible:ring-accent/60 ${
                    b.earned ? 'border-white/40 group-hover:scale-105' : 'border-tint/10 bg-tint/4'
                  }`}
                  style={b.earned ? { background: TIER_BG[b.tier] } : undefined}
                >
                  {b.earned
                    ? (b.glyph === 'star'
                      ? <Star size={18} className="fill-black/80 text-black/80" />
                      : <Flame size={18} className="fill-black/80 text-black/80" />)
                    : <Lock size={14} className="text-fg-subtle" />}
                </span>
                <span className={`line-clamp-2 text-center text-[10px] leading-tight ${b.earned ? 'text-fg-muted' : 'text-fg-subtle'}`}>{b.name}</span>
              </button>
            </li>
          ))}
        </ul>
        {nextBadge && (
          <p className="mt-2 text-xs text-fg-subtle">
            Próxima: <strong className="text-fg-muted">{nextBadge.name}</strong> — faltam {Math.max(0, nextBadge.threshold - nextBadge.value)} aulas.
          </p>
        )}
      </div>

      <ShareCardModal
        open={sharing !== null}
        onClose={() => setSharing(null)}
        title={sharing?.kind === 'badge' ? 'Compartilhar insígnia' : 'Compartilhar progresso'}
        build={build}
        caption={caption}
        fileName={sharing?.kind === 'badge' ? `insignia-${sharing.badge.id}` : 'progresso-trilha-gain'}
      />
    </Card>
  );
};
