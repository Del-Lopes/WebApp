import { supabase } from './supabase';

// Loja de Coins. Preço e quantidade vêm do banco; o cliente só escolhe o
// pacote e o meio de pagamento. O crédito é feito pelos webhooks no servidor.

export type PayMethod = 'nowpayments' | 'asaas' | 'depix';
export type OrderStatus = 'pending' | 'paid' | 'expired' | 'failed';

export interface CoinPackage {
  id: string;
  name: string;
  price_brl: number;
  coins: number;
  bonus_pct: number;
  highlight: boolean;
}

export interface CoinOrder {
  id: string;
  package_id: string | null;
  coins: number;
  price_brl: number;
  method: PayMethod;
  status: OrderStatus;
  checkout_url: string | null;
  created_at: string;
  paid_at: string | null;
}

export const METHOD_LABEL: Record<PayMethod, string> = {
  nowpayments: 'Cripto',
  asaas: 'Cartão',
  depix: 'Pix',
};

export const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export async function fetchPackages(): Promise<CoinPackage[]> {
  const { data, error } = await supabase
    .from('coin_packages')
    .select('id, name, price_brl, coins, bonus_pct, highlight')
    .eq('active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((p) => ({ ...p, price_brl: Number(p.price_brl) })) as CoinPackage[];
}

export async function fetchMyOrders(limit = 20): Promise<CoinOrder[]> {
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id;
  if (!userId) return [];
  // .eq(user_id) explícito: não depender só da RLS (staff enxerga tudo).
  const { data, error } = await supabase
    .from('coin_orders')
    .select('id, package_id, coins, price_brl, method, status, checkout_url, created_at, paid_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((o) => ({ ...o, price_brl: Number(o.price_brl) })) as CoinOrder[];
}

// Cria o pedido + cobrança. Erros (message): method_unavailable, package_not_found,
// too_many_pending, gateway_error, not_authenticated.
export async function startCheckout(packageId: string, method: PayMethod): Promise<{ orderId: string; url: string }> {
  const { data, error } = await supabase.functions.invoke('coin-checkout', {
    body: { package_id: packageId, method },
  });
  if (error) {
    // supabase-js esconde o corpo do erro HTTP em error.context (Response).
    let code = 'gateway_error';
    try {
      const body = await (error as { context?: Response }).context?.json();
      if (body?.error) code = body.error;
    } catch { /* mantém o código padrão */ }
    throw new Error(code);
  }
  if (!data?.checkout_url || !data?.order_id) throw new Error('gateway_error');
  return { orderId: data.order_id as string, url: data.checkout_url as string };
}

// ── Admin: pacotes e pedidos (a RLS só libera para role admin / first_mate) ──
export interface AdminPackage extends CoinPackage {
  active: boolean;
  sort_order: number;
}

export async function fetchAllPackages(): Promise<AdminPackage[]> {
  const { data, error } = await supabase
    .from('coin_packages')
    .select('id, name, price_brl, coins, bonus_pct, highlight, active, sort_order')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((p) => ({ ...p, price_brl: Number(p.price_brl) })) as AdminPackage[];
}

// Cria ou atualiza (id é o slug). Só um pacote pode ser o "mais escolhido".
export async function savePackage(p: AdminPackage): Promise<void> {
  const { error } = await supabase.from('coin_packages').upsert(p, { onConflict: 'id' });
  if (error) throw error;
  if (p.highlight) {
    const { error: e2 } = await supabase.from('coin_packages').update({ highlight: false }).neq('id', p.id);
    if (e2) throw e2;
  }
}

export interface AdminOrder extends CoinOrder {
  user_id: string;
  external_id: string | null;
  credited_at: string | null;
  user_name: string | null;
  user_email: string | null;
}

export async function fetchAdminOrders(limit = 200): Promise<AdminOrder[]> {
  const { data, error } = await supabase
    .from('coin_orders')
    .select('id, user_id, package_id, coins, price_brl, method, status, external_id, checkout_url, created_at, paid_at, credited_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = data ?? [];
  const ids = [...new Set(rows.map((o) => o.user_id as string))];
  const names = new Map<string, { full_name: string | null; email: string | null }>();
  if (ids.length) {
    const { data: profs, error: pe } = await supabase.from('profiles').select('id, full_name, email').in('id', ids);
    if (pe) throw pe;
    for (const p of profs ?? []) names.set(p.id as string, p as { full_name: string | null; email: string | null });
  }
  return rows.map((o) => ({
    ...o,
    price_brl: Number(o.price_brl),
    user_name: names.get(o.user_id as string)?.full_name ?? null,
    user_email: names.get(o.user_id as string)?.email ?? null,
  })) as AdminOrder[];
}
