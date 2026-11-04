import React, { useMemo, useState } from 'react';
import { CheckCircle2, Clock, ChevronDown, Compass } from 'lucide-react';
import { EconEvent, EconProfile, fmtTime, fmtValue, fmtCountdown, FOCUS_ASSET_LABEL } from '../../lib/econCalendar';
import { AssetMacro, MacroItem, biasLabel, buildAssetMacros } from '../../lib/econMacro';
import { assetMacroCard, assetMacroCaption } from '../../lib/shareSpecs';
import { ShareButton, ShareCardModal } from '../Share/ShareCardModal';
import { Stars } from './EventRow';
import { DirIcon } from './EventDetail';
import { cn } from '../../lib/cn';

interface Props {
  /** Eventos do período já filtrados (período e estrelas). */
  events: EconEvent[];
  profiles: Map<string, EconProfile>;
  periodLabel: string;
  now: number;
}

const dirText = (d: string | null) => (d === 'alta' ? 'alta' : d === 'baixa' ? 'baixa' : 'estável');
const dirColor = (d: string | null) => (d === 'alta' ? 'text-success-fg' : d === 'baixa' ? 'text-danger-fg' : 'text-fg-muted');

const BIAS_CLS: Record<AssetMacro['bias'], string> = {
  alta: 'border-success/30 bg-success/10 text-success-fg',
  baixa: 'border-danger/30 bg-danger/10 text-danger-fg',
  misto: 'border-warning/30 bg-warning/10 text-warning-fg',
  neutro: 'border-tint/10 bg-tint/3 text-fg-muted',
};

/** Termômetro do saldo: o marcador anda de -1 (baixa) a +1 (alta). */
const Gauge: React.FC<{ score: number; active: boolean }> = ({ score, active }) => (
  <div className="relative h-2 rounded-full bg-tint/8" role="img" aria-label={`Saldo ${(score * 100).toFixed(0)}%`}>
    <div className="absolute inset-y-0 left-1/2 w-px bg-tint/25" aria-hidden />
    {active && (
      <div
        className={cn('absolute top-0 h-full rounded-full', score >= 0 ? 'bg-success' : 'bg-danger')}
        style={score >= 0 ? { left: '50%', width: `${Math.max(2, score * 50)}%` } : { right: '50%', width: `${Math.max(2, -score * 50)}%` }}
      />
    )}
  </div>
);

