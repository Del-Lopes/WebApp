import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, AlertTriangle, Loader2, Clock, ChevronDown, CalendarX, RefreshCw } from 'lucide-react';
import { BackButton } from '../BackButton';
import {
  EconEvent, EconProfile, SyncStatus,
  fetchEvents, fetchProfiles, fetchSyncStatus, requestSync,
  fmtValue, fmtCountdown, fmtTime, dayKey, displayTitle, CURRENCY_LABEL,
} from '../../lib/econCalendar';
import { EventRow, Stars } from './EventRow';
import { EventDetail, DirIcon } from './EventDetail';
import { PageHeader, Tabs, EmptyState, Skeleton } from '../ui';

interface Props {
  onBack: () => void;
}

type RangeKey = 'yesterday' | 'today' | 'tomorrow' | 'week';

const RANGES: { key: RangeKey; label: string }[] = [
  { key: 'yesterday', label: 'Ontem' },
  { key: 'today', label: 'Hoje' },
  { key: 'tomorrow', label: 'Amanhã' },
  { key: 'week', label: 'Próximos 7 dias' },
];

const REFRESH_MS = 60_000;
const PREFS_KEY = 'econ_calendar_prefs';

function startOfDay(offsetDays: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d;
}

function rangeBounds(r: RangeKey): [Date, Date] {
  switch (r) {
    case 'yesterday': return [startOfDay(-1), startOfDay(0)];
    case 'today': return [startOfDay(0), startOfDay(1)];
    case 'tomorrow': return [startOfDay(1), startOfDay(2)];
    case 'week': return [startOfDay(0), startOfDay(8)];
  }
}

interface Prefs { onlyHigh: boolean; currencies: string[] }

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return { onlyHigh: !!p.onlyHigh, currencies: Array.isArray(p.currencies) ? p.currencies : [] };
    }
  } catch { /* storage indisponível */ }
  return { onlyHigh: false, currencies: [] };
}

function fmtDayHeader(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = dayKey(new Date().toISOString());
  const label = date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  return key === today ? `Hoje · ${label}` : label.charAt(0).toUpperCase() + label.slice(1);
}

function fmtAgo(iso: string, now: number): string {
  const min = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (min < 1) return 'agora há pouco';
  if (min < 60) return `há ${min}min`;
  return `há ${Math.round(min / 60)}h`;
}

// ─── Próximo evento de alto impacto ──────────────────────────────────────────

const NextEventCard: React.FC<{ event: EconEvent; profile: EconProfile | undefined; now: number }> = ({ event, profile, now }) => {
  const [open, setOpen] = useState(false);
  const interp = profile?.interpretation;
  const up = interp?.cenarios.acima;
  const down = interp?.cenarios.abaixo;

  return (
    <div className="glass-card overflow-hidden">
      {/* Brilho verde sutil no canto — destaque sem gritar */}
      <div className="pointer-events-none absolute -top-16 -right-12 h-44 w-44 rounded-full bg-accent/10 blur-3xl" aria-hidden />
      <div className="hairline absolute inset-x-0 top-0" aria-hidden />
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="relative w-full text-left p-5 rounded-2xl focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="eyebrow flex items-center gap-1.5">
              <Clock size={13} /> Próximo evento de alto impacto
            </p>
            <p className="mt-2 font-display text-lg font-semibold leading-snug text-fg">{displayTitle(event, profile)}</p>
            <p className="mt-1.5 text-xs text-fg-muted flex items-center gap-2 flex-wrap">
              <span className="font-mono font-semibold text-fg bg-tint/6 border border-tint/10 px-1.5 py-0.5 rounded-sm">{event.currency}</span>
              {CURRENCY_LABEL[event.currency] && <span>{CURRENCY_LABEL[event.currency]}</span>}
              <Stars n={event.importance} />
              <span className="tabular-nums">
                {new Date(event.occurs_at).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })} às {fmtTime(event.occurs_at)}
              </span>
            </p>
          </div>
          <div className="sm:text-right">
            <p className="font-display text-2xl font-semibold tabular-nums whitespace-nowrap text-accent-fg">{fmtCountdown(event.occurs_at, now)}</p>
            {(event.previous != null || event.forecast != null) && (
              <p className="text-xs text-fg-muted mt-1">
                Anterior <span className="font-mono tabular-nums text-fg font-semibold">{fmtValue(event.previous, event.unit, event.precision)}</span>
                {' · '}Projeção <span className="font-mono tabular-nums text-fg font-semibold">{fmtValue(event.forecast, event.unit, event.precision)}</span>
              </p>
            )}
          </div>
        </div>

        {up && down && (
          <div className="mt-4 grid sm:grid-cols-2 gap-2">
            {[up, down].map((s, i) => (
              <div key={i} className="rounded-xl bg-tint/3 border border-tint/8 px-3 py-2">
                <p className="eyebrow-muted text-[10px]">{s.rotulo}</p>
                <p className="text-sm font-semibold text-fg flex items-center gap-1 mt-1">
                  <DirIcon dir={s.moeda} size={15} />
                  {event.currency} tende a {s.moeda === 'alta' ? 'alta' : s.moeda === 'baixa' ? 'baixa' : 'ficar estável'}
                  {s.moeda !== 'neutra' && <span className="font-normal text-fg-muted">· {s.intensidade}</span>}
                </p>
              </div>
            ))}
          </div>
        )}

        <p className="mt-3 text-xs font-medium text-accent-fg flex items-center gap-1">
          {open ? 'Ocultar interpretação' : 'Ver interpretação completa'}
          <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </p>
      </button>

      {open && (
        <div className="relative border-t border-tint/6 bg-tint/2 pt-3">
          <EventDetail event={event} profile={profile} />
        </div>
      )}
    </div>
  );
};

