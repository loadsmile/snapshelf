import type { EmailOtpType, SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

import type { AuthUser, SignUpResult, UserProfile } from '@/features/auth/types';
import { deleteImageLocally } from '@/features/images/local';
import { listCurrentDeviceMediaPaths } from '@/features/images/locations';
import { requireSupabaseClient } from '@/services/supabase';

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function toDate(value: unknown) {
  return typeof value === 'string' ? new Date(value) : null;
}

function getDisplayName(user: SupabaseUser) {
  const displayName = user.user_metadata?.display_name;
  return typeof displayName === 'string' ? displayName : null;
}

export function mapAuthUser(user: SupabaseUser): AuthUser {
  return {
    id: user.id,
    email: user.email ?? null,
    displayName: getDisplayName(user),
  };
}

function mapUserProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  };
}

function isMissingProfileError(error: { code?: string; message?: string } | null) {
  return error?.code === 'PGRST116' || error?.message?.toLowerCase().includes('no rows') === true;
}

async function getCurrentUser() {
  const client = requireSupabaseClient();
  const { data, error } = await client.auth.getUser();

  if (error) {
    throw error;
  }

  return data.user;
}

async function collectAccountLocalMediaPaths(client: SupabaseClient, userId: string): Promise<string[]> {
  return listCurrentDeviceMediaPaths(client, userId, [
    'snap_media_locations',
    'shelf_cover_locations',
    'stack_cover_locations',
  ]);
}

async function deleteAccountLocalMedia(localPaths: string[]) {
  await Promise.allSettled(localPaths.map((localPath) => deleteImageLocally(localPath)));
}

export async function ensureUserProfile(user: SupabaseUser): Promise<UserProfile> {
  const client = requireSupabaseClient();
  const { data: existingProfile, error: readError } = await client
    .from('profiles')
    .select('id,email,display_name,created_at,updated_at')
    .eq('id', user.id)
    .maybeSingle<ProfileRow>();

  if (readError && !isMissingProfileError(readError)) {
    throw readError;
  }

  const profilePatch = {
    id: user.id,
    email: user.email ?? existingProfile?.email ?? null,
    display_name: existingProfile?.display_name ?? getDisplayName(user),
    updated_at: new Date().toISOString(),
  };

  const query = existingProfile
    ? client.from('profiles').update(profilePatch).eq('id', user.id)
    : client.from('profiles').insert(profilePatch);
  const { data: syncedProfile, error: syncError } = await query
    .select('id,email,display_name,created_at,updated_at')
    .single<ProfileRow>();

  if (syncError) {
    throw syncError;
  }

  return mapUserProfile(syncedProfile);
}

export async function signUp(email: string, password: string): Promise<SignUpResult> {
  const client = requireSupabaseClient();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: Linking.createURL('/auth-callback'),
    },
  });

  if (error) {
    throw error;
  }

  if (data.session && data.user) {
    await ensureUserProfile(data.user);
  }

  return {
    requiresEmailConfirmation: !data.session,
  };
}

export async function signIn(email: string, password: string): Promise<void> {
  const client = requireSupabaseClient();
  const { error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }
}

export async function signOutUser(): Promise<void> {
  const client = requireSupabaseClient();
  const { error } = await client.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function updateUserDisplayName(displayName: string): Promise<void> {
  const client = requireSupabaseClient();
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error('Sign in again before updating your profile.');
  }

  const trimmedDisplayName = displayName.trim();

  if (trimmedDisplayName.length > 80) {
    throw new Error('Display name must be 80 characters or fewer.');
  }

  const nextDisplayName = trimmedDisplayName || null;
  const { error: metadataError } = await client.auth.updateUser({
    data: {
      display_name: nextDisplayName,
    },
  });

  if (metadataError) {
    throw metadataError;
  }

  const { error: profileError } = await client
    .from('profiles')
    .update({
      email: currentUser.email ?? null,
      display_name: nextDisplayName,
      updated_at: new Date().toISOString(),
    })
    .eq('id', currentUser.id);

  if (profileError) {
    throw profileError;
  }
}

export async function sendPasswordReset(): Promise<void> {
  const currentUser = await getCurrentUser();

  if (!currentUser?.email) {
    throw new Error('This account does not have an email address for password reset.');
  }

  await requestPasswordReset(currentUser.email);
}

