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

  // Banner "Domine o mercado" — FIXO no topo; a trilha passa por trás dele.
  const banner = (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 via-slate-900 to-emerald-950 p-6 mb-3 shadow-xl">
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="absolute inset-0 flex items-end justify-around px-2 pb-0 opacity-25">
        {[
          { h: 34, b: 20, up: true }, { h: 52, b: 30, up: true }, { h: 40, b: 18, up: false },
          { h: 64, b: 36, up: true }, { h: 48, b: 22, up: false }, { h: 72, b: 44, up: true },
          { h: 58, b: 28, up: false }, { h: 80, b: 50, up: true }, { h: 66, b: 32, up: true },
          { h: 90, b: 40, up: false }, { h: 76, b: 46, up: true }, { h: 100, b: 58, up: true },
        ].map((c, i) => (
          <div key={i} className="flex flex-col items-center justify-end" style={{ height: '100%' }}>
            <div className={`w-[2px] ${c.up ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ height: (c.h - c.b) / 2 }} />
            <div className={`w-2 rounded-[2px] ${c.up ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ height: c.b }} />
            <div className={`w-[2px] ${c.up ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ height: (c.h - c.b) / 2 }} />
          </div>
        ))}
      </div>
      <div className="relative">
        <div className="inline-flex items-center gap-2 text-emerald-300 text-xs font-bold mb-3">
          <span className="w-6 h-px bg-emerald-400/60" />
          Do zero ao operacional: Fundamentos, leitura de Candles e estruturação de operações.
        </div>
        <h2 className="text-2xl font-extrabold text-white leading-tight">
          Domine o mercado,<br />uma lição por vez.
        </h2>
      </div>
    </div>
  );

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

      {/* Banner fixo no topo + rolagem reversa: barra começa no topo e desce
          normal; a trilha passa por trás do banner (aula 1 sai por baixo,
          aula 2 entra por cima). */}
      {loading && !activeTrack ? (
        <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" size={28} /></div>
      ) : activeTrack ? (
        <InvertedScroll banner={banner}>
          <TrackMap track={activeTrack} completed={completed} isAdmin={isAdmin} onSelectLesson={setPlaying} />
        </InvertedScroll>
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
