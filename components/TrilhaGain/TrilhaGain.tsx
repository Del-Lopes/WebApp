import React, { useEffect, useState } from 'react';
import { Loader2, ChevronRight, Milestone, Lock, X } from 'lucide-react';
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BackButton onClick={activeTrack ? () => setActiveTrack(null) : onBack} />
          <h1 className="text-xl font-bold text-slate-800">
            {activeTrack ? activeTrack.title : 'Trilha Gain'}
          </h1>
        </div>
        <GamificationBar stats={stats} />
      </div>

      {/* Lista de trilhas */}
      {!activeTrack && (
        <div className="space-y-3">
          {tracks.map((track) => (
            <button
              key={track.id}
              onClick={() => track.is_locked ? setLockedTrack(track) : openTrack(track.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl bg-white border transition-all text-left ${
                track.is_locked
                  ? 'border-slate-100 opacity-80 hover:opacity-100'
                  : 'border-slate-100 hover:border-green-300 hover:shadow-md'
              }`}
            >
              <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden ${
                track.is_locked ? 'bg-slate-100 text-slate-400' : 'bg-green-100 text-green-600'
              }`}>
                {track.image_url
                  ? <img src={track.image_url} alt="" className={`w-full h-full object-cover ${track.is_locked ? 'grayscale' : ''}`} />
                  : <Milestone size={26} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-800 truncate">{track.title}</h3>
                  {track.is_locked && <Lock size={14} className="text-slate-400 shrink-0" />}
                  {track.price_label && (
                    <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                      {track.price_label}
                    </span>
                  )}
                </div>
                {track.description && (
                  <p className="text-sm text-slate-500 line-clamp-2">{track.description}</p>
                )}
              </div>
              <ChevronRight size={20} className="text-slate-300 shrink-0" />
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
