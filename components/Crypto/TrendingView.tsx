import React, { useEffect, useState } from 'react';
import { Loader2, Flame, RefreshCw } from 'lucide-react';
import { fetchTrending, TrendingCoin } from '../../lib/cryptoData';
import { fmtUsd, fmtPct, pctColor } from './format';

// Moedas mais buscadas no CoinGecko nas últimas 24h — sinal de atenção do mercado.
export const TrendingView: React.FC = () => {
  const [coins, setCoins] = useState<TrendingCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setCoins(await fetchTrending());
    } catch (e) {
      setError(e instanceof Error && e.message === 'rate_limited'
        ? 'Limite de consultas atingido. Aguarde um instante.'
        : 'Não foi possível carregar o trending agora.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 flex items-center gap-2">
          <Flame size={16} className="text-orange-500" /> As moedas mais buscadas nas últimas 24h.
        </p>
        <button onClick={load} disabled={loading} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-50">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-slate-300"><Loader2 className="animate-spin" size={32} /></div>
      ) : error ? (
        <p className="text-sm text-rose-600 py-8 text-center">{error}</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {coins.map((c, i) => (
            <div key={c.id} className="flex items-center gap-3 rounded-xl bg-white ring-1 ring-slate-100 p-3 shadow-sm">
              <span className="text-xs font-bold text-slate-300 w-5 text-center">{i + 1}</span>
              {c.thumb && <img src={c.thumb} alt={c.name} className="w-8 h-8 rounded-full" />}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm truncate">{c.name} <span className="text-slate-400 font-medium">{c.symbol}</span></p>
                {c.rank && <p className="text-[11px] text-slate-400">Rank #{c.rank}</p>}
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-700 tabular-nums">{fmtUsd(c.price)}</p>
                <p className={`text-xs font-medium tabular-nums ${pctColor(c.change24h)}`}>{fmtPct(c.change24h)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
