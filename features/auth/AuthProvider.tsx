import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import {
  deleteCurrentUserAccount,
  ensureUserProfile,
  mapAuthUser,
  sendPasswordReset,
  signIn as signInUser,
  signOutUser,
  signUp as signUpUser,
  subscribeToAuth,
  updateUserDisplayName,
} from '@/features/auth/api';
import type { AuthContextValue, AuthStatus, AuthUser, UserProfile } from '@/features/auth/types';
import { requireSupabaseClient, supabaseConfigError, isSupabaseConfigured } from '@/services/supabase';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(isSupabaseConfigured ? 'loading' : 'signedOut');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setStatus('signedOut');
      return;
    }

    const unsubscribe = subscribeToAuth(async (supabaseUser) => {
      if (!supabaseUser) {
        setUser(null);
        setProfile(null);
        setStatus('signedOut');
        return;
      }

      setStatus('loading');
      setUser(mapAuthUser(supabaseUser));

      try {
        const nextProfile = await ensureUserProfile(supabaseUser);
        setProfile(nextProfile);
      } catch {
        setProfile(null);
      }

      setStatus('signedIn');
    });

    return unsubscribe;
  }, []);

  async function syncCurrentUserProfile() {
    const { data, error } = await requireSupabaseClient().auth.getUser();

    if (error || !data.user) {
      return;
    }

    setUser(mapAuthUser(data.user));
    const nextProfile = await ensureUserProfile(data.user);
    setProfile(nextProfile);
  }

  const value: AuthContextValue = {
    status,
    user,
    profile,
    isConfigured: isSupabaseConfigured,
    configError: supabaseConfigError,
    signIn: signInUser,
    signUp: signUpUser,
    signOut: signOutUser,
    updateDisplayName: async (displayName) => {
      await updateUserDisplayName(displayName);
      await syncCurrentUserProfile();
    },
    sendPasswordReset,
    deleteAccount: deleteCurrentUserAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
