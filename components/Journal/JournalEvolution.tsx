import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LineChart } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  DayResults, WEEKDAYS_SHORT, dailyNet, dayKey, fetchDayResults, formatMoney, formatPercent, keyToDate, keyToLabel,
} from '../../lib/journalCalendar';
import { EmptyState, Skeleton } from '../ui';
import { useJournalCurrency } from '../../hooks/useJournalCurrency';

interface Props {
  /** Muda quando o Diário salva/apaga uma operação: recarrega os dados. */
  refreshKey: number;
}

type ClosedTrade = { closed_at: string; opened_at: string; result_amount: number | string | null };

const PERIODS = [
  { value: 30, label: '30 dias' },
  { value: 90, label: '90 dias' },
  { value: 365, label: '1 ano' },
  { value: 0, label: 'Tudo' },
];

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const tone = (v: number) => (v > 0 ? 'text-success-fg' : v < 0 ? 'text-danger-fg' : 'text-fg-muted');

export function JournalEvolution({ refreshKey }: Props) {
  useJournalCurrency(); // re-renderiza quando a moeda muda
  const { user } = useAuth();
  const userId = user?.id;
  const [period, setPeriod] = useState(90);
  const [trades, setTrades] = useState<ClosedTrade[]>([]);
  const [dayResults, setDayResults] = useState<DayResults>(() => new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    setLoading(true);
    Promise.all([
      supabase
        .from('trade_journal')
        .select('closed_at, opened_at, result_amount')
        .eq('user_id', userId)
        .not('closed_at', 'is', null)
        .not('result_amount', 'is', null)
        .order('closed_at', { ascending: true })
        .limit(10000),
      fetchDayResults(supabase, userId).catch(() => new Map() as DayResults),
    ]).then(([res, manual]) => {
      if (!alive) return;
      if (res.error) {
        setError(res.error.message);
        setTrades([]);
      } else {
        setError(null);
        setTrades((res.data ?? []) as ClosedTrade[]);
      }
      setDayResults(manual);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [userId, refreshKey]);

  // Resultado por dia dentro do período, em ordem cronológica.
  const series = useMemo(() => {
    const all = dailyNet(trades as any, dayResults);
    const since = period > 0 ? dayKey(new Date(Date.now() - period * 86400000)) : '';
    return [...all.entries()].filter(([k]) => k >= since).sort(([a], [b]) => (a < b ? -1 : 1));
  }, [trades, dayResults, period]);

  const summary = useMemo(() => {
    let total = 0;
    let peak = 0;
    let maxDd = 0;
    let positive = 0;
    for (const [, v] of series) {
      total += v;
      peak = Math.max(peak, total);
      maxDd = Math.max(maxDd, peak - total);
      if (v > 0) positive += 1;
    }
    return { total, maxDd, positiveRate: series.length ? positive / series.length : 0 };
  }, [series]);

  const curve = useMemo(() => {
    let acc = 0;
    return series.map(([key, v]) => ({ key, value: (acc += v) }));
  }, [series]);

  const byMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const [k, v] of series) map.set(k.slice(0, 7), (map.get(k.slice(0, 7)) ?? 0) + v);
    return [...map.entries()].map(([k, v]) => {
      const [y, m] = k.split('-').map(Number);
      return { label: `${MONTHS_SHORT[m - 1]}/${String(y).slice(2)}`, value: v };
    });
  }, [series]);

  const byWeekday = useMemo(() => {
    const sums = Array(7).fill(0) as number[];
    for (const [k, v] of series) sums[keyToDate(k).getDay()] += v;
    return sums.map((v, i) => ({ label: WEEKDAYS_SHORT[i], value: v }));
  }, [series]);

  const lastDays = useMemo(
    () => series.slice(-31).map(([k, v]) => ({ label: keyToLabel(k).slice(0, 5), value: v })),
    [series],
  );

  return (
    <div className="space-y-5">
      <div className="flex rounded-lg border border-tint/10 bg-tint/3 p-0.5 w-fit" role="group" aria-label="Período">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            aria-pressed={period === p.value}
            onClick={() => setPeriod(p.value)}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 ${
              period === p.value ? 'bg-accent/10 font-medium text-accent-fg' : 'text-fg-muted hover:text-fg'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-danger/20 bg-danger/10 p-3 text-sm text-danger-fg">{error}</p>
      )}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      ) : series.length === 0 ? (
        <EmptyState
          icon={LineChart}
          title={
            <span className="block font-sans text-sm font-normal text-fg-muted">
              Sem resultados neste período. Registre operações fechadas ou lance o resultado do dia no calendário.
            </span>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Resultado no período" value={formatMoney(summary.total)} cls={tone(summary.total)} />
            <Kpi label="Dias com resultado" value={String(series.length)} />
            <Kpi label="Dias no positivo" value={formatPercent(summary.positiveRate)} />
            <Kpi label="Drawdown máximo" value={summary.maxDd > 0 ? formatMoney(-summary.maxDd) : '—'} cls={summary.maxDd > 0 ? 'text-danger-fg' : undefined} />
          </div>

          <ChartCard title="Curva de resultado acumulado" hint="Soma dos resultados dia a dia">
            <CurveChart points={curve} />
          </ChartCard>

          <div className="grid gap-5 lg:grid-cols-2">
            <ChartCard title="Resultado por mês">
              <BarChart items={byMonth} />
            </ChartCard>
            <ChartCard title="Resultado por dia da semana">
              <BarChart items={byWeekday} />
            </ChartCard>
          </div>

          <ChartCard title="Resultado por dia" hint="Últimos 31 dias com resultado">
            <BarChart items={lastDays} showValues={false} />
          </ChartCard>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className="glass-card min-w-0 rounded-xl p-3 sm:p-4">
      <p className="eyebrow-muted truncate">{label}</p>
      <p className={`mt-1 truncate font-display text-lg font-semibold tabular-nums sm:text-xl ${cls ?? 'text-fg'}`}>{value}</p>
    </div>
  );
}

