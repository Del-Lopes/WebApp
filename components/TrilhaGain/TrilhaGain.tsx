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
    setStats(await fetchStats());
  };

  // Pula (compra acesso a) uma unidade à frente travada. Não move a progressão.
  const handleSkip = async (unitId: string) => {
    await redeemUnitSkip(unitId); // lança em insufficient_xp
    setAccessUnits((prev) => new Set(prev).add(unitId));
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

  // Banner "Domine o mercado" — FIXO no topo; claro, leve, acento verde.
  const banner = (
    <div className="relative overflow-hidden rounded-3xl p-6 mb-3 bg-gradient-to-br from-white via-emerald-50/60 to-teal-50 ring-1 ring-emerald-100 shadow-[0_10px_30px_-12px_rgba(16,185,129,0.25)]">
      {/* brilho verde difuso no canto */}
      <div className="pointer-events-none absolute -top-16 -right-12 w-56 h-56 rounded-full bg-emerald-200/40 blur-3xl" />
      {/* grid sutil em verde, esmaecendo */}
      <div
        className="absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            'linear-gradient(#10b981 1px, transparent 1px), linear-gradient(90deg, #10b981 1px, transparent 1px)',
          backgroundSize: '26px 26px',
          maskImage: 'radial-gradient(120% 100% at 100% 0%, rgba(0,0,0,0.10) 0%, transparent 65%)',
          WebkitMaskImage: 'radial-gradient(120% 100% at 100% 0%, rgba(0,0,0,0.10) 0%, transparent 65%)',
        }}
      />
      {/* candles minimalistas e discretos na base */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-around px-3 opacity-40">
        {[
          { h: 34, b: 20, up: true }, { h: 52, b: 30, up: true }, { h: 40, b: 18, up: false },
          { h: 64, b: 36, up: true }, { h: 48, b: 22, up: false }, { h: 72, b: 44, up: true },
          { h: 58, b: 28, up: false }, { h: 80, b: 50, up: true }, { h: 66, b: 32, up: true },
          { h: 90, b: 40, up: false }, { h: 76, b: 46, up: true }, { h: 100, b: 58, up: true },
        ].map((c, i) => (
          <div key={i} className="flex flex-col items-center justify-end" style={{ height: 100 }}>
            <div className={`w-px ${c.up ? 'bg-emerald-400' : 'bg-rose-300'}`} style={{ height: (c.h - c.b) / 2 }} />
            <div className={`w-1.5 rounded-[2px] ${c.up ? 'bg-emerald-400' : 'bg-rose-300'}`} style={{ height: c.b }} />
            <div className={`w-px ${c.up ? 'bg-emerald-400' : 'bg-rose-300'}`} style={{ height: (c.h - c.b) / 2 }} />
          </div>
        ))}
      </div>
      <div className="relative">
        <div className="inline-flex items-center gap-2 text-emerald-700 text-[11px] font-semibold tracking-wide mb-3">
          <span className="w-6 h-px bg-gradient-to-r from-emerald-500 to-transparent" />
          Do zero ao operacional
        </div>
        <h2 className="font-display text-[26px] leading-[1.12] font-bold text-slate-900 tracking-tight">
          Domine o mercado,<br />
          <span className="text-emerald-600">uma lição por vez.</span>
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
