import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { authStorage } from '@/services/auth-storage';
import { isSupabaseConfigured, supabaseConfigError, supabaseEnv } from '@/shared/config/env';

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseEnv.url, supabaseEnv.publishableKey, {
      auth: {
        storage: authStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

export function requireSupabaseClient() {
  if (!supabase) {
    throw new Error(supabaseConfigError ?? 'Supabase has not been configured yet.');
  }

  return supabase;
}

export { isSupabaseConfigured, supabaseConfigError };
