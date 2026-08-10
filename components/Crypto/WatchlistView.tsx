import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, Star, Flame, Zap, Info, LockOpen } from 'lucide-react';
import {
  fetchMarketsByIds, fetchTrending, fetchUpcomingUnlocks, daysUntil,
  MarketCoin, UpcomingUnlock,
} from '../../lib/cryptoData';
import { fmtUsd, fmtCompact, fmtPct, pctColor } from './format';
import { useWatchlist } from './useWatchlist';
import { WatchStar } from './WatchStar';

// Limiar de "movimento forte" em 24h. Alto o bastante para não disparar no
// ruído normal de cripto, baixo o bastante para não perder o que importa.
const STRONG_MOVE_PCT = 10;

// Janela de antecedência do aviso de desbloqueio. 30 dias dá tempo de reagir
// sem poluir a lista com eventos distantes demais para importar.
const UNLOCK_WARN_DAYS = 30;

// Lista do usuário com os alertas avaliados no momento em que ele abre a aba.
// Ainda não há envio por push neste projeto — não existe infraestrutura de
// notificação aqui —, então o alerta é sinalizado na própria tela.
export const WatchlistView: React.FC = () => {
  const { items, loading: loadingList } = useWatchlist();
  const [quotes, setQuotes] = useState<Record<string, MarketCoin>>({});
  const [trendingIds, setTrendingIds] = useState<Set<string>>(new Set());
  const [unlocks, setUnlocks] = useState<Record<string, UpcomingUnlock>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (ids: string[]) => {
    if (ids.length === 0) { setQuotes({}); return; }
    setLoading(true);
    setError(null);
    try {
      const [markets, trending, upcoming] = await Promise.all([
        fetchMarketsByIds(ids),
        fetchTrending(),
        fetchUpcomingUnlocks(UNLOCK_WARN_DAYS),
      ]);
      const map: Record<string, MarketCoin> = {};
      markets.forEach((m) => { map[m.id] = m; });
      setQuotes(map);
      setTrendingIds(new Set(trending.map((t) => t.id)));

      // O calendário indexa por id do CoinGecko, o mesmo que guardamos na lista.
      const byGecko: Record<string, UpcomingUnlock> = {};
      upcoming.forEach((u) => { if (u.gecko_id) byGecko[u.gecko_id] = u; });
      setUnlocks(byGecko);
    } catch (e) {
      setError(e instanceof Error && e.message === 'rate_limited'
        ? 'Limite de consultas atingido. Aguarde um instante.'
        : 'Não foi possível atualizar as cotações agora.');
    } finally {
      setLoading(false);
    }
  }, []);

  const ids = items.map((i) => i.coin_id).join(',');
  useEffect(() => { void load(ids ? ids.split(',') : []); }, [ids, load]);

  if (loadingList) {
    return <div className="flex justify-center py-16 text-slate-300"><Loader2 className="animate-spin" size={32} /></div>;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-14 space-y-2">
        <Star size={30} className="mx-auto text-slate-200" />
        <p className="text-sm font-semibold text-slate-600">Sua lista está vazia</p>
        <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
          Toque na estrela ao lado de qualquer moeda nas abas Trending ou Maiores altas para
          acompanhá-la aqui, com aviso quando ela entrar no radar ou se mexer forte.
        </p>
      </div>
    );
  }

  const alerts = items.filter((i) => {
    const q = quotes[i.coin_id];
    return trendingIds.has(i.coin_id)
      || (q && Math.abs(q.change24h) >= STRONG_MOVE_PCT)
      || !!unlocks[i.coin_id];
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-slate-500 flex items-center gap-2">
          <Star size={16} className="text-amber-500" />
          {items.length} {items.length === 1 ? 'moeda acompanhada' : 'moedas acompanhadas'}
          {alerts.length > 0 && <span className="text-amber-600 font-semibold">· {alerts.length} com novidade</span>}
        </p>
        <button
          onClick={() => void load(items.map((i) => i.coin_id))}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((i) => {
          const q = quotes[i.coin_id];
          const inTrending = trendingIds.has(i.coin_id);
          const strongMove = q && Math.abs(q.change24h) >= STRONG_MOVE_PCT;
          const unlock = unlocks[i.coin_id];

          return (
            <div
              key={i.coin_id}
              className={`rounded-xl bg-white p-3 shadow-sm ring-1 ${
                inTrending || strongMove || unlock ? 'ring-amber-200' : 'ring-slate-100'
              }`}
            >
              <div className="flex items-center gap-2">
                {(q?.image || i.image) && <img src={q?.image || i.image || ''} alt={i.name} className="w-8 h-8 rounded-full" />}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">
                    {i.name} <span className="text-slate-400 font-medium">{i.symbol}</span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {q ? <>#{q.rank ?? '—'} • Cap {fmtCompact(q.marketCap)}</> : 'Sem cotação disponível'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-700 tabular-nums">{q ? fmtUsd(q.price) : '—'}</p>
                  {q && <p className={`text-xs font-bold tabular-nums ${pctColor(q.change24h)}`}>{fmtPct(q.change24h)}</p>}
                </div>
                <WatchStar coin={{ id: i.coin_id, symbol: i.symbol, name: i.name, image: i.image }} />
              </div>

              {q && (
                <div className="mt-2 flex gap-4 text-[11px] text-slate-400">
                  <span>7d <span className={`font-semibold tabular-nums ${pctColor(q.change7d)}`}>{fmtPct(q.change7d)}</span></span>
                  <span>30d <span className={`font-semibold tabular-nums ${pctColor(q.change30d)}`}>{fmtPct(q.change30d)}</span></span>
                </div>
              )}

              {(inTrending || strongMove || unlock) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {inTrending && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 text-[11px] font-semibold">
                      <Flame size={11} /> No radar hoje
                    </span>
                  )}
                  {strongMove && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[11px] font-semibold">
                      <Zap size={11} /> Movimento forte em 24h
                    </span>
                  )}
                  {unlock && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[11px] font-semibold">
                      <LockOpen size={11} /> Desbloqueio em {daysUntil(unlock.next_unlock_at)}d
                      {unlock.dilution_pct != null && ` · ${unlock.dilution_pct.toFixed(2)}% do supply`}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="flex items-start gap-2 text-[11px] text-slate-400 leading-relaxed">
        <Info size={13} className="mt-0.5 shrink-0" />
        Os avisos são calculados quando você abre esta aba: moeda entre as mais buscadas do dia,
        variação de {STRONG_MOVE_PCT}% ou mais em 24h, ou desbloqueio de tokens nos próximos{' '}
        {UNLOCK_WARN_DAYS} dias. Não é sinal de compra ou venda.
      </p>
    </div>
  );
};
