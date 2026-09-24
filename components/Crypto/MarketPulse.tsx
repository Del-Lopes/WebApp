import React, { useEffect, useState } from 'react';
import {
  fetchGlobalMarket, fetchFearGreed, fetchDefiTvl, fearGreedLabel,
  GlobalMarket, FearGreed, DefiTvl,
} from '../../lib/cryptoData';
import { fmtCompact, fmtPct, pctColor } from './format';
import { Skeleton } from '../ui';

// Termômetro fixo no topo da sessão: dá contexto a tudo que vem depois.
// Uma moeda subindo 30% significa coisas diferentes com o BTC dominando 56% e
// medo extremo no mercado, ou com dominância caindo e ganância — é essa leitura
// que o usuário não consegue fazer olhando só a lista de maiores altas.
//
// Três fontes independentes de propósito (CoinGecko, alternative.me, DefiLlama):
// se uma falhar, os outros cartões continuam de pé.

const Card: React.FC<{ label: string; children: React.ReactNode; hint?: string }> = ({ label, children, hint }) => (
  <div className="glass-card rounded-xl p-3 min-w-0">
    <p className="eyebrow-muted text-[10px] truncate">{label}</p>
    <div className="mt-1.5">{children}</div>
    {hint && <p className="text-[10px] text-fg-subtle mt-0.5 truncate tabular-nums">{hint}</p>}
  </div>
);

// 0–24 medo extremo · 25–44 medo · 45–55 neutro · 56–75 ganância · 76+ extrema.
function fngColor(v: number): string {
  if (v <= 24) return 'text-danger-fg';
  if (v <= 44) return 'text-warning-fg';
  if (v <= 55) return 'text-fg-muted';
  if (v <= 75) return 'text-success-fg';
  return 'text-success-fg';
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
      <div className="grid gap-2 grid-cols-2 lg:grid-cols-5" aria-busy="true">
        {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[76px] rounded-xl" />)}
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
            <p className="font-display text-lg font-semibold text-fg tabular-nums whitespace-nowrap leading-tight">{fmtCompact(global.totalMarketCap)}</p>
            <p className={`font-mono text-xs font-medium tabular-nums whitespace-nowrap ${pctColor(global.marketCapChange24h)}`}>
              {fmtPct(global.marketCapChange24h)}
            </p>
          </Card>

          <Card label="Dominância BTC" hint={`ETH ${global.ethDominance.toFixed(1)}%`}>
            <p className="font-display text-lg font-semibold text-fg tabular-nums whitespace-nowrap leading-tight">
              {global.btcDominance.toFixed(1)}%
            </p>
          </Card>

          <Card label="Stablecoins" hint="USDT + USDC — capital aguardando">
            <p className="font-display text-lg font-semibold text-fg tabular-nums whitespace-nowrap leading-tight">
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
          <p className={`font-display text-lg font-semibold tabular-nums leading-tight ${fngColor(fng.value)}`}>
            {fng.value}
          </p>
          <p className="text-xs font-medium text-fg-muted truncate">{fearGreedLabel(fng.classification)}</p>
        </Card>
      )}

      {defi && (
        <Card label="TVL DeFi" hint={`30d ${fmtPct(defi.change30d)}`}>
          <p className="font-display text-lg font-semibold text-fg tabular-nums whitespace-nowrap leading-tight">{fmtCompact(defi.total)}</p>
          <p className={`font-mono text-xs font-medium tabular-nums whitespace-nowrap ${pctColor(defi.change7d)}`}>
            {fmtPct(defi.change7d)} <span className="text-fg-subtle font-normal">7d</span>
          </p>
        </Card>
      )}
    </div>
  );
};
