
import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Logo } from '../Logo';
import { AlertCircle } from 'lucide-react';
import { Button, Input, Label } from '../ui';

// Versão vigente dos documentos legais aceitos no cadastro (gravada em user_metadata).
const TERMS_VERSION = '2026-09-26';
const LEGAL_LINKS = [
  { href: '/legal/termos.html', label: 'Termos de Uso' },
  { href: '/legal/privacidade.html', label: 'Política de Privacidade' },
  { href: '/legal/risco.html', label: 'Aviso de Risco' },
] as const;
const LEGAL_LINK_CLASS = 'text-accent-fg font-medium hover:underline underline-offset-4 rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [message, setMessage] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signup' && !acceptedTerms) {
      setError('Para criar a conta, confirme que tem 18 anos ou mais e aceite os Termos de Uso, a Política de Privacidade e o Aviso de Risco.');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: fullName,
              // Registro do aceite dos documentos legais (sem migration: fica no user_metadata).
              terms_version: TERMS_VERSION,
              terms_accepted_at: new Date().toISOString(),
            },
          },
        });
        if (error) throw error;

        // Ensure profile is created/updated with email and full_name
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: email,
            full_name: fullName,
            role: 'client'
          });
        }

        setMessage('Cadastro realizado! Verifique seu email para confirmar.');
      } else if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMessage('Email de recuperação enviado! Verifique sua caixa de entrada.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-page text-fg flex items-center justify-center p-4">
      {/* Ambientação: grid esmaecido, brilhos verdes difusos e linha fina */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-grid-fade opacity-70" />
        <div className="absolute left-1/2 top-[30%] h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-green/[0.07] blur-[140px]" />
        <div className="absolute -left-40 bottom-0 h-[420px] w-[420px] rounded-full bg-brand-green/[0.05] blur-[120px]" />
        <div className="hairline absolute inset-x-0 top-[22%] opacity-40" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="glass-card overflow-hidden p-8 sm:p-10">
          <div className="hairline absolute inset-x-0 top-0" aria-hidden />
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-3 mb-6">
              <div className="w-14 h-14">
                <Logo className="w-full h-full" variant="mobile" />
              </div>
              <span className="font-display text-2xl font-semibold tracking-tight text-fg">
                Trader <span className="text-gradient-brand">AFK</span>
              </span>
            </div>
            
            <h1 className="font-display text-xl font-medium text-fg">
              {mode === 'signin' ? 'Bem-vindo' : mode === 'signup' ? 'Criar nova conta' : 'Recuperar Senha'}
            </h1>
            <p className="text-fg-muted mt-2 text-sm">
              {mode === 'signin' 
                ? 'Entre para acessar a área de membros' 
                : mode === 'signup'
                ? 'Preencha seus dados para começar'
                : 'Digite seu email para receber o link'}
            </p>
          </div>

          {error && (
            <div role="alert" className="mb-6 p-3.5 bg-danger/10 text-danger-fg text-sm rounded-xl flex items-center gap-2 border border-danger/20">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          {message && (
            <div role="status" className="mb-6 p-3.5 bg-success/10 text-success-fg text-sm rounded-xl flex items-center gap-2 border border-success/20">
              <AlertCircle size={16} className="shrink-0" />
              {message}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <Label htmlFor="login-name">Nome Completo</Label>
                <Input
                  id="login-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="py-3"
                  placeholder="Seu Nome"
                  autoComplete="name"
                />
              </div>
            )}
            <div>
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="py-3"
                placeholder="seu@email.com"
                autoComplete="email"
              />
            </div>
            
            {mode !== 'forgot' && (
              <div>
                <Label htmlFor="login-password">Senha</Label>
                <Input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="py-3"
                  placeholder="••••••••"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
                {mode === 'signin' && (
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setError(null);
                        setMessage(null);
                      }}
                      className="text-xs text-accent-fg hover:underline underline-offset-4 font-medium"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                )}
              </div>
            )}

            {mode === 'signup' && (
              <div className="flex items-start gap-2.5 rounded-xl bg-tint/3 border border-tint/8 p-3">
                <input
                  id="login-accept-terms"
                  type="checkbox"
                  required
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded-sm accent-accent"
                />
                <label htmlFor="login-accept-terms" className="text-xs text-fg-muted leading-relaxed cursor-pointer">
                  Tenho 18 anos ou mais e li e aceito os{' '}
                  <a href={LEGAL_LINKS[0].href} target="_blank" rel="noopener noreferrer" className={LEGAL_LINK_CLASS}>{LEGAL_LINKS[0].label}</a>, a{' '}
                  <a href={LEGAL_LINKS[1].href} target="_blank" rel="noopener noreferrer" className={LEGAL_LINK_CLASS}>{LEGAL_LINKS[1].label}</a> e o{' '}
                  <a href={LEGAL_LINKS[2].href} target="_blank" rel="noopener noreferrer" className={LEGAL_LINK_CLASS}>{LEGAL_LINKS[2].label}</a>.
                </label>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              isLoading={loading}
              disabled={mode === 'signup' && !acceptedTerms}
              className="w-full"
            >
              {loading ? null : mode === 'signin' ? (
                'Entrar'
              ) : mode === 'signup' ? (
                'Cadastrar'
              ) : (
                'Enviar Link de Recuperação'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {mode === 'forgot' ? (
               <button
                onClick={() => {
                  setMode('signin');
                  setError(null);
                  setMessage(null);
                }}
                className="text-sm text-fg-muted hover:text-accent-fg font-medium transition-colors"
              >
                Voltar para Login
              </button>
            ) : (
              <button
                onClick={() => {
                  setMode(mode === 'signin' ? 'signup' : 'signin');
                  setError(null);
                  setMessage(null);
                }}
                className="text-sm text-fg-muted hover:text-accent-fg font-medium transition-colors"
              >
                {mode === 'signin' 
                  ? 'Não tem uma conta? Crie agora' 
                  : 'Já tem conta? Fazer login'}
              </button>
            )}
          </div>

          {mode === 'signin' && (
            <p className="mt-6 pt-4 border-t border-tint/6 text-center text-[11px] text-fg-subtle leading-relaxed">
              {LEGAL_LINKS.map((l, i) => (
                <React.Fragment key={l.href}>
                  {i > 0 && <span aria-hidden> · </span>}
                  <a href={l.href} target="_blank" rel="noopener noreferrer" className="hover:text-accent-fg hover:underline underline-offset-4 rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60">
                    {l.label}
                  </a>
                </React.Fragment>
              ))}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
