import { supabase } from './supabase';

// Wrappers para a edge function mt5-link, que gerencia o vínculo
// entre uma estratégia (products type='ea') e a conta MT5.

interface ConnectResponse {
  api_key: string;
  api_key_prefix: string;
}

async function invokeMt5Link<T>(action: 'connect' | 'rotate' | 'disconnect', body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(`mt5-link/${action}`, { body });
  if (error) {
    const message = (data && typeof data === 'object' && 'error' in data) ? String((data as { error: unknown }).error) : error.message;
    throw new Error(message);
  }
  return data as T;
}

export async function connectStrategyToMt5(
  strategyId: string,
  accountLogin: number,
  brokerDisplay?: string,
): Promise<ConnectResponse> {
  return invokeMt5Link<ConnectResponse>('connect', {
    strategy_id: strategyId,
    account_login: accountLogin,
    broker_display: brokerDisplay,
  });
}

export async function rotateStrategyApiKey(strategyId: string): Promise<ConnectResponse> {
  return invokeMt5Link<ConnectResponse>('rotate', { strategy_id: strategyId });
}

export async function disconnectStrategyFromMt5(strategyId: string): Promise<void> {
  await invokeMt5Link<{ ok: true }>('disconnect', { strategy_id: strategyId });
}
