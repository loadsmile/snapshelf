const supabaseEnv = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  publishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
};

export const missingSupabaseEnv = Object.entries({
  EXPO_PUBLIC_SUPABASE_URL: supabaseEnv.url,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabaseEnv.publishableKey,
})
  .filter(([, value]) => !value)
  .map(([key]) => key);

export const isSupabaseConfigured = missingSupabaseEnv.length === 0;

export const supabaseConfigError = isSupabaseConfigured
  ? null
  : `Missing Supabase environment values: ${missingSupabaseEnv.join(', ')}`;

export { supabaseEnv };
