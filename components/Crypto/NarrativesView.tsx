import React, { useCallback, useEffect, useState } from 'react';
import { Layers, RefreshCw, TrendingUp, TrendingDown, Info } from 'lucide-react';
import {
  fetchNarratives, fetchCategoryTrend, fetchSnapshotCoverage,
  Narrative, CategoryTrend, SnapshotCoverage, CryptoPeriod, PERIOD_LABEL,
} from '../../lib/cryptoData';
import { fmtCompact, fmtPct, pctColor } from './format';
import { Skeleton, EmptyState } from '../ui';

const PERIODS: CryptoPeriod[] = ['24h', '7d', '30d'];
const PERIOD_DAYS: Record<CryptoPeriod, number> = { '24h': 1, '7d': 7, '30d': 30 };
const MIN_DAYS_FOR_HISTORY = 2;

// Performance por setor/narrativa (IA, DePIN, RWA...). O jeito data-driven de
// enxergar quais temas estão ganhando força — sem "recomendar" nada.
//
// Em 24h os dados vêm ao vivo do CoinGecko. Em 7/30 dias vêm do nosso histórico
// diário: a API não expõe variação de setor em janelas maiores, então somamos as
// leituras de 24h capturadas a cada dia.
export const NarrativesView: React.FC = () => {
  const [period, setPeriod] = useState<CryptoPeriod>('24h');
  const [live, setLive] = useState<Narrative[]>([]);
  const [history, setHistory] = useState<CategoryTrend[]>([]);
  const [coverage, setCoverage] = useState<SnapshotCoverage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: CryptoPeriod) => {
    setLoading(true);
    setError(null);
    try {
      if (p === '24h') {
        const all = await fetchNarratives();
        // Top 20 setores por variação (a lista completa é enorme).
        setLive(all.slice(0, 20));
      } else {
        const cov = await fetchSnapshotCoverage();
        setCoverage(cov);
        if (cov.days_available >= MIN_DAYS_FOR_HISTORY) {
          setHistory((await fetchCategoryTrend(PERIOD_DAYS[p])).slice(0, 20));
        } else {
          const all = await fetchNarratives();
          setLive(all.slice(0, 20));
        }
      }
    } catch (e) {
      setError(e instanceof Error && e.message === 'rate_limited'
        ? 'Limite de consultas atingido. Aguarde um instante.'
        : 'Não foi possível carregar as narrativas agora.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(period); }, [period, load]);

  const usingHistory = period !== '24h' && (coverage?.days_available ?? 0) >= MIN_DAYS_FOR_HISTORY;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-fg-muted flex items-center gap-2">
          <Layers size={16} className="text-accent-fg" />
          Setores com maior variação de capitalização ({usingHistory ? PERIOD_LABEL[period] : '24h'}).
        </p>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-1 rounded-xl border border-tint/6 bg-tint/3">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-lg border font-mono text-xs font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 ${
                  period === p ? 'bg-accent/10 text-accent-fg border-accent/30' : 'border-transparent text-fg-muted hover:text-fg'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={() => load(period)}
            disabled={loading}
            aria-label="Atualizar" className="p-2 rounded-lg hover:bg-tint/5 text-fg-muted hover:text-fg transition-colors disabled:opacity-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {period !== '24h' && (
        <p className="flex items-start gap-2 text-[11px] text-fg-muted leading-relaxed">
          <Info size={13} className="mt-0.5 shrink-0" />
          {usingHistory ? (
            <>
              Soma das variações diárias capturadas em {coverage?.days_available}{' '}
              {coverage?.days_available === 1 ? 'dia' : 'dias'} de histórico — aproximação de acumulado,
              não retorno composto exato.
            </>
          ) : (
            <>
              O CoinGecko só publica variação de setor em 24h e ainda estamos acumulando histórico
              ({coverage?.days_available ?? 0} {coverage?.days_available === 1 ? 'dia' : 'dias'}).
              Mostrando a janela de 24h por enquanto.
            </>
          )}
        </p>
      )}

      {loading ? (
        <div className="grid gap-2 sm:grid-cols-2" aria-busy="true">{[0, 1, 2, 3, 4, 5].map((k) => <Skeleton key={k} className="h-[62px] rounded-xl" />)}</div>
      ) : error ? (
        <p className="text-sm text-danger-fg py-8 text-center">{error}</p>
      ) : usingHistory ? (
        <div className="space-y-2">
          {history.map((n) => (
            <div key={n.category_id} className="flex items-center gap-3 glass-card rounded-xl p-3">
              <div className={`w-9 h-9 shrink-0 rounded-lg border border-tint/6 flex items-center justify-center ${n.sum_change >= 0 ? 'bg-success/10 text-success-fg' : 'bg-danger/10 text-danger-fg'}`}>
                {n.sum_change >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-fg text-sm truncate">{n.name}</p>
                <p className="text-[11px] text-fg-muted tabular-nums truncate">
                  Cap {fmtCompact(n.market_cap)} • {n.days_seen} {n.days_seen === 1 ? 'dia' : 'dias'} medidos
                </p>
              </div>
              <span className={`font-mono text-sm font-semibold tabular-nums whitespace-nowrap w-20 shrink-0 text-right ${pctColor(n.sum_change)}`}>{fmtPct(n.sum_change)}</span>
            </div>
          ))}
          {history.length === 0 && (
            <EmptyState className="py-10" title="Sem dados de setor para esta janela ainda." />
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {live.map((n) => (
            <div key={n.id} className="flex items-center gap-3 glass-card rounded-xl p-3">
              <div className={`w-9 h-9 shrink-0 rounded-lg border border-tint/6 flex items-center justify-center ${n.change24h >= 0 ? 'bg-success/10 text-success-fg' : 'bg-danger/10 text-danger-fg'}`}>
                {n.change24h >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-fg text-sm truncate">{n.name}</p>
                <p className="text-[11px] text-fg-muted tabular-nums truncate">Cap {fmtCompact(n.marketCap)} • Vol {fmtCompact(n.volume24h)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="hidden min-[400px]:flex -space-x-2">
                  {n.topCoins.slice(0, 3).map((src, i) => (
                    <img loading="lazy" decoding="async" key={i} src={src} alt="" className="w-6 h-6 rounded-full ring-2 ring-surface" />
                  ))}
                </div>
                <span className={`font-mono text-sm font-semibold tabular-nums whitespace-nowrap w-20 shrink-0 text-right ${pctColor(n.change24h)}`}>{fmtPct(n.change24h)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
