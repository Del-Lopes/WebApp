// Exclusão de conta pela edge function delete-account (service role no servidor).
//   • sem user_id: o próprio usuário exclui a sua conta;
//   • com user_id: admin exclui a conta de outro usuário (nunca a de outro admin).

import { supabase } from './supabase';

export class DeleteAccountError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

const MESSAGES: Record<string, string> = {
  admin_self_delete: 'Contas de administrador não podem ser excluídas por aqui.',
  target_is_admin: 'Não é possível excluir a conta de outro administrador.',
  forbidden: 'Você não tem permissão para excluir esta conta.',
  not_authenticated: 'Sua sessão expirou. Entre novamente e tente de novo.',
  delete_failed: 'Não foi possível excluir a conta agora. Tente novamente ou fale com o suporte.',
};

export async function deleteAccount(userId?: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('delete-account', { body: userId ? { user_id: userId } : {} });
  if (error) {
    // supabase-js devolve o corpo da resposta de erro em error.context (Response).
    let code = 'delete_failed';
    try { code = (await (error as any).context?.json?.())?.error ?? code; } catch { /* corpo ilegível */ }
    throw new DeleteAccountError(code, MESSAGES[code] ?? MESSAGES.delete_failed);
  }
  if (!data?.ok) throw new DeleteAccountError('delete_failed', MESSAGES.delete_failed);
}