export async function requestPasswordReset(email: string): Promise<void> {
  const client = requireSupabaseClient();
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: Linking.createURL('/reset-password'),
  });

  if (error) {
    throw error;
  }
}

function getAuthRedirectParams(url: string) {
  const queryStart = url.indexOf('?');
  const hashStart = url.indexOf('#');
  const queryEnd = hashStart >= 0 ? hashStart : url.length;
  const query = queryStart >= 0 ? url.slice(queryStart + 1, queryEnd) : '';
  const hash = hashStart >= 0 ? url.slice(hashStart + 1) : '';
  const params = new URLSearchParams(query);

  new URLSearchParams(hash).forEach((value, key) => {
    params.set(key, value);
  });

  return params;
}

export async function completeAuthRedirect(
  url: string,
  expectedType?: 'confirmed' | 'recovery',
): Promise<'confirmed' | 'recovery'> {
  const client = requireSupabaseClient();
  const params = getAuthRedirectParams(url);
  const errorDescription = params.get('error_description') ?? params.get('error');

  if (errorDescription) {
    throw new Error(errorDescription.replace(/\+/g, ' '));
  }

  const type = params.get('type');
  const code = params.get('code');
  const tokenHash = params.get('token_hash');
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);

    if (error) {
      throw error;
    }
  } else if (tokenHash && type) {
    const { error } = await client.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });

    if (error) {
      throw error;
    }
  } else if (accessToken && refreshToken) {
    const { error } = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      throw error;
    }
  } else {
    throw new Error('This sign-in link is incomplete or has expired. Request a new email and try again.');
  }

  return type === 'recovery' || expectedType === 'recovery' ? 'recovery' : 'confirmed';
}

export async function updatePassword(password: string): Promise<void> {
  const client = requireSupabaseClient();
  const { error } = await client.auth.updateUser({ password });

  if (error) {
    throw error;
  }
}

export async function deleteCurrentUserAccount(password: string): Promise<void> {
  const client = requireSupabaseClient();
  const currentUser = await getCurrentUser();

  if (!currentUser?.email) {
    throw new Error('Sign in again before deleting this account.');
  }

  if (!password) {
    throw new Error('Enter your current password to delete this account.');
  }

  const { error: verificationError } = await client.auth.signInWithPassword({
    email: currentUser.email,
    password,
  });

  if (verificationError) {
    throw verificationError;
  }

  const localMediaPaths = await collectAccountLocalMediaPaths(client, currentUser.id);

  const { data, error } = await client.functions.invoke('delete-account', {
    body: { password },
  });

  if (error) {
    throw error;
  }

  if (!data || data.ok !== true) {
    throw new Error('SnapShelf could not confirm that account deletion completed.');
  }

  try {
    await deleteAccountLocalMedia(localMediaPaths);
  } finally {
    await client.auth.signOut({ scope: 'local' });
  }
}

export function subscribeToAuth(listener: (user: SupabaseUser | null) => void) {
  const client = requireSupabaseClient();
  let isSubscribed = true;

  client.auth.getSession().then(({ data }) => {
    if (isSubscribed) {
      listener(data.session?.user ?? null);
    }
  });

  const { data } = client.auth.onAuthStateChange((_event, session) => {
    listener(session?.user ?? null);
  });

  return () => {
    isSubscribed = false;
    data.subscription.unsubscribe();
  };
}

export function getAuthErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message ?? '');
    const code = 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
    const lowerMessage = message.toLowerCase();

    if (code === 'email_exists' || lowerMessage.includes('already registered')) {
      return 'That email is already in use.';
    }

    if (lowerMessage.includes('invalid email')) {
      return 'Enter a valid email address.';
    }

    if (lowerMessage.includes('invalid login credentials')) {
      return 'That email/password combination was not recognized.';
    }

    if (lowerMessage.includes('password')) {
      return message;
    }

    if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many')) {
      return 'Too many attempts. Please wait a moment and try again.';
    }

    if (lowerMessage.includes('row-level security') || lowerMessage.includes('permission denied')) {
      return 'Supabase permissions blocked this request. Check RLS policies for this table.';
    }

    if (lowerMessage.includes('failed to fetch') || lowerMessage.includes('network')) {
      return 'Network error. Check your connection and try again.';
    }

    return message || 'Something went wrong. Please try again.';
  }

  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
