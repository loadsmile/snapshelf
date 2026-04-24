import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { ensureUserProfile, mapAuthUser, signIn as signInUser, signOutUser, signUp as signUpUser, subscribeToAuth } from '@/features/auth/api';
import type { AuthContextValue, AuthStatus, AuthUser, UserProfile } from '@/features/auth/types';
import { firebaseConfigError, isFirebaseConfigured } from '@/services/firebase';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(isFirebaseConfigured ? 'loading' : 'signedOut');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setStatus('signedOut');
      return;
    }

    const unsubscribe = subscribeToAuth(async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setProfile(null);
        setStatus('signedOut');
        return;
      }

      setStatus('loading');
      setUser(mapAuthUser(firebaseUser));

      try {
        const nextProfile = await ensureUserProfile(firebaseUser);
        setProfile(nextProfile);
      } catch {
        setProfile(null);
      }

      setStatus('signedIn');
    });

    return unsubscribe;
  }, []);

  const value: AuthContextValue = {
    status,
    user,
    profile,
    isConfigured: isFirebaseConfigured,
    configError: firebaseConfigError,
    signIn: signInUser,
    signUp: signUpUser,
    signOut: signOutUser,
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
