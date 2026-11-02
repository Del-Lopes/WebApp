import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Copy, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { TradeEntry } from '../../hooks/useTradeJournal';
import {
  CalendarMode, DayStats, Report, WEEKDAYS_SHORT,
  addDays, addMonths, buildReport, dayKey, entryDate, fetchRange, formatMoney, formatPercent,
  groupByDay, keyToLabel, monthGrid, periodLabel, reportRange, reportToText, startOfDay, startOfWeek,
} from '../../lib/journalCalendar';
import { Button, EmptyState, Skeleton } from '../ui';

interface Props {
  /** Muda quando o Diário salva/apaga uma operação: recarrega o período. */
  refreshKey: number;
  /** Cartão completo da operação (expandir, editar, apagar), vindo da lista do Diário. */
  renderTrade: (entry: TradeEntry) => React.ReactNode;
  onNewTrade: (date: Date) => void;
}

const MODES: { value: CalendarMode; label: string }[] = [
  { value: 'month', label: 'Mês' },
  { value: 'week', label: 'Semana' },
  { value: 'day', label: 'Dia' },
];

// "+1,2k" nas células pequenas do celular.
function compact(v: number): string {
  const sign = v > 0 ? '+' : v < 0 ? '−' : '';
  const abs = Math.abs(v);
  return abs >= 1000 ? `${sign}${(abs / 1000).toFixed(1).replace('.', ',')}k` : `${sign}${Math.round(abs)}`;
}

const tone = (v: number) => (v > 0 ? 'text-success-fg' : v < 0 ? 'text-danger-fg' : 'text-fg-muted');

export function JournalCalendar({ refreshKey, renderTrade, onNewTrade }: Props) {
  const { user } = useAuth();
  const userId = user?.id;
  const [mode, setMode] = useState<CalendarMode>('month');
  const [cursor, setCursor] = useState<Date>(() => startOfDay(new Date()));
  const [entries, setEntries] = useState<TradeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => fetchRange(mode, cursor), [mode, cursor]);
  const fromMs = range.from.getTime();
  const toMs = range.to.getTime();

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    setLoading(true);
    const f = new Date(fromMs).toISOString();
    const t = new Date(toMs).toISOString();
    // Conta no período a operação fechada nele, ou a ainda aberta que foi aberta nele.
    supabase
      .from('trade_journal')
      .select('*')
      .eq('user_id', userId)
      .or(`and(closed_at.gte.${f},closed_at.lt.${t}),and(closed_at.is.null,opened_at.gte.${f},opened_at.lt.${t})`)
      .order('opened_at', { ascending: false })
      .limit(1000)
      .then(({ data, error: err }) => {
        if (!alive) return;
        if (err) {
          setError(err.message);
          setEntries([]);
        } else {
          setError(null);
          setEntries((data ?? []) as TradeEntry[]);
        }
        setLoading(false);
      });
    return () => { alive = false; };
  }, [userId, fromMs, toMs, refreshKey]);

  const days = useMemo(() => groupByDay(entries), [entries]);

  // O relatório vale só para o período exibido (o mês não conta os dias vizinhos da grade).
  const reportEntries = useMemo(() => {
    const r = reportRange(mode, cursor);
    return entries.filter((e) => {
      const d = entryDate(e).getTime();
      return d >= r.from.getTime() && d < r.to.getTime();
    });
  }, [entries, mode, cursor]);
  const report = useMemo(() => buildReport(reportEntries), [reportEntries]);
  const label = periodLabel(mode, cursor);

  const step = (dir: 1 | -1) => {
    setCursor((c) => (mode === 'month' ? addMonths(c, dir) : addDays(c, dir * (mode === 'week' ? 7 : 1))));
  };
  const openDay = (d: Date) => { setCursor(startOfDay(d)); setMode('day'); };
  const todayKey = dayKey(new Date());

  return (
    <div className="space-y-5">
      {/* Barra de controle */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="flex rounded-lg border border-tint/10 bg-tint/3 p-0.5" role="group" aria-label="Visão do calendário">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              aria-pressed={mode === m.value}
              onClick={() => setMode(m.value)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 ${
                mode === m.value ? 'bg-accent/10 font-medium text-accent-fg' : 'text-fg-muted hover:text-fg'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-1 sm:flex-none sm:justify-start">
          <Button type="button" variant="ghost" size="icon" aria-label="Período anterior" onClick={() => step(-1)}><ChevronLeft size={18} /></Button>
          <h2 className="min-w-0 truncate text-center font-display text-base font-semibold capitalize text-fg sm:min-w-[220px] sm:text-lg">{label}</h2>
          <Button type="button" variant="ghost" size="icon" aria-label="Próximo período" onClick={() => step(1)}><ChevronRight size={18} /></Button>
        </div>

        <Button type="button" variant="secondary" size="sm" onClick={() => setCursor(startOfDay(new Date()))} className="sm:ml-auto">
          <CalendarDays size={15} /> Hoje
        </Button>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-danger/20 bg-danger/10 p-3 text-sm text-danger-fg">{error}</p>
      )}

      <Kpis report={report} mode={mode} />

      <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'} aria-busy={loading}>
        {loading && entries.length === 0 ? (
          <Skeleton className="h-96 w-full rounded-2xl" />
        ) : mode === 'month' ? (
          <MonthView cursor={cursor} days={days} todayKey={todayKey} onOpenDay={openDay} />
        ) : mode === 'week' ? (
          <WeekView cursor={cursor} days={days} todayKey={todayKey} onOpenDay={openDay} />
        ) : (
          <DayView
            day={days.get(dayKey(cursor))}
            onNew={() => onNewTrade(cursor)}
            renderTrade={renderTrade}
          />
        )}
      </div>

      <ReportPanel report={report} label={label} />
    </div>
  );
}

