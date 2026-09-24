import React, { useCallback, useEffect, useState } from 'react';
import { Flame, RefreshCw, TrendingUp, Info, History } from 'lucide-react';
import {
  fetchTrending, fetchMarkets, topMovers, changeFor,
  fetchTrendingPersistence, fetchSnapshotCoverage,
  TrendingCoin, MarketCoin, TrendingPersistence, SnapshotCoverage,
  CryptoPeriod, PERIOD_LABEL,
} from '../../lib/cryptoData';
import { fmtUsd, fmtCompact, fmtPct, pctColor } from './format';
import { WatchStar } from './WatchStar';
import { Skeleton, EmptyState } from '../ui';

const PERIODS: CryptoPeriod[] = ['24h', '7d', '30d'];
const PERIOD_DAYS: Record<CryptoPeriod, number> = { '24h': 1, '7d': 7, '30d': 30 };

// Mínimo de dias capturados para a recorrência dizer alguma coisa. Com um único
// dia o ranking seria idêntico ao de 24h, fingindo uma informação que não temos.
const MIN_DAYS_FOR_PERSISTENCE = 2;

// Trending em três janelas:
//   24h  → moedas mais buscadas agora (CoinGecko /search/trending)
//   7/30 → recorrência no radar, a partir do nosso histórico de snapshots
// Enquanto o histórico não tem dias suficientes, cai para valorização de preço
// no período — e a tela diz qual dos dois está vendo, sempre.
export const TrendingView: React.FC = () => {
  const [period, setPeriod] = useState<CryptoPeriod>('24h');
  const [searched, setSearched] = useState<TrendingCoin[]>([]);
  const [markets, setMarkets] = useState<MarketCoin[]>([]);
  const [persistence, setPersistence] = useState<TrendingPersistence[]>([]);
  const [coverage, setCoverage] = useState<SnapshotCoverage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: CryptoPeriod, force = false) => {
    setLoading(true);
    setError(null);
    try {
      if (p === '24h') {
        setSearched(await fetchTrending());
      } else {
        const cov = await fetchSnapshotCoverage();
        setCoverage(cov);
        if (cov.days_available >= MIN_DAYS_FOR_PERSISTENCE) {
          setPersistence(await fetchTrendingPersistence(PERIOD_DAYS[p]));
        } else {
          setMarkets(await fetchMarkets(force));
        }
      }
    } catch (e) {
      setError(e instanceof Error && e.message === 'rate_limited'
        ? 'Limite de consultas atingido. Aguarde um instante.'
        : 'Não foi possível carregar o trending agora.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(period); }, [period, load]);

  const hasHistory = (coverage?.days_available ?? 0) >= MIN_DAYS_FOR_PERSISTENCE;
  const usingHistory = period !== '24h' && hasHistory;
  const movers = period === '24h' || usingHistory ? [] : topMovers(markets, period, false);

  const isEmpty = period === '24h'
    ? searched.length === 0
    : usingHistory ? persistence.length === 0 : movers.length === 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-fg-muted flex items-center gap-2">
          {period === '24h' ? (
            <><Flame size={16} className="text-accent-fg" /> As moedas mais buscadas nas últimas 24h.</>
          ) : usingHistory ? (
            <><History size={16} className="text-accent-fg" /> Quem mais apareceu no radar em {PERIOD_LABEL[period]}.</>
          ) : (
            <><TrendingUp size={16} className="text-accent-fg" /> Maiores altas em {PERIOD_LABEL[period]}.</>
          )}
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
            onClick={() => load(period, true)}
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
              Com base em {coverage?.days_available} {coverage?.days_available === 1 ? 'dia' : 'dias'} de histórico próprio.
              Aparecer no radar vários dias seguidos diz mais que um pico isolado.
            </>
          ) : (
            <>
              O ranking de mais buscadas existe só em 24h, e ainda estamos acumulando histórico
              ({coverage?.days_available ?? 0} {coverage?.days_available === 1 ? 'dia' : 'dias'} capturados).
              Enquanto isso, aqui está a valorização de preço em {PERIOD_LABEL[period]} entre as 250 maiores.
            </>
          )}
        </p>
      )}

      {loading ? (
        <div className="grid gap-2 sm:grid-cols-2" aria-busy="true">{[0, 1, 2, 3, 4, 5].map((k) => <Skeleton key={k} className="h-[62px] rounded-xl" />)}</div>
      ) : error ? (
        <p className="text-sm text-danger-fg py-8 text-center">{error}</p>
      ) : isEmpty ? (
        <EmptyState className="py-10" title="Nenhuma moeda para exibir neste período." />
      ) : period === '24h' ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {searched.map((c, i) => (
            <div key={c.id} className="flex items-center gap-2 glass-card rounded-xl p-3">
              <span className="font-mono text-xs font-medium text-fg-subtle tabular-nums w-5 shrink-0 text-center">{i + 1}</span>
              {c.thumb && <img src={c.thumb} alt={c.name} className="w-8 h-8 rounded-full" />}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-fg text-sm truncate">{c.name} <span className="font-mono text-xs font-normal text-fg-muted">{c.symbol}</span></p>
                {c.rank && <p className="text-[11px] text-fg-muted tabular-nums truncate">Rank #{c.rank}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="font-mono text-sm font-medium text-fg tabular-nums whitespace-nowrap">{fmtUsd(c.price)}</p>
                <p className={`font-mono text-xs font-medium tabular-nums whitespace-nowrap ${pctColor(c.change24h)}`}>{fmtPct(c.change24h)}</p>
              </div>
              <WatchStar coin={{ id: c.id, symbol: c.symbol, name: c.name, image: c.thumb }} />
            </div>
          ))}
        </div>
      ) : usingHistory ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {persistence.map((c, i) => (
            <div key={c.coin_id} className="flex items-center gap-2 glass-card rounded-xl p-3">
              <span className="font-mono text-xs font-medium text-fg-subtle tabular-nums w-5 shrink-0 text-center">{i + 1}</span>
              {c.thumb && <img src={c.thumb} alt={c.name} className="w-8 h-8 rounded-full" />}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-fg text-sm truncate">{c.name} <span className="font-mono text-xs font-normal text-fg-muted">{c.symbol}</span></p>
                <p className="text-[11px] text-fg-muted tabular-nums truncate">
                  {c.market_cap_rank ? `#${c.market_cap_rank} • ` : ''}posição média {c.avg_position}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-mono text-sm font-semibold text-accent-fg tabular-nums leading-tight">{c.days_seen}</p>
                <p className="text-[11px] text-fg-muted tabular-nums truncate">{c.days_seen === 1 ? 'dia' : 'dias'} no radar</p>
              </div>
              <WatchStar coin={{ id: c.coin_id, symbol: c.symbol, name: c.name, image: c.thumb }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {movers.map((c, i) => (
            <div key={c.id} className="flex items-center gap-2 glass-card rounded-xl p-3">
              <span className="font-mono text-xs font-medium text-fg-subtle tabular-nums w-5 shrink-0 text-center">{i + 1}</span>
              {c.image && <img src={c.image} alt={c.name} className="w-8 h-8 rounded-full" />}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-fg text-sm truncate">{c.name} <span className="font-mono text-xs font-normal text-fg-muted">{c.symbol}</span></p>
                <p className="text-[11px] text-fg-muted tabular-nums truncate">#{c.rank ?? '—'} • Cap {fmtCompact(c.marketCap)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-mono text-sm font-medium text-fg tabular-nums whitespace-nowrap">{fmtUsd(c.price)}</p>
                <p className={`font-mono text-xs font-semibold tabular-nums whitespace-nowrap ${pctColor(changeFor(c, period))}`}>{fmtPct(changeFor(c, period))}</p>
              </div>
              <WatchStar coin={{ id: c.id, symbol: c.symbol, name: c.name, image: c.image }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
