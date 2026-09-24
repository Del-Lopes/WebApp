import { useCallback, useEffect, useState } from 'react';
import {
  fetchWatchlist, addToWatchlist, removeFromWatchlist, WatchItem,
} from '../../lib/cryptoData';
import { useAuth } from '../../contexts/AuthContext';

// Estado da watchlist compartilhado entre as abas sem Provider.
// A estrela aparece em Trending, Maiores altas e na própria lista; um cache de
// módulo com assinantes mantém as três em sincronia e evita que cada linha
// renderizada dispare a própria consulta.

//
// O cache pertence a um usuário: na troca de conta na mesma aba ele é
// descartado, senão o próximo usuário veria a watchlist do anterior.

let cache: WatchItem[] | null = null;
let cacheUserId: string | null = null;
const listeners = new Set<(items: WatchItem[]) => void>();

function publish(items: WatchItem[]): void {
  cache = items;
  listeners.forEach((l) => l(items));
}

// Resposta de uma consulta disparada para outro usuário é ignorada.
function publishFor(userId: string | null, items: WatchItem[]): void {
  if (userId === cacheUserId) publish(items);
}

function bindUser(userId: string | null): void {
  if (cacheUserId === userId) return;
  cacheUserId = userId;
  cache = null;
}

export interface WatchableCoin {
  id: string;
  symbol: string;
  name: string;
  image?: string | null;
}

export function useWatchlist() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const cached = cacheUserId === userId ? cache : null;
  const [items, setItems] = useState<WatchItem[]>(cached ?? []);
  const [loading, setLoading] = useState(cached === null);

  useEffect(() => {
    bindUser(userId);
    listeners.add(setItems);
    if (cache === null) {
      setItems([]);
      setLoading(true);
      fetchWatchlist()
        .then((list) => publishFor(userId, list))
        .finally(() => setLoading(false));
    } else {
      setItems(cache);
      setLoading(false);
    }
    return () => { listeners.delete(setItems); };
  }, [userId]);

  const has = useCallback(
    (coinId: string) => items.some((i) => i.coin_id === coinId),
    [items],
  );

  // Otimista: a estrela responde na hora e o estado é reconciliado com o banco
  // depois. Se a escrita falhar, recarregamos para não deixar a UI mentindo.
  const toggle = useCallback(async (coin: WatchableCoin) => {
    const owner = cacheUserId;
    const current = cache ?? [];
    const existing = current.find((i) => i.coin_id === coin.id);

    if (existing) {
      publish(current.filter((i) => i.coin_id !== coin.id));
      try {
        await removeFromWatchlist(coin.id);
      } catch {
        publishFor(owner, await fetchWatchlist());
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
      publishFor(owner, await fetchWatchlist());
    } catch {
      publishFor(owner, await fetchWatchlist());
    }
  }, []);

  const reload = useCallback(async () => {
    const owner = cacheUserId;
    publishFor(owner, await fetchWatchlist());
  }, []);

  return { items, loading, has, toggle, reload };
}
