import React from 'react';
import { Star, TrendingUp, Lock } from 'lucide-react';
import { TrilhaTrack, TrilhaLesson } from '../../types';
import { Candle } from './Candle';
import { LessonCandle } from './LessonCandle';
import { makeCandleSeries } from './candleSeries';

interface Props {
  track: TrilhaTrack;
  completed: Set<string>;
  isAdmin?: boolean; // admin acessa qualquer aula (ignora bloqueio/progressão)
  onSelectLesson: (lesson: TrilhaLesson) => void;
}

type LessonState = 'done' | 'available' | 'locked';

// Geometria do caminho
const TRACK_W   = 320; // largura útil da coluna de aulas (px)
const NODE_H    = 34;  // altura do corpo do nó-candle
const LABEL_H   = 26;  // altura do rótulo sob o nó
const CANDLE_W  = 6;   // largura de cada candle (fino)
const CANDLE_GAP = 1;  // espaço entre candles (bem justo)
const CANDLES_PER_GAP = 3; // nº fixo de candles entre duas aulas

// Pontos (x,y) de cada aula. Escada diagonal suave (desce e vai à direita),
// com pivots leves, começando no canto superior esquerdo — como o gráfico
// contínuo do print de referência.
function unitWaypoints(n: number): { x: number; y: number }[] {
  // deltas: sempre avança à direita; verticalmente desce, com alguns sobem leve (pivô).
  const deltas = [
    { dx: 64, dy:  74 },
    { dx: 60, dy:  60 },
    { dx: 56, dy: -34 }, // pivô leve de alta
    { dx: 58, dy:  78 },
    { dx: 52, dy:  56 },
    { dx: 60, dy: -30 }, // pivô leve
    { dx: 56, dy:  76 },
    { dx: 54, dy:  58 },
  ];
  const pts: { x: number; y: number }[] = [];
  let x = 22, y = 14;                 // primeira aula no canto superior esquerdo
  const minX = 22, maxX = TRACK_W - 30;
  for (let i = 0; i < n; i++) {
    if (i > 0) {
      const d = deltas[(i - 1) % deltas.length];
      // se passar da direita, "quebra a linha": volta à esquerda e desce um degrau
      if (x + d.dx > maxX) { x = minX; y += 84; }
      else { x = Math.max(minX, x + d.dx); y += d.dy; }
    }
    pts.push({ x, y });
  }
  return pts;
}

