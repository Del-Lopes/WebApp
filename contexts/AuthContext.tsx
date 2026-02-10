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
        fetchUserRole(session.user.id);
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
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
         // Reset flag on normal sign in to avoid stuck state, but NOT on initial load if recovery flow
      } else if (event === 'SIGNED_OUT') {
        setIsPasswordRecovery(false);
      }

      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setRole(null);
        setIsLoading(false);
      }
    });

    // Real-time subscription to profile changes
    const profileSubscription = supabase
      .channel('public:profiles')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'profiles',
        filter: session?.user ? `id=eq.${session.user.id}` : undefined
      }, (payload) => {
        if (payload.new && 'role' in payload.new) {
             console.log("Role updated via realtime:", payload.new.role);
             setRole(payload.new.role as UserRole);
        }
      })
      .subscribe();

    return () => {
        subscription.unsubscribe();
        supabase.removeChannel(profileSubscription);
    };
  }, [session?.user?.id]); // Re-subscribe if user changes

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching role:', error);
        setRole('client'); // Default role
      } else {
        let userRole = (data?.role as UserRole) || 'client';
        
        // We rely on the DB role now. The partner request check should ideally be handled by a trigger or admin action updating the profile role.
        // However, keeping this check for legacy compatibility or if the upgrade logic is strictly frontend-based (not recommended).
        // Since we now update profile.role directly in AdminPanel, the DB source of truth is profiles.role.
        
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
