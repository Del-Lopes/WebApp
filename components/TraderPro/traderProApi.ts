import { supabase } from '../../lib/supabase';

/** Recursos que uma licença do Trader Pro pode liberar (mesma lista da extensão e da edge function ext-license). */
export const TP_FEATURES = [
  { id: 'execution', label: 'Execução real de ordens' },
  { id: 'orderFlow', label: 'Janelas de Order Flow' },
  { id: 'autoBe', label: 'Auto BE' },
  { id: 'autoStop', label: 'Auto STOP' },
  { id: 'macros', label: 'Macros (atalhos)' },
  { id: 'journalSync', label: 'Diário automático' },
] as const;

export const TP_PLANS = [
  { id: 'trial', label: 'Trial' },
  { id: 'standard', label: 'Standard' },
  { id: 'pro', label: 'Pro' },
  { id: 'lifetime', label: 'Vitalício' },
] as const;

export interface TpDevice { id: string; label: string | null; ext_version: string | null; created_at: string; last_seen_at: string; revoked_at: string | null }
export interface TpLicenseView { plan: string; status: string; problem: string | null; expires_at: string | null; max_devices: number; features: string[] }

const REASON: Record<string, string> = {
  no_license: 'Sua conta ainda não tem licença do Trader Pro.',
  suspended: 'Licença suspensa.',
  revoked: 'Licença revogada.',
  expired: 'Licença vencida.',
  not_started: 'A licença ainda não começou.',
};

/** Chama a edge function ext-license com o login do usuário (o supabase-js manda o JWT). */
async function call<T>(route: string, body: Record<string, unknown> = {}): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke(`ext-license/${route}`, { body });
  if (error) {
    // respostas 4xx trazem { error, reason } no corpo
    let msg = 'Não foi possível concluir. Tente de novo.';
    try {
      const ctx = (error as { context?: Response }).context;
      const j = ctx ? await ctx.json() : null;
      if (j?.error === 'license_inactive') msg = REASON[j.reason as string] ?? 'A licença não está ativa.';
      else if (j?.error === 'unauthorized') msg = 'Sessão expirada. Entre de novo.';
    } catch { /* corpo ilegível: mantém a mensagem padrão */ }
    return { data: null, error: msg };
  }
  return { data: data as T, error: null };
}

export const traderProApi = {
  devices: () => call<{ license: TpLicenseView | null; devices: TpDevice[] }>('devices'),
  pair: () => call<{ code: string; expires_in: number }>('pair'),
  revoke: (deviceId: string) => call<{ ok: true }>('revoke', { device_id: deviceId }),
};