const ItemRow: React.FC<{ item: MacroItem; now: number }> = ({ item, now }) => {
  const { event, reading } = item;
  const released = event.actual != null;
  const late = !released && new Date(event.occurs_at).getTime() <= now;
  return (
    <li className="rounded-lg border border-tint/8 bg-tint/2 px-3 py-2">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0" aria-hidden>
          {released ? <CheckCircle2 size={14} className="text-accent-fg" /> : <Clock size={14} className="text-fg-subtle" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-fg">{item.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-fg-muted">
            <span className="rounded-sm border border-tint/10 bg-tint/6 px-1 font-mono font-semibold text-fg">{event.currency}</span>
            <Stars n={event.importance} />
            <span className="tabular-nums">{fmtTime(event.occurs_at)}</span>
            {!released && !late && <span>· {fmtCountdown(event.occurs_at, now)}</span>}
            {late && <span className="text-warning-fg">· aguardando divulgação</span>}
            <span className="text-fg-subtle">· sensibilidade {reading.relevancia}</span>
          </p>
        </div>
        {released && item.dir !== null && (
          <span className={cn('flex shrink-0 items-center gap-0.5 text-xs font-semibold', dirColor(item.dir))}>
            <DirIcon dir={item.dir} size={14} /> {dirText(item.dir)}
          </span>
        )}
      </div>

      {released ? (
        <p className="mt-1.5 pl-6 text-xs leading-relaxed text-fg-muted">
          Saiu <strong className="font-mono tabular-nums text-fg">{fmtValue(event.actual, event.unit, event.precision)}</strong>
          {item.outcome
            ? <> — {item.outcome.scenario === 'em_linha' ? 'em linha' : item.outcome.scenario === 'acima' ? 'acima' : 'abaixo'} {item.outcome.baseline === 'forecast' ? 'da projeção' : 'do anterior'}. </>
            : '. '}
          {reading.leitura}
        </p>
      ) : (
        <div className="mt-1.5 pl-6">
          <div className="grid grid-cols-3 gap-1">
            {(['acima', 'em_linha', 'abaixo'] as const).map((k) => (
              <div key={k} className="rounded-md border border-tint/8 bg-surface px-1.5 py-1">
                <p className="truncate text-[9px] uppercase tracking-wider text-fg-subtle">{k === 'acima' ? 'Acima' : k === 'abaixo' ? 'Abaixo' : 'Em linha'}</p>
                <p className={cn('flex items-center gap-0.5 text-[11px] font-semibold', dirColor(reading[k]))}>
                  <DirIcon dir={reading[k]} size={12} /> {dirText(reading[k])}
                </p>
              </div>
            ))}
          </div>
          {(event.previous != null || event.forecast != null) && (
            <p className="mt-1 text-[11px] text-fg-muted">
              Anterior <span className="font-mono tabular-nums text-fg">{fmtValue(event.previous, event.unit, event.precision)}</span>
              {' · '}Projeção <span className="font-mono tabular-nums text-fg">{fmtValue(event.forecast, event.unit, event.precision)}</span>
            </p>
          )}
        </div>
      )}
    </li>
  );
};

const MacroCard: React.FC<{ m: AssetMacro; periodLabel: string; now: number }> = ({ m, periodLabel, now }) => {
  const total = m.released.length + m.upcoming.length;
  const [open, setOpen] = useState(total > 0 && total <= 3);
  const [shareOpen, setShareOpen] = useState(false);
  const hasScore = m.released.some((i) => i.dir !== null);

  return (
    <section className="glass-card relative overflow-hidden p-4 sm:p-5" aria-label={`Macro ${m.label}`}>
      <div className="hairline absolute inset-x-0 top-0" aria-hidden />
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="eyebrow-muted">{m.ativo}</p>
          <h3 className="font-display text-lg font-semibold text-fg">{FOCUS_ASSET_LABEL[m.ativo]}</h3>
        </div>
        <span className={cn('shrink-0 rounded-md border px-2 py-1 text-xs font-semibold', hasScore ? BIAS_CLS[m.bias] : BIAS_CLS.neutro)}>
          {hasScore ? biasLabel(m.bias) + (m.bias === 'alta' || m.bias === 'baixa' ? ` · ${m.strength}` : '') : total > 0 ? 'Aguardando dados' : 'Sem notícias'}
        </span>
      </div>

      <div className="mt-3">
        <Gauge score={m.score} active={hasScore} />
        <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wider text-fg-subtle">
          <span>Baixa</span><span>Já saiu: {m.released.length} · A sair: {m.upcoming.length}</span><span>Alta</span>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-fg">{m.summary}</p>

      {total > 0 && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="mt-3 flex items-center gap-1 text-xs font-medium text-accent-fg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            {open ? 'Ocultar notícias' : `Ver as ${total} notícias`}
            <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
          </button>
          {open && (
            <div className="mt-2 space-y-3">
              {m.released.length > 0 && (
                <div>
                  <p className="eyebrow-muted mb-1.5">Já saíram</p>
                  <ul className="space-y-1.5">{m.released.map((i) => <ItemRow key={i.event.occurrence_id} item={i} now={now} />)}</ul>
                </div>
              )}
              {m.upcoming.length > 0 && (
                <div>
                  <p className="eyebrow-muted mb-1.5">Ainda vão sair</p>
                  <ul className="space-y-1.5">{m.upcoming.map((i) => <ItemRow key={i.event.occurrence_id} item={i} now={now} />)}</ul>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {m.hidden > 0 && (
        <p className="mt-2 text-[11px] text-fg-subtle">
          {m.hidden} {m.hidden === 1 ? 'notícia de baixa sensibilidade ficou' : 'notícias de baixa sensibilidade ficaram'} de fora.
        </p>
      )}

      {total > 0 && (
        <div className="mt-3 flex justify-end">
          <ShareButton label="Compartilhar macro" onClick={() => setShareOpen(true)} />
        </div>
      )}
      {shareOpen && (
        <ShareCardModal
          open
          onClose={() => setShareOpen(false)}
          title={`Compartilhar macro · ${m.label}`}
          fileName={`macro-${m.ativo.toLowerCase()}`}
          build={() => assetMacroCard(m, periodLabel)}
          caption={assetMacroCaption(m, periodLabel)}
        />
      )}
    </section>
  );
};

export const AssetMacroView: React.FC<Props> = ({ events, profiles, periodLabel, now }) => {
  const macros = useMemo(() => buildAssetMacros(events, profiles, now), [events, profiles, now]);
  const hasAny = macros.some((m) => m.released.length + m.upcoming.length > 0);

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-xl border border-accent/20 bg-accent/5 p-3">
        <Compass size={16} className="mt-0.5 shrink-0 text-accent-fg" aria-hidden />
        <p className="text-xs leading-relaxed text-fg-muted">
          <strong className="text-fg">Compilado macro por ativo · {periodLabel}.</strong>{' '}
          Reúne as notícias que já saíram e as que ainda vão sair para cada ativo, usando a leitura por ativo de cada indicador.
          É um resumo gerado por IA do que costuma acontecer, não uma recomendação de operação.
        </p>
      </div>

      {!hasAny && (
        <div className="rounded-2xl border border-dashed border-tint/10 px-4 py-10 text-center text-sm text-fg-muted">
          Nenhuma notícia com leitura por ativo neste período e com estes filtros. Tente outro período ou inclua as de 2 estrelas.
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {macros.map((m) => <MacroCard key={m.ativo} m={m} periodLabel={periodLabel} now={now} />)}
      </div>
    </div>
  );
};
