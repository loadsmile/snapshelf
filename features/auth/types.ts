export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

export type AuthUser = {
  id: string;
  email: string | null;
  displayName: string | null;
};

export type UserProfile = {
  id: string;
  email: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  profile: UserProfile | null;
  isConfigured: boolean;
  configError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};
