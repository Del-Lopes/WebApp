import React, { useEffect, useState } from 'react';
import { Loader2, RefreshCw, Landmark, Info } from 'lucide-react';
import { fetchChainsTvl, fetchDefiTvl, ChainTvl, DefiTvl } from '../../lib/cryptoData';
import { fmtCompact, fmtPct, pctColor } from './format';
import { UnlocksPanel } from './UnlocksPanel';

// TVL = capital efetivamente depositado nos protocolos de cada rede. É a métrica
// mais próxima de "uso" que existe em cripto: diferente de preço, não sobe só
// porque alguém comprou — alguém precisou travar dinheiro ali dentro.
//
// Serve de contraprova das narrativas: um setor subindo de preço e perdendo TVL
// conta uma história bem diferente de um que sobe nos dois.
export const DefiView: React.FC = () => {
  const [chains, setChains] = useState<ChainTvl[]>([]);
  const [total, setTotal] = useState<DefiTvl | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, t] = await Promise.all([fetchChainsTvl(15), fetchDefiTvl()]);
      setChains(c);
      setTotal(t);
    } catch {
      setError('Não foi possível carregar os dados de DeFi agora.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const maxTvl = chains[0]?.tvl ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-slate-500 flex items-center gap-2">
          <Landmark size={16} className="text-indigo-500" /> Capital depositado em DeFi, por rede.
        </p>
        <button
          onClick={load}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-slate-300"><Loader2 className="animate-spin" size={32} /></div>
      ) : error ? (
        <p className="text-sm text-rose-600 py-8 text-center">{error}</p>
      ) : (
        <>
          {total && (
            <div className="rounded-xl bg-white ring-1 ring-slate-100 p-4 shadow-sm flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">TVL total em DeFi</p>
                <p className="text-2xl font-bold text-slate-800 tabular-nums">{fmtCompact(total.total)}</p>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-[11px] text-slate-400">7 dias</p>
                  <p className={`text-sm font-bold tabular-nums ${pctColor(total.change7d)}`}>{fmtPct(total.change7d)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">30 dias</p>
                  <p className={`text-sm font-bold tabular-nums ${pctColor(total.change30d)}`}>{fmtPct(total.change30d)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            {chains.map((c, i) => (
              <div key={c.name} className="rounded-xl bg-white ring-1 ring-slate-100 p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-300 w-5 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">
                      {c.name}
                      {c.symbol && <span className="text-slate-400 font-medium"> {c.symbol}</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-700 tabular-nums">{fmtCompact(c.tvl)}</p>
                    <p className="text-[11px] text-slate-400 tabular-nums">{c.share.toFixed(1)}% do total</p>
                  </div>
                </div>
                {/* Barra proporcional à maior rede — comparação visual imediata */}
                <div className="mt-2 h-1 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-400"
                    style={{ width: `${maxTvl > 0 ? (c.tvl / maxTvl) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="flex items-start gap-2 text-[11px] text-slate-400 leading-relaxed">
            <Info size={13} className="mt-0.5 shrink-0" />
            Dados do DefiLlama. TVL alto não significa projeto bom nem rede segura — significa
            capital exposto. Quedas bruscas costumam indicar saque em massa ou incidente.
          </p>

          <div className="border-t border-slate-100 pt-1">
            <UnlocksPanel />
          </div>
        </>
      )}
    </div>
  );
};
