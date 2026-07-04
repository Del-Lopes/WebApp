import { supabase } from './supabase';

// ============================================================
// Admin — leitura e atribuição de Coins de um usuário.
// Leitura direta (RLS já permite admin ler qualquer trilha_stats).
// Escrita via RPC admin_grant_coins (SECURITY DEFINER, valida admin).
// ============================================================

// Saldo de Coins (total_xp) de um usuário. Null se ainda não tem linha.
export async function fetchUserCoins(userId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('trilha_stats')
    .select('total_xp')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) { console.error('[adminCoins] fetchUserCoins', error); return null; }
  return data ? (data as { total_xp: number }).total_xp : null;
}

// Credita (amount>0) ou debita (amount<0) Coins a um usuário. Retorna o novo saldo.
// Erros possíveis (message): 'forbidden', 'invalid_amount', 'user_not_found'.
export async function grantUserCoins(userId: string, amount: number, note?: string): Promise<number> {
  const { data, error } = await supabase.rpc('admin_grant_coins', {
    p_user_id: userId,
    p_amount: amount,
    p_note: note ?? null,
  });
  if (error) { console.error('[adminCoins] grantUserCoins', error); throw new Error(error.message); }
  return data as number;
}
