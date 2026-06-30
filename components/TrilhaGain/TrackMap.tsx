import React from 'react';
import { Star, TrendingUp, Lock } from 'lucide-react';
import { TrilhaTrack } from '../../types';
import { Candle } from './Candle';
import { LessonCandle } from './LessonCandle';
import { makeCandleSeries } from './candleSeries';
import { buildUnitNodes, TrackNode } from './unitNodes';

interface Props {
  track: TrilhaTrack;
  completed: Set<string>;
  isAdmin?: boolean; // admin acessa qualquer aula (ignora bloqueio/progressão)
  // Abre o player com a sequência de nós da unidade, começando no nó clicado.
  // Permite fluir aula→aula→gain→…→revisão sem voltar ao lobby.
  onSelectNode: (nodes: TrackNode[], startIndex: number) => void;
}

type LessonState = 'done' | 'available' | 'locked';

// Geometria do caminho
const TRACK_W   = 320; // largura útil da coluna de aulas (px)
const NODE_H    = 34;  // altura do corpo do nó-candle
const MARGIN    = 28;  // respiro topo/base
const CANDLE_W  = 6;   // largura de cada candle (fino)
const CANDLE_GAP = 1;  // espaço entre candles (bem justo)
const CANDLES_PER_GAP = 3; // nº fixo de candles entre dois nós

// Pontos (x,y) de cada nó. Escada diagonal (mesma distribuição da versão que
// formava tendência de baixa), porém ESPELHADA para SUBIR: o primeiro nó fica
// embaixo e a trilha sobe à direita; ao bater na borda, quebra a linha.
function unitWaypoints(n: number): { x: number; y: number }[] {
  // 1) gera a escada "descendo" (mesmos parâmetros da versão anterior)
  const deltas = [
    { dx: 64, dy:  74 },
    { dx: 60, dy:  60 },
    { dx: 56, dy: -34 }, // pivô leve
    { dx: 58, dy:  78 },
    { dx: 52, dy:  56 },
    { dx: 60, dy: -30 }, // pivô leve
    { dx: 56, dy:  76 },
    { dx: 54, dy:  58 },
  ];
  const raw: { x: number; y: number }[] = [];
  let x = 22, y = 14;
  const minX = 22, maxX = TRACK_W - 30;
  for (let i = 0; i < n; i++) {
    if (i > 0) {
      const d = deltas[(i - 1) % deltas.length];
      if (x + d.dx > maxX) { x = minX; y += 84; }       // quebra de linha
      else { x = Math.max(minX, x + d.dx); y += d.dy; }
    }
    raw.push({ x, y });
  }
  // 2) espelha no eixo vertical → vira tendência de ALTA (sobe)
  const maxY = raw.length ? Math.max(...raw.map((p) => p.y)) : 0;
  return raw.map((p) => ({ x: p.x, y: maxY - p.y + MARGIN }));
}

// true quando o trecho i→i+1 é uma quebra de linha (salto lateral grande):
// nesses trechos não desenhamos candles (ficariam "voando" no vão).
function isLineBreak(a: { x: number }, b: { x: number }): boolean {
  return b.x < a.x - 1; // próximo voltou para a esquerda
}

