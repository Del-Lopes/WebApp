import React, { useEffect, useState } from 'react';
import { Loader2, Rocket, RefreshCw } from 'lucide-react';
import { fetchMarkets, topGainers, MarketCoin } from '../../lib/cryptoData';
import { fmtUsd, fmtCompact, fmtPct, pctColor } from './format';
import { WatchStar } from './WatchStar';

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
        <p className="text-sm text-slate-500 flex items-center gap-2">
          <Rocket size={16} className="text-green-600" /> Maiores altas em 24h{lowCapOnly ? ' — fora do top 50 (baixo cap)' : ''}.
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLowCapOnly((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${lowCapOnly ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Só baixo cap
          </button>
          <button onClick={load} disabled={loading} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-50">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-slate-300"><Loader2 className="animate-spin" size={32} /></div>
      ) : error ? (
        <p className="text-sm text-rose-600 py-8 text-center">{error}</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {list.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-xl bg-white ring-1 ring-slate-100 p-3 shadow-xs">
              {c.image && <img src={c.image} alt={c.name} className="w-8 h-8 rounded-full" />}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm truncate">{c.name} <span className="text-slate-400 font-medium">{c.symbol}</span></p>
                <p className="text-[11px] text-slate-400">#{c.rank ?? '—'} • Cap {fmtCompact(c.marketCap)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-700 tabular-nums">{fmtUsd(c.price)}</p>
                <p className={`text-xs font-bold tabular-nums ${pctColor(c.change24h)}`}>{fmtPct(c.change24h)}</p>
              </div>
              <WatchStar coin={{ id: c.id, symbol: c.symbol, name: c.name, image: c.image }} />
            </div>
          ))}
          {list.length === 0 && <p className="text-sm text-slate-400 py-8 text-center col-span-full">Nenhuma moeda encontrada com esse filtro.</p>}
        </div>
      )}
    </div>
  );
};
