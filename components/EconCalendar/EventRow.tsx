import React from 'react';
import { Star, ChevronDown, Mic, FileText } from 'lucide-react';
import { EconEvent, EconProfile, evaluateOutcome, actualBias, displayTitle, fmtValue, fmtTime, fmtCountdown } from '../../lib/econCalendar';
import { EventDetail, DirIcon } from './EventDetail';

interface Props {
  event: EconEvent;
  profile: EconProfile | undefined;
  // Só vem para eventos ainda por acontecer (contagem regressiva). Nos já
  // passados fica undefined, e o memo evita re-render a cada tick do relógio.
  now?: number;
  open: boolean;
  onToggle: (occurrenceId: string) => void;
}

export const Stars: React.FC<{ n: number }> = ({ n }) => (
  <span className="inline-flex" title={`${n} estrelas`}>
    {[1, 2, 3].map((i) => (
      <Star key={i} size={12} className={i <= n ? 'fill-warning text-warning' : 'text-tint/20'} />
    ))}
  </span>
);

// Cor do "Atual" segue o cenário que se concretizou para a moeda:
// favorável (verde), desfavorável (vermelho). Sem interpretação, fica neutra.
function actualColor(e: EconEvent, p: EconProfile | undefined): string {
  const bias = actualBias(e, p);
  return bias > 0 ? 'text-success-fg' : bias < 0 ? 'text-danger-fg' : 'text-fg';
}

const Value: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="text-right min-w-[64px]">
    <p className="eyebrow-muted text-[9px] md:hidden">{label}</p>
    <p className="font-mono text-sm tabular-nums whitespace-nowrap">{children}</p>
  </div>
);

export const EventRow = React.memo<Props>(({ event, profile, now, open, onToggle }) => {
  const t = new Date(event.occurs_at).getTime();
  const released = event.actual != null;
  const upcoming = now !== undefined && t > now;
  const imminent = upcoming && t - now < 30 * 60_000;
  const outcome = evaluateOutcome(event);
  const scenario = outcome && profile?.interpretation ? profile.interpretation.cenarios[outcome.scenario] : null;
  const eventType = profile?.event_type;

  return (
    <div className={`rounded-2xl bg-surface border overflow-hidden transition-colors ${imminent ? 'border-warning/40' : 'border-tint/8 hover:border-tint/15'}`}>
      <button onClick={() => onToggle(event.occurrence_id)} aria-expanded={open} className="w-full text-left px-4 py-3 hover:bg-tint/2 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60">
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
          {/* Hora + moeda + importância */}
          <div className="flex items-center gap-3 md:w-44 shrink-0">
            <span className={`font-mono text-sm font-medium tabular-nums w-11 ${upcoming ? 'text-fg' : 'text-fg-subtle'}`}>
              {fmtTime(event.occurs_at)}
            </span>
            <span className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-tint/6 border border-tint/10 text-fg w-10 text-center">
              {event.currency}
            </span>
            <Stars n={event.importance} />
          </div>

          {/* Título */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-fg truncate flex items-center gap-1.5">
              {eventType === 'speech' && <Mic size={13} className="text-fg-muted shrink-0" />}
              {eventType === 'report' && <FileText size={13} className="text-fg-muted shrink-0" />}
              <span className="truncate">{displayTitle(event, profile)}</span>
              {event.reference_period && <span className="text-xs font-normal text-fg-subtle shrink-0">({event.reference_period})</span>}
            </p>
            {scenario ? (
              <p className="text-xs mt-0.5 flex items-center gap-1 text-fg-muted">
                <DirIcon dir={scenario.moeda} size={13} />
                {scenario.rotulo} · {event.currency} tende a {scenario.moeda === 'alta' ? 'alta' : scenario.moeda === 'baixa' ? 'baixa' : 'ficar estável'}
              </p>
            ) : upcoming ? (
              <p className={`text-xs mt-0.5 tabular-nums ${imminent ? 'text-warning-fg font-semibold' : 'text-fg-muted'}`}>
                {fmtCountdown(event.occurs_at, now!)}
              </p>
            ) : !released && eventType !== 'speech' && eventType !== 'report' && (event.forecast != null || event.previous != null) ? (
              <p className="text-xs mt-0.5 text-fg-muted">Aguardando divulgação do dado…</p>
            ) : null}
          </div>

          {/* Números */}
          <div className="flex items-center gap-3 md:gap-5 justify-between md:justify-end">
            <Value label="Atual"><span className={`font-semibold ${actualColor(event, profile)}`}>{fmtValue(event.actual, event.unit, event.precision)}</span></Value>
            <Value label="Projeção"><span className="text-fg-muted">{fmtValue(event.forecast, event.unit, event.precision)}</span></Value>
            <Value label="Anterior"><span className="text-fg-subtle">{fmtValue(event.previous, event.unit, event.precision)}</span></Value>
            <ChevronDown size={18} className={`text-fg-subtle transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-tint/6 bg-tint/2">
          <EventDetail event={event} profile={profile} />
        </div>
      )}
    </div>
  );
});
EventRow.displayName = 'EventRow';
