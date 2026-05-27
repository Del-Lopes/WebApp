import React, { createContext, useContext, useEffect, useState } from 'react';
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Carga inicial: atualiza last_login pois é o primeiro carregamento da sessão
        fetchUserRole(session.user.id, true);
      } else {
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      } else if (event === 'SIGNED_OUT') {
        setIsPasswordRecovery(false);
      }

      if (session?.user) {
        // Apenas SIGNED_IN é login real — TOKEN_REFRESHED é renovação automática
        // a cada hora e não deve gerar UPDATE em profiles nem query extra de role.
        const isRealLogin = event === 'SIGNED_IN';
        fetchUserRole(session.user.id, isRealLogin);
      } else {
        setRole(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Roda uma única vez — a subscription cobre mudanças de sessão

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

  const fetchUserRole = async (userId: string, shouldUpdateLastLogin = false) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching role:', error);
        setRole('client');
      } else {
        const userRole = (data?.role as UserRole) || 'client';

        if (shouldUpdateLastLogin) {
          const updateFields: any = { last_login: new Date().toISOString() };
          if (session?.user?.email && !data?.email) {
            updateFields.email = session.user.email;
          }
          await supabase.from('profiles').update(updateFields).eq('id', userId);
        }

        setRole(userRole);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshRole = async () => {
      if (user) {
          await fetchUserRole(user.id);
      }
  };

  const signIn = async () => {
    // For now, simpler implementation - redirect to generic login
    // In production, this would trigger specific provider or email flow
    console.log("Sign in triggered");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, role, session, isLoading, signIn, signOut, refreshRole, isPasswordRecovery }}>
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
