// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Origin': '*',
};

const STORAGE_PAGE_SIZE = 1000;
const STORAGE_REMOVE_BATCH_SIZE = 1000;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
    status,
  });
}

async function listStorageObjectPaths(storage, bucket: string, prefix: string): Promise<string[]> {
  const paths: string[] = [];

  for (let offset = 0; ; offset += STORAGE_PAGE_SIZE) {
    const { data, error } = await storage.from(bucket).list(prefix, {
      limit: STORAGE_PAGE_SIZE,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      throw error;
    }

    for (const item of data ?? []) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;

      if (item.id === null) {
        paths.push(...(await listStorageObjectPaths(storage, bucket, path)));
      } else {
        paths.push(path);
      }
    }

    if ((data?.length ?? 0) < STORAGE_PAGE_SIZE) {
      return paths;
    }
  }
}

async function removeStorageObjectPaths(storage, bucket: string, paths: string[]) {
  for (let index = 0; index < paths.length; index += STORAGE_REMOVE_BATCH_SIZE) {
    const batch = paths.slice(index, index + STORAGE_REMOVE_BATCH_SIZE);
    const { error } = await storage.from(bucket).remove(batch);

    if (error) {
      throw error;
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  let body: { password?: unknown };

  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Missing request body.' }, 400);
  }

  const password = typeof body.password === 'string' ? body.password : '';

  if (!password) {
    return jsonResponse({ error: 'Password confirmation is required.' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'Account deletion is not configured.' }, 500);
  }

  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    return jsonResponse({ error: 'Missing authorization header.' }, 401);
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ error: 'Invalid session.' }, 401);
  }

  if (!user.email) {
    return jsonResponse({ error: 'Account deletion requires an email/password account.' }, 400);
  }

  const { error: verificationError } = await userClient.auth.signInWithPassword({
    email: user.email,
    password,
  });

  if (verificationError) {
    return jsonResponse({ error: 'Password confirmation failed.' }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  let storagePaths: string[];

  try {
    storagePaths = await listStorageObjectPaths(adminClient.storage, 'snap-media', user.id);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unable to list account storage objects.' }, 500);
  }

  try {
    await removeStorageObjectPaths(adminClient.storage, 'snap-media', storagePaths);
  } catch (error) {
    console.warn('Unable to remove all account storage objects before user deletion.', error);
    return jsonResponse({ error: 'Unable to remove all account storage objects.' }, 500);
  }

  const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(user.id);

  if (deleteUserError) {
    return jsonResponse({ error: deleteUserError.message }, 500);
  }

  return jsonResponse({ ok: true });
});
