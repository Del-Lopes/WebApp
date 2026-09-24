import React, { useEffect, useState } from 'react';
import { Rocket, RefreshCw } from 'lucide-react';
import { fetchMarkets, topGainers, MarketCoin } from '../../lib/cryptoData';
import { fmtUsd, fmtCompact, fmtPct, pctColor } from './format';
import { WatchStar } from './WatchStar';
import { Skeleton, EmptyState } from '../ui';

// Maiores altas em 24h, com filtro opcional de "baixo valor de mercado" — o
// território onde as narrativas costumam nascer. Dados reais, sem promessas.
export const GainersView: React.FC = () => {
  const [coins, setCoins] = useState<MarketCoin[]>([]);
  const [lowCapOnly, setLowCapOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setCoins(await fetchMarkets());
    } catch (e) {
      setError(e instanceof Error && e.message === 'rate_limited'
        ? 'Limite de consultas atingido. Aguarde um instante.'
        : 'Não foi possível carregar o mercado agora.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const list = topGainers(coins, lowCapOnly);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-fg-muted flex items-center gap-2">
          <Rocket size={16} className="text-accent-fg" /> Maiores altas em 24h{lowCapOnly ? ' — fora do top 50 (baixo cap)' : ''}.
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLowCapOnly((v) => !v)}
            aria-pressed={lowCapOnly}
            className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 ${lowCapOnly ? 'bg-accent/10 text-accent-fg border-accent/30' : 'bg-tint/3 text-fg-muted border-tint/10 hover:text-fg'}`}
          >
            Só baixo cap
          </button>
          <button onClick={load} disabled={loading} aria-label="Atualizar" className="p-2 rounded-lg hover:bg-tint/5 text-fg-muted hover:text-fg transition-colors disabled:opacity-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-2 sm:grid-cols-2" aria-busy="true">{[0, 1, 2, 3, 4, 5].map((k) => <Skeleton key={k} className="h-[62px] rounded-xl" />)}</div>
      ) : error ? (
        <p className="text-sm text-danger-fg py-8 text-center">{error}</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {list.map((c) => (
            <div key={c.id} className="flex items-center gap-2 glass-card rounded-xl p-3">
              {c.image && <img src={c.image} alt={c.name} className="w-8 h-8 rounded-full" />}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-fg text-sm truncate">{c.name} <span className="font-mono text-xs font-normal text-fg-muted">{c.symbol}</span></p>
                <p className="text-[11px] text-fg-muted tabular-nums truncate">#{c.rank ?? '—'} • Cap {fmtCompact(c.marketCap)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-mono text-sm font-medium text-fg tabular-nums whitespace-nowrap">{fmtUsd(c.price)}</p>
                <p className={`font-mono text-xs font-semibold tabular-nums whitespace-nowrap ${pctColor(c.change24h)}`}>{fmtPct(c.change24h)}</p>
              </div>
              <WatchStar coin={{ id: c.id, symbol: c.symbol, name: c.name, image: c.image }} />
            </div>
          ))}
          {list.length === 0 && <EmptyState className="py-10 col-span-full" title="Nenhuma moeda encontrada com esse filtro." />}
        </div>
      )}
    </div>
  );
};
