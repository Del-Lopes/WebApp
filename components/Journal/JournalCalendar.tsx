import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Copy, Pencil, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { TradeEntry } from '../../hooks/useTradeJournal';
import {
  CalendarMode, DayResults, DayStats, Report, WEEKDAYS_SHORT,
  addDays, addMonths, buildReport, dayKey, entryDate, fetchDayResults, fetchRange, formatMoney, formatPercent,
  groupByDay, keyToLabel, monthGrid, periodLabel, reportRange, reportToText, startOfDay, startOfWeek, weekNet,
} from '../../lib/journalCalendar';
import { Button, EmptyState, Input, Skeleton } from '../ui';
import { useJournalCurrency } from '../../hooks/useJournalCurrency';

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
  useJournalCurrency(); // re-renderiza quando a moeda muda
  const { user } = useAuth();
  const userId = user?.id;
  const [mode, setMode] = useState<CalendarMode>('month');
  const [cursor, setCursor] = useState<Date>(() => startOfDay(new Date()));
  const [entries, setEntries] = useState<TradeEntry[]>([]);
  const [dayResults, setDayResults] = useState<DayResults>(() => new Map());
  const [resultsVersion, setResultsVersion] = useState(0);
  const [editingDay, setEditingDay] = useState<Date | null>(null);
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
    // Resultados lançados direto no dia. Se a tabela ainda não existir, o calendário segue só com as operações.
    fetchDayResults(supabase, userId, new Date(fromMs), new Date(toMs))
      .then((r) => { if (alive) setDayResults(r); })
      .catch(() => { if (alive) setDayResults(new Map()); });
    return () => { alive = false; };
  }, [userId, fromMs, toMs, refreshKey, resultsVersion]);

  const days = useMemo(() => groupByDay(entries, dayResults), [entries, dayResults]);

  // O relatório vale só para o período exibido (o mês não conta os dias vizinhos da grade).
  const reportEntries = useMemo(() => {
    const r = reportRange(mode, cursor);
    return entries.filter((e) => {
      const d = entryDate(e).getTime();
      return d >= r.from.getTime() && d < r.to.getTime();
    });
  }, [entries, mode, cursor]);
  const reportDayResults = useMemo(() => {
    const r = reportRange(mode, cursor);
    const from = dayKey(r.from);
    const to = dayKey(r.to);
    return new Map([...dayResults].filter(([k]) => k >= from && k < to));
  }, [dayResults, mode, cursor]);
  const report = useMemo(() => buildReport(reportEntries, reportDayResults), [reportEntries, reportDayResults]);
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

      {mode === 'month' && <PeriodTotal label={`Total de ${label}`} net={report.net} hasResult={report.tradedDays > 0} />}

      <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'} aria-busy={loading}>
        {loading && entries.length === 0 ? (
          <Skeleton className="h-96 w-full rounded-2xl" />
        ) : mode === 'month' ? (
          <MonthView cursor={cursor} days={days} todayKey={todayKey} onOpenDay={openDay} onEditResult={setEditingDay} />
        ) : mode === 'week' ? (
          <WeekView cursor={cursor} days={days} todayKey={todayKey} onOpenDay={openDay} onEditResult={setEditingDay} />
        ) : (
          <DayView
            day={days.get(dayKey(cursor))}
            onNew={() => onNewTrade(cursor)}
            onEditResult={() => setEditingDay(cursor)}
            renderTrade={renderTrade}
          />
        )}
      </div>

      <ReportPanel report={report} label={label} />

      {editingDay && userId && (
        <DayResultDialog
          userId={userId}
          date={editingDay}
          current={dayResults.get(dayKey(editingDay)) ?? null}
          onClose={() => setEditingDay(null)}
          onSaved={() => { setEditingDay(null); setResultsVersion((v) => v + 1); }}
        />
      )}
    </div>
  );
}

// ─── Indicadores do período ────────────────────────────────────────────────

