import React from 'react';
import { Star, ChevronDown, Mic, FileText } from 'lucide-react';
import { EconEvent, EconProfile, evaluateOutcome, fmtValue, fmtTime, fmtCountdown } from '../../lib/econCalendar';
import { EventDetail, DirIcon } from './EventDetail';

interface Props {
  event: EconEvent;
  profile: EconProfile | undefined;
  now: number;
  open: boolean;
  onToggle: () => void;
}

export const Stars: React.FC<{ n: number }> = ({ n }) => (
  <span className="inline-flex" title={`${n} estrelas`}>
    {[1, 2, 3].map((i) => (
      <Star key={i} size={12} className={i <= n ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />
    ))}
  </span>
);

// Cor do "Atual" segue a classificação do Investing para a moeda:
// positivo = bom para a moeda (verde), negativo = ruim (vermelho).
function actualColor(e: EconEvent): string {
  if (e.actual_to_forecast === 'positive') return 'text-emerald-600';
  if (e.actual_to_forecast === 'negative') return 'text-rose-600';
  return 'text-slate-800';
}

const Value: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="text-right min-w-[64px]">
    <p className="text-[10px] uppercase tracking-wide text-slate-400 md:hidden">{label}</p>
    <p className="text-sm tabular-nums">{children}</p>
  </div>
);

export const EventRow: React.FC<Props> = ({ event, profile, now, open, onToggle }) => {
  const t = new Date(event.occurs_at).getTime();
  const released = event.actual != null;
  const upcoming = t > now;
  const imminent = upcoming && t - now < 30 * 60_000;
  const outcome = evaluateOutcome(event);
  const scenario = outcome && profile?.interpretation ? profile.interpretation.cenarios[outcome.scenario] : null;
  const eventType = profile?.event_type;

  return (
    <div className={`rounded-2xl bg-white ring-1 shadow-sm overflow-hidden ${imminent ? 'ring-amber-300' : 'ring-slate-100'}`}>
      <button onClick={onToggle} className="w-full text-left px-4 py-3 hover:bg-slate-50/60 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
          {/* Hora + moeda + importância */}
          <div className="flex items-center gap-3 md:w-44 shrink-0">
            <span className={`text-sm font-semibold tabular-nums w-11 ${upcoming ? 'text-slate-800' : 'text-slate-400'}`}>
              {fmtTime(event.occurs_at)}
            </span>
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-slate-900 text-white w-10 text-center">
              {event.currency}
            </span>
            <Stars n={event.importance} />
          </div>

          {/* Título */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate flex items-center gap-1.5">
              {eventType === 'speech' && <Mic size={13} className="text-slate-400 shrink-0" />}
              {eventType === 'report' && <FileText size={13} className="text-slate-400 shrink-0" />}
              <span className="truncate">{event.title}</span>
              {event.reference_period && <span className="text-xs font-normal text-slate-400 shrink-0">({event.reference_period})</span>}
            </p>
            {scenario ? (
              <p className="text-xs mt-0.5 flex items-center gap-1 text-slate-500">
                <DirIcon dir={scenario.moeda} size={13} />
                {scenario.rotulo} · {event.currency} tende a {scenario.moeda === 'alta' ? 'alta' : scenario.moeda === 'baixa' ? 'baixa' : 'ficar estável'}
              </p>
            ) : upcoming ? (
              <p className={`text-xs mt-0.5 ${imminent ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}>
                {fmtCountdown(event.occurs_at, now)}
              </p>
            ) : !released && eventType !== 'speech' && eventType !== 'report' && (event.forecast != null || event.previous != null) ? (
              <p className="text-xs mt-0.5 text-slate-400">Aguardando divulgação do dado…</p>
            ) : null}
          </div>

          {/* Números */}
          <div className="flex items-center gap-3 md:gap-5 justify-between md:justify-end">
            <Value label="Atual"><span className={`font-bold ${actualColor(event)}`}>{fmtValue(event.actual, event.unit, event.precision)}</span></Value>
            <Value label="Projeção"><span className="text-slate-600">{fmtValue(event.forecast, event.unit, event.precision)}</span></Value>
            <Value label="Anterior"><span className="text-slate-400">{fmtValue(event.previous, event.unit, event.precision)}</span></Value>
            <ChevronDown size={18} className={`text-slate-300 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50/40">
          <EventDetail event={event} profile={profile} />
        </div>
      )}
    </div>
  );
};
