import React, { useState } from 'react';
import { Star, TrendingUp, Lock, Coins, Loader2 } from 'lucide-react';
import { TrilhaTrack, TrilhaUnit } from '../../types';
import { Candle } from './Candle';
import { LessonCandle } from './LessonCandle';
import { makeCandleSeries } from './candleSeries';
import { buildUnitNodes, TrackNode } from './unitNodes';
import { Button, EmptyState } from '../ui';

interface Props {
  track: TrilhaTrack;
  completed: Set<string>;
  // Unidades às quais o usuário comprou acesso (qualquer motivo: premium ou pulo).
  accessUnits: Set<string>;
  coins: number;             // saldo atual (para decidir se pode resgatar/pular)
  skipCost: number;          // custo do pulo de progressão (ex.: 1000)
  isAdmin?: boolean; // admin acessa qualquer aula (ignora bloqueio/progressão)
  // Abre o player com a sequência de nós da unidade, começando no nó clicado.
  onSelectNode: (nodes: TrackNode[], startIndex: number) => void;
  // Desbloqueia a unidade Premium alcançada organicamente (gasta unlock_cost).
  onRedeem: (unitId: string) => Promise<void>;
  // Pula (compra acesso a) uma unidade à frente travada pela progressão.
  onSkip: (unitId: string) => Promise<void>;
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

// Acento de cor por bloco temático, derivado do título da unidade.
// Cards de unidade usam a superfície do tema, com uma tinta sutil + barra lateral.
// Sem azul/roxo decorativo: verde da marca em intensidades, neutro e dourado.
interface UnitAccent { bar: string; tint: string; ring: string; eyebrow: string; }
const ACCENTS: Record<string, UnitAccent> = {
  // Fundamentos → verde da marca
  fundamentos: { bar: 'bg-accent',        tint: 'from-accent/10 to-transparent', ring: 'ring-tint/8', eyebrow: 'text-accent-fg' },
  // Análise Técnica → verde suave
  tecnica:     { bar: 'bg-accent/50',     tint: 'from-accent/5 to-transparent',  ring: 'ring-tint/8', eyebrow: 'text-accent-fg' },
  // Conceitos Avançados → neutro
  avancado:    { bar: 'bg-tint/30',       tint: 'from-tint/5 to-transparent',    ring: 'ring-tint/8', eyebrow: 'text-fg-muted' },
  // Operacional → dourado
  operacional: { bar: 'bg-brand-gold',    tint: 'from-warning/8 to-transparent', ring: 'ring-tint/8', eyebrow: 'text-warning-fg' },
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
export const TrackMap: React.FC<Props> = ({
  track, completed, accessUnits, coins, skipCost,
  isAdmin = false, onSelectNode, onRedeem, onSkip,
}) => {
  const units = track.units ?? []; // já em ordem (order_index)

  // Nós (aula + lição-checkpoint) por unidade.
  const nodesByUnit = new Map<string, TrackNode[]>();
  for (const u of units) nodesByUnit.set(u.id, buildUnitNodes(u.id, u.lessons ?? []));
  const unitNodeIds = (u: TrilhaUnit) => (nodesByUnit.get(u.id) ?? []).map((n) => n.id);
  const unitDone = (u: TrilhaUnit) => {
    const ids = unitNodeIds(u);
    return ids.length > 0 && ids.every((id) => completed.has(id));
  };

  // "Frente orgânica": cadeia contínua U1→…→Un. Uma unidade é orgânica se ela e
  // TODAS as anteriores foram concluídas, OU é a primeira ainda-não-concluída
  // logo após a cadeia. Pular/concluir uma unidade fora da cadeia NÃO avança a frente.
  const organicChain = new Set<string>();
  {
    let prevAllDone = true;
    for (const u of units) {
      if (!!u.is_locked && !accessUnits.has(u.id)) {
        // Premium ainda não pago: pode-se "chegar" nela (entra na cadeia para
        // mostrar o botão Desbloquear), mas o premium gateia os nós e barra a
        // continuação orgânica até ser paga.
        if (prevAllDone) organicChain.add(u.id);
        prevAllDone = false;
        continue;
      }
      if (prevAllDone) { organicChain.add(u.id); prevAllDone = unitDone(u); }
    }
  }

  // Unidade abrível = admin, ou na cadeia orgânica, ou acesso comprado (pulo/premium).
  const isOpenable = (u: TrilhaUnit) => isAdmin || organicChain.has(u.id) || accessUnits.has(u.id);

  // Premium ainda travada (não comprada) → nós ficam locked mesmo se "abrível".
  const isPremiumLocked = (u: TrilhaUnit) => !!u.is_locked && !accessUnits.has(u.id);

  // Nós para contagem de progresso = de todas as unidades abríveis e não-premium-travadas.
  const flatNodes: TrackNode[] = units
    .filter((u) => isOpenable(u) && !isPremiumLocked(u))
    .flatMap((u) => nodesByUnit.get(u.id) ?? []);

  // Estado por nó: progressão sequencial DENTRO de cada unidade abrível.
  const stateMap = new Map<string, LessonState>();
  for (const u of units) {
    const nodes = nodesByUnit.get(u.id) ?? [];
    const openable = isOpenable(u) && !isPremiumLocked(u);
    if (!openable) { for (const n of nodes) stateMap.set(n.id, 'locked'); continue; }
    if (isAdmin) { for (const n of nodes) stateMap.set(n.id, completed.has(n.id) ? 'done' : 'available'); continue; }
    let next = true; // primeiro nó não-concluído da unidade fica 'available'
    for (const n of nodes) {
      if (completed.has(n.id)) { stateMap.set(n.id, 'done'); continue; }
      stateMap.set(n.id, next ? 'available' : 'locked');
      next = false;
    }
  }

  const doneCount = flatNodes.filter((n) => completed.has(n.id)).length;
  const pct = flatNodes.length ? Math.round((doneCount / flatNodes.length) * 100) : 0;

  return (
    <div className="max-w-md mx-auto pb-20">
      {/* Barra de progresso geral da trilha */}
      {flatNodes.length > 0 && (
        <div className="mb-8 bg-surface rounded-2xl p-4 border border-tint/8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-fg-muted flex items-center gap-1.5">
              <TrendingUp size={16} className="text-accent-fg" />
              Progresso da trilha
            </span>
            <span className="text-sm font-bold font-mono tabular-nums text-accent-fg">{pct}%</span>
          </div>
          <div className="h-2.5 bg-tint/6 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-green-bright to-brand-green rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-fg-subtle mt-2 tabular-nums">{doneCount} de {flatNodes.length} etapas concluídas</p>
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

          {/* Cabeçalho claro da unidade — fica EMBAIXO da trilha (que sobe). */}
          <UnitHeader
            unit={unit}
            bought={accessUnits.has(unit.id)}
            organicPremium={organicChain.has(unit.id) && isPremiumLocked(unit)}
            skippable={!isAdmin && !isOpenable(unit)}
            coins={coins}
            skipCost={skipCost}
            onRedeem={onRedeem}
            onSkip={onSkip}
          />
        </div>
      ))}

      {flatNodes.length === 0 && (
        <EmptyState icon={Star} title="Esta trilha ainda não tem lições." />
      )}
    </div>
  );
};

// Cabeçalho de uma unidade. Ação à direita conforme o estado:
//   bought          → selo "Desbloqueado"
//   organicPremium  → "Desbloquear · {unlock_cost} Coins" (chegou na Premium)
//   skippable       → "Pular · {skipCost(+premium)} Coins" (unidade à frente travada)
//   livre/em curso  → miniatura da ilustração (quem tem) / nada
const UnitHeader: React.FC<{
  unit: TrilhaUnit;
  bought: boolean;          // acesso já comprado (premium ou pulo)
  organicPremium: boolean;  // Premium alcançada na cadeia orgânica, ainda não paga
  skippable: boolean;       // unidade à frente travada pela progressão
  coins: number;            // saldo atual
  skipCost: number;         // custo base do pulo
  onRedeem: (unitId: string) => Promise<void>;
  onSkip: (unitId: string) => Promise<void>;
}> = ({ unit, bought, organicPremium, skippable, coins, skipCost, onRedeem, onSkip }) => {
  const a = unitAccent(unit.title);
  const premiumCost = unit.unlock_cost ?? 0;

  // Modo de ação. Pular uma unidade que TAMBÉM é Premium embute o premium no custo.
  const mode: 'bought' | 'redeem' | 'skip' | 'none' =
    bought ? 'bought'
    : organicPremium && premiumCost > 0 ? 'redeem'
    : skippable ? 'skip'
    : 'none';

  const cost =
    mode === 'redeem' ? premiumCost
    : mode === 'skip' ? skipCost + (unit.is_locked ? premiumCost : 0)
    : 0;
  const canAfford = coins >= cost;

  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doAction = async () => {
    setBusy(true); setError(null);
    try {
      if (mode === 'redeem') await onRedeem(unit.id);
      else if (mode === 'skip') await onSkip(unit.id);
      setConfirming(false);
    } catch (e) {
      const msg = (e as Error).message;
      setError(
        msg === 'insufficient_xp' ? 'Coins insuficientes.'
        : msg === 'not_redeemable' ? 'Esta unidade não pode ser resgatada.'
        : 'Não foi possível concluir. Tente de novo.',
      );
    } finally {
      setBusy(false);
    }
  };

  const actionLabel = mode === 'skip' ? 'Destravar' : 'Desbloquear';

  return (
    <div className={`relative overflow-hidden rounded-2xl mt-2 mb-8 bg-surface bg-gradient-to-r ${a.tint} ring-1 ${a.ring} ${mode === 'redeem' || mode === 'skip' ? 'opacity-95' : ''}`}>
      <div className="flex items-stretch">
        {/* barra lateral colorida */}
        <span className={`w-1.5 shrink-0 ${a.bar}`} />
        <div className="flex-1 flex items-center justify-between gap-3 px-4 py-3.5">
          <div className="min-w-0">
            <p className={`text-[10px] uppercase tracking-[0.18em] font-semibold mb-0.5 ${a.eyebrow}`}>
              {unit.subtitle || 'Unidade'}
            </p>
            <h3 className="font-display text-[17px] font-semibold text-fg tracking-tight truncate">{unit.title}</h3>
          </div>

          {/* Lado direito conforme o modo */}
          {mode === 'redeem' || mode === 'skip' ? (
            <button
              onClick={() => { setError(null); setConfirming(true); }}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-warning/30 bg-warning/15 hover:bg-warning/25 text-warning-fg text-[11px] font-bold tabular-nums whitespace-nowrap transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              <Coins size={13} strokeWidth={2.5} /> {actionLabel} · {cost.toLocaleString('pt-BR')} Coins
            </button>
          ) : mode === 'bought' ? (
            <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-success/20 bg-success/10 text-success-fg text-[11px] font-bold">
              <Coins size={12} strokeWidth={2.5} /> Desbloqueado
            </span>
          ) : unit.image_url ? (
            <img loading="lazy" decoding="async" src={unit.image_url} alt="" className="shrink-0 w-20 h-12 rounded-lg object-cover ring-1 ring-tint/10" />
          ) : null}
        </div>
      </div>

      {/* Confirmação inline (dentro do card) */}
      {confirming && (
        <div className="border-t border-tint/8 bg-tint/3 px-4 py-3">
          <p className="text-sm text-fg-muted mb-1">
            {mode === 'skip' ? 'Destravar' : 'Liberar'} <span className="font-semibold text-fg">{unit.title}</span> por <span className="font-bold font-mono tabular-nums whitespace-nowrap text-warning-fg">{cost.toLocaleString('pt-BR')} Coins</span>?
          </p>
          {mode === 'skip' && unit.is_locked && premiumCost > 0 && (
            <p className="text-[11px] text-fg-subtle tabular-nums mb-1">
              ({skipCost.toLocaleString('pt-BR')} do pulo + {premiumCost.toLocaleString('pt-BR')} da unidade Premium)
            </p>
          )}
          <p className="text-xs text-fg-muted mb-3">
            Seu saldo: <span className="font-mono tabular-nums">{coins.toLocaleString('pt-BR')}</span> Coins
            {!canAfford && <span className="text-danger-fg font-semibold tabular-nums"> · faltam {(cost - coins).toLocaleString('pt-BR')} Coins</span>}
          </p>
          {error && <p className="text-xs text-danger-fg mb-2">{error}</p>}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={doAction}
              disabled={busy || !canAfford}
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Coins size={15} />}
              Confirmar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirming(false)}
              disabled={busy}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