// ─── Indicadores do período ────────────────────────────────────────────────

function Kpis({ report, mode }: { report: Report; mode: CalendarMode }) {
  const cards: { label: string; value: string; hint?: string; cls?: string }[] = [
    { label: 'Resultado', value: formatMoney(report.net), cls: tone(report.net), hint: `${report.tradedDays} dia(s) com operações` },
    { label: 'Operações', value: String(report.trades), hint: `${report.decided} fechadas · ${report.open} em aberto` },
    { label: 'Win rate', value: report.decided ? formatPercent(report.winRate) : '—', hint: `${report.wins} ganhos · ${report.losses} perdas` },
    { label: 'Fator de lucro', value: report.profitFactor !== null ? report.profitFactor.toFixed(2) : '—', hint: 'ganhos ÷ perdas' },
  ];
  if (mode !== 'day') {
    cards.push({
      label: 'Melhor dia',
      value: report.bestDay ? formatMoney(report.bestDay.net) : '—',
      cls: report.bestDay ? tone(report.bestDay.net) : undefined,
      hint: report.bestDay ? keyToLabel(report.bestDay.key) : undefined,
    });
    cards.push({
      label: 'Pior dia',
      value: report.worstDay ? formatMoney(report.worstDay.net) : '—',
      cls: report.worstDay ? tone(report.worstDay.net) : undefined,
      hint: report.worstDay ? keyToLabel(report.worstDay.key) : undefined,
    });
  }
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((c) => (
        <div key={c.label} className="glass-card min-w-0 rounded-xl p-3 sm:p-4">
          <p className="eyebrow-muted truncate">{c.label}</p>
          <p className={`mt-1 truncate font-display text-lg font-semibold tabular-nums sm:text-xl ${c.cls ?? 'text-fg'}`}>{c.value}</p>
          {c.hint && <p className="mt-0.5 truncate text-[11px] text-fg-subtle">{c.hint}</p>}
        </div>
      ))}
    </div>
  );
}

// ─── Mês ───────────────────────────────────────────────────────────────────

