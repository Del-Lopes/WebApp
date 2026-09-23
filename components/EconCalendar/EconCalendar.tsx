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
    <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white shadow-lg overflow-hidden">
      <button onClick={() => setOpen((v) => !v)} className="w-full text-left p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
              <Clock size={13} /> Próximo evento de alto impacto
            </p>
            <p className="mt-1.5 text-lg font-bold leading-snug">{displayTitle(event, profile)}</p>
            <p className="mt-1 text-xs text-slate-400 flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white bg-white/10 px-1.5 py-0.5 rounded">{event.currency}</span>
              {CURRENCY_LABEL[event.currency] && <span>{CURRENCY_LABEL[event.currency]}</span>}
              <Stars n={event.importance} />
              <span>
                {new Date(event.occurs_at).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })} às {fmtTime(event.occurs_at)}
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums text-amber-300">{fmtCountdown(event.occurs_at, now)}</p>
            {(event.previous != null || event.forecast != null) && (
              <p className="text-xs text-slate-400 mt-1">
                Anterior <span className="text-slate-200 font-semibold">{fmtValue(event.previous, event.unit, event.precision)}</span>
                {' · '}Projeção <span className="text-slate-200 font-semibold">{fmtValue(event.forecast, event.unit, event.precision)}</span>
              </p>
            )}
          </div>
        </div>

        {up && down && (
          <div className="mt-4 grid sm:grid-cols-2 gap-2">
            {[up, down].map((s, i) => (
              <div key={i} className="rounded-xl bg-white/5 ring-1 ring-white/10 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">{s.rotulo}</p>
                <p className="text-sm font-semibold flex items-center gap-1 mt-0.5">
                  <DirIcon dir={s.moeda} size={15} />
                  {event.currency} tende a {s.moeda === 'alta' ? 'alta' : s.moeda === 'baixa' ? 'baixa' : 'ficar estável'}
                  {s.moeda !== 'neutra' && <span className="font-normal text-slate-400">· {s.intensidade}</span>}
                </p>
              </div>
            ))}
          </div>
        )}

        <p className="mt-3 text-xs text-indigo-300 flex items-center gap-1">
          {open ? 'Ocultar interpretação' : 'Ver interpretação completa'}
          <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </p>
      </button>

      {open && (
        <div className="bg-white text-slate-800 pt-3">
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
      <div className="flex items-center gap-3">
        <BackButton onClick={onBack} />
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
            <CalendarClock size={18} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Calendário Econômico</h1>
            <p className="text-xs text-slate-400">Notícias de alto impacto e como o mercado costuma reagir</p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl bg-amber-50 ring-1 ring-amber-100 p-3 flex items-start gap-2">
        <AlertTriangle size={15} className="text-amber-500 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800 leading-relaxed">
          Eventos de 2 e 3 estrelas (dados via TradingView), horários no seu fuso. As interpretações são geradas por IA e descrevem a
          reação <strong>típica</strong> do mercado — não são recomendação de operação. Na divulgação o spread abre e o preço pode
          oscilar forte para os dois lados.
        </p>
      </div>

      {stale && (
        <div className="rounded-xl bg-rose-50 ring-1 ring-rose-100 p-3 text-xs text-rose-700 flex items-center gap-2">
          <RefreshCw size={14} /> A coleta do calendário está com falha
          {sync?.last_ok_at ? ` desde ${new Date(sync.last_ok_at).toLocaleString('pt-BR')}` : ''} — os dados podem estar desatualizados.
        </div>
      )}

      {nextHigh && <NextEventCard event={nextHigh} profile={profiles.get(nextHigh.event_key)} now={now} />}

      {/* Filtros */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 p-1 rounded-2xl bg-slate-100 overflow-x-auto max-w-full">
            {RANGES.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setRange(key)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  range === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 p-1 rounded-2xl bg-slate-100">
            {[false, true].map((high) => (
              <button
                key={String(high)}
                onClick={() => setPrefs((p) => ({ ...p, onlyHigh: high }))}
                className={`flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                  prefs.onlyHigh === high ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Stars n={high ? 3 : 2} /> {high ? 'Só 3' : '2 e 3'}
              </button>
            ))}
          </div>
          {sync?.last_ok_at && (
            <span className="text-[11px] text-slate-400 ml-auto">Atualizado {fmtAgo(sync.last_ok_at, now)}</span>
          )}
        </div>

        {currencies.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setPrefs((p) => ({ ...p, currencies: [] }))}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold ring-1 transition-colors ${
                prefs.currencies.length === 0 ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-500 ring-slate-200 hover:text-slate-800'
              }`}
            >
              Todas
            </button>
            {currencies.map((c) => (
              <button
                key={c}
                onClick={() => toggleCurrency(c)}
                title={CURRENCY_LABEL[c]}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold ring-1 transition-colors ${
                  prefs.currencies.includes(c) ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white text-slate-500 ring-slate-200 hover:text-slate-800'
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
        <div className="flex justify-center py-16 text-slate-300"><Loader2 className="animate-spin" size={32} /></div>
      ) : error ? (
        <div className="rounded-2xl border border-dashed border-rose-200 py-12 text-center text-rose-500 text-sm">
          Não foi possível carregar o calendário. Tente novamente em instantes.
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center text-slate-400">
          <Loader2 size={26} className="mx-auto mb-2 animate-spin opacity-50" />
          <p className="text-sm">Coletando o calendário econômico…</p>
          <p className="text-xs text-slate-300 mt-1">Na primeira carga isso leva alguns instantes.</p>
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center text-slate-400">
          <CalendarX size={28} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhum evento com esses filtros neste período.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([day, list]) => (
            <div key={day} className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 px-1">{fmtDayHeader(day)}</p>
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
