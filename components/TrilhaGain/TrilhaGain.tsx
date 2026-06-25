import React, { useEffect, useState } from 'react';
import { Loader2, Milestone } from 'lucide-react';
import { TrilhaTrack, TrilhaLesson, TrilhaStats } from '../../types';
import {
  fetchTracks, fetchTrackTree, fetchCompletedLessonIds, fetchStats,
} from '../../lib/trilhaGain';
import { BackButton } from '../BackButton';
import { GamificationBar } from './GamificationBar';
import { TrackMap } from './TrackMap';
import { LessonPlayer } from './LessonPlayer';

interface Props {
  onBack: () => void;
}

export const TrilhaGain: React.FC<Props> = ({ onBack }) => {
  const [tracks, setTracks] = useState<TrilhaTrack[]>([]);
  const [activeTrack, setActiveTrack] = useState<TrilhaTrack | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<TrilhaStats | null>(null);
  const [playing, setPlaying] = useState<TrilhaLesson | null>(null);
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
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
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

      {/* Banner — minimalista, com candles sutis no rodapé */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-5 mb-8">
        {/* candles discretos no rodapé */}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-around px-2 h-16 opacity-[0.18]">
          {[
            { h: 24, b: 14, up: true }, { h: 36, b: 20, up: true }, { h: 28, b: 12, up: false },
            { h: 44, b: 26, up: true }, { h: 34, b: 16, up: false }, { h: 50, b: 30, up: true },
            { h: 40, b: 20, up: false }, { h: 56, b: 34, up: true }, { h: 46, b: 22, up: true },
            { h: 62, b: 28, up: false }, { h: 52, b: 32, up: true }, { h: 68, b: 40, up: true },
          ].map((c, i) => (
            <div key={i} className="flex flex-col items-center justify-end h-full">
              <div className={`w-[2px] ${c.up ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ height: (c.h - c.b) / 2 }} />
              <div className={`w-1.5 rounded-[1px] ${c.up ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ height: c.b }} />
              <div className={`w-[2px] ${c.up ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ height: (c.h - c.b) / 2 }} />
            </div>
          ))}
        </div>
        <div className="relative">
          <h2 className="text-xl font-bold text-white leading-snug mb-2">
            Domine o mercado, uma lição por vez.
          </h2>
          <p className="text-slate-400 text-xs leading-relaxed max-w-md">
            Do zero ao operacional: fundamentos, leitura de candles e estruturação de operações.
          </p>
        </div>
      </div>

      {/* Mapa da trilha */}
      {loading && !activeTrack ? (
        <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" size={28} /></div>
      ) : activeTrack ? (
        <TrackMap track={activeTrack} completed={completed} onSelectLesson={setPlaying} />
      ) : (
        <div className="text-center text-slate-400 py-16 flex flex-col items-center gap-3">
          <Milestone size={40} className="opacity-40" />
          <p>Nenhuma trilha publicada ainda.</p>
        </div>
      )}

      {/* Player de lição */}
      {playing && (
        <LessonPlayer
          lesson={playing}
          onClose={() => setPlaying(null)}
          onCompleted={handleLessonCompleted}
        />
      )}
    </div>
  );
};