// Acento de cor (claro) por bloco temático, derivado do título da unidade.
// Cards de unidade ficam claros, com uma tinta sutil + barra lateral colorida.
interface UnitAccent { bar: string; tint: string; ring: string; eyebrow: string; }
const ACCENTS: Record<string, UnitAccent> = {
  // Fundamentos → emerald
  fundamentos: { bar: 'bg-emerald-500', tint: 'from-emerald-50 to-white', ring: 'ring-emerald-100', eyebrow: 'text-emerald-600' },
  // Análise Técnica → sky
  tecnica:     { bar: 'bg-sky-500',     tint: 'from-sky-50 to-white',     ring: 'ring-sky-100',     eyebrow: 'text-sky-600' },
  // Conceitos Avançados → violet
  avancado:    { bar: 'bg-violet-500',  tint: 'from-violet-50 to-white',  ring: 'ring-violet-100',  eyebrow: 'text-violet-600' },
  // Operacional → amber
  operacional: { bar: 'bg-amber-500',   tint: 'from-amber-50 to-white',   ring: 'ring-amber-100',   eyebrow: 'text-amber-600' },
};
function unitAccent(title: string): UnitAccent {
  const t = title.toLowerCase();
  // Operacional (corretoras, plataforma, robôs)
  if (/(corretora|metatrader|expert advisor|instalando|vps)/.test(t)) return ACCENTS.operacional;
  // Conceitos avançados (escolas/estratégias avançadas)
  if (/(smart money|ict|wyckoff|teoria de dow|elliott|bollinger)/.test(t)) return ACCENTS.avancado;
  // Análise técnica (price action / leitura de gráfico)
  if (/(velas|candle|m[ée]dia|trend|suporte|resist|fibonacci)/.test(t)) return ACCENTS.tecnica;
  // Fundamentos (default)
  return ACCENTS.fundamentos;
}

