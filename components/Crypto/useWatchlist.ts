import { useCallback, useEffect, useState } from 'react';
import {
  fetchWatchlist, addToWatchlist, removeFromWatchlist, WatchItem,
} from '../../lib/cryptoData';

// Estado da watchlist compartilhado entre as abas sem Provider.
// A estrela aparece em Trending, Maiores altas e na própria lista; um cache de
// módulo com assinantes mantém as três em sincronia e evita que cada linha
// renderizada dispare a própria consulta.

let cache: WatchItem[] | null = null;
const listeners = new Set<(items: WatchItem[]) => void>();

function publish(items: WatchItem[]): void {
  cache = items;
  listeners.forEach((l) => l(items));
}

export interface WatchableCoin {
  id: string;
  symbol: string;
  name: string;
  image?: string | null;
}

export function useWatchlist() {
  const [items, setItems] = useState<WatchItem[]>(cache ?? []);
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    listeners.add(setItems);
    if (cache === null) {
      fetchWatchlist()
        .then(publish)
        .finally(() => setLoading(false));
    }
    return () => { listeners.delete(setItems); };
  }, []);

  const has = useCallback(
    (coinId: string) => items.some((i) => i.coin_id === coinId),
    [items],
  );

  // Otimista: a estrela responde na hora e o estado é reconciliado com o banco
  // depois. Se a escrita falhar, recarregamos para não deixar a UI mentindo.
  const toggle = useCallback(async (coin: WatchableCoin) => {
    const current = cache ?? [];
    const existing = current.find((i) => i.coin_id === coin.id);

    if (existing) {
      publish(current.filter((i) => i.coin_id !== coin.id));
      try {
        await removeFromWatchlist(coin.id);
      } catch {
        publish(await fetchWatchlist());
      }
      return;
    }

    publish([
      {
        id: `tmp-${coin.id}`,
        coin_id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        image: coin.image ?? null,
        created_at: new Date().toISOString(),
      },
      ...current,
    ]);
    try {
      await addToWatchlist(coin);
      publish(await fetchWatchlist());
    } catch {
      publish(await fetchWatchlist());
    }
  }, []);

  const reload = useCallback(async () => {
    publish(await fetchWatchlist());
  }, []);

  return { items, loading, has, toggle, reload };
}
