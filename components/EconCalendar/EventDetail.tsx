import React, { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, AlertTriangle, Loader2, ExternalLink, Sparkles, History, Target } from 'lucide-react';
import {
  EconEvent, EconProfile, Scenario, ScenarioKey, Dir,
  evaluateOutcome, fetchHistory, fmtValue, fmtDiff,
} from '../../lib/econCalendar';

interface Props {
  event: EconEvent;
  profile: EconProfile | undefined;
}

const SCENARIO_ORDER: ScenarioKey[] = ['acima', 'em_linha', 'abaixo'];

export const DirIcon: React.FC<{ dir: Dir; size?: number }> = ({ dir, size = 14 }) =>
  dir === 'alta' ? <ArrowUpRight size={size} className="text-emerald-600" />
  : dir === 'baixa' ? <ArrowDownRight size={size} className="text-rose-600" />
  : <Minus size={size} className="text-slate-400" />;

const dirText = (d: Dir) => (d === 'alta' ? 'alta' : d === 'baixa' ? 'baixa' : 'estável');
const dirColor = (d: Dir) => (d === 'alta' ? 'text-emerald-700' : d === 'baixa' ? 'text-rose-700' : 'text-slate-600');

const ScenarioCard: React.FC<{ s: Scenario; currency: string; state: 'hit' | 'miss' | 'idle' }> = ({ s, currency, state }) => (
  <div
    className={`rounded-xl p-3.5 ring-1 transition-opacity ${
      state === 'hit' ? 'bg-white ring-2 ring-indigo-400 shadow-md'
      : state === 'miss' ? 'bg-slate-50 ring-slate-100 opacity-60'
      : 'bg-white ring-slate-100'
    }`}
  >
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{s.rotulo}</p>
      {state === 'hit' && (
        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-600 text-white">Aconteceu</span>
      )}
    </div>
    <p className={`mt-1.5 flex items-center gap-1 text-sm font-semibold ${dirColor(s.moeda)}`}>
      <DirIcon dir={s.moeda} size={16} />
      {currency} tende a {dirText(s.moeda)}
      {s.moeda !== 'neutra' && <span className="font-normal text-slate-500">· {s.intensidade}</span>}
    </p>
    <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">{s.leitura}</p>
    {s.ativos.length > 0 && (
      <div className="mt-2 flex flex-wrap gap-1">
        {s.ativos.map((a, i) => (
          <span key={i} className="inline-flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded-md bg-slate-50 ring-1 ring-slate-100 text-slate-700">
            <DirIcon dir={a.direcao} size={12} /> {a.ativo}
          </span>
        ))}
      </div>
    )}
  </div>
);

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
        <div className="rounded-xl bg-indigo-50 ring-1 ring-indigo-100 p-3.5 flex items-start gap-2.5">
          <Target size={18} className="text-indigo-600 mt-0.5 shrink-0" />
          <div className="text-sm text-slate-700 leading-relaxed">
            <p>
              Saiu <strong>{fmtValue(event.actual, event.unit, event.precision)}</strong>{' '}
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
              <p className="text-xs text-slate-500 mt-0.5">Sem projeção de mercado para este dado — comparado com o anterior.</p>
            )}
          </div>
        </div>
      )}

      {/* Antes da divulgação: o que está em jogo */}
      {!outcome && hasNumbers && (
        <p className="text-sm text-slate-600">
          Anterior <strong>{fmtValue(event.previous, event.unit, event.precision)}</strong>
          {event.forecast != null && <> · projeção <strong>{fmtValue(event.forecast, event.unit, event.precision)}</strong></>}.
          {' '}A reação costuma vir da <strong>diferença entre o dado e a projeção</strong>, não do número em si.
        </p>
      )}

      {interp ? (
        <>
          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 flex items-center gap-1.5">
              <Sparkles size={13} className="text-indigo-500" /> Contexto
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">{interp.resumo}</p>
            <p className="text-sm text-slate-600 leading-relaxed">{interp.contexto}</p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">
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
            <div className="rounded-xl bg-amber-50 ring-1 ring-amber-100 p-3 flex items-start gap-2">
              <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-900 leading-relaxed">{interp.atencao}</p>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 p-3.5 text-sm text-slate-500 flex items-start gap-2">
          <Loader2 size={15} className="animate-spin mt-0.5 shrink-0 text-slate-300" />
          <span>A interpretação deste indicador está sendo preparada e aparece aqui em alguns minutos.</span>
        </div>
      )}

      {/* Histórico das últimas divulgações */}
      {history && history.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2 flex items-center gap-1.5">
            <History size={13} /> Últimas divulgações
          </p>
          <div className="overflow-x-auto rounded-xl ring-1 ring-slate-100">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-400">
                <tr>
                  <th className="text-left font-semibold px-3 py-1.5">Data</th>
                  <th className="text-right font-semibold px-3 py-1.5">Atual</th>
                  <th className="text-right font-semibold px-3 py-1.5">Projeção</th>
                  <th className="text-right font-semibold px-3 py-1.5">Surpresa</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => {
                  const o = evaluateOutcome(h);
                  return (
                    <tr key={h.occurrence_id} className="border-t border-slate-100">
                      <td className="px-3 py-1.5 text-slate-500">
                        {new Date(h.occurs_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}
                        {h.reference_period && <span className="text-slate-300"> · {h.reference_period}</span>}
                      </td>
                      <td className="px-3 py-1.5 text-right font-semibold text-slate-700">{fmtValue(h.actual, h.unit, h.precision)}</td>
                      <td className="px-3 py-1.5 text-right text-slate-500">{fmtValue(h.forecast, h.unit, h.precision)}</td>
                      <td className={`px-3 py-1.5 text-right font-medium ${
                        !o || o.baseline !== 'forecast' || o.scenario === 'em_linha' ? 'text-slate-400'
                        : o.scenario === 'acima' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {o && o.baseline === 'forecast' ? (o.scenario === 'em_linha' ? 'em linha' : fmtDiff(o.diff, h.unit, h.precision)) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fonte */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
        {profile?.description && (
          <details className="w-full">
            <summary className="cursor-pointer hover:text-slate-600">Descrição original do indicador (inglês)</summary>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed whitespace-pre-line">{profile.description}</p>
          </details>
        )}
        {profile?.source && (
          profile.source_url ? (
            <a
              href={profile.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-indigo-600"
            >
              Fonte oficial: {profile.source} <ExternalLink size={11} />
            </a>
          ) : <span>Fonte oficial: {profile.source}</span>
        )}
      </div>
    </div>
  );
};
