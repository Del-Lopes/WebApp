import React, { useEffect, useState } from 'react';
import { Loader2, Layers, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { fetchNarratives, Narrative } from '../../lib/cryptoData';
import { fmtCompact, fmtPct, pctColor } from './format';

// Performance por setor/narrativa (IA, DePIN, RWA...). O jeito data-driven de
// enxergar quais temas estão ganhando força — sem "recomendar" nada.
export const NarrativesView: React.FC = () => {
  const [items, setItems] = useState<Narrative[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await fetchNarratives();
      // Top 20 setores por variação (a lista completa é enorme).
      setItems(all.slice(0, 20));
    } catch (e) {
      setError(e instanceof Error && e.message === 'rate_limited'
        ? 'Limite de consultas atingido. Aguarde um instante.'
        : 'Não foi possível carregar as narrativas agora.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 flex items-center gap-2">
          <Layers size={16} className="text-indigo-500" /> Setores com maior variação de capitalização (24h).
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
        <div className="space-y-2">
          {items.map((n) => (
            <div key={n.id} className="flex items-center gap-3 rounded-xl bg-white ring-1 ring-slate-100 p-3 shadow-sm">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${n.change24h >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {n.change24h >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm truncate">{n.name}</p>
                <p className="text-[11px] text-slate-400">Cap {fmtCompact(n.marketCap)} • Vol {fmtCompact(n.volume24h)}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {n.topCoins.slice(0, 3).map((src, i) => (
                    <img key={i} src={src} alt="" className="w-6 h-6 rounded-full ring-2 ring-white" />
                  ))}
                </div>
                <span className={`text-sm font-bold tabular-nums w-20 text-right ${pctColor(n.change24h)}`}>{fmtPct(n.change24h)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
