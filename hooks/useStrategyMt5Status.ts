import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { StrategyMt5Link, StrategyMt5Status } from '../types';

interface UseStrategyMt5StatusResult {
  link: StrategyMt5Link | null;
  status: StrategyMt5Status | null;
  loading: boolean;
  // Disparado quando o link muda externamente (após connect/disconnect/rotate),
  // permite o consumidor forçar refetch.
  refetch: () => Promise<void>;
}

// Estados derivados ficam no componente; aqui só sincronizamos dados.
export function useStrategyMt5Status(strategyId: string | null): UseStrategyMt5StatusResult {
  const [link, setLink] = useState<StrategyMt5Link | null>(null);
  const [status, setStatus] = useState<StrategyMt5Status | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    if (!strategyId) {
      setLink(null);
      setStatus(null);
      setLoading(false);
      return;
    }

    const [{ data: linkData }, { data: statusData }] = await Promise.all([
      supabase
        .from('strategy_mt5_link')
        .select('*')
        .eq('strategy_id', strategyId)
        .maybeSingle(),
      supabase
        .from('strategy_mt5_status')
        .select('*')
        .eq('strategy_id', strategyId)
        .maybeSingle(),
    ]);

    setLink(linkData as StrategyMt5Link | null);
    setStatus(statusData as StrategyMt5Status | null);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strategyId]);

  // Realtime: assina mudanças em strategy_mt5_status pra essa estratégia
  useEffect(() => {
    if (!strategyId) return;

    const channel = supabase
      .channel(`mt5-status-${strategyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'strategy_mt5_status',
          filter: `strategy_id=eq.${strategyId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setStatus(null);
          } else {
            setStatus(payload.new as StrategyMt5Status);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [strategyId]);

  return { link, status, loading, refetch: fetchAll };
}
