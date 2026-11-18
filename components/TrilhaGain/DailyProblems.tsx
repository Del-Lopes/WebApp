import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Coins, Loader2, Lock, RefreshCw, TrendingDown, TrendingUp, XCircle } from 'lucide-react';
import { Badge, Button, Card } from '../ui';
import { DailyProblem, ProblemKind, Side, generateProblem, newSeed } from '../../lib/dailyProblems';
import { DailyStatus, buyDailyPack, fetchDailyStatus, submitDailyProblem } from '../../lib/trilhaGain';

interface Props {
  coins: number;
  onCoinsChanged: () => void;       // recarrega o saldo do header
  onBuyCoins?: () => void;
}

type Phase = 'direction' | 'stop' | 'result';

const W = 640, H = 340, PAD_X = 10, PAD_Y = 14, AXIS_W = 0;
const FUTURE_SLOTS = 14;
const LETTERS = ['A', 'B', 'C', 'D'];

export const DailyProblems: React.FC<Props> = ({ coins, onCoinsChanged, onBuyCoins }) => {
  const [status, setStatus] = useState<DailyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<DailyProblem | null>(null);
  const [phase, setPhase] = useState<Phase>('direction');
  const [pickedSide, setPickedSide] = useState<Side | null>(null);
  const [pickedStop, setPickedStop] = useState<number | null>(null);
  const [correct, setCorrect] = useState(false);
  const [revealed, setRevealed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recent = useRef<ProblemKind[]>([]);

  const outOfQuota = !!status && !status.unlimited && status.used >= status.allowed;

  const next = useCallback(() => {
    const p = generateProblem(newSeed(), recent.current.slice(-1));
    recent.current = [...recent.current, p.kind].slice(-3);
    setProblem(p);
    setPhase('direction');
    setPickedSide(null);
    setPickedStop(null);
    setCorrect(false);
    setRevealed(0);
    setError(null);
  }, []);

  useEffect(() => {
    (async () => {
      setStatus(await fetchDailyStatus());
      setLoading(false);
      next();
    })();
  }, [next]);

  // Animação: candles futuros entram um a um depois da resposta.
  useEffect(() => {
    if (phase !== 'result' || !problem) return;
    if (revealed >= problem.future.length) return;
    const t = setTimeout(() => setRevealed((r) => r + 1), 240);
    return () => clearTimeout(t);
  }, [phase, revealed, problem]);

  const finish = async (ok: boolean, side: Side, stopIdx: number | null) => {
    if (!problem) return;
    setPickedSide(side);
    setPickedStop(stopIdx);
    setCorrect(ok);
    setPhase('result');
    setRevealed(0);
    setSaving(true);
    setError(null);
    try {
      setStatus(await submitDailyProblem(problem.kind, problem.seed, ok));
    } catch (e) {
      setError((e as Error).message.includes('quota_exceeded')
        ? 'Sua cota de hoje acabou antes de registrar esta resposta.'
        : 'Não foi possível registrar sua resposta. Tente de novo.');
      setStatus(await fetchDailyStatus());
    } finally {
      setSaving(false);
    }
  };

  const chooseSide = (side: Side) => {
    if (!problem || phase !== 'direction') return;
    if (side !== problem.side) { finish(false, side, null); return; }
    setPickedSide(side);
    setPhase('stop');
  };

  const chooseStop = (idx: number) => {
    if (!problem || phase !== 'stop') return;
    finish(problem.stopOptions[idx].correct, problem.side, idx);
  };

  const buy = async () => {
    setBuying(true);
    setError(null);
    try {
      setStatus(await buyDailyPack());
      onCoinsChanged();
    } catch (e) {
      setError((e as Error).message.includes('insufficient_xp')
        ? 'Coins insuficientes para este pacote.'
        : 'Não foi possível concluir a compra.');
    } finally {
      setBuying(false);
    }
  };

  if (loading || !problem) {
    return (
      <div className="flex items-center justify-center py-16 text-fg-subtle">
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }

  const remaining = status ? Math.max(status.allowed - status.used, 0) : 0;

  // Cota esgotada e nenhuma resposta em andamento → pede pacote extra.
  if (outOfQuota && phase !== 'result') {
    return (
      <Card padding="lg" className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-warning/10 text-warning">
          <Lock size={22} />
        </div>
        <h3 className="font-display text-lg font-semibold text-fg">Você fechou as {status!.allowed} situações de hoje</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">
          Os problemas gratuitos renovam todo dia. Quer continuar treinando agora? Libere mais
          {' '}{status!.pack_size} situações com Coins.
        </p>
        <p className="mt-3 text-xs text-fg-subtle">
          Hoje: {status!.correct_today} de {status!.used} certas
        </p>
        {error && <p className="mt-3 text-sm text-danger-fg">{error}</p>}
        <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Button onClick={buy} isLoading={buying} disabled={coins < status!.pack_cost}>
            <Coins size={16} /> +{status!.pack_size} situações · {status!.pack_cost.toLocaleString('pt-BR')} Coins
          </Button>
          {coins < status!.pack_cost && onBuyCoins && (
            <Button variant="outline" onClick={onBuyCoins}>Comprar Coins</Button>
          )}
        </div>
        {coins < status!.pack_cost && (
          <p className="mt-3 text-xs text-fg-subtle">Seu saldo: {coins.toLocaleString('pt-BR')} Coins</p>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho do treino */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge tone="accent">Nível {problem.level}</Badge>
          <span className="text-sm text-fg-muted">
            {phase === 'result' ? problem.title : 'Situação de mercado'}
          </span>
        </div>
        <div className="text-sm text-fg-muted tabular-nums">
          {status?.unlimited
            ? `Hoje: ${status.used} feitas`
            : <>Restam <b className="text-fg">{remaining}</b> de {status?.allowed ?? 0} hoje</>}
        </div>
      </div>

      <Card padding="sm" className="space-y-3">
        <p className="text-sm text-fg">
          {phase === 'direction' && 'Leia o gráfico. O que você faria na próxima vela?'}
          {phase === 'stop' && 'Boa leitura! Agora, onde você posicionaria o stop? Toque na linha (A–D).'}
          {phase === 'result' && (correct ? 'Você acertou!' : 'Não foi dessa vez — veja o que o mercado fez.')}
        </p>

        <Chart
          problem={problem}
          phase={phase}
          revealed={revealed}
          pickedStop={pickedStop}
          onPickStop={chooseStop}
        />

        {phase === 'direction' && (
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={() => chooseSide('buy')} className="!bg-emerald-600 hover:!bg-emerald-500 !text-white !border-transparent">
              <TrendingUp size={18} /> Comprar
            </Button>
            <Button onClick={() => chooseSide('sell')} className="!bg-rose-600 hover:!bg-rose-500 !text-white !border-transparent">
              <TrendingDown size={18} /> Vender
            </Button>
          </div>
        )}

        {phase === 'stop' && (
          <div className="grid grid-cols-4 gap-2">
            {LETTERS.slice(0, problem.stopOptions.length).map((l, i) => (
              <Button key={l} variant="secondary" onClick={() => chooseStop(i)} aria-label={`Stop ${l}`}>
                {l}
              </Button>
            ))}
          </div>
        )}
      </Card>

      {phase === 'result' && (
        <Card padding="md" className={correct ? 'border-emerald-500/30' : 'border-rose-500/30'}>
          <div className="flex items-start gap-3">
            {correct
              ? <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-500" size={22} />
              : <XCircle className="mt-0.5 shrink-0 text-rose-500" size={22} />}
            <div className="space-y-2 text-sm text-fg-muted">
              <p className="font-semibold text-fg">
                {problem.title} — {problem.side === 'buy' ? 'compra' : 'venda'}
              </p>
              {pickedSide !== problem.side && <p>{problem.wrongSideExplanation}</p>}
              <p>{problem.explanation}</p>
              {pickedStop !== null && !problem.stopOptions[pickedStop].correct && (
                <p>
                  <b className="text-fg">Seu stop:</b> {problem.stopOptions[pickedStop].why}
                </p>
              )}
              {pickedStop !== null && problem.stopOptions[pickedStop].correct && (
                <p><b className="text-fg">Seu stop:</b> {problem.stopOptions[pickedStop].why}</p>
              )}
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-danger-fg">{error}</p>}
          <div className="mt-4 flex justify-end">
            <Button onClick={next} disabled={saving || revealed < problem.future.length}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              {outOfQuota ? 'Continuar' : 'Próxima situação'}
            </Button>
          </div>
        </Card>
      )}

      {status && status.total > 0 && (
        <p className="text-center text-xs text-fg-subtle">
          Geral: {status.total_correct} acertos em {status.total} situações
          ({Math.round((status.total_correct / status.total) * 100)}%)
        </p>
      )}
    </div>
  );
};

// --- Gráfico ---

interface ChartProps {
  problem: DailyProblem;
  phase: Phase;
  revealed: number;
  pickedStop: number | null;
  onPickStop: (i: number) => void;
}

const Chart: React.FC<ChartProps> = ({ problem, phase, revealed, pickedStop, onPickStop }) => {
  const { candles, future, entry, target, stopOptions, levels, marks } = problem;

  const { y, x, cw } = useMemo(() => {
    // O domínio inclui o futuro, as opções de stop e o alvo ESPELHADO em torno
    // da entrada — assim o espaço livre não denuncia a direção.
    const prices: number[] = [entry, target, 2 * entry - target];
    for (const c of candles) prices.push(c.h, c.l);
    for (const c of future) prices.push(c.h, c.l);
    for (const o of stopOptions) prices.push(o.price);
    for (const l of levels) prices.push(l.price);
    const lo = Math.min(...prices), hi = Math.max(...prices);
    const span = hi - lo || 1;
    const slots = candles.length + FUTURE_SLOTS;
    const cwidth = (W - PAD_X * 2 - AXIS_W) / slots;
    return {
      y: (p: number) => PAD_Y + (1 - (p - lo) / span) * (H - PAD_Y * 2),
      x: (i: number) => PAD_X + cwidth * i + cwidth / 2,
      cw: cwidth,
    };
  }, [candles, future, entry, target, stopOptions, levels]);

  const bodyW = Math.max(cw * 0.62, 2);
  const drawCandle = (c: { o: number; h: number; l: number; c: number }, i: number, faded = false) => {
    const up = c.c >= c.o;
    const color = up ? '#10b981' : '#f43f5e';
    const top = y(Math.max(c.o, c.c));
    const bh = Math.max(Math.abs(y(c.o) - y(c.c)), 1.2);
    return (
      <g key={i} opacity={faded ? 0.95 : 1}>
        <line x1={x(i)} x2={x(i)} y1={y(c.h)} y2={y(c.l)} stroke={color} strokeWidth={1.4} />
        <rect x={x(i) - bodyW / 2} y={top} width={bodyW} height={bh} fill={color} rx={0.8} />
      </g>
    );
  };

  // Rótulos A–D com afastamento mínimo para não se sobreporem.
  const labelY = useMemo(() => {
    const order = stopOptions.map((o, i) => ({ i, y: y(o.price) })).sort((a, b) => a.y - b.y);
    const out: Record<number, number> = {};
    let last = -Infinity;
    for (const o of order) {
      const yy = Math.max(o.y, last + 22);
      out[o.i] = yy;
      last = yy;
    }
    return out;
  }, [stopOptions, y]);

  const result = phase === 'result';
  const correctIdx = stopOptions.findIndex((o) => o.correct);
  const lastX = x(candles.length - 1);
  const rightX = W - PAD_X;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full select-none rounded-xl border border-tint/8 bg-tint/3"
      role="img"
      aria-label="Gráfico de candles da situação de mercado"
    >
      {/* grade */}
      {[0.2, 0.4, 0.6, 0.8].map((g) => (
        <line key={g} x1={0} x2={W} y1={H * g} y2={H * g} stroke="currentColor" className="text-tint/8" strokeWidth={1} />
      ))}

      {/* linhas de contexto reveladas */}
      {result && levels.map((l, i) => (
        <g key={i}>
          <line x1={PAD_X} x2={rightX} y1={y(l.price)} y2={y(l.price)} stroke="#94a3b8" strokeWidth={1.2} strokeDasharray="2 4" />
          <text x={PAD_X + 4} y={y(l.price) - 5} fontSize={11} fill="#94a3b8">{l.label}</text>
        </g>
      ))}

      {candles.map((c, i) => drawCandle(c, i))}
      {result && future.slice(0, revealed).map((c, i) => drawCandle(c, candles.length + i, true))}

      {/* marcadores */}
      {result && marks.map((m, i) => {
        const c = candles[m.index];
        const below = problem.side === 'buy';
        const py = below ? y(c.l) + 14 : y(c.h) - 8;
        return (
          <text key={i} x={x(m.index)} y={py} fontSize={10} textAnchor="middle" fill="#94a3b8">{m.label}</text>
        );
      })}

      {/* entrada */}
      <line x1={lastX} x2={rightX} y1={y(entry)} y2={y(entry)} stroke="#38bdf8" strokeWidth={1.3} strokeDasharray="5 4" />
      <text x={rightX - 4} y={y(entry) - 5} fontSize={11} textAnchor="end" fill="#38bdf8">Entrada</text>

      {/* opções de stop (fase de escolha) */}
      {phase === 'stop' && stopOptions.map((o, i) => (
        <g key={i} className="cursor-pointer" onClick={() => onPickStop(i)}>
          <line x1={PAD_X} x2={rightX} y1={y(o.price)} y2={y(o.price)} stroke="#f59e0b" strokeWidth={1.6} strokeDasharray="6 4" />
          {/* faixa invisível maior para facilitar o toque */}
          <line x1={PAD_X} x2={rightX} y1={y(o.price)} y2={y(o.price)} stroke="transparent" strokeWidth={22} />
          <circle cx={rightX - 18} cy={labelY[i]} r={14} fill="#f59e0b" />
          <text x={rightX - 18} y={labelY[i] + 5} fontSize={15} fontWeight={700} textAnchor="middle" fill="#111827">{LETTERS[i]}</text>
        </g>
      ))}

      {/* resultado: stop certo, stop escolhido e alvo */}
      {result && (
        <>
          <line x1={PAD_X} x2={rightX} y1={y(target)} y2={y(target)} stroke="#10b981" strokeWidth={1.3} strokeDasharray="6 4" />
          <text x={rightX - 4} y={y(target) - 5} fontSize={11} textAnchor="end" fill="#10b981">Alvo</text>
          {pickedStop !== null && pickedStop !== correctIdx && (
            <>
              <line x1={PAD_X} x2={rightX} y1={y(stopOptions[pickedStop].price)} y2={y(stopOptions[pickedStop].price)} stroke="#f43f5e" strokeWidth={1.3} strokeDasharray="6 4" />
              <text x={rightX - 4} y={y(stopOptions[pickedStop].price) - 5} fontSize={11} textAnchor="end" fill="#f43f5e">Seu stop</text>
            </>
          )}
          {pickedStop !== null && (
            <>
              <line x1={PAD_X} x2={rightX} y1={y(stopOptions[correctIdx].price)} y2={y(stopOptions[correctIdx].price)} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="6 4" />
              <text x={rightX - 4} y={y(stopOptions[correctIdx].price) + 14} fontSize={11} textAnchor="end" fill="#f59e0b">Stop ideal</text>
            </>
          )}
        </>
      )}
    </svg>
  );
};
