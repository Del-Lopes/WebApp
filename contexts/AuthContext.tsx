import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  session: Session | null;
  isLoading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
  isPasswordRecovery: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  // Usuário cujo role já foi carregado nesta aba. O supabase-js emite
  // INITIAL_SESSION + SIGNED_IN no boot e SIGNED_IN de novo ao focar a aba;
  // só a troca de usuário justifica nova query de role e UPDATE de last_login.
  const loadedUserIdRef = useRef<string | null>(null);

  const fetchUserRole = useCallback(async (userId: string, loginEmail?: string | null, shouldUpdateLastLogin = false) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('id', userId)
        .single();

      // Resposta atrasada de um usuário que já saiu: descarta.
      if (loadedUserIdRef.current !== userId) return;

      if (error) {
        console.error('Error fetching role:', error);
        setRole('client');
      } else {
        const userRole = (data?.role as UserRole) || 'client';

        if (shouldUpdateLastLogin) {
          const updateFields: { last_login: string; email?: string } = { last_login: new Date().toISOString() };
          if (loginEmail && !data?.email) {
            updateFields.email = loginEmail;
          }
          // Não segura o render: o role já está disponível.
          supabase.from('profiles').update(updateFields).eq('id', userId)
            .then(({ error: updateError }) => {
              if (updateError) console.error('Error updating last_login:', updateError);
            });
        }

        setRole(userRole);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      if (loadedUserIdRef.current === userId) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // onAuthStateChange já emite INITIAL_SESSION com a sessão salva, então
    // não é preciso chamar getSession() à parte (dobrava a query de role).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      const nextUser = session?.user ?? null;
      // Mantém a mesma referência de user enquanto o id não muda (ex.:
      // TOKEN_REFRESHED), para não disparar os efeitos [user] do app inteiro.
      setUser((prev) => {
        if (event === 'USER_UPDATED') return nextUser;
        return prev?.id === nextUser?.id ? prev : nextUser;
      });

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      } else if (event === 'SIGNED_OUT') {
        setIsPasswordRecovery(false);
      }

      if (nextUser) {
        if (loadedUserIdRef.current === nextUser.id) return;
        loadedUserIdRef.current = nextUser.id;
        // setTimeout: o supabase-js recomenda não chamar a API de dentro do
        // callback (ele roda segurando o lock de auth).
        const email = nextUser.email ?? null;
        setTimeout(() => { fetchUserRole(nextUser.id, email, true); }, 0);
      } else {
        loadedUserIdRef.current = null;
        setRole(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserRole]); // Roda uma única vez — a subscription cobre mudanças de sessão

  // Subscription separada, criada somente quando o userId está disponível
  useEffect(() => {
    if (!user?.id) return;

    const profileSubscription = supabase
      .channel(`profiles:${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`,
      }, (payload) => {
        if (payload.new && 'role' in payload.new) {
          setRole(payload.new.role as UserRole);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profileSubscription);
    };
  }, [user?.id]); // Re-subscribe somente quando o userId muda (login/logout)

  const userId = user?.id;
  const refreshRole = useCallback(async () => {
    if (userId) {
      await fetchUserRole(userId);
    }
  }, [userId, fetchUserRole]);

  const signIn = useCallback(async () => {
    // For now, simpler implementation - redirect to generic login
    // In production, this would trigger specific provider or email flow
    console.log("Sign in triggered");
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({ user, role, session, isLoading, signIn, signOut, refreshRole, isPasswordRecovery }),
    [user, role, session, isLoading, signIn, signOut, refreshRole, isPasswordRecovery]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
