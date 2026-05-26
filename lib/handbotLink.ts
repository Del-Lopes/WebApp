import { supabase } from './supabase';

// Wrappers para as edge functions handbot-link e handbot-params.

export interface HandbotConnectResponse {
  api_key: string;
  api_key_prefix: string;
}

export interface HandbotLink {
  id: string;
  account_login: number;
  broker_display: string | null;
  api_key_prefix: string;
  api_key_created_at: string;
  api_key_revoked_at: string | null;
  created_at: string;
}

export interface HandbotParams {
  trailing_avg_enabled: boolean;
  trailing_avg_distance: number;
  trailing_avg_stop: number;
  trailing_pts_enabled: boolean;
  trailing_pts_distance: number;
  trailing_pts_stop: number;
  break_even_avg_enabled: boolean;
  break_even_avg_distance: number;
  break_even_avg_gain: number;
  break_even_pts_enabled: boolean;
  break_even_pts_distance: number;
  break_even_pts_gain: number;
  add_points_enabled: boolean;
  add_points_lot: number;
  add_points_distance: number;
  add_points_avg_distance: number;
  // Grid à Favor
  grid_ahead_enabled: boolean;
  grid_ahead_distance: number;
  grid_ahead_multiplier: number;
  // Grid Contra
  grid_contra_enabled: boolean;
  grid_contra_lot: number;
  grid_contra_distance: number;
  grid_contra_multiplier: number;
  grid_contra_max_orders: number;
  // Barra-a-Barra
  bar_folga_stop: number;
  bar_trailing_enabled: boolean;
  bar_timeframe: number;
  bar_refresh_entry: boolean;
  updated_at?: string;
}

const FUNCTIONS_URL = (() => {
  const env = (import.meta as unknown as { env?: { VITE_SUPABASE_URL?: string } }).env;
  const base = env?.VITE_SUPABASE_URL ?? '';
  return base.replace(/\/$/, '') + '/functions/v1';
})();

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('not_authenticated');
  return token;
}

async function callHandbotLink<T>(
  action: 'connect' | 'rotate' | 'disconnect',
  body: Record<string, unknown> = {},
): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${FUNCTIONS_URL}/handbot-link/${action}`, {
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

export async function connectHandbot(
  accountLogin: number,
  brokerDisplay?: string,
): Promise<HandbotConnectResponse> {
  return callHandbotLink<HandbotConnectResponse>('connect', {
    account_login: accountLogin,
    broker_display: brokerDisplay,
  });
}

export async function rotateHandbotApiKey(): Promise<HandbotConnectResponse> {
  return callHandbotLink<HandbotConnectResponse>('rotate', {});
}

export async function disconnectHandbot(): Promise<void> {
  await callHandbotLink<{ ok: true }>('disconnect', {});
}

export async function fetchHandbotLink(): Promise<HandbotLink | null> {
  const token = await getToken();
  const res = await fetch(`${FUNCTIONS_URL}/handbot-params/link`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.link ?? null;
}

export async function fetchHandbotParams(): Promise<HandbotParams | null> {
  const token = await getToken();
  const res = await fetch(`${FUNCTIONS_URL}/handbot-params/user-params`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.params ?? null;
}

export async function saveHandbotParams(params: HandbotParams): Promise<void> {
  const token = await getToken();
  const res = await fetch(`${FUNCTIONS_URL}/handbot-params`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(params),
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
}
