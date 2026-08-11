import type { SupabaseClient } from '@supabase/supabase-js';

import { getDeviceId } from '@/services/device';

export type MediaLocationConfig = {
  table: 'snap_media_locations' | 'shelf_cover_locations' | 'stack_cover_locations';
  entityColumn: 'snap_id' | 'shelf_id' | 'stack_id';
};

type MediaLocationRow = {
  local_path: string;
  snap_id?: string;
  shelf_id?: string;
  stack_id?: string;
};

const LOCATION_QUERY_CHUNK_SIZE = 200;

export async function getMediaLocationMap(
  client: SupabaseClient,
  userId: string,
  config: MediaLocationConfig,
  entityIds: string[],
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(entityIds)];
  const locations = new Map<string, string>();

  if (uniqueIds.length === 0) {
    return locations;
  }

  const deviceId = await getDeviceId();

  for (let index = 0; index < uniqueIds.length; index += LOCATION_QUERY_CHUNK_SIZE) {
    const ids = uniqueIds.slice(index, index + LOCATION_QUERY_CHUNK_SIZE);
    const { data, error } = await client
      .from(config.table)
      .select(`${config.entityColumn},local_path`)
      .eq('user_id', userId)
      .eq('device_id', deviceId)
      .in(config.entityColumn, ids);

    if (error) {
      throw error;
    }

    for (const row of (data as unknown as MediaLocationRow[] | null) ?? []) {
      const entityId = row[config.entityColumn];

      if (entityId && row.local_path) {
        locations.set(entityId, row.local_path);
      }
    }
  }

  return locations;
}

export async function setMediaLocation(
  client: SupabaseClient,
  userId: string,
  config: MediaLocationConfig,
  entityId: string,
  localPath: string | null,
): Promise<void> {
  const deviceId = await getDeviceId();

  if (!localPath) {
    const { error } = await client
      .from(config.table)
      .delete()
      .eq('user_id', userId)
      .eq('device_id', deviceId)
      .eq(config.entityColumn, entityId);

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await client.from(config.table).upsert(
    {
      user_id: userId,
      device_id: deviceId,
      [config.entityColumn]: entityId,
      local_path: localPath,
    },
    { onConflict: `user_id,device_id,${config.entityColumn}` },
  );

  if (error) {
    throw error;
  }
}

export async function listCurrentDeviceMediaPaths(
  client: SupabaseClient,
  userId: string,
  tables: MediaLocationConfig['table'][],
): Promise<string[]> {
  const deviceId = await getDeviceId();
  const paths = new Set<string>();

  for (const table of tables) {
    const { data, error } = await client
      .from(table)
      .select('local_path')
      .eq('user_id', userId)
      .eq('device_id', deviceId);

    if (error) {
      throw error;
    }

    for (const row of (data as Array<{ local_path: string | null }> | null) ?? []) {
      if (row.local_path) {
        paths.add(row.local_path);
      }
    }
  }

  return [...paths];
}
