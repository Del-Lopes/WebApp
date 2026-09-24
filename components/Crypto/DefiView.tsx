import React, { useEffect, useState } from 'react';
import { RefreshCw, Landmark, Info } from 'lucide-react';
import { fetchChainsTvl, fetchDefiTvl, ChainTvl, DefiTvl } from '../../lib/cryptoData';
import { fmtCompact, fmtPct, pctColor } from './format';
import { UnlocksPanel } from './UnlocksPanel';
import { Skeleton } from '../ui';

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
        <p className="text-sm text-fg-muted flex items-center gap-2">
          <Landmark size={16} className="text-accent-fg" /> Capital depositado em DeFi, por rede.
        </p>
        <button
          onClick={load}
          disabled={loading}
          aria-label="Atualizar" className="p-2 rounded-lg hover:bg-tint/5 text-fg-muted hover:text-fg transition-colors disabled:opacity-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="grid gap-2 sm:grid-cols-2" aria-busy="true">{[0, 1, 2, 3, 4, 5].map((k) => <Skeleton key={k} className="h-[62px] rounded-xl" />)}</div>
      ) : error ? (
        <p className="text-sm text-danger-fg py-8 text-center">{error}</p>
      ) : (
        <>
          {total && (
            <div className="glass-card rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="eyebrow-muted text-[10px]">TVL total em DeFi</p>
                <p className="mt-1 font-display text-2xl font-semibold text-fg tabular-nums whitespace-nowrap">{fmtCompact(total.total)}</p>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-[11px] text-fg-muted tabular-nums truncate">7 dias</p>
                  <p className={`font-mono text-sm font-semibold tabular-nums whitespace-nowrap ${pctColor(total.change7d)}`}>{fmtPct(total.change7d)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-fg-muted tabular-nums truncate">30 dias</p>
                  <p className={`font-mono text-sm font-semibold tabular-nums whitespace-nowrap ${pctColor(total.change30d)}`}>{fmtPct(total.change30d)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            {chains.map((c, i) => (
              <div key={c.name} className="glass-card rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-medium text-fg-subtle tabular-nums w-5 shrink-0 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-fg text-sm truncate">
                      {c.name}
                      {c.symbol && <span className="font-mono text-xs font-normal text-fg-muted"> {c.symbol}</span>}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-sm font-medium text-fg tabular-nums whitespace-nowrap">{fmtCompact(c.tvl)}</p>
                    <p className="text-[11px] text-fg-muted tabular-nums whitespace-nowrap">{c.share.toFixed(1)}% do total</p>
                  </div>
                </div>
                {/* Barra proporcional à maior rede — comparação visual imediata */}
                <div className="mt-2 h-1 rounded-full bg-tint/6 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent/70"
                    style={{ width: `${maxTvl > 0 ? (c.tvl / maxTvl) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="flex items-start gap-2 text-[11px] text-fg-muted leading-relaxed">
            <Info size={13} className="mt-0.5 shrink-0" />
            Dados do DefiLlama. TVL alto não significa projeto bom nem rede segura — significa
            capital exposto. Quedas bruscas costumam indicar saque em massa ou incidente.
          </p>

          <div className="border-t border-tint/6 pt-1">
            <UnlocksPanel />
          </div>
        </>
      )}
    </div>
  );
};
