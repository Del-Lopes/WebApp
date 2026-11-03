import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Bitcoin, CalendarClock, Clock, MinusCircle, Radio } from 'lucide-react';
import {
  EconEvent, EconProfile, displayTitle, fetchEvents, fetchProfiles, fmtTime, fmtValue,
} from '../../lib/econCalendar';
import {
  FearGreed, GlobalMarket, fearGreedLabel, fetchFearGreed, fetchGlobalMarket,
} from '../../lib/cryptoData';
import { fetchSignals } from '../../lib/signals';
import { Signal, View } from '../../types';
import { Stars } from '../EconCalendar/EventRow';
import { cn } from '../../lib/cn';

// Atalhos "vivos" do Início: em vez de só apontar para a tela, mostram o que
// está acontecendo nela agora. Cada card carrega o próprio dado e, se falhar,
// cai para um texto estático — o atalho nunca some por causa de uma API fora do ar.

interface CardProps { onNavigate: (view: View) => void }

const CARD = 'glass-card glass-card-hover p-6 rounded-2xl cursor-pointer group';
const ICON = 'p-3 bg-tint/5 border border-tint/10 text-fg-muted rounded-xl group-hover:bg-accent/10 group-hover:border-accent/20 group-hover:text-accent-fg transition-colors';
const TITLE = 'font-display text-lg font-semibold text-fg';

const Shell: React.FC<{
  onClick: () => void; icon: React.ElementType; eyebrow: string; title: string; label: string;
  className?: string; children: React.ReactNode;
}> = ({ onClick, icon: Icon, eyebrow, title, label, className, children }) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onClick}
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
    aria-label={label}
    className={cn(CARD, 'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60', className)}>
    <div className="mb-4 flex items-center gap-4">
      <div className={ICON}><Icon size={24} /></div>
      <div className="min-w-0">
        <p className="eyebrow-muted truncate">{eyebrow}</p>
        <h3 className={TITLE}>{title}</h3>
      </div>
    </div>
    {children}
  </div>
);

const Pulse: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('animate-pulse rounded-md bg-tint/6', className)} aria-hidden />
);