function MonthView({ cursor, days, todayKey, onOpenDay }: {
  cursor: Date; days: Map<string, DayStats>; todayKey: string; onOpenDay: (d: Date) => void;
}) {
  const grid = monthGrid(cursor);
  return (
    <div className="glass-card rounded-2xl p-2 sm:p-4">
      <div className="mb-1 grid grid-cols-7 gap-1 sm:gap-1.5">
        {WEEKDAYS_SHORT.map((w) => (
          <p key={w} className="py-1 text-center text-[10px] font-semibold uppercase tracking-wider text-fg-subtle sm:text-xs">{w}</p>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {grid.map((d) => {
          const key = dayKey(d);
          const s = days.get(key);
          const inMonth = d.getMonth() === cursor.getMonth();
          const isToday = key === todayKey;
          const hasResult = !!s && s.decided > 0;
          const cls = !s
            ? 'border-tint/6 bg-tint/2 hover:bg-tint/5'
            : hasResult && s.net > 0
              ? 'border-success/25 bg-success/10 hover:bg-success/15'
              : hasResult && s.net < 0
                ? 'border-danger/25 bg-danger/10 hover:bg-danger/15'
                : 'border-tint/10 bg-tint/5 hover:bg-tint/8';
          return (
            <button
              key={key}
              type="button"
              onClick={() => onOpenDay(d)}
              aria-label={`${d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}: ${
                s ? `${s.entries.length} operação(ões)${hasResult ? `, resultado ${formatMoney(s.net)}` : ''}` : 'sem operações'
              }`}
              className={`flex min-h-[58px] flex-col justify-between rounded-lg border p-1 text-left transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 sm:min-h-[92px] sm:rounded-xl sm:p-2 ${cls} ${inMonth ? '' : 'opacity-40'} ${isToday ? 'ring-2 ring-accent/60' : ''}`}
            >
              <span className={`text-[11px] font-medium sm:text-xs ${isToday ? 'text-accent-fg' : 'text-fg-muted'}`}>{d.getDate()}</span>
              {s && (
                <span className="flex flex-col items-end leading-tight">
                  {hasResult && (
                    <span className={`font-mono text-[10px] font-semibold tabular-nums sm:text-sm ${tone(s.net)}`}>
                      <span className="sm:hidden">{compact(s.net)}</span>
                      <span className="hidden sm:inline">{formatMoney(s.net)}</span>
                    </span>
                  )}
                  <span className="text-[9px] text-fg-subtle sm:text-[11px]">
                    {s.entries.length} op.{s.open > 0 && <span className="text-warning-fg"> · {s.open} ab.</span>}
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Semana ────────────────────────────────────────────────────────────────

function WeekView({ cursor, days, todayKey, onOpenDay }: {
  cursor: Date; days: Map<string, DayStats>; todayKey: string; onOpenDay: (d: Date) => void;
}) {
  const start = startOfWeek(cursor);
  const week = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
      {week.map((d) => {
        const key = dayKey(d);
        const s = days.get(key);
        const hasResult = !!s && s.decided > 0;
        return (
          <div
            key={key}
            className={`glass-card flex min-h-[120px] flex-col rounded-xl p-3 ${key === todayKey ? 'ring-2 ring-accent/50' : ''}`}
          >
            <button
              type="button"
              onClick={() => onOpenDay(d)}
              className="mb-2 flex items-baseline justify-between gap-2 rounded-sm text-left focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
              aria-label={`Abrir ${d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}`}
            >
              <span className="text-sm font-semibold text-fg">
                {WEEKDAYS_SHORT[d.getDay()]} <span className="text-fg-subtle">{d.getDate()}</span>
              </span>
              {hasResult && <span className={`font-mono text-xs font-semibold tabular-nums ${tone(s!.net)}`}>{formatMoney(s!.net)}</span>}
            </button>
            {s ? (
              <ul className="space-y-1">
                {s.entries.map((e) => {
                  const open = !e.closed_at;
                  const r = Number(e.result_amount ?? 0);
                  return (
                    <li key={e.id}>
                      <button
                        type="button"
                        onClick={() => onOpenDay(d)}
                        className="flex w-full items-center justify-between gap-2 rounded-md bg-tint/3 px-2 py-1 text-left text-xs hover:bg-tint/6 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                      >
                        <span className="flex min-w-0 items-center gap-1 font-mono text-fg">
                          <span className={e.side === 'buy' ? 'text-success-fg' : 'text-danger-fg'} aria-hidden>{e.side === 'buy' ? '↑' : '↓'}</span>
                          <span className="truncate">{e.asset}</span>
                        </span>
                        <span className={`shrink-0 font-mono tabular-nums ${open ? 'text-warning-fg' : tone(r)}`}>
                          {open ? 'aberta' : e.result_amount === null ? '—' : formatMoney(r)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-auto text-xs text-fg-subtle">Sem operações</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Dia ───────────────────────────────────────────────────────────────────

function DayView({ day, onNew, renderTrade }: {
  day: DayStats | undefined; onNew: () => void; renderTrade: (e: TradeEntry) => React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">
          {day
            ? <>Resultado do dia: <span className={`font-mono font-semibold tabular-nums ${tone(day.net)}`}>{formatMoney(day.net)}</span> · {day.entries.length} operação(ões)</>
            : 'Nenhuma operação neste dia.'}
        </p>
        <Button type="button" size="sm" onClick={onNew}><Plus size={15} /> Nova operação neste dia</Button>
      </div>
      {day ? (
        <div className="space-y-3">
          {day.entries.map((e) => <React.Fragment key={e.id}>{renderTrade(e)}</React.Fragment>)}
        </div>
      ) : (
        <EmptyState
          icon={CalendarDays}
          title={<span className="block font-sans text-sm font-normal text-fg-muted">Registre uma operação para este dia ou escolha outro no calendário.</span>}
        />
      )}
    </div>
  );
}

// ─── Relatório ─────────────────────────────────────────────────────────────

function ReportPanel({ report, label }: { report: Report; label: string }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reportToText(report, label));
      setCopyError(false);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
    }
  };

  const stat = (name: string, value: string) => (
    <div className="min-w-0">
      <dt className="eyebrow-muted truncate">{name}</dt>
      <dd className="mt-0.5 truncate font-mono text-sm tabular-nums text-fg">{value}</dd>
    </div>
  );

  return (
    <section className="glass-card rounded-2xl p-4 sm:p-5" aria-label="Relatório do período">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg font-semibold text-fg">Relatório do período</h3>
        <div className="flex items-center gap-2">
          {copyError && <span role="alert" className="text-xs text-danger-fg">Não foi possível copiar.</span>}
          <Button type="button" size="sm" variant="secondary" onClick={copy} disabled={report.trades === 0}>
            {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copiado' : 'Copiar relatório'}
          </Button>
        </div>
      </div>

      {report.trades === 0 ? (
        <p className="py-4 text-center text-sm text-fg-muted">Sem operações neste período.</p>
      ) : (
        <div className="space-y-5">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stat('Ganho médio', formatMoney(report.avgWin))}
            {stat('Perda média', formatMoney(-report.avgLoss))}
            {stat('Payoff', report.payoff !== null ? report.payoff.toFixed(2) : '—')}
            {stat('Operações em aberto', String(report.open))}
            {stat('Melhor operação', report.bestTrade ? `${report.bestTrade.asset} ${formatMoney(Number(report.bestTrade.result_amount))}` : '—')}
            {stat('Pior operação', report.worstTrade ? `${report.worstTrade.asset} ${formatMoney(Number(report.worstTrade.result_amount))}` : '—')}
          </dl>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <p className="eyebrow-muted mb-2">Por ativo</p>
              <ul className="divide-y divide-tint/6 rounded-xl border border-tint/8">
                {report.byAsset.map((a) => (
                  <li key={a.asset} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="min-w-0 truncate font-mono text-fg">{a.asset} <span className="text-xs text-fg-subtle">· {a.trades} op. · {formatPercent(a.winRate)}</span></span>
                    <span className={`shrink-0 font-mono tabular-nums ${tone(a.net)}`}>{formatMoney(a.net)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="eyebrow-muted mb-2">Estado emocional</p>
              {report.tags.length > 0 ? (
                <ul className="divide-y divide-tint/6 rounded-xl border border-tint/8">
                  {report.tags.map((t) => (
                    <li key={t.tag} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span className="min-w-0 truncate text-fg">{t.tag} <span className="text-xs text-fg-subtle">· {t.count}x</span></span>
                      <span className={`shrink-0 font-mono tabular-nums ${tone(t.net)}`}>{formatMoney(t.net)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl border border-tint/8 px-3 py-3 text-sm text-fg-muted">Nenhuma emoção registrada neste período.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
