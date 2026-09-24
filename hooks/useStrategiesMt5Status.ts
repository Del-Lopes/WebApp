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
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      // Resolve userId primeiro — necessário para filtrar o snapshot e a subscription
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      // Sem usuário não há o que mostrar — e uma assinatura realtime sem
      // filtro receberia eventos de qualquer linha que a RLS deixasse passar.
      if (!userId) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('strategy_mt5_status')
        .select('*')
        .eq('user_id', userId);

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

      if (cancelled) return;

      channel = supabase
        .channel('mt5-status-own')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'strategy_mt5_status',
            filter: `user_id=eq.${userId}`,
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
    };

    init();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return { statusByStrategy, loading };
}
