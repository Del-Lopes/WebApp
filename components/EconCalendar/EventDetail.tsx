import React, { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, AlertTriangle, Loader2, ExternalLink, Sparkles, History, Target, ChevronDown, Layers } from 'lucide-react';
import {
  EconEvent, EconProfile, Scenario, ScenarioKey, Dir, AssetReading, Outcome,
  evaluateOutcome, fetchHistory, fmtValue, fmtDiff, FOCUS_ASSET_LABEL,
} from '../../lib/econCalendar';
import { Table, THead, TBody, TR, TH, TD } from '../ui';

interface Props {
  event: EconEvent;
  profile: EconProfile | undefined;
}

const SCENARIO_ORDER: ScenarioKey[] = ['acima', 'em_linha', 'abaixo'];

export const DirIcon: React.FC<{ dir: Dir; size?: number }> = ({ dir, size = 14 }) =>
  dir === 'alta' ? <ArrowUpRight size={size} className="text-success-fg" />
  : dir === 'baixa' ? <ArrowDownRight size={size} className="text-danger-fg" />
  : <Minus size={size} className="text-fg-muted" />;

const dirText = (d: Dir) => (d === 'alta' ? 'alta' : d === 'baixa' ? 'baixa' : 'estável');
const dirColor = (d: Dir) => (d === 'alta' ? 'text-success-fg' : d === 'baixa' ? 'text-danger-fg' : 'text-fg-muted');

const ScenarioCard: React.FC<{ s: Scenario; currency: string; state: 'hit' | 'miss' | 'idle' }> = ({ s, currency, state }) => (
  <div
    className={`rounded-xl p-3.5 border transition-opacity ${
      state === 'hit' ? 'bg-surface border-accent/50 ring-1 ring-accent/30'
      : state === 'miss' ? 'bg-tint/2 border-tint/6 opacity-60'
      : 'bg-surface border-tint/8'
    }`}
  >
    <div className="flex items-center justify-between gap-2">
      <p className="eyebrow-muted">{s.rotulo}</p>
      {state === 'hit' && (
        <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-sm border bg-accent/10 text-accent-fg border-accent/30">Aconteceu</span>
      )}
    </div>
    <p className={`mt-1.5 flex items-center gap-1 text-sm font-semibold ${dirColor(s.moeda)}`}>
      <DirIcon dir={s.moeda} size={16} />
      {currency} tende a {dirText(s.moeda)}
      {s.moeda !== 'neutra' && <span className="font-normal text-fg-muted">· {s.intensidade}</span>}
    </p>
    <p className="mt-1.5 text-xs text-fg-muted leading-relaxed">{s.leitura}</p>
    {s.ativos.length > 0 && (
      <div className="mt-2 flex flex-wrap gap-1">
        {s.ativos.map((a, i) => (
          <span key={i} className="inline-flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded-md bg-tint/3 border border-tint/8 text-fg">
            <DirIcon dir={a.direcao} size={12} /> {a.ativo}
          </span>
        ))}
      </div>
    )}
  </div>
);

const RELEVANCE: Record<AssetReading['relevancia'], { label: string; cls: string }> = {
  alta: { label: 'Sensibilidade alta', cls: 'bg-accent/10 text-accent-fg border-accent/30' },
  media: { label: 'Sensibilidade média', cls: 'bg-tint/3 text-fg-muted border-tint/10' },
  baixa: { label: 'Sensibilidade baixa', cls: 'bg-tint/2 text-fg-subtle border-tint/8' },
};

const AssetCard: React.FC<{ a: AssetReading; labels: Record<ScenarioKey, string>; hit: ScenarioKey | null }> = ({ a, labels, hit }) => (
  <div className="rounded-xl border border-tint/8 bg-surface p-3.5">
    <div className="flex items-start justify-between gap-2">
      <p className="text-sm font-semibold text-fg">
        <span className="font-mono">{a.ativo}</span>
        <span className="ml-1.5 font-normal text-fg-muted">{FOCUS_ASSET_LABEL[a.ativo] ?? ''}</span>
      </p>
      <span className={`shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] font-medium ${RELEVANCE[a.relevancia].cls}`}>
        {RELEVANCE[a.relevancia].label}
      </span>
    </div>
    <div className="mt-2.5 grid grid-cols-3 gap-1.5">
      {SCENARIO_ORDER.map((k) => (
        <div
          key={k}
          className={`rounded-lg border px-2 py-1.5 transition-opacity ${
            hit === k ? 'border-accent/50 bg-accent/5 ring-1 ring-accent/30'
            : hit ? 'border-tint/6 bg-tint/2 opacity-55'
            : 'border-tint/8 bg-tint/2'
          }`}
        >
          <p className="truncate text-[10px] uppercase tracking-wider text-fg-subtle">{labels[k]}</p>
          <p className={`mt-0.5 flex items-center gap-0.5 text-xs font-semibold ${dirColor(a[k])}`}>
            <DirIcon dir={a[k]} size={13} /> {dirText(a[k])}
          </p>
        </div>
      ))}
    </div>
    <p className="mt-2.5 text-xs leading-relaxed text-fg-muted">{a.leitura}</p>
  </div>
);

