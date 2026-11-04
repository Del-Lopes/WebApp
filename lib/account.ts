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
    let detail = '';
    try {
      const body = await (error as any).context?.json?.();
      code = body?.error ?? code;
      detail = typeof body?.detail === 'string' ? body.detail : '';
    } catch { /* corpo ilegível */ }
    // Falha de rede/execução (sem corpo de resposta): mostra o que o supabase-js informou.
    if (!detail && (error as Error).message) detail = (error as Error).message;
    // O detalhe técnico ajuda o suporte a achar o que travou a exclusão.
    throw new DeleteAccountError(code, `${MESSAGES[code] ?? MESSAGES.delete_failed}${detail ? ` (${detail})` : ''}`);
  }
  if (!data?.ok) throw new DeleteAccountError('delete_failed', MESSAGES.delete_failed);
}
