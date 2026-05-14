import { supabase } from './supabase';

// Wrappers para a edge function mt5-link, que gerencia o vínculo
// entre uma estratégia (products type='ea') e a conta MT5.

interface ConnectResponse {
  api_key: string;
  api_key_prefix: string;
}

const FUNCTIONS_URL = (() => {
  const env = (import.meta as unknown as { env?: { VITE_SUPABASE_URL?: string } }).env;
  const base = env?.VITE_SUPABASE_URL ?? '';
  return base.replace(/\/$/, '') + '/functions/v1';
})();

// Chama mt5-link/<action> diretamente via fetch, anexando manualmente o
// token de acesso da sessão atual. Usamos fetch direto (em vez de
// supabase.functions.invoke) porque o invoke estava sendo afetado por um
// gateway que retornava 401 sem CORS headers — o browser reportava como
// "CORS error" em vez do 401 real.
async function callMt5Link<T>(action: 'connect' | 'rotate' | 'disconnect', body: Record<string, unknown>): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('not_authenticated');

  const res = await fetch(`${FUNCTIONS_URL}/mt5-link/${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  // Tenta parsear corpo mesmo em erro pra extrair { error: '...' }
  let parsed: unknown = null;
  try { parsed = await res.json(); } catch { /* corpo vazio */ }

  if (!res.ok) {
    const message =
      parsed && typeof parsed === 'object' && 'error' in parsed
        ? String((parsed as { error: unknown }).error)
        : `http_${res.status}`;
    throw new Error(message);
  }

  return parsed as T;
}

export async function connectStrategyToMt5(
  strategyId: string,
  accountLogin: number,
  brokerDisplay?: string,
): Promise<ConnectResponse> {
  return callMt5Link<ConnectResponse>('connect', {
    strategy_id: strategyId,
    account_login: accountLogin,
    broker_display: brokerDisplay,
  });
}

export async function rotateStrategyApiKey(strategyId: string): Promise<ConnectResponse> {
  return callMt5Link<ConnectResponse>('rotate', { strategy_id: strategyId });
}

export async function disconnectStrategyFromMt5(strategyId: string): Promise<void> {
  await callMt5Link<{ ok: true }>('disconnect', { strategy_id: strategyId });
}