function ChartCard({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="glass-card rounded-2xl p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="font-display text-base font-semibold text-fg">{title}</h3>
        {hint && <span className="text-xs text-fg-subtle">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

// Largura real do contêiner, para o SVG ser desenhado sem distorcer o texto.
function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.floor(el.clientWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

const compactMoney = (v: number): string => {
  const abs = Math.abs(v);
  const sign = v < 0 ? '−' : '';
  return abs >= 1000 ? `${sign}${(abs / 1000).toFixed(1).replace('.', ',')}k` : `${sign}${Math.round(abs)}`;
};

// Escala "bonita" para o eixo Y incluindo o zero.
function niceScale(min: number, max: number, ticks = 4) {
  const lo = Math.min(0, min);
  const hi = Math.max(0, max);
  const span = hi - lo || 1;
  const rough = span / ticks;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? 10 * pow;
  const start = Math.floor(lo / step) * step;
  const end = Math.ceil(hi / step) * step;
  const values: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) values.push(Math.round(v * 100) / 100);
  return { min: start, max: end, values };
}

const H = 240;
const PAD = { top: 12, right: 12, bottom: 28, left: 46 };

function CurveChart({ points }: { points: { key: string; value: number }[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const w = Math.max(width, 280);
  const innerW = w - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  // Começa em zero, antes do primeiro dia.
  const data = [{ key: '', value: 0 }, ...points];
  const scale = niceScale(Math.min(...data.map((p) => p.value)), Math.max(...data.map((p) => p.value)));
  const x = (i: number) => PAD.left + (data.length === 1 ? 0 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - ((v - scale.min) / (scale.max - scale.min)) * innerH;

  const line = data.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(data.length - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`;
  const last = data[data.length - 1].value;
  const up = last >= 0;

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left - PAD.left) / innerW;
    setHover(Math.min(data.length - 1, Math.max(1, Math.round(rel * (data.length - 1)))));
  };

  const hp = hover !== null ? data[hover] : null;
  const labelIdx = [1, Math.floor((data.length - 1) / 2) + 1, data.length - 1].filter((v, i, a) => v >= 1 && v < data.length && a.indexOf(v) === i);

  return (
    <div ref={ref} className="relative w-full">
      <svg
        width={w}
        height={H}
        role="img"
        aria-label={`Curva de resultado acumulado, terminando em ${formatMoney(last)}`}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        className={`block ${up ? 'text-success-fg' : 'text-danger-fg'}`}
      >
        {scale.values.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={w - PAD.right} y1={y(v)} y2={y(v)} className={v === 0 ? 'stroke-current text-fg-subtle' : 'stroke-current text-tint/10'} strokeWidth={v === 0 ? 1.2 : 1} strokeDasharray={v === 0 ? '4 3' : undefined} />
            <text x={PAD.left - 6} y={y(v) + 3} textAnchor="end" className="fill-current text-fg-subtle" fontSize={10}>{compactMoney(v)}</text>
          </g>
        ))}
        <path d={area} className="fill-current" opacity={0.12} />
        <path d={line} fill="none" className="stroke-current" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {labelIdx.map((i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor={i === 1 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} className="fill-current text-fg-subtle" fontSize={10}>
            {keyToLabel(data[i].key)}
          </text>
        ))}
        {hp && hover !== null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} className="stroke-current text-fg-subtle" strokeWidth={1} opacity={0.5} />
            <circle cx={x(hover)} cy={y(hp.value)} r={4} className="fill-current" />
          </>
        )}
      </svg>
      {hp && hover !== null && (
        <div
          className="pointer-events-none absolute top-1 rounded-lg border border-tint/10 bg-surface px-2.5 py-1.5 text-xs shadow-lg"
          style={{ left: Math.min(Math.max(x(hover) - 60, 0), w - 130) }}
        >
          <p className="text-fg-subtle">{keyToLabel(hp.key)}</p>
          <p className={`font-mono font-semibold tabular-nums ${tone(hp.value)}`}>{formatMoney(hp.value)}</p>
        </div>
      )}
    </div>
  );
}

function BarChart({ items, showValues = true }: { items: { label: string; value: number }[]; showValues?: boolean }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const w = Math.max(width, 280);
  const innerW = w - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const scale = niceScale(Math.min(...items.map((i) => i.value), 0), Math.max(...items.map((i) => i.value), 0));
  const y = (v: number) => PAD.top + innerH - ((v - scale.min) / (scale.max - scale.min)) * innerH;
  const slot = innerW / items.length;
  const barW = Math.max(3, Math.min(40, slot * 0.7));
  const everyN = Math.ceil(items.length / Math.max(1, Math.floor(innerW / 44)));
  const valuesFit = showValues && slot >= 48;

  return (
    <div ref={ref} className="w-full">
      <svg width={w} height={H} role="img" aria-label="Gráfico de barras de resultado" className="block">
        {scale.values.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={w - PAD.right} y1={y(v)} y2={y(v)} className="stroke-current text-tint/10" strokeWidth={1} />
            <text x={PAD.left - 6} y={y(v) + 3} textAnchor="end" className="fill-current text-fg-subtle" fontSize={10}>{compactMoney(v)}</text>
          </g>
        ))}
        <line x1={PAD.left} x2={w - PAD.right} y1={y(0)} y2={y(0)} className="stroke-current text-fg-subtle" strokeWidth={1.2} />
        {items.map((it, i) => {
          const cx = PAD.left + slot * i + slot / 2;
          const top = y(Math.max(it.value, 0));
          const h = Math.max(1.5, Math.abs(y(it.value) - y(0)));
          const positive = it.value >= 0;
          return (
            <g key={`${it.label}-${i}`} className={positive ? 'text-success-fg' : 'text-danger-fg'}>
              <rect x={cx - barW / 2} y={positive ? top : y(0)} width={barW} height={h} rx={2} className="fill-current" opacity={0.85}>
                <title>{`${it.label}: ${formatMoney(it.value)}`}</title>
              </rect>
              {valuesFit && (
                <text x={cx} y={positive ? top - 4 : y(0) + h + 11} textAnchor="middle" className="fill-current" fontSize={10}>{compactMoney(it.value)}</text>
              )}
              {i % everyN === 0 && (
                <text x={cx} y={H - 8} textAnchor="middle" className="fill-current text-fg-subtle" fontSize={10}>{it.label}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