const AssetInterpretation: React.FC<{ profile: EconProfile; tipo: 'dado' | 'qualitativo'; outcome: Outcome | null }> = ({ profile, tipo, outcome }) => {
  const [open, setOpen] = useState(false);
  const ativos = profile.asset_interpretation?.ativos ?? [];
  const labels: Record<ScenarioKey, string> = tipo === 'qualitativo'
    ? { acima: 'Hawkish', em_linha: 'Neutro', abaixo: 'Dovish' }
    : { acima: 'Acima', em_linha: 'Em linha', abaixo: 'Abaixo' };

  return (
    <div className="rounded-xl border border-tint/8 bg-tint/2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-left transition-colors hover:bg-tint/3 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-fg">
          <Layers size={15} className="text-accent-fg" aria-hidden /> Interpretação por ativo
        </span>
        <span className="flex items-center gap-2 text-xs font-medium text-accent-fg">
          <span className="hidden font-mono text-fg-subtle sm:inline">XAUUSD · NAS100 · US30 · WIN · WDO · BTC</span>
          {open ? 'Ocultar' : 'Ver'}
          <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
        </span>
      </button>

      {open && (
        <div className="border-t border-tint/6 p-3">
          {ativos.length > 0 ? (
            <>
              <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                {ativos.map((a) => <AssetCard key={a.ativo} a={a} labels={labels} hit={outcome?.scenario ?? null} />)}
              </div>
              <p className="mt-2.5 text-[11px] text-fg-subtle">
                Reações típicas para cada cenário do indicador, geradas por IA. Não são recomendação de compra ou venda.
              </p>
            </>
          ) : (
            <p className="flex items-start gap-2 text-sm text-fg-muted">
              <Loader2 size={15} className="mt-0.5 shrink-0 animate-spin text-fg-subtle" aria-hidden />
              A leitura por ativo deste indicador está sendo preparada e aparece aqui em alguns minutos.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export const EventDetail: React.FC<Props> = ({ event, profile }) => {
  const [history, setHistory] = useState<EconEvent[] | null>(null);
  const interp = profile?.interpretation ?? null;
  const outcome = evaluateOutcome(event);
  const hasNumbers = event.forecast != null || event.previous != null || event.actual != null;

  useEffect(() => {
    let alive = true;
    fetchHistory(event.event_key, event.occurs_at)
      .then((h) => { if (alive) setHistory(h); })
      .catch(() => { if (alive) setHistory([]); });
    return () => { alive = false; };
  }, [event.event_key, event.occurs_at]);

  const hitScenario = outcome && interp ? interp.cenarios[outcome.scenario] : null;

  return (
    <div className="space-y-4 px-4 pb-4 pt-1">
      {/* Resultado — só depois da divulgação */}
      {outcome && (
        <div className="rounded-xl bg-accent/5 border border-accent/20 p-3.5 flex items-start gap-2.5">
          <Target size={18} className="text-accent-fg mt-0.5 shrink-0" />
          <div className="text-sm text-fg leading-relaxed">
            <p>
              Saiu <strong className="font-mono tabular-nums">{fmtValue(event.actual, event.unit, event.precision)}</strong>{' '}
              {outcome.scenario === 'em_linha'
                ? <>— <strong>em linha</strong> com {outcome.baseline === 'forecast' ? 'a projeção' : 'o dado anterior'}.</>
                : <>— <strong>{outcome.scenario === 'acima' ? 'acima' : 'abaixo'}</strong> {outcome.baseline === 'forecast' ? 'da projeção' : 'do dado anterior'} ({fmtDiff(outcome.diff, event.unit, event.precision)}).</>}
            </p>
            {hitScenario && (
              <p className={`mt-0.5 font-semibold flex items-center gap-1 ${dirColor(hitScenario.moeda)}`}>
                <DirIcon dir={hitScenario.moeda} size={15} />
                Cenário: {event.currency} tende a {dirText(hitScenario.moeda)}
                {hitScenario.moeda !== 'neutra' && ` ${hitScenario.intensidade}`}
              </p>
            )}
            {outcome.baseline === 'previous' && (
              <p className="text-xs text-fg-muted mt-0.5">Sem projeção de mercado para este dado — comparado com o anterior.</p>
            )}
          </div>
        </div>
      )}

      {/* Antes da divulgação: o que está em jogo */}
      {!outcome && hasNumbers && (
        <p className="text-sm text-fg-muted">
          Anterior <strong className="font-mono tabular-nums text-fg">{fmtValue(event.previous, event.unit, event.precision)}</strong>
          {event.forecast != null && <> · projeção <strong className="font-mono tabular-nums text-fg">{fmtValue(event.forecast, event.unit, event.precision)}</strong></>}.
          {' '}A reação costuma vir da <strong>diferença entre o dado e a projeção</strong>, não do número em si.
        </p>
      )}

      {interp ? (
        <>
          <div className="space-y-1.5">
            <p className="eyebrow-muted flex items-center gap-1.5">
              <Sparkles size={13} className="text-accent-fg" /> Contexto
            </p>
            <p className="text-sm text-fg leading-relaxed">{interp.resumo}</p>
            <p className="text-sm text-fg-muted leading-relaxed">{interp.contexto}</p>
          </div>

          <div>
            <p className="eyebrow-muted mb-2">
              {interp.tipo === 'qualitativo' ? 'Como o mercado pode reagir' : 'Cenários'}
            </p>
            <div className="grid gap-2.5 md:grid-cols-3">
              {SCENARIO_ORDER.map((k) => (
                <ScenarioCard
                  key={k}
                  s={interp.cenarios[k]}
                  currency={event.currency}
                  state={outcome ? (outcome.scenario === k ? 'hit' : 'miss') : 'idle'}
                />
              ))}
            </div>
          </div>

          {interp.atencao && (
            <div className="rounded-xl bg-warning/10 border border-warning/20 p-3 flex items-start gap-2">
              <AlertTriangle size={14} className="text-warning-fg mt-0.5 shrink-0" />
              <p className="text-xs text-warning-fg leading-relaxed">{interp.atencao}</p>
            </div>
          )}

          {profile && <AssetInterpretation profile={profile} tipo={interp.tipo} outcome={outcome} />}
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-tint/10 p-3.5 text-sm text-fg-muted flex items-start gap-2">
          <Loader2 size={15} className="animate-spin mt-0.5 shrink-0 text-fg-subtle" />
          <span>A interpretação deste indicador está sendo preparada e aparece aqui em alguns minutos.</span>
        </div>
      )}

      {/* Histórico das últimas divulgações */}
      {history && history.length > 0 && (
        <div>
          <p className="eyebrow-muted mb-2 flex items-center gap-1.5">
            <History size={13} /> Últimas divulgações
          </p>
          <Table className="text-xs">
            <THead>
              <tr>
                <TH className="px-3 py-2 text-[10px]">Data</TH>
                <TH align="right" className="px-3 py-2 text-[10px]">Atual</TH>
                <TH align="right" className="px-3 py-2 text-[10px]">Projeção</TH>
                <TH align="right" className="px-3 py-2 text-[10px]">Surpresa</TH>
              </tr>
            </THead>
            <TBody>
              {history.map((h) => {
                const o = evaluateOutcome(h);
                return (
                  <TR key={h.occurrence_id}>
                    <TD className="px-3 py-1.5 tabular-nums">
                      {new Date(h.occurs_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}
                      {h.reference_period && <span className="text-fg-subtle"> · {h.reference_period}</span>}
                    </TD>
                    <TD numeric className="px-3 py-1.5 font-semibold">{fmtValue(h.actual, h.unit, h.precision)}</TD>
                    <TD numeric className="px-3 py-1.5 text-fg-muted">{fmtValue(h.forecast, h.unit, h.precision)}</TD>
                    <TD numeric className={`px-3 py-1.5 font-medium ${
                      !o || o.baseline !== 'forecast' || o.scenario === 'em_linha' ? 'text-fg-subtle'
                      : o.scenario === 'acima' ? 'text-success-fg' : 'text-danger-fg'
                    }`}>
                      {o && o.baseline === 'forecast' ? (o.scenario === 'em_linha' ? 'em linha' : fmtDiff(o.diff, h.unit, h.precision)) : '—'}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </div>
      )}

      {/* Fonte */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-fg-subtle">
        {profile?.description && (
          <details className="w-full">
            <summary className="cursor-pointer hover:text-fg-muted">Descrição original do indicador (inglês)</summary>
            <p className="mt-1.5 text-xs text-fg-muted leading-relaxed whitespace-pre-line">{profile.description}</p>
          </details>
        )}
        {profile?.source && (
          profile.source_url ? (
            <a
              href={profile.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-accent-fg"
            >
              Fonte oficial: {profile.source} <ExternalLink size={11} />
            </a>
          ) : <span>Fonte oficial: {profile.source}</span>
        )}
      </div>
    </div>
  );
};
