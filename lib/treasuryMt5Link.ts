import { supabase } from './supabase';

// Wrappers para a edge function treasury-mt5-link, espelhando o padrão de
// lib/mt5Link.ts. Vincula uma conta da Tesouraria a uma conta MT5 e devolve
// a api_key (em texto plano, uma única vez).

interface ConnectResponse {
  api_key: string;
  api_key_prefix: string;
}

const FUNCTIONS_URL = (() => {
  const env = (import.meta as unknown as { env?: { VITE_SUPABASE_URL?: string } }).env;
  const base = env?.VITE_SUPABASE_URL ?? '';
  return base.replace(/\/$/, '') + '/functions/v1';
})();

async function callTreasuryMt5Link<T>(
  action: 'connect' | 'rotate' | 'disconnect',
  body: Record<string, unknown>,
): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('not_authenticated');

  const res = await fetch(`${FUNCTIONS_URL}/treasury-mt5-link/${action}`, {
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

export async function connectTreasuryAccountToMt5(
  accountId: string,
  accountLogin: number,
  brokerDisplay?: string,
): Promise<ConnectResponse> {
  return callTreasuryMt5Link<ConnectResponse>('connect', {
    account_id: accountId,
    account_login: accountLogin,
    broker_display: brokerDisplay,
  });
}

export async function rotateTreasuryApiKey(accountId: string): Promise<ConnectResponse> {
  return callTreasuryMt5Link<ConnectResponse>('rotate', { account_id: accountId });
}

export async function disconnectTreasuryAccountFromMt5(accountId: string): Promise<void> {
  await callTreasuryMt5Link<{ ok: true }>('disconnect', { account_id: accountId });
}