function Kpis({ report, mode }: { report: Report; mode: CalendarMode }) {
  const cards: { label: string; value: string; hint?: string; cls?: string }[] = [
    { label: mode === 'month' ? 'Resultado do mês' : mode === 'week' ? 'Resultado da semana' : 'Resultado do dia', value: formatMoney(report.net), cls: tone(report.net), hint: `${report.tradedDays} dia(s) com operações` },
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

function MonthView({ cursor, days, todayKey, onOpenDay, onEditResult }: {
  cursor: Date; days: Map<string, DayStats>; todayKey: string; onOpenDay: (d: Date) => void; onEditResult: (d: Date) => void;
}) {
  const grid = monthGrid(cursor);
  const weeks = Array.from({ length: 6 }, (_, i) => grid.slice(i * 7, i * 7 + 7));
  return (
    <div className="glass-card rounded-2xl p-2 sm:p-4">
      <div className="mb-1 grid grid-cols-[repeat(7,minmax(0,1fr))_minmax(0,0.9fr)] gap-1 sm:gap-1.5">
        {WEEKDAYS_SHORT.map((w) => (
          <p key={w} className="py-1 text-center text-[10px] font-semibold uppercase tracking-wider text-fg-subtle sm:text-xs">{w}</p>
        ))}
        <p className="py-1 text-center text-[10px] font-semibold uppercase tracking-wider text-accent-fg sm:text-xs">Semana</p>
      </div>
      <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_minmax(0,0.9fr)] gap-1 sm:gap-1.5">
        {weeks.map((week) => {
          const total = weekNet(days, week[0]);
          return (
            <React.Fragment key={dayKey(week[0])}>
              {week.map((d) => {
                const key = dayKey(d);
                const s = days.get(key);
                const inMonth = d.getMonth() === cursor.getMonth();
                const isToday = key === todayKey;
                const hasResult = !!s && s.hasResult;
                const cls = !s
                  ? 'border-tint/6 bg-tint/2 hover:bg-tint/5'
                  : hasResult && s.net > 0
                    ? 'border-success/25 bg-success/10 hover:bg-success/15'
                    : hasResult && s.net < 0
                      ? 'border-danger/25 bg-danger/10 hover:bg-danger/15'
                      : 'border-tint/10 bg-tint/5 hover:bg-tint/8';
                return (
                  <div key={key} className={`group relative ${inMonth ? '' : 'opacity-40'}`}>
                    <button
                      type="button"
                      onClick={() => onOpenDay(d)}
                      aria-label={`${d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}: ${
                        s ? `${s.entries.length} operação(ões)${hasResult ? `, resultado ${formatMoney(s.net)}` : ''}` : 'sem operações'
                      }`}
                      className={`flex min-h-[58px] w-full flex-col justify-between rounded-lg border p-1 text-left transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 sm:min-h-[92px] sm:rounded-xl sm:p-2 ${cls} ${isToday ? 'ring-2 ring-accent/60' : ''}`}
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
                          {s.entries.length > 0 && (
                            <span className="text-[9px] text-fg-subtle sm:text-[11px]">
                              {s.entries.length} op.{s.open > 0 && <span className="text-warning-fg"> · {s.open} ab.</span>}
                            </span>
                          )}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditResult(d)}
                      aria-label={`Lançar resultado de ${d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}`}
                      title="Lançar resultado do dia"
                      className="absolute right-0.5 top-0.5 rounded-md bg-page/70 p-1 text-fg-muted opacity-70 transition-opacity hover:text-fg focus-visible:opacity-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Pencil size={11} />
                    </button>
                  </div>
                );
              })}
              <div
                className={`flex min-h-[58px] flex-col items-center justify-center rounded-lg border p-1 text-center sm:min-h-[92px] sm:rounded-xl ${
                  total.hasResult
                    ? total.net > 0 ? 'border-success/25 bg-success/10' : total.net < 0 ? 'border-danger/25 bg-danger/10' : 'border-tint/10 bg-tint/5'
                    : 'border-tint/6 bg-tint/2'
                }`}
                aria-label={`Total da semana de ${week[0].toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}: ${total.hasResult ? formatMoney(total.net) : 'sem resultado'}`}
              >
                {total.hasResult ? (
                  <span className={`font-mono text-[10px] font-semibold tabular-nums sm:text-sm ${tone(total.net)}`}>
                    <span className="sm:hidden">{compact(total.net)}</span>
                    <span className="hidden sm:inline">{formatMoney(total.net)}</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-fg-subtle sm:text-xs">—</span>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function PeriodTotal({ label, net, hasResult }: { label: string; net: number; hasResult: boolean }) {
  return (
    <div className="glass-card flex items-center justify-between gap-3 rounded-xl px-4 py-3">
      <span className="min-w-0 truncate text-sm font-medium capitalize text-fg-muted">{label}</span>
      <span className={`font-display text-lg font-semibold tabular-nums sm:text-xl ${hasResult ? tone(net) : 'text-fg-muted'}`}>
        {hasResult ? formatMoney(net) : '—'}
      </span>
    </div>
  );
}

// ─── Semana ────────────────────────────────────────────────────────────────

function WeekView({ cursor, days, todayKey, onOpenDay, onEditResult }: {
  cursor: Date; days: Map<string, DayStats>; todayKey: string; onOpenDay: (d: Date) => void; onEditResult: (d: Date) => void;
}) {
  const start = startOfWeek(cursor);
  const week = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const total = weekNet(days, start);
  return (
    <div className="space-y-2">
    <PeriodTotal label="Total da semana" net={total.net} hasResult={total.hasResult} />
    <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
      {week.map((d) => {
        const key = dayKey(d);
        const s = days.get(key);
        const hasResult = !!s && s.hasResult;
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
            <button
              type="button"
              onClick={() => onEditResult(d)}
              className="mb-2 inline-flex w-fit items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-fg-muted hover:bg-tint/6 hover:text-fg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              <Pencil size={11} /> {s?.manual != null ? 'Editar resultado' : 'Lançar resultado'}
            </button>
            {s && s.entries.length > 0 ? (
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
              <p className="mt-auto text-xs text-fg-subtle">{s?.manual != null ? 'Resultado lançado' : 'Sem operações'}</p>
            )}
          </div>
        );
      })}
    </div>
    </div>
  );
}

// ─── Dia ───────────────────────────────────────────────────────────────────

function DayView({ day, onNew, onEditResult, renderTrade }: {
  day: DayStats | undefined; onNew: () => void; onEditResult: () => void; renderTrade: (e: TradeEntry) => React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">
          {day
            ? <>Resultado do dia: <span className={`font-mono font-semibold tabular-nums ${day.hasResult ? tone(day.net) : 'text-fg-muted'}`}>{day.hasResult ? formatMoney(day.net) : '—'}</span> · {day.entries.length} operação(ões)
                {day.manual != null && <span className="text-fg-subtle"> · inclui {formatMoney(day.manual)} lançado</span>}</>
            : 'Nenhuma operação neste dia.'}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={onEditResult}><Pencil size={14} /> {day?.manual != null ? 'Editar resultado do dia' : 'Lançar resultado do dia'}</Button>
          <Button type="button" size="sm" onClick={onNew}><Plus size={15} /> Nova operação neste dia</Button>
        </div>
      </div>
      {day && day.entries.length > 0 ? (
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
          <Button type="button" size="sm" variant="secondary" onClick={copy} disabled={report.tradedDays === 0}>
            {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copiado' : 'Copiar relatório'}
          </Button>
        </div>
      </div>

      {report.tradedDays === 0 ? (
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

// ─── Resultado do dia ──────────────────────────────────────────────────────

function DayResultDialog({ userId, date, current, onClose, onSaved }: {
  userId: string; date: Date; current: number | null; onClose: () => void; onSaved: () => void;
}) {
  const [value, setValue] = useState(current !== null ? String(current) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = dayKey(date);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = async () => {
    const amount = parseFloat(value.replace(',', '.'));
    if (!Number.isFinite(amount)) { setError('Informe o resultado do dia (use sinal negativo para prejuízo).'); return; }
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from('journal_day_results')
      .upsert({ user_id: userId, day: key, amount }, { onConflict: 'user_id,day' });
    setSaving(false);
    if (err) { setError('Não foi possível salvar o resultado. Tente novamente.'); return; }
    onSaved();
  };

  const remove = async () => {
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from('journal_day_results').delete().eq('user_id', userId).eq('day', key);
    setSaving(false);
    if (err) { setError('Não foi possível remover o resultado. Tente novamente.'); return; }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Resultado do dia"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm space-y-4 rounded-t-2xl border border-tint/10 bg-surface p-5 text-fg sm:rounded-2xl"
      >
        <div>
          <h3 className="font-display text-lg font-semibold">Resultado do dia</h3>
          <p className="mt-0.5 text-sm capitalize text-fg-muted">
            {date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Resultado final (R$/$)</span>
          <Input
            type="number"
            step="0.01"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void save(); }}
            placeholder="Use sinal negativo para prejuízo"
          />
        </label>
        <p className="text-xs text-fg-subtle">Soma-se às operações fechadas neste dia, se houver.</p>
        {error && <p role="alert" className="rounded-lg border border-danger/20 bg-danger/10 p-2.5 text-sm text-danger-fg">{error}</p>}
        <div className="flex items-center justify-between gap-2">
          {current !== null ? (
            <Button type="button" variant="danger" size="sm" onClick={remove} disabled={saving}>Remover</Button>
          ) : <span />}
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="button" onClick={save} disabled={saving}>Salvar</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
