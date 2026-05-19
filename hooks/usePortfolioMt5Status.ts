import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface PortfolioMt5Status {
  account_id: string;
  user_id: string;
  account_login: number;
  account_currency: string | null;
  account_company: string | null;
  account_server: string | null;
  balance: number | null;
  equity: number | null;
  floating_pnl: number | null;
  daily_pnl: number | null;
  open_positions: number | null;
  last_trade_at: string | null;
  ea_version: string | null;
  reported_at: string;
  received_at: string;
  updated_at: string;
}

// Subscreve realtime para a tabela portfolio_mt5_status filtrando por user.
// Mantém um Map account_id → status na memória do componente.
export function usePortfolioMt5StatusMap(userId: string | null) {
  const [statusMap, setStatusMap] = useState<Record<string, PortfolioMt5Status>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setStatusMap({});
      setLoading(false);
      return;
    }

    let active = true;

    (async () => {
      const { data } = await supabase
        .from('portfolio_mt5_status')
        .select('*')
        .eq('user_id', userId);
      if (!active) return;
      const map: Record<string, PortfolioMt5Status> = {};
      (data || []).forEach((row) => { map[row.account_id] = row as PortfolioMt5Status; });
      setStatusMap(map);
      setLoading(false);
    })();

    const channel = supabase
      .channel(`portfolio-mt5-status-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'portfolio_mt5_status',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setStatusMap((prev) => {
            if (payload.eventType === 'DELETE') {
              const next = { ...prev };
              const oldRow = payload.old as { account_id?: string };
              if (oldRow.account_id) delete next[oldRow.account_id];
              return next;
            }
            const row = payload.new as PortfolioMt5Status;
            return { ...prev, [row.account_id]: row };
          });
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { statusMap, loading };
}
