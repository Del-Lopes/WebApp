
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { User, Lock, Save, Loader2, AlertCircle, CheckCircle, ShieldCheck, FileText, ExternalLink, Camera, Trash2, TriangleAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BackButton } from './BackButton';
import { Button, Card, Input, Label, Modal, PageHeader } from './ui';
import { Avatar } from './Forum/Avatar';
import { avatarErrorMessage, avatarsEnabled, removeAvatar, uploadAvatar, useAvatarKey } from '../lib/avatars';
import { DeleteAccountError, deleteAccount } from '../lib/account';
import { isValidPhone } from '../lib/whatsapp';

interface SettingsProps {
  onBack?: () => void;
}

const LEGAL_DOCS = [
  { href: '/legal/termos.html', label: 'Termos de Uso' },
  { href: '/legal/privacidade.html', label: 'Política de Privacidade' },
  { href: '/legal/risco.html', label: 'Aviso de Risco' },
] as const;

export const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Profile State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [savedPhone, setSavedPhone] = useState('');

  // Foto de perfil
  const avatarInput = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Exclusão da conta
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setFullName(user.user_metadata.full_name);
    }
  }, [user]);

  // Depende só do id: o objeto user muda ao renovar o token e apagaria o que está sendo digitado.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('profiles')
      .select('phone')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error('Error loading phone:', error);
          return;
        }
        setPhone(data?.phone ?? '');
        setSavedPhone(data?.phone ?? '');
      });
  }, [userId]);

  const myAvatarKey = useAvatarKey(user?.id);

  const handleAvatarFile = async (file: File | undefined) => {
    if (!file || !user) return;
    setAvatarBusy(true);
    setAvatarError(null);
    try {
      await uploadAvatar(user.id, file);
      setMessage({ type: 'success', text: 'Foto de perfil atualizada!' });
    } catch (err) {
      console.error('[Settings] avatar', err);
      setAvatarError(avatarErrorMessage(err));
    } finally {
      setAvatarBusy(false);
      if (avatarInput.current) avatarInput.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    setAvatarBusy(true);
    setAvatarError(null);
    try {
      await removeAvatar(user.id);
    } catch (err) {
      console.error('[Settings] remover avatar', err);
      setAvatarError('Não foi possível remover a foto. Tente novamente.');
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      // A conta já não existe: encerra a sessão deste navegador e volta para o início.
      await supabase.auth.signOut().catch(() => undefined);
      window.location.assign('/');
    } catch (err) {
      console.error('[Settings] excluir conta', err);
      setDeleteError(err instanceof DeleteAccountError ? err.message : 'Não foi possível excluir a conta agora. Tente novamente.');
      setDeleting(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const newPhone = phone.trim();
    // Quem já tem telefone só pode trocá-lo; a remoção é um pedido LGPD ao suporte.
    if ((newPhone || savedPhone) && !isValidPhone(newPhone)) {
      setMessage({ type: 'error', text: 'Informe um telefone válido, com DDD.' });
      return;
    }
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      });

      if (error) throw error;

      if (newPhone !== savedPhone) {
        const { error: phoneError } = await supabase
          .from('profiles')
          .update({ phone: newPhone })
          .eq('id', userId);

        if (phoneError) throw phoneError;
        setSavedPhone(newPhone);
      }
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem.' });
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres.' });
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <PageHeader
        className="mb-0 sm:mb-0"
        leading={onBack && <BackButton onClick={onBack} />}
        eyebrow="Conta"
        title="Configurações da Conta"
        description="Gerencie seus dados pessoais e segurança."
      />

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-2 border text-sm ${
          message.type === 'success' 
            ? 'bg-success/10 text-success-fg border-success/20' 
            : 'bg-danger/10 text-danger-fg border-danger/20'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} className="shrink-0" /> : <AlertCircle size={20} className="shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Profile Section */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-tint/3 border border-tint/8 rounded-lg text-accent-fg">
            <User size={22} />
          </div>
          <h3 className="font-display text-lg font-semibold text-fg">Perfil</h3>
        </div>

        {/* Foto de perfil */}
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-tint/8 bg-tint/2 p-4">
          <Avatar name={fullName || user?.email || '?'} userId={user?.id} className="h-20 w-20 text-2xl" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-fg">Foto de perfil</p>
            <p className="mt-0.5 text-xs text-fg-muted">Aparece no menu e nas suas mensagens do Fórum. A imagem é recortada em quadrado.</p>
            {avatarsEnabled ? (
              <div className="mt-2.5 flex flex-wrap gap-2">
                <input ref={avatarInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => void handleAvatarFile(e.target.files?.[0])} />
                <Button type="button" size="sm" variant="secondary" disabled={avatarBusy} onClick={() => avatarInput.current?.click()}>
                  {avatarBusy ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
                  {myAvatarKey ? 'Trocar foto' : 'Enviar foto'}
                </Button>
                {myAvatarKey && (
                  <Button type="button" size="sm" variant="ghost" disabled={avatarBusy} onClick={() => void handleRemoveAvatar()}>
                    <Trash2 size={15} /> Remover
                  </Button>
                )}
              </div>
            ) : (
              <p className="mt-2 text-xs text-fg-subtle">O envio de fotos não está disponível no momento.</p>
            )}
            {avatarError && <p className="mt-2 text-xs text-danger-fg">{avatarError}</p>}
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <Label>Nome Completo</Label>
            <Input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="settings-phone">Telefone (com DDD)</Label>
            <Input
              id="settings-phone"
              type="tel"
              maxLength={30}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              autoComplete="tel"
            />
            <p className="mt-1.5 text-xs text-fg-subtle">Usado para suporte e avisos da plataforma, inclusive por WhatsApp.</p>
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Salvar Alterações
            </Button>
          </div>
        </form>
      </Card>

      {/* Security Section */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-tint/3 border border-tint/8 rounded-lg text-accent-fg">
            <Lock size={22} />
          </div>
          <h3 className="font-display text-lg font-semibold text-fg">Segurança</h3>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nova Senha</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div>
              <Label>Confirmar Senha</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={loading || !newPassword}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Alterar Senha
            </Button>
          </div>
        </form>
      </Card>

      {/* Privacidade e documentos (LGPD) */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-tint/3 border border-tint/8 rounded-lg text-accent-fg">
            <ShieldCheck size={22} />
          </div>
          <h3 className="font-display text-lg font-semibold text-fg">Privacidade e documentos</h3>
        </div>

        <ul className="divide-y divide-tint/6 rounded-xl border border-tint/8 overflow-hidden">
          {LEGAL_DOCS.map((doc) => (
            <li key={doc.href}>
              <a
                href={doc.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-fg hover:bg-tint/3 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60"
              >
                <span className="flex items-center gap-2"><FileText size={16} className="text-fg-subtle shrink-0" /> {doc.label}</span>
                <ExternalLink size={14} className="text-fg-subtle shrink-0" aria-hidden />
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-4 rounded-xl bg-tint/3 border border-tint/8 p-4">
          <p className="text-sm text-fg-muted leading-relaxed">
            Você pode pedir a exclusão da sua conta, uma cópia dos seus dados pessoais ou exercer outros direitos previstos na LGPD.
          </p>
          <p className="mt-2 text-sm text-fg-muted leading-relaxed">
            Para uma cópia dos seus dados ou outros direitos, fale com o suporte da Trader AFK pelos canais de atendimento da plataforma. A exclusão da conta você faz sozinho, na seção abaixo.
          </p>
        </div>
      </Card>

      {/* Excluir a conta */}
      <Card className="border-danger/20">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg border border-danger/20 bg-danger/10 p-2 text-danger-fg"><TriangleAlert size={22} /></div>
          <h3 className="font-display text-lg font-semibold text-fg">Excluir conta</h3>
        </div>
        {role === 'admin' ? (
          <p className="text-sm text-fg-muted leading-relaxed">Contas de administrador não podem ser excluídas por aqui. Para encerrar esta conta, transfira a administração antes.</p>
        ) : (
          <>
            <p className="text-sm text-fg-muted leading-relaxed">
              Exclui sua conta e apaga seus dados: login, perfil e foto, diário de operações, progresso na Trilha, <strong className="text-fg">Coins</strong> e licenças.
              Suas mensagens no Fórum continuam publicadas, sem seu nome nem sua foto. Essa ação <strong className="text-fg">não tem volta</strong> e os Coins não são reembolsados.
            </p>
            <div className="mt-4 flex justify-end">
              <Button variant="danger" onClick={() => { setDeleteText(''); setDeleteError(null); setDeleteOpen(true); }}>
                <Trash2 size={16} /> Excluir minha conta
              </Button>
            </div>
          </>
        )}
      </Card>

      <Modal
        open={deleteOpen}
        onClose={() => { if (!deleting) setDeleteOpen(false); }}
        title="Excluir sua conta?"
        description="Essa ação é permanente."
        closeOnOverlay={false}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancelar</Button>
            <Button variant="danger" onClick={() => void handleDeleteAccount()} isLoading={deleting} disabled={deleteText.trim().toUpperCase() !== 'EXCLUIR'}>
              Excluir definitivamente
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-fg-muted leading-relaxed">
            Você perderá o acesso à plataforma e seus dados serão apagados, incluindo o diário, o progresso, as licenças e os Coins. Suas mensagens no Fórum permanecem, como "Usuário excluído".
          </p>
          <div>
            <Label htmlFor="delete-confirm">Para confirmar, digite <strong className="text-fg">EXCLUIR</strong></Label>
            <Input id="delete-confirm" value={deleteText} onChange={(e) => setDeleteText(e.target.value)} autoComplete="off" placeholder="EXCLUIR" />
          </div>
          {deleteError && <p className="text-sm text-danger-fg">{deleteError}</p>}
        </div>
      </Modal>
    </div>
  );
};
