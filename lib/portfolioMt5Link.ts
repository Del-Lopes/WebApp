import { supabase } from './supabase';

// Wrappers para a edge function portfolio-mt5-link (Live Portfólio do cliente).
// Stack isolado do mt5-link (estratégias) e do treasury-mt5-link (tesouraria).

interface ConnectResponse {
  api_key: string;
  api_key_prefix: string;
}

const FUNCTIONS_URL = (() => {
  const env = (import.meta as unknown as { env?: { VITE_SUPABASE_URL?: string } }).env;
  const base = env?.VITE_SUPABASE_URL ?? '';
  return base.replace(/\/$/, '') + '/functions/v1';
})();

async function callPortfolioMt5Link<T>(
  action: 'connect' | 'rotate' | 'disconnect',
  body: Record<string, unknown>,
): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('not_authenticated');

  const res = await fetch(`${FUNCTIONS_URL}/portfolio-mt5-link/${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

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

export async function connectPortfolioAccountToMt5(
  accountId: string,
  accountLogin: number,
): Promise<ConnectResponse> {
  return callPortfolioMt5Link<ConnectResponse>('connect', {
    account_id: accountId,
    account_login: accountLogin,
  });
}

export async function rotatePortfolioApiKey(accountId: string): Promise<ConnectResponse> {
  return callPortfolioMt5Link<ConnectResponse>('rotate', { account_id: accountId });
}

export async function disconnectPortfolioAccountFromMt5(accountId: string): Promise<void> {
  await callPortfolioMt5Link<{ ok: true }>('disconnect', { account_id: accountId });
}
