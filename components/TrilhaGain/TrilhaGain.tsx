import React, { useEffect, useState } from 'react';
import { Loader2, Milestone } from 'lucide-react';
import { TrilhaTrack, TrilhaStats } from '../../types';
import {
  fetchTracks, fetchTrackTree, fetchCompletedLessonIds, fetchStats,
  fetchUnlockedUnitIds, redeemUnitUnlock, redeemUnitSkip, fetchSkipCost,
} from '../../lib/trilhaGain';
import { BackButton } from '../BackButton';
import { GamificationBar } from './GamificationBar';
import { TrackMap } from './TrackMap';
import { LessonPlayer } from './LessonPlayer';
import { TrackNode } from './unitNodes';
import { InvertedScroll } from './InvertedScroll';
import { ProgressPanel } from './ProgressPanel';
import { useAuth } from '../../contexts/AuthContext';
import { EmptyState, PageHeader, Skeleton } from '../ui';

interface Props {
  onBack: () => void;
  onBuyCoins?: () => void;
}

export const TrilhaGain: React.FC<Props> = ({ onBack, onBuyCoins }) => {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [tracks, setTracks] = useState<TrilhaTrack[]>([]);
  const [activeTrack, setActiveTrack] = useState<TrilhaTrack | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  // Unidades com acesso comprado (premium pago OU pulo) — qualquer reason.
  const [accessUnits, setAccessUnits] = useState<Set<string>>(new Set());
  const [skipCost, setSkipCost] = useState(1000);
  const [stats, setStats] = useState<TrilhaStats | null>(null);
  const [playing, setPlaying] = useState<{ nodes: TrackNode[]; startIndex: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [t, c, s, u, sc] = await Promise.all([
        fetchTracks(), fetchCompletedLessonIds(), fetchStats(), fetchUnlockedUnitIds(), fetchSkipCost(),
      ]);
      setTracks(t);
      setCompleted(c);
      setStats(s);
      setAccessUnits(u);
      setSkipCost(sc);
      // Abre direto a primeira trilha gratuita (sem etapa de seleção).
      const first = t.find((tr) => !tr.is_locked) ?? t[0];
      if (first) {
        const tree = await fetchTrackTree(first.id);
        setActiveTrack(tree);
      }
      setLoading(false);
    })();
  }, []);

  const handleLessonCompleted = async (lessonId: string) => {
    setCompleted((prev) => new Set(prev).add(lessonId));
    // Recarrega stats para refletir Coins/streak atualizados
    setStats(await fetchStats());
  };

  // Desbloqueia a unidade Premium alcançada organicamente (gasta unlock_cost).
  const handleRedeem = async (unitId: string) => {
    await redeemUnitUnlock(unitId); // lança em insufficient_xp / not_redeemable
    setAccessUnits((prev) => new Set(prev).add(unitId));
    await refreshAfterUnlock();
  };

  // Pula (compra acesso a) uma unidade à frente travada. Não move a progressão.
  const handleSkip = async (unitId: string) => {
    await redeemUnitSkip(unitId); // lança em insufficient_xp
    setAccessUnits((prev) => new Set(prev).add(unitId));
    await refreshAfterUnlock();
  };

  // O banco só entrega os passos de unidade Premium a quem a desbloqueou:
  // depois do resgate a árvore precisa ser relida, senão a lição abre vazia.
  const refreshAfterUnlock = async () => {
    const [s, tree] = await Promise.all([
      fetchStats(),
      activeTrack ? fetchTrackTree(activeTrack.id) : Promise.resolve(null),
    ]);
    setStats(s);
    if (tree) setActiveTrack(tree);
  };

  // --- Render ---

  if (loading && tracks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-fg-subtle">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto w-full">
      {/* Header */}
      <PageHeader
        className="mb-5 sm:mb-5 sm:items-center"
        leading={<BackButton onClick={onBack} />}
        title={
          <span className="flex items-center gap-2 min-w-0 text-xl md:text-2xl">
            <span className="shrink-0">Trilha Gain</span>
            <span className="text-fg-subtle shrink-0">—</span>
            <span className="text-accent-fg truncate">Jornada do Trader</span>
          </span>
        }
        actions={<GamificationBar stats={stats} onBuy={onBuyCoins} />}
      />

      {activeTrack && <ProgressPanel track={activeTrack} completed={completed} stats={stats} />}

      {/* Rolagem reversa: barra começa no topo e desce normal; a trilha
          sobe (aula 1 sai por baixo, aula 2 entra por cima). */}
      {loading && !activeTrack ? (
        <div className="space-y-3">
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      ) : activeTrack ? (
        <InvertedScroll>
          <TrackMap
            track={activeTrack}
            completed={completed}
            accessUnits={accessUnits}
            coins={stats?.total_xp ?? 0}
            skipCost={skipCost}
            isAdmin={isAdmin}
            onSelectNode={(nodes, startIndex) => setPlaying({ nodes, startIndex })}
            onRedeem={handleRedeem}
            onSkip={handleSkip}
          />
        </InvertedScroll>
      ) : (
        <EmptyState icon={Milestone} title="Nenhuma trilha publicada ainda." />
      )}

      {/* Player do módulo: flui aula→aula→gain→…→revisão sem voltar ao lobby */}
      {playing && (
        <LessonPlayer
          nodes={playing.nodes}
          startIndex={playing.startIndex}
          onClose={() => setPlaying(null)}
          onCompleted={handleLessonCompleted}
        />
      )}
    </div>
  );
};
