import React, { useEffect, useState } from 'react';
import { Loader2, Milestone } from 'lucide-react';
import { TrilhaTrack, TrilhaStats } from '../../types';
import {
  fetchTracks, fetchTrackTree, fetchCompletedLessonIds, fetchStats,
} from '../../lib/trilhaGain';
import { BackButton } from '../BackButton';
import { GamificationBar } from './GamificationBar';
import { TrackMap } from './TrackMap';
import { LessonPlayer } from './LessonPlayer';
import { TrackNode } from './unitNodes';
import { InvertedScroll } from './InvertedScroll';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  onBack: () => void;
}

export const TrilhaGain: React.FC<Props> = ({ onBack }) => {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [tracks, setTracks] = useState<TrilhaTrack[]>([]);
  const [activeTrack, setActiveTrack] = useState<TrilhaTrack | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<TrilhaStats | null>(null);
  const [playing, setPlaying] = useState<{ nodes: TrackNode[]; startIndex: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [t, c, s] = await Promise.all([fetchTracks(), fetchCompletedLessonIds(), fetchStats()]);
      setTracks(t);
      setCompleted(c);
      setStats(s);
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
    // Recarrega stats para refletir XP/streak atualizados
    setStats(await fetchStats());
  };

  // --- Render ---

  if (loading && tracks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 min-w-0">
          <BackButton onClick={onBack} />
          <h1 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2 min-w-0">
            <span className="shrink-0">Trilha Gain</span>
            <span className="text-slate-300 shrink-0">—</span>
            <span className="text-emerald-600 truncate">Jornada do Trader</span>
          </h1>
        </div>
        <GamificationBar stats={stats} />
      </div>

      {/* Rolagem reversa: barra começa no topo e desce normal; a trilha sobe
          (aula 1 sai por baixo, aula 2 entra por cima). Sem banner. */}
      {loading && !activeTrack ? (
        <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" size={28} /></div>
      ) : activeTrack ? (
        <InvertedScroll banner={null}>
          <TrackMap
            track={activeTrack}
            completed={completed}
            isAdmin={isAdmin}
            onSelectNode={(nodes, startIndex) => setPlaying({ nodes, startIndex })}
          />
        </InvertedScroll>
      ) : (
        <div className="text-center text-slate-400 py-16 flex flex-col items-center gap-3">
          <Milestone size={40} className="opacity-40" />
          <p>Nenhuma trilha publicada ainda.</p>
        </div>
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
