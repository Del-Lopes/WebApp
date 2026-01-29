
import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Logo } from '../Logo';
import { LogIn, AlertCircle, Loader2 } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: email.split('@')[0],
            },
          },
        });
        if (error) throw error;
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <div className="flex flex-col items-center gap-3 mb-6">
            <div className="w-16 h-16">
              <Logo className="w-full h-full" variant="mobile" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              Tradexperience
            </span>
          </div>
          
          <h1 className="text-xl font-medium text-slate-600">
            {mode === 'signin' ? 'Bem-vindo' : mode === 'signup' ? 'Criar nova conta' : 'Recuperar Senha'}
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            {mode === 'signin' 
              ? 'Entre para acessar a área de membros' 
              : mode === 'signup'
              ? 'Preencha seus dados para começar'
              : 'Digite seu email para receber o link'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl flex items-center gap-2 border border-red-100">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 bg-green-50 text-green-600 text-sm rounded-xl flex items-center gap-2 border border-green-100">
            <AlertCircle size={16} className="shrink-0" />
            {message}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all placeholder:text-slate-400"
              placeholder="seu@email.com"
            />
          </div>
          
          {mode !== 'forgot' && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium text-slate-700">Senha</label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError(null);
                      setMessage(null);
                    }}
                    className="text-xs text-green-600 hover:text-green-700 font-medium"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all placeholder:text-slate-400"
                placeholder="••••••••"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-green-600/20 hover:shadow-green-600/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : mode === 'signin' ? (
              'Entrar'
            ) : mode === 'signup' ? (
              'Cadastrar'
            ) : (
              'Enviar Link de Recuperação'
            )}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          {mode === 'forgot' ? (
             <button
              onClick={() => {
                setMode('signin');
                setError(null);
                setMessage(null);
              }}
              className="text-sm text-slate-600 hover:text-green-600 font-medium transition-colors"
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
              className="text-sm text-slate-600 hover:text-green-600 font-medium transition-colors"
            >
              {mode === 'signin' 
                ? 'Não tem uma conta? Crie agora' 
                : 'Já tem conta? Fazer login'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
