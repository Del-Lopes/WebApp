import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  fetchGlobalMarket, fetchFearGreed, fetchDefiTvl, fearGreedLabel,
  GlobalMarket, FearGreed, DefiTvl,
} from '../../lib/cryptoData';
import { fmtCompact, fmtPct, pctColor } from './format';

// Termômetro fixo no topo da sessão: dá contexto a tudo que vem depois.
// Uma moeda subindo 30% significa coisas diferentes com o BTC dominando 56% e
// medo extremo no mercado, ou com dominância caindo e ganância — é essa leitura
// que o usuário não consegue fazer olhando só a lista de maiores altas.
//
// Três fontes independentes de propósito (CoinGecko, alternative.me, DefiLlama):
// se uma falhar, os outros cartões continuam de pé.

const Card: React.FC<{ label: string; children: React.ReactNode; hint?: string }> = ({ label, children, hint }) => (
  <div className="rounded-xl bg-white ring-1 ring-slate-100 p-3 shadow-xs min-w-0">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 truncate">{label}</p>
    <div className="mt-1">{children}</div>
    {hint && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{hint}</p>}
  </div>
);

// 0–24 medo extremo · 25–44 medo · 45–55 neutro · 56–75 ganância · 76+ extrema.
function fngColor(v: number): string {
  if (v <= 24) return 'text-rose-600';
  if (v <= 44) return 'text-orange-500';
  if (v <= 55) return 'text-slate-600';
  if (v <= 75) return 'text-emerald-600';
  return 'text-emerald-700';
}

export const MarketPulse: React.FC = () => {
  const [global, setGlobal] = useState<GlobalMarket | null>(null);
  const [fng, setFng] = useState<FearGreed | null>(null);
  const [defi, setDefi] = useState<DefiTvl | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    // allSettled: uma fonte fora do ar não derruba o painel inteiro.
    Promise.allSettled([fetchGlobalMarket(), fetchFearGreed(), fetchDefiTvl()])
      .then(([g, f, d]) => {
        if (!alive) return;
        if (g.status === 'fulfilled') setGlobal(g.value);
        if (f.status === 'fulfilled') setFng(f.value);
        if (d.status === 'fulfilled') setDefi(d.value);
        setLoading(false);
      });
    return () => { alive = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-6 text-slate-300">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }

  if (!global && !fng && !defi) return null;

  const fngDelta = fng?.previous != null ? fng.value - fng.previous : null;

  return (
    <div className="grid gap-2 grid-cols-2 lg:grid-cols-5">
      {global && (
        <>
          <Card label="Cap. total" hint={`Volume 24h ${fmtCompact(global.totalVolume)}`}>
            <p className="text-lg font-bold text-slate-800 tabular-nums leading-tight">{fmtCompact(global.totalMarketCap)}</p>
            <p className={`text-xs font-semibold tabular-nums ${pctColor(global.marketCapChange24h)}`}>
              {fmtPct(global.marketCapChange24h)}
            </p>
          </Card>

          <Card label="Dominância BTC" hint={`ETH ${global.ethDominance.toFixed(1)}%`}>
            <p className="text-lg font-bold text-amber-600 tabular-nums leading-tight">
              {global.btcDominance.toFixed(1)}%
            </p>
          </Card>

          <Card label="Stablecoins" hint="USDT + USDC — capital aguardando">
            <p className="text-lg font-bold text-slate-800 tabular-nums leading-tight">
              {global.stableDominance.toFixed(1)}%
            </p>
          </Card>
        </>
      )}

      {fng && (
        <Card
          label="Medo & Ganância"
          hint={fngDelta != null ? `${fngDelta >= 0 ? '+' : ''}${fngDelta} vs. ontem` : undefined}
        >
          <p className={`text-lg font-bold tabular-nums leading-tight ${fngColor(fng.value)}`}>
            {fng.value}
          </p>
          <p className="text-xs font-medium text-slate-500 truncate">{fearGreedLabel(fng.classification)}</p>
        </Card>
      )}

      {defi && (
        <Card label="TVL DeFi" hint={`30d ${fmtPct(defi.change30d)}`}>
          <p className="text-lg font-bold text-slate-800 tabular-nums leading-tight">{fmtCompact(defi.total)}</p>
          <p className={`text-xs font-semibold tabular-nums ${pctColor(defi.change7d)}`}>
            {fmtPct(defi.change7d)} <span className="text-slate-400 font-normal">7d</span>
          </p>
        </Card>
      )}
    </div>
  );
};
