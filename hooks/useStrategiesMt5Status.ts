import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { StrategyMt5Status } from '../types';

interface UseStrategiesMt5StatusResult {
  // Map<strategy_id, status>
  statusByStrategy: Record<string, StrategyMt5Status>;
  loading: boolean;
}

// Carrega o snapshot mais recente de TODAS as estrategias com conexao MT5 ativa
// e mantem em sync via realtime. Util pra listagens (grid de Estrategias).
export function useStrategiesMt5Status(): UseStrategiesMt5StatusResult {
  const [statusByStrategy, setStatusByStrategy] = useState<Record<string, StrategyMt5Status>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      const { data, error } = await supabase
        .from('strategy_mt5_status')
        .select('*');
      if (error) {
        console.error('useStrategiesMt5Status fetch error:', error);
        if (!cancelled) setLoading(false);
        return;
      }
      if (cancelled) return;
      const map: Record<string, StrategyMt5Status> = {};
      for (const row of (data || []) as StrategyMt5Status[]) {
        map[row.strategy_id] = row;
      }
      setStatusByStrategy(map);
      setLoading(false);
    };

    fetchAll();

    // Filtra por user_id para não receber broadcast de outros usuários.
    // Requer que a tabela tenha RLS habilitada com user_id visível.
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const channel = supabase
      .channel('mt5-status-own')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'strategy_mt5_status',
          ...(userId ? { filter: `user_id=eq.${userId}` } : {}),
        },
        (payload) => {
          setStatusByStrategy(prev => {
            const next = { ...prev };
            if (payload.eventType === 'DELETE') {
              const oldRow = payload.old as Partial<StrategyMt5Status>;
              if (oldRow?.strategy_id) delete next[oldRow.strategy_id];
            } else {
              const newRow = payload.new as StrategyMt5Status;
              if (newRow?.strategy_id) next[newRow.strategy_id] = newRow;
            }
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { statusByStrategy, loading };
}
