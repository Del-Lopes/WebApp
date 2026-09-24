
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Lock, Save, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BackButton } from './BackButton';
import { Button, Card, Input, Label, PageHeader } from './ui';

interface SettingsProps {
  onBack?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Profile State
  const [fullName, setFullName] = useState('');
  
  // Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setFullName(user.user_metadata.full_name);
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      });

      if (error) throw error;
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

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <Label>Nome Completo</Label>
            <Input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
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
    </div>
  );
};