// Trilha vertical serpenteante de nós, com linha de conexão e tema de mercado.
// Uma lição fica disponível quando a anterior (ordem global) está concluída.
export const TrackMap: React.FC<Props> = ({ track, completed, isAdmin = false, onSelectNode }) => {
  const units = track.units ?? [];

  // Nós (aula + lição-checkpoint) por unidade.
  const nodesByUnit = new Map<string, TrackNode[]>();
  for (const u of units) nodesByUnit.set(u.id, buildUnitNodes(u.id, u.lessons ?? []));

  // Ids de nós em unidades bloqueadas (pagas).
  const lockedNodeIds = new Set<string>();
  for (const u of units) {
    if (u.is_locked) for (const n of nodesByUnit.get(u.id) ?? []) lockedNodeIds.add(n.id);
  }

  // Sequência de nós das unidades desbloqueadas (entra na progressão/contagem).
  const flatNodes: TrackNode[] = units
    .filter((u) => !u.is_locked)
    .flatMap((u) => nodesByUnit.get(u.id) ?? []);

  const stateMap = new Map<string, LessonState>();
  if (isAdmin) {
    for (const u of units) {
      for (const n of nodesByUnit.get(u.id) ?? []) {
        stateMap.set(n.id, completed.has(n.id) ? 'done' : 'available');
      }
    }
  } else {
    // Progressão: só o primeiro nó não-concluído fica disponível.
    let unlocked = true;
    for (const n of flatNodes) {
      if (completed.has(n.id)) { stateMap.set(n.id, 'done'); continue; }
      stateMap.set(n.id, unlocked ? 'available' : 'locked');
      unlocked = false;
    }
    for (const id of lockedNodeIds) stateMap.set(id, 'locked');
  }

  const doneCount = flatNodes.filter((n) => completed.has(n.id)).length;
  const pct = flatNodes.length ? Math.round((doneCount / flatNodes.length) * 100) : 0;

  return (
    <div className="max-w-md mx-auto pb-20">
      {/* Barra de progresso geral da trilha */}
      {flatNodes.length > 0 && (
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
          <p className="text-xs text-slate-400 mt-2">{doneCount} de {flatNodes.length} etapas concluídas</p>
        </div>
      )}

      {/* Unidades em ordem REVERSA no DOM: como o InvertedScroll aplica
          scaleY(-1), a última do DOM aparece no começo visual — então a
          Unidade 1 (Candles) precisa ficar por último aqui para abrir como
          a primeira na tela. */}
      {[...units].reverse().map((unit) => (
        <div key={unit.id} className="mb-2">
          {/* Nós da unidade (aulas + lições-checkpoint) num caminho com pivots */}
          {(() => {
            const nodes = nodesByUnit.get(unit.id) ?? [];
            const pts = unitWaypoints(nodes.length);
            const height = pts.length
              ? Math.max(...pts.map((p) => p.y)) + NODE_H + MARGIN
              : 0;

            return (
              <div className="relative mx-auto" style={{ width: TRACK_W, height }}>
                {/* candles de conexão entre cada par de nós (pula a quebra de linha) */}
                {nodes.slice(0, -1).map((node, i) => {
                  const a = pts[i], b = pts[i + 1];
                  if (isLineBreak(a, b)) return null;
                  const filled = (stateMap.get(node.id) ?? 'locked') === 'done';
                  const count = CANDLES_PER_GAP;
                  const aMid = a.y + NODE_H / 2, bMid = b.y + NODE_H / 2;
                  const midY = (aMid + bMid) / 2;
                  const range = 40;
                  // série inclina no sentido a→b (sobe quando a próxima aula está mais alta = y menor)
                  const goingUp = b.y < a.y;
                  const startLvl = goingUp ? range - 8 : 8;
                  const endLvl = goingUp ? 8 : range - 8;
                  const series = makeCandleSeries(count, i + 1, range, startLvl, endLvl);
                  const totalW = count * (CANDLE_W + CANDLE_GAP) - CANDLE_GAP;
                  const cx = (a.x + b.x) / 2;
                  return (
                    <div
                      key={`c-${node.id}`}
                      className="absolute flex items-start"
                      style={{ left: cx - totalW / 2, top: midY - range / 2, height: range, gap: CANDLE_GAP }}
                    >
                      {series.map((c, ci) => (
                        <Candle key={ci} filled={filled} high={c.high} open={c.open} close={c.close} low={c.low} />
                      ))}
                    </div>
                  );
                })}

                {/* nós (aula / lição) */}
                {nodes.map((node, i) => {
                  const p = pts[i];
                  const state = stateMap.get(node.id) ?? 'locked';
                  return (
                    <div
                      key={node.id}
                      className="absolute -translate-x-1/2"
                      style={{ left: p.x, top: p.y }}
                    >
                      <LessonCandle
                        state={state}
                        kind={node.kind}
                        xp={node.xp}
                        num={node.kind === 'aula' ? node.num : undefined}
                        onClick={() => onSelectNode(nodes, i)}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Cabeçalho claro da unidade — fica EMBAIXO da trilha (que sobe).
              Acento de cor por bloco temático; sem fundo preto. */}
          {(() => {
            const a = unitAccent(unit.title);
            return (
              <div className={`relative overflow-hidden rounded-2xl mt-2 mb-8 flex items-stretch bg-gradient-to-r ${a.tint} ring-1 ${a.ring} shadow-[0_4px_16px_-8px_rgba(15,23,42,0.18)] ${unit.is_locked ? 'opacity-90' : ''}`}>
                {/* barra lateral colorida */}
                <span className={`w-1.5 shrink-0 ${a.bar}`} />
                <div className="flex-1 flex items-center justify-between gap-3 px-4 py-3.5">
                  <div className="min-w-0">
                    <p className={`text-[10px] uppercase tracking-[0.18em] font-bold mb-0.5 ${a.eyebrow}`}>
                      {unit.subtitle || 'Unidade'}
                    </p>
                    <h3 className="text-[17px] font-bold text-slate-800 tracking-tight truncate">{unit.title}</h3>
                  </div>
                  {unit.is_locked ? (
                    <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                      <Lock size={12} strokeWidth={2.5} /> Premium
                    </span>
                  ) : unit.image_url ? (
                    // miniatura clara da ilustração (sem véu preto), só p/ quem tem
                    <img
                      src={unit.image_url}
                      alt=""
                      className="shrink-0 w-20 h-12 rounded-lg object-cover ring-1 ring-black/5"
                    />
                  ) : null}
                </div>
              </div>
            );
          })()}
        </div>
      ))}

      {flatNodes.length === 0 && (
        <div className="text-center text-slate-400 py-12 flex flex-col items-center gap-3">
          <Star size={40} className="opacity-40" />
          <p>Esta trilha ainda não tem lições.</p>
        </div>
      )}
    </div>
  );
};
