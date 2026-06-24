import React, { useEffect, useState } from 'react';
import { Loader2, ChevronRight, Milestone, Lock, X, TrendingUp } from 'lucide-react';
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
  const [lockedTrack, setLockedTrack] = useState<TrilhaTrack | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [t, c, s] = await Promise.all([fetchTracks(), fetchCompletedLessonIds(), fetchStats()]);
      setTracks(t);
      setCompleted(c);
      setStats(s);
      setLoading(false);
    })();
  }, []);

  const openTrack = async (id: string) => {
    setLoading(true);
    const tree = await fetchTrackTree(id);
    setActiveTrack(tree);
    setLoading(false);
  };

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
        <div className="flex items-center gap-2">
          <BackButton onClick={activeTrack ? () => setActiveTrack(null) : onBack} />
          <h1 className="text-xl font-bold text-slate-800">
            {activeTrack ? activeTrack.title : 'Trilha Gain'}
          </h1>
        </div>
        <GamificationBar stats={stats} />
      </div>

      {/* Banner financeiro (só na lista de trilhas) */}
      {!activeTrack && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 via-slate-900 to-emerald-950 p-6 mb-6 shadow-xl">
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          {/* linha de "candles" decorativa */}
          <div className="absolute bottom-0 right-4 flex items-end gap-1 opacity-30">
            {[18, 28, 22, 36, 30, 44, 38, 52].map((h, i) => (
              <div key={i} className="w-1.5 rounded-t bg-emerald-400" style={{ height: h }} />
            ))}
          </div>
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold mb-3">
              <TrendingUp size={13} /> Aprenda operando
            </div>
            <h2 className="text-2xl font-extrabold text-white leading-tight mb-1">
              Domine o mercado,<br />uma lição por vez.
            </h2>
            <p className="text-slate-300 text-sm">Trilhas práticas e gamificadas para evoluir todo dia.</p>
          </div>
        </div>
      )}

      {/* Lista de trilhas */}
      {!activeTrack && (
        <div className="space-y-4">
          {tracks.map((track) => (
            <button
              key={track.id}
              onClick={() => track.is_locked ? setLockedTrack(track) : openTrack(track.id)}
              className={`group relative w-full overflow-hidden flex items-center gap-4 p-4 rounded-2xl bg-white border-2 transition-all text-left ${
                track.is_locked
                  ? 'border-slate-100 hover:border-yellow-200'
                  : 'border-slate-100 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-500/5'
              }`}
            >
              {/* mini-grid decorativo no hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-[0.04] transition-opacity pointer-events-none"
                style={{
                  backgroundImage: 'linear-gradient(90deg, #0f766e 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                }}
              />
              <div className={`relative w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden ${
                track.is_locked
                  ? 'bg-slate-100 text-slate-400'
                  : 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/30'
              }`}>
                {track.image_url
                  ? <img src={track.image_url} alt="" className={`w-full h-full object-cover ${track.is_locked ? 'grayscale' : ''}`} />
                  : (track.is_locked ? <Lock size={26} /> : <TrendingUp size={28} strokeWidth={2.5} />)}
              </div>
              <div className="relative flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-slate-800 truncate">{track.title}</h3>
                  {track.is_locked && (
                    <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                      <Lock size={11} /> {track.price_label || 'Premium'}
                    </span>
                  )}
                  {!track.is_locked && (
                    <span className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      Gratuita
                    </span>
                  )}
                </div>
                {track.description && (
                  <p className="text-sm text-slate-500 line-clamp-2 mt-0.5">{track.description}</p>
                )}
              </div>
              <ChevronRight size={20} className="relative text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all shrink-0" />
            </button>
          ))}

          {tracks.length === 0 && (
            <div className="text-center text-slate-400 py-16 flex flex-col items-center gap-3">
              <Milestone size={40} className="opacity-40" />
              <p>Nenhuma trilha publicada ainda.</p>
            </div>
          )}
        </div>
      )}

      {/* Mapa da trilha */}
      {activeTrack && (
        loading
          ? <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" size={28} /></div>
          : <TrackMap track={activeTrack} completed={completed} onSelectLesson={setPlaying} />
      )}

      {/* Player de lição */}
      {playing && (
        <LessonPlayer
          lesson={playing}
          onClose={() => setPlaying(null)}
          onCompleted={handleLessonCompleted}
        />
      )}

      {/* Modal de trilha paga */}
      {lockedTrack && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setLockedTrack(null)}
        >
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setLockedTrack(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
            <div className="w-16 h-16 mx-auto rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 mb-4">
              <Lock size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">{lockedTrack.title}</h3>
            <p className="text-slate-500 text-sm mb-4">
              {lockedTrack.lock_note || 'Esta trilha é exclusiva. Adquira o acesso para desbloquear todo o conteúdo.'}
            </p>
            {lockedTrack.price_label && (
              <p className="text-2xl font-extrabold text-green-600 mb-5">{lockedTrack.price_label}</p>
            )}
            <button
              onClick={() => setLockedTrack(null)}
              className="w-full py-3 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