// ── Calendário Econômico: contagem para a próxima notícia ───────────────
function countdown(ms: number): string {
  if (ms <= 0) return 'agora';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export const EconCalendarCard: React.FC<CardProps> = ({ onNavigate }) => {
  const [events, setEvents] = useState<EconEvent[] | null>(null);
  const [profiles, setProfiles] = useState<Map<string, EconProfile>>(new Map());
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const from = new Date();
        const evs = await fetchEvents(from, new Date(from.getTime() + 7 * 86400_000));
        const upcoming = evs.filter((e) => new Date(e.occurs_at).getTime() > from.getTime()).slice(0, 12);
        const profs = await fetchProfiles([...new Set(upcoming.map((e) => e.event_key))]).catch(() => new Map<string, EconProfile>());
        if (!alive) return;
        setEvents(upcoming); setProfiles(profs);
      } catch (e) {
        console.error('[LiveCards] calendário', e);
        if (alive) { setFailed(true); setEvents([]); }
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const next = useMemo(
    () => (events ?? []).find((e) => new Date(e.occurs_at).getTime() > now) ?? null,
    [events, now],
  );
  const ms = next ? new Date(next.occurs_at).getTime() - now : 0;
  const imminent = !!next && ms < 30 * 60_000;

  return (
    <Shell onClick={() => onNavigate('econ_calendar')} icon={CalendarClock} eyebrow="Calendário Econômico"
      title={next ? `Próxima notícia ${countdown(ms)}` : 'Notícias do mercado'}
      label="Abrir o Calendário Econômico"
      className={imminent ? 'border-warning/40!' : undefined}>
      {events === null ? (
        <div className="space-y-2"><Pulse className="h-4 w-3/4" /><Pulse className="h-3 w-1/2" /></div>
      ) : next ? (
        <div className="space-y-1.5">
          <p className="line-clamp-2 text-sm font-medium text-fg">{displayTitle(next, profiles.get(next.event_key))}</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
            <span className="rounded-md border border-tint/10 bg-tint/6 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-fg">{next.currency}</span>
            <Stars n={next.importance} />
            <span className="inline-flex items-center gap-1 tabular-nums"><Clock size={11} /> {fmtTime(next.occurs_at)}</span>
          </div>
          {(next.forecast != null || next.previous != null) && (
            <p className="text-xs text-fg-subtle tabular-nums">
              {next.previous != null && <>Anterior <span className="text-fg-muted">{fmtValue(next.previous, next.unit, next.precision)}</span></>}
              {next.forecast != null && <> · Projeção <span className="text-fg-muted">{fmtValue(next.forecast, next.unit, next.precision)}</span></>}
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-fg-muted">{failed ? 'Veja os indicadores do dia e a leitura por IA.' : 'Sem notícias relevantes nos próximos dias.'}</p>
      )}
    </Shell>
  );
};

// ── Crypto: termômetro do mercado ───────────────────────────────────────
export const CryptoCard: React.FC<CardProps> = ({ onNavigate }) => {
  const [fg, setFg] = useState<FearGreed | null>(null);
  const [global, setGlobal] = useState<GlobalMarket | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.allSettled([fetchFearGreed(), fetchGlobalMarket()]).then(([a, b]) => {
      if (!alive) return;
      if (a.status === 'fulfilled') setFg(a.value);
      if (b.status === 'fulfilled') setGlobal(b.value);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  const change = global?.marketCapChange24h ?? null;
  const fgTone = fg ? (fg.value >= 55 ? 'text-success-fg' : fg.value <= 45 ? 'text-danger-fg' : 'text-warning-fg') : '';

  return (
    <Shell onClick={() => onNavigate('crypto')} icon={Bitcoin} eyebrow="Crypto" title="Termômetro do mercado" label="Abrir a área Crypto">
      {loading ? (
        <div className="space-y-2"><Pulse className="h-4 w-2/3" /><Pulse className="h-3 w-1/2" /></div>
      ) : fg || global ? (
        <div className="space-y-1.5">
          {fg && (
            <p className="text-sm text-fg">
              Medo e Ganância{' '}
              <span className={cn('font-mono font-semibold tabular-nums', fgTone)}>{fg.value}</span>
              <span className="text-fg-muted"> · {fearGreedLabel(fg.classification)}</span>
            </p>
          )}
          {global && (
            <p className="flex flex-wrap items-center gap-x-2 text-xs text-fg-muted tabular-nums">
              <span className={cn('inline-flex items-center gap-0.5 font-semibold', (change ?? 0) >= 0 ? 'text-success-fg' : 'text-danger-fg')}>
                {(change ?? 0) >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {Math.abs(change ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% em 24h
              </span>
              <span>· Dominância BTC {global.btcDominance.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</span>
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-fg-muted">Altas, narrativas e desbloqueios de tokens.</p>
      )}
    </Shell>
  );
};

// ── Sinais: última análise ──────────────────────────────────────────────
const ago = (iso: string): string => {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
};

export const SignalsCard: React.FC<CardProps> = ({ onNavigate }) => {
  const [signals, setSignals] = useState<Signal[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetchSignals(undefined, 10).then((s) => { if (alive) setSignals(s); }).catch(() => { if (alive) setSignals([]); });
    return () => { alive = false; };
  }, []);

  const last = signals?.[0] ?? null;
  const open = (signals ?? []).filter((s) => s.status === 'open' && s.action !== 'NONE').length;
  const meta = last?.action === 'BUY'
    ? { label: 'COMPRA', cls: 'text-success-fg', Icon: ArrowUpRight }
    : last?.action === 'SELL'
      ? { label: 'VENDA', cls: 'text-danger-fg', Icon: ArrowDownRight }
      : { label: 'SEM ENTRADA', cls: 'text-fg-muted', Icon: MinusCircle };

  return (
    <Shell onClick={() => onNavigate('signals')} icon={Radio} eyebrow="Sinais" title="Análise por IA" label="Abrir os Sinais">
      {signals === null ? (
        <div className="space-y-2"><Pulse className="h-4 w-2/3" /><Pulse className="h-3 w-1/2" /></div>
      ) : last ? (
        <div className="space-y-1.5">
          <p className="flex flex-wrap items-center gap-x-2 text-sm">
            <span className={cn('inline-flex items-center gap-1 font-display font-semibold', meta.cls)}>
              <meta.Icon size={15} /> {meta.label}
            </span>
            <span className="font-mono font-medium text-fg">{last.symbol}</span>
            {last.timeframe && <span className="font-mono text-xs text-fg-subtle">{last.timeframe}</span>}
          </p>
          <p className="text-xs text-fg-muted">
            Última análise {ago(last.created_at)}
            {open > 0 && <> · <span className="font-semibold text-accent-fg">{open} {open === 1 ? 'ativa' : 'ativas'}</span></>}
          </p>
        </div>
      ) : (
        <p className="text-xs text-fg-muted">Peça a primeira análise de um ativo.</p>
      )}
    </Shell>
  );
};