// ─── Sessão ──────────────────────────────────────────────────────────────────

export const EconCalendar: React.FC<Props> = ({ onBack }) => {
  const [events, setEvents] = useState<EconEvent[]>([]);
  const [profiles, setProfiles] = useState<Map<string, EconProfile>>(new Map());
  const [sync, setSync] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [range, setRange] = useState<RangeKey>('today');
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [openId, setOpenId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* storage indisponível */ }
  }, [prefs]);

  // Uma consulta cobre todas as abas (ontem → +8 dias, ~150 linhas); trocar de
  // aba só refiltra no cliente.
  const load = useCallback(async () => {
    try {
      const evs = await fetchEvents(startOfDay(-1), startOfDay(8));
      const [profs, status] = await Promise.all([
        fetchProfiles([...new Set(evs.map((e) => e.event_key))]),
        fetchSyncStatus(),
      ]);
      setEvents(evs);
      setProfiles(profs);
      setSync(status);
      setError(false);
    } catch (e) {
      console.error('[econ] load', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Mostra o que já está no banco na hora, pede um sync e recarrega. Enquanto a
  // tela estiver visível repete a cada minuto — é assim que o "Atual" aparece
  // logo depois da divulgação. A trava de 60s da function segura a fonte.
  useEffect(() => {
    let alive = true;
    const cycle = async () => {
      await requestSync();
      if (alive) await load();
    };
    void load().then(cycle);
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void cycle();
    }, REFRESH_MS);
    return () => { alive = false; window.clearInterval(id); };
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const currencyOk = useCallback(
    (e: EconEvent) => prefs.currencies.length === 0 || prefs.currencies.includes(e.currency),
    [prefs.currencies],
  );

  // Moedas presentes na janela, mais frequentes primeiro.
  const currencies = useMemo(() => {
    const count = new Map<string, number>();
    for (const e of events) count.set(e.currency, (count.get(e.currency) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }, [events]);

  const nextHigh = useMemo(
    () => events.find((e) => e.importance === 3 && new Date(e.occurs_at).getTime() > now && currencyOk(e)),
    [events, now, currencyOk],
  );

  const grouped = useMemo(() => {
    const [from, to] = rangeBounds(range);
    const groups = new Map<string, EconEvent[]>();
    for (const e of events) {
      const t = new Date(e.occurs_at).getTime();
      if (t < from.getTime() || t >= to.getTime()) continue;
      if (prefs.onlyHigh && e.importance < 3) continue;
      if (!currencyOk(e)) continue;
      const k = dayKey(e.occurs_at);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(e);
    }
    return [...groups.entries()];
  }, [events, range, prefs.onlyHigh, currencyOk]);

  const toggleCurrency = (c: string) =>
    setPrefs((p) => ({
      ...p,
      currencies: p.currencies.includes(c) ? p.currencies.filter((x) => x !== c) : [...p.currencies, c],
    }));

  // Coleta parada há mais de 30 min: o calendário pode estar desatualizado.
  const stale = sync?.last_error && (!sync.last_ok_at || now - new Date(sync.last_ok_at).getTime() > 30 * 60_000);

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <PageHeader
        leading={<BackButton onClick={onBack} />}
        title={<span className="inline-flex items-center gap-2.5"><CalendarClock size={22} className="shrink-0 text-accent-fg" aria-hidden /> Calendário Econômico</span>}
        description="Notícias de alto impacto e como o mercado costuma reagir"
        className="mb-2 sm:mb-2"
      />

      {/* Disclaimer */}
      <div className="rounded-xl bg-warning/10 border border-warning/20 p-3 flex items-start gap-2">
        <AlertTriangle size={15} className="text-warning-fg mt-0.5 shrink-0" />
        <p className="text-xs text-warning-fg leading-relaxed">
          Eventos de 2 e 3 estrelas (dados via TradingView), horários no seu fuso. As interpretações são geradas por IA e descrevem a
          reação <strong>típica</strong> do mercado — não são recomendação de operação. Na divulgação o spread abre e o preço pode
          oscilar forte para os dois lados.
        </p>
      </div>

      {stale && (
        <div className="rounded-xl bg-danger/10 border border-danger/20 p-3 text-xs text-danger-fg flex items-start gap-2">
          <RefreshCw size={14} className="mt-0.5 shrink-0" /> A coleta do calendário está com falha
          {sync?.last_ok_at ? ` desde ${new Date(sync.last_ok_at).toLocaleString('pt-BR')}` : ''} — os dados podem estar desatualizados.
        </div>
      )}

      {nextHigh && <NextEventCard event={nextHigh} profile={profiles.get(nextHigh.event_key)} now={now} />}

      {/* Filtros */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Tabs
            aria-label="Período"
            items={RANGES}
            value={range}
            onChange={setRange}
          />
          <div className="flex gap-1 p-1 rounded-xl border border-tint/6 bg-tint/3">
            {[false, true].map((high) => (
              <button
                key={String(high)}
                onClick={() => setPrefs((p) => ({ ...p, onlyHigh: high }))}
                aria-pressed={prefs.onlyHigh === high}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg border text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 ${
                  prefs.onlyHigh === high ? 'bg-surface text-fg border-tint/10 shadow-xs' : 'border-transparent text-fg-muted hover:text-fg'
                }`}
              >
                <Stars n={high ? 3 : 2} /> {high ? 'Só 3' : '2 e 3'}
              </button>
            ))}
          </div>
          {sync?.last_ok_at && (
            <span className="text-[11px] text-fg-subtle ml-auto">Atualizado {fmtAgo(sync.last_ok_at, now)}</span>
          )}
        </div>

        {currencies.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setPrefs((p) => ({ ...p, currencies: [] }))}
              aria-pressed={prefs.currencies.length === 0}
              className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 ${
                prefs.currencies.length === 0 ? 'bg-accent/10 text-accent-fg border-accent/30' : 'bg-tint/3 text-fg-muted border-tint/10 hover:text-fg'
              }`}
            >
              Todas
            </button>
            {currencies.map((c) => (
              <button
                key={c}
                onClick={() => toggleCurrency(c)}
                title={CURRENCY_LABEL[c]}
                aria-pressed={prefs.currencies.includes(c)}
                className={`px-2.5 py-1 rounded-full border font-mono text-xs font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 ${
                  prefs.currencies.includes(c) ? 'bg-accent/10 text-accent-fg border-accent/30' : 'bg-tint/3 text-fg-muted border-tint/10 hover:text-fg'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-2" aria-busy="true">
          <Skeleton className="h-3 w-40" />
          {[0, 1, 2, 3, 4].map((k) => <Skeleton key={k} className="h-[62px] rounded-2xl" />)}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-dashed border-danger/30 bg-danger/5 py-12 px-4 text-center text-danger-fg text-sm">
          Não foi possível carregar o calendário. Tente novamente em instantes.
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-tint/10 px-6 py-14 text-center">
          <Loader2 size={26} className="mb-3 animate-spin text-fg-subtle" />
          <p className="font-display text-base font-semibold text-fg">Coletando o calendário econômico…</p>
          <p className="mt-1 text-sm text-fg-muted">Na primeira carga isso leva alguns instantes.</p>
        </div>
      ) : grouped.length === 0 ? (
        <EmptyState icon={CalendarX} title="Nenhum evento com esses filtros neste período." />
      ) : (
        <div className="space-y-5">
          {grouped.map(([day, list]) => (
            <div key={day} className="space-y-2">
              <p className="eyebrow-muted px-1">{fmtDayHeader(day)}</p>
              {list.map((e) => (
                <EventRow
                  key={e.occurrence_id}
                  event={e}
                  profile={profiles.get(e.event_key)}
                  now={now}
                  open={openId === e.occurrence_id}
                  onToggle={() => setOpenId((id) => (id === e.occurrence_id ? null : e.occurrence_id))}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
