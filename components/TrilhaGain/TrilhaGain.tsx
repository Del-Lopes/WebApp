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

  // Banner "Domine o mercado" — FIXO no topo; a trilha passa por trás dele.
  const banner = (
    <div className="tg-sheen tg-rise tg-rise-2 relative overflow-hidden rounded-[28px] p-6 mb-3 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 ring-1 ring-white/10 shadow-[0_20px_60px_-20px_rgba(4,120,87,0.55)]">
      {/* halo de luz superior */}
      <div className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-emerald-500/20 blur-3xl" />
      {/* grid sutil */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(120% 100% at 100% 0%, #000 40%, transparent 80%)',
        }}
      />
      {/* candles minimalistas, mais finos e discretos */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-around px-3 opacity-20">
        {[
          { h: 34, b: 20, up: true }, { h: 52, b: 30, up: true }, { h: 40, b: 18, up: false },
          { h: 64, b: 36, up: true }, { h: 48, b: 22, up: false }, { h: 72, b: 44, up: true },
          { h: 58, b: 28, up: false }, { h: 80, b: 50, up: true }, { h: 66, b: 32, up: true },
          { h: 90, b: 40, up: false }, { h: 76, b: 46, up: true }, { h: 100, b: 58, up: true },
        ].map((c, i) => (
          <div key={i} className="flex flex-col items-center justify-end" style={{ height: 100 }}>
            <div className={`w-px ${c.up ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ height: (c.h - c.b) / 2 }} />
            <div className={`w-1.5 rounded-[2px] ${c.up ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ height: c.b }} />
            <div className={`w-px ${c.up ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ height: (c.h - c.b) / 2 }} />
          </div>
        ))}
      </div>
      <div className="relative">
        <div className="inline-flex items-center gap-2 text-emerald-300/90 text-[11px] font-semibold tracking-wide mb-3">
          <span className="w-7 h-px bg-gradient-to-r from-emerald-400 to-transparent" />
          Do zero ao operacional
        </div>
        <h2 className="font-display text-[26px] leading-[1.12] font-bold text-white tracking-tight">
          Domine o mercado,<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-200">uma lição por vez.</span>
        </h2>
      </div>
    </div>
  );

  return (
    <div className="tg-scope p-4 md:p-6 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <BackButton onClick={onBack} />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-600/80 mb-0.5">Trilha Gain</p>
            <h1 className="font-display text-xl md:text-2xl font-bold text-slate-900 tracking-tight truncate leading-none">
              Jornada do Trader
            </h1>
          </div>
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
          <TrackMap
            track={activeTrack}
            completed={completed}
            isAdmin={isAdmin}
            onSelectNode={(nodes, startIndex) => setPlaying({ nodes, startIndex })}
          />
        </InvertedScroll>
      ) : (
        <div className="tg-rise text-center text-slate-400 py-20 flex flex-col items-center gap-3">
          <span className="grid place-items-center w-16 h-16 rounded-full bg-slate-100/80 ring-1 ring-slate-200/60">
            <Milestone size={28} className="text-slate-300" />
          </span>
          <p className="text-sm tracking-tight">Nenhuma trilha publicada ainda.</p>
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