// Trilha vertical serpenteante de nós, com linha de conexão e tema de mercado.
// Uma lição fica disponível quando a anterior (ordem global) está concluída.
export const TrackMap: React.FC<Props> = ({ track, completed, isAdmin = false, onSelectLesson }) => {
  const units = track.units ?? [];

  // Conjunto de lições que pertencem a unidades bloqueadas (pagas).
  const lockedLessonIds = new Set<string>();
  for (const u of units) {
    if (u.is_locked) for (const l of (u.lessons ?? [])) lockedLessonIds.add(l.id);
  }

  // Lições "operáveis" = as de unidades desbloqueadas (entram na progressão/contagem).
  const flat: TrilhaLesson[] = units
    .filter((u) => !u.is_locked)
    .flatMap((u) => u.lessons ?? []);

  const stateMap = new Map<string, LessonState>();
  if (isAdmin) {
    // Admin acessa qualquer aula: concluída fica 'done', o resto 'available'.
    for (const u of units) {
      for (const l of (u.lessons ?? [])) {
        stateMap.set(l.id, completed.has(l.id) ? 'done' : 'available');
      }
    }
  } else {
    // Progressão normal: só a primeira não-concluída fica disponível.
    let unlocked = true;
    for (const l of flat) {
      if (completed.has(l.id)) { stateMap.set(l.id, 'done'); continue; }
      stateMap.set(l.id, unlocked ? 'available' : 'locked');
      unlocked = false;
    }
    // Lições de unidades bloqueadas → sempre travadas (exceto admin).
    for (const id of lockedLessonIds) stateMap.set(id, 'locked');
  }

  const doneCount = flat.filter((l) => completed.has(l.id)).length;
  const pct = flat.length ? Math.round((doneCount / flat.length) * 100) : 0;

  return (
    <div className="max-w-md mx-auto pb-20">
      {/* Barra de progresso geral da trilha */}
      {flat.length > 0 && (
        <div className="mb-8 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-600 flex items-center gap-1.5">
              <TrendingUp size={16} className="text-emerald-500" />
              Progresso da trilha
            </span>
            <span className="text-sm font-bold text-emerald-600">{pct}%</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2">{doneCount} de {flat.length} lições concluídas</p>
        </div>
      )}

      {units.map((unit) => (
        <div key={unit.id} className="mb-10">
          {/* Cabeçalho da unidade — banner com cena temática (SVG) */}
          <div className="relative overflow-hidden rounded-2xl mb-10 shadow-lg h-[120px] bg-gradient-to-r from-slate-800 to-slate-900">
            {unit.image_url && (
              <img
                src={unit.image_url}
                alt=""
                className={`absolute inset-0 w-full h-full object-cover ${unit.is_locked ? 'grayscale' : ''}`}
              />
            )}
            {/* leve escurecimento para legibilidade do texto */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/40 to-transparent" />
            <div className="relative h-full flex items-center justify-between px-5 text-white">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-300 font-bold mb-0.5">
                  {unit.subtitle || 'Unidade'}
                </p>
                <h3 className="text-lg font-bold drop-shadow">{unit.title}</h3>
              </div>
              {unit.is_locked && (
                <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-400/90 text-yellow-900 text-xs font-extrabold shadow">
                  <Lock size={13} /> Premium
                </span>
              )}
            </div>
          </div>

          {/* Nós da unidade num caminho com pivots (sobe e desce), ligados por candles */}
          {(() => {
            const lessons = unit.lessons ?? [];
            const pts = unitWaypoints(lessons.length);
            const height = pts.length
              ? Math.max(...pts.map((p) => p.y)) + NODE_H + LABEL_H
              : 0;

            return (
              <div className="relative mx-auto" style={{ width: TRACK_W, height }}>
                {/* candles entre cada par de aulas — quantidade fixa, faixa baixa */}
                {lessons.slice(0, -1).map((lesson, i) => {
                  const a = pts[i], b = pts[i + 1];
                  const filled = (stateMap.get(lesson.id) ?? 'locked') === 'done';
                  const count = CANDLES_PER_GAP; // fixo, cabe sempre
                  const aMid = a.y + NODE_H / 2, bMid = b.y + NODE_H / 2;
                  const midY = (aMid + bMid) / 2;
                  const range = 40; // faixa baixa e compacta
                  // série inclina no sentido a→b (acompanha a escada das aulas)
                  const startLvl = (a.y <= b.y) ? 8 : range - 8;
                  const endLvl = (a.y <= b.y) ? range - 8 : 8;
                  const series = makeCandleSeries(count, i + 1, range, startLvl, endLvl);
                  const totalW = count * (CANDLE_W + CANDLE_GAP) - CANDLE_GAP;
                  const cx = (a.x + b.x) / 2;
                  return (
                    <div
                      key={`c-${lesson.id}`}
                      className="absolute flex items-start"
                      style={{ left: cx - totalW / 2, top: midY - range / 2, height: range, gap: CANDLE_GAP }}
                    >
                      {series.map((c, ci) => (
                        <Candle key={ci} filled={filled} high={c.high} open={c.open} close={c.close} low={c.low} />
                      ))}
                    </div>
                  );
                })}

                {/* nós das aulas */}
                {lessons.map((lesson, i) => {
                  const p = pts[i];
                  const state = stateMap.get(lesson.id) ?? 'locked';
                  return (
                    <div
                      key={lesson.id}
                      className="absolute -translate-x-1/2"
                      style={{ left: p.x, top: p.y }}
                    >
                      <LessonCandle
                        state={state}
                        xp={lesson.xp_reward}
                        iconSeed={lesson.id}
                        onClick={() => onSelectLesson(lesson)}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      ))}

      {flat.length === 0 && (
        <div className="text-center text-slate-400 py-12 flex flex-col items-center gap-3">
          <Star size={40} className="opacity-40" />
          <p>Esta trilha ainda não tem lições.</p>
        </div>
      )}
    </div>
  );
};
