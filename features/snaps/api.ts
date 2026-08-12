import * as Crypto from 'expo-crypto';

import type { CreateSnapInput, Snap, SnapSource, UpdateSnapInput } from '@/features/snaps/types';
import { clearShelfCoverSnap, touchShelf } from '@/features/shelves/api';
import { deleteImageLocally, saveImageLocally } from '@/features/images/local';
import { getMediaLocationMap, type MediaLocationConfig } from '@/features/images/locations';
import { getDeviceId } from '@/services/device';
import { requireSupabaseClient } from '@/services/supabase';

const DEFAULT_SNAP_PAGE_SIZE = 20;
export const MAX_SNAP_IMPORT_COUNT = 20;

export type SnapCursor = {
  createdAt: string;
  id: string;
};

type SnapPageResult = {
  cursor: SnapCursor | null;
  snaps: Snap[];
};

type SnapRow = {
  id: string;
  shelf_id: string | null;
  title: string | null;
  image_url: string | null;
  source_url: string | null;
  thought: string | null;
  labels: string[] | null;
  source: string | null;
  is_favorite: boolean | null;
  favorited_at: string | null;
  is_archived: boolean | null;
  archived_at: string | null;
  captured_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const snapColumns =
  'id,shelf_id,title,image_url,source_url,thought,labels,source,is_favorite,favorited_at,is_archived,archived_at,captured_at,created_at,updated_at';

const snapMediaLocation: MediaLocationConfig = {
  table: 'snap_media_locations',
  entityColumn: 'snap_id',
};

export class SnapSaveOutcomeUnknownError extends Error {
  readonly preserveLocalFile = true;

  constructor(message: string) {
    super(message);
    this.name = 'SnapSaveOutcomeUnknownError';
  }
}

export type SnapImportProgress = {
  completed: number;
  phase: 'copying' | 'saving';
  total: number;
};

export type SnapImageImport = {
  title?: string | null;
  uri: string;
};

export type SnapBulkFailure = {
  snapId: string;
  code: 'not_found' | 'outcome_unknown';
  message: string;
};

export type SnapBulkResult = {
  succeededIds: string[];
  failures: SnapBulkFailure[];
};

function toDate(value: unknown) {
  return typeof value === 'string' ? new Date(value) : null;
}

function toIsoString(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function getSnapUpdateTimestamp() {
  return new Date().toISOString();
}

function isSnapSource(value: unknown): value is SnapSource {
  return value === 'quick-snap' || value === 'camera-roll' || value === 'web-clip' || value === 'instagram' || value === 'manual' || value === 'unknown';
}

function getCursor(row: SnapRow | undefined): SnapCursor | null {
  return row?.created_at ? { createdAt: row.created_at, id: row.id } : null;
}

function mapSnapRow(row: SnapRow, localPath: string | null = null): Snap {
  return {
    id: row.id,
    shelfId: row.shelf_id,
    title: row.title,
    imageUrl: row.image_url,
    sourceUrl: row.source_url,
    localPath,
    thought: row.thought,
    labels: Array.isArray(row.labels) ? row.labels.filter((value): value is string => typeof value === 'string') : [],
    source: isSnapSource(row.source) ? row.source : 'unknown',
    isFavorite: row.is_favorite === true,
    favoritedAt: toDate(row.favorited_at),
    isArchived: row.is_archived === true,
    archivedAt: toDate(row.archived_at),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
    capturedAt: toDate(row.captured_at),
  };
}

async function mapSnapRowsForCurrentDevice(userId: string, rows: SnapRow[]): Promise<Snap[]> {
  const client = requireSupabaseClient();
  const locations = await getMediaLocationMap(client, userId, snapMediaLocation, rows.map((row) => row.id));
  return rows.map((row) => mapSnapRow(row, locations.get(row.id) ?? null));
}

async function listScopedSnaps(userId: string, shelfId: string | null, cursor?: SnapCursor | null, pageSize: number = DEFAULT_SNAP_PAGE_SIZE): Promise<SnapPageResult> {
  const client = requireSupabaseClient();
  let query = client.from('snaps').select(snapColumns).eq('user_id', userId);

  query = shelfId === null ? query.is('shelf_id', null) : query.eq('shelf_id', shelfId);

  if (cursor) {
    query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
  }

  const { data, error } = await query.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(pageSize);

  if (error) {
    throw error;
  }

  const rows = data as SnapRow[];

  return {
    cursor: getCursor(rows[rows.length - 1]),
    snaps: await mapSnapRowsForCurrentDevice(userId, rows),
  };
}

function subscribeToSnapRefetch(
  userId: string,
  refetch: (shouldApply: () => boolean) => Promise<void>,
  onError: ((error: Error) => void) | undefined,
  errorMessage: string,
) {
  const client = requireSupabaseClient();
  let isSubscribed = true;
  let latestRequest = 0;
  let isRefetching = false;
  let isRefetchQueued = false;

  const guardedRefetch = async () => {
    if (isRefetching) {
      isRefetchQueued = true;
      return;
    }

    isRefetching = true;

    do {
      isRefetchQueued = false;
      const request = ++latestRequest;

      try {
        await refetch(() => isSubscribed && request === latestRequest);
      } catch (error) {
        if (isSubscribed) {
          onError?.(error instanceof Error ? error : new Error(errorMessage));
        }
      }

    } while (isSubscribed && isRefetchQueued);

    isRefetching = false;
  };

  const channel = client
    .channel(`snaps:${userId}:${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'snaps',
        filter: `user_id=eq.${userId}`,
      },
      () => {
        void guardedRefetch();
      },
    )
    .subscribe((status, error) => {
      if (status === 'SUBSCRIBED') {
        void guardedRefetch();
      } else if (isSubscribed && (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT')) {
        onError?.(error instanceof Error ? error : new Error('Snap realtime subscription failed.'));
      }
    });

  return () => {
    isSubscribed = false;
    void client.removeChannel(channel);
  };
}

export async function createSnap(userId: string, input: CreateSnapInput): Promise<Snap> {
  const client = requireSupabaseClient();
  const deviceId = await getDeviceId();
  const targetSnapId = Crypto.randomUUID();
  const { data, error } = await client.rpc('create_snap_with_media', {
    target_snap_id: targetSnapId,
    target_device_id: deviceId,
    target_shelf_id: input.shelfId ?? null,
    snap_title: input.title ?? null,
    snap_image_url: input.imageUrl ?? null,
    snap_source_url: input.sourceUrl ?? null,
    snap_thought: input.thought ?? null,
    snap_labels: input.labels ?? [],
    snap_source: input.source ?? 'unknown',
    snap_is_favorite: input.isFavorite ?? false,
    snap_favorited_at: toIsoString(input.favoritedAt),
    snap_is_archived: input.isArchived ?? false,
    snap_archived_at: toIsoString(input.archivedAt),
    snap_captured_at: toIsoString(input.capturedAt) ?? getSnapUpdateTimestamp(),
    snap_local_path: input.localPath ?? null,
  });

  if (error || !data) {
    try {
      const existingSnap = await getSnap(userId, targetSnapId);

      if (existingSnap) {
        return existingSnap;
      }
    } catch {
      throw new SnapSaveOutcomeUnknownError('SnapShelf could not confirm whether this Snap was saved. Its image remains on this device; check The Tray before retrying.');
    }

    throw error ?? new Error('SnapShelf could not confirm that this Snap was saved.');
  }

  const createdRow = data as unknown as SnapRow;

  if (input.shelfId) {
    touchShelf(userId, input.shelfId, createdRow.id).catch((touchError) => {
      if (__DEV__) {
        console.warn('[createSnap] Snap saved, but its Shelf activity could not be updated.', touchError);
      }
    });
  }

  return mapSnapRow(createdRow, input.localPath ?? null);
}

export async function createSnapsBatch(userId: string, inputs: CreateSnapInput[]): Promise<Snap[]> {
  if (inputs.length < 1 || inputs.length > MAX_SNAP_IMPORT_COUNT) {
    throw new Error(`Choose between 1 and ${MAX_SNAP_IMPORT_COUNT} images.`);
  }

  const client = requireSupabaseClient();
  const deviceId = await getDeviceId();
  const requests = inputs.map((input) => ({
    id: Crypto.randomUUID(),
    shelf_id: input.shelfId ?? null,
    title: input.title ?? null,
    image_url: input.imageUrl ?? null,
    source_url: input.sourceUrl ?? null,
    thought: input.thought ?? null,
    labels: input.labels ?? [],
    source: input.source ?? 'unknown',
    is_favorite: input.isFavorite ?? false,
    favorited_at: toIsoString(input.favoritedAt),
    is_archived: input.isArchived ?? false,
    archived_at: toIsoString(input.archivedAt),
    captured_at: toIsoString(input.capturedAt) ?? getSnapUpdateTimestamp(),
    local_path: input.localPath ?? null,
  }));
  const localPathsById = new Map(requests.map((request) => [request.id, request.local_path]));
  const { data, error } = await client.rpc('create_snaps_with_media', {
    target_device_id: deviceId,
    snap_inputs: requests,
  });

  let rows = data as SnapRow[] | null;
  const persistenceError = error ?? new Error('SnapShelf could not confirm that these Snaps were saved.');

  if (error || !rows || rows.length !== requests.length) {
    try {
      const { data: existingData, error: lookupError } = await client
        .from('snaps')
        .select(snapColumns)
        .eq('user_id', userId)
        .in('id', requests.map((request) => request.id));

      if (lookupError) {
        throw lookupError;
      }

      const existingRows = existingData as SnapRow[];
      if (existingRows.length === requests.length) {
        rows = existingRows;
      } else if (existingRows.length === 0) {
        throw persistenceError;
      } else {
        throw new SnapSaveOutcomeUnknownError('SnapShelf could not confirm the complete batch. The local images were preserved; check The Tray before retrying.');
      }
    } catch (lookupFailure) {
      if (lookupFailure === persistenceError || lookupFailure instanceof SnapSaveOutcomeUnknownError) {
        throw lookupFailure;
      }
      throw new SnapSaveOutcomeUnknownError('SnapShelf could not confirm whether these Snaps were saved. Their images remain on this device; check The Tray before retrying.');
    }
  }

  const snapsById = new Map(
    rows.map((row) => [row.id, mapSnapRow(row, localPathsById.get(row.id) ?? null)]),
  );
  const createdSnaps = requests.map((request) => snapsById.get(request.id)).filter((snap): snap is Snap => Boolean(snap));

  for (const shelfId of new Set(createdSnaps.map((snap) => snap.shelfId).filter((shelfId): shelfId is string => Boolean(shelfId)))) {
    const latestSnap = createdSnaps.find((snap) => snap.shelfId === shelfId);
    if (latestSnap) {
      touchShelf(userId, shelfId, latestSnap.id).catch((touchError) => {
        if (__DEV__) {
          console.warn('[createSnapsBatch] Snaps saved, but Shelf activity could not be updated.', touchError);
        }
      });
    }
  }

  return createdSnaps;
}

export async function importSnapImages(
  userId: string,
  images: SnapImageImport[],
  sharedInput: Omit<CreateSnapInput, 'imageUrl' | 'localPath' | 'title'>,
  onProgress?: (progress: SnapImportProgress) => void,
): Promise<Snap[]> {
  if (images.length < 1 || images.length > MAX_SNAP_IMPORT_COUNT) {
    throw new Error(`Choose between 1 and ${MAX_SNAP_IMPORT_COUNT} images.`);
  }

  const localPaths: string[] = [];

  try {
    for (let index = 0; index < images.length; index += 1) {
      const localPath = await saveSnapImageLocally(images[index].uri);
      localPaths.push(localPath);
      onProgress?.({ completed: index + 1, phase: 'copying', total: images.length });
    }

    onProgress?.({ completed: images.length, phase: 'saving', total: images.length });
    return await createSnapsBatch(
      userId,
      images.map((image, index) => ({
        ...sharedInput,
        title: image.title?.trim() || null,
        imageUrl: null,
        localPath: localPaths[index],
      })),
    );
  } catch (error) {
    if (!(error instanceof SnapSaveOutcomeUnknownError)) {
      await Promise.all(localPaths.map((localPath) => deleteImageLocally(localPath)));
    }
    throw error;
  }
}

const SNAP_BULK_CHUNK_SIZE = 50;

async function runSnapBulkMutation(
  snapIds: string[],
  rpcName: 'bulk_move_snaps' | 'bulk_set_snaps_favorite' | 'bulk_set_snaps_archived' | 'bulk_delete_snaps',
  extraArguments: Record<string, unknown> = {},
): Promise<SnapBulkResult> {
  const client = requireSupabaseClient();
  const uniqueIds = [...new Set(snapIds)];
  const result: SnapBulkResult = { succeededIds: [], failures: [] };

  for (let offset = 0; offset < uniqueIds.length; offset += SNAP_BULK_CHUNK_SIZE) {
    const chunk = uniqueIds.slice(offset, offset + SNAP_BULK_CHUNK_SIZE);
    const { data, error } = await client.rpc(rpcName, {
      target_snap_ids: chunk,
      ...extraArguments,
    });

    if (error || !Array.isArray(data)) {
      result.failures.push(...chunk.map((snapId) => ({
        snapId,
        code: 'outcome_unknown' as const,
        message: 'SnapShelf could not confirm this update. It remains selected so you can review or retry it.',
      })));
      continue;
    }

    const succeeded = new Set(data.filter((value): value is string => typeof value === 'string'));
    result.succeededIds.push(...chunk.filter((snapId) => succeeded.has(snapId)));
    result.failures.push(...chunk.filter((snapId) => !succeeded.has(snapId)).map((snapId) => ({
      snapId,
      code: 'not_found' as const,
      message: 'This Snap was no longer available and remains selected for review.',
    })));
  }

  return result;
}

export function bulkMoveSnaps(_userId: string, snapIds: string[], shelfId: string | null) {
  return runSnapBulkMutation(snapIds, 'bulk_move_snaps', { target_shelf_id: shelfId });
}

export function bulkFavoriteSnaps(_userId: string, snapIds: string[]) {
  return runSnapBulkMutation(snapIds, 'bulk_set_snaps_favorite', { target_is_favorite: true });
}

export function bulkSetSnapsArchived(_userId: string, snapIds: string[], isArchived: boolean) {
  return runSnapBulkMutation(snapIds, 'bulk_set_snaps_archived', { target_is_archived: isArchived });
}

export async function bulkDeleteSnaps(_userId: string, snaps: Snap[]): Promise<SnapBulkResult> {
  const client = requireSupabaseClient();
  const result = await runSnapBulkMutation(snaps.map((snap) => snap.id), 'bulk_delete_snaps');
  const uncertainIds = result.failures.filter((failure) => failure.code === 'outcome_unknown').map((failure) => failure.snapId);

  if (uncertainIds.length > 0) {
    const { data, error } = await client.from('snaps').select('id').in('id', uncertainIds);
    if (!error && Array.isArray(data)) {
      const existingIds = new Set(data.map((row) => row.id).filter((id): id is string => typeof id === 'string'));
      const confirmedDeletedIds = uncertainIds.filter((id) => !existingIds.has(id));
      result.succeededIds.push(...confirmedDeletedIds);
      result.failures = result.failures.filter((failure) => !confirmedDeletedIds.includes(failure.snapId));
    }
  }

  const snapsById = new Map(snaps.map((snap) => [snap.id, snap]));

  await Promise.all(result.succeededIds.map((snapId) => deleteImageLocally(snapsById.get(snapId)?.localPath ?? null)));
  return result;
}

export async function saveSnapImageLocally(uri: string): Promise<string> {
  return saveImageLocally(uri, 'snaps');
}

export async function listAllSnaps(userId: string): Promise<Snap[]> {
  const client = requireSupabaseClient();
  const { data, error } = await client.from('snaps').select(snapColumns).eq('user_id', userId).order('created_at', { ascending: false }).order('id', { ascending: false });

  if (error) {
    throw error;
  }

  return mapSnapRowsForCurrentDevice(userId, data as SnapRow[]);
}

export async function getSnap(userId: string, snapId: string): Promise<Snap | null> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('snaps')
    .select(snapColumns)
    .eq('user_id', userId)
    .eq('id', snapId)
    .maybeSingle<SnapRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const [snap] = await mapSnapRowsForCurrentDevice(userId, [data]);
  return snap;
}

export function subscribeToAllSnaps(userId: string, callback: (snaps: Snap[]) => void, onError?: (error: Error) => void, pageSize?: number) {
  return subscribeToSnapRefetch(
    userId,
    async (shouldApply) => {
      const client = requireSupabaseClient();
      let query = client.from('snaps').select(snapColumns).eq('user_id', userId).order('created_at', { ascending: false }).order('id', { ascending: false });

      if (typeof pageSize === 'number') {
        query = query.limit(pageSize);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const snaps = await mapSnapRowsForCurrentDevice(userId, data as SnapRow[]);

      if (shouldApply()) {
        callback(snaps);
      }
    },
    onError,
    'Unable to load Snaps.',
  );
}

export async function listTraySnaps(userId: string, cursor?: SnapCursor | null, pageSize: number = DEFAULT_SNAP_PAGE_SIZE): Promise<SnapPageResult> {
  return listScopedSnaps(userId, null, cursor, pageSize);
}

export function subscribeToTraySnaps(
  userId: string,
  callback: (snaps: Snap[], cursor: SnapCursor | null, requestedPageSize: number) => void,
  onError?: (error: Error) => void,
  cursor?: SnapCursor,
  pageSize: number | (() => number) = DEFAULT_SNAP_PAGE_SIZE,
) {
  return subscribeToSnapRefetch(
    userId,
    async (shouldApply) => {
      const resolvedPageSize = typeof pageSize === 'function' ? pageSize() : pageSize;
      const page = await listTraySnaps(userId, cursor, resolvedPageSize);

      if (shouldApply()) {
        callback(page.snaps, page.cursor, resolvedPageSize);
      }
    },
    onError,
    'Unable to load tray Snaps.',
  );
}

export async function listShelfSnaps(
  userId: string,
  shelfId: string,
  cursor?: SnapCursor | null,
  pageSize: number = DEFAULT_SNAP_PAGE_SIZE,
): Promise<SnapPageResult> {
  return listScopedSnaps(userId, shelfId, cursor, pageSize);
}

export function subscribeToShelfSnaps(
  userId: string,
  shelfId: string,
  callback: (snaps: Snap[], cursor: SnapCursor | null, requestedPageSize: number) => void,
  onError?: (error: Error) => void,
  cursor?: SnapCursor,
  pageSize: number | (() => number) = DEFAULT_SNAP_PAGE_SIZE,
) {
  return subscribeToSnapRefetch(
    userId,
    async (shouldApply) => {
      const resolvedPageSize = typeof pageSize === 'function' ? pageSize() : pageSize;
      const page = await listShelfSnaps(userId, shelfId, cursor, resolvedPageSize);

      if (shouldApply()) {
        callback(page.snaps, page.cursor, resolvedPageSize);
      }
    },
    onError,
    'Unable to load Shelf Snaps.',
  );
}

export async function moveSnapToShelf(userId: string, snapId: string, shelfId: string | null): Promise<void> {
  const client = requireSupabaseClient();
  const { error } = await client
    .from('snaps')
    .update({
      shelf_id: shelfId,
      updated_at: getSnapUpdateTimestamp(),
    })
    .eq('user_id', userId)
    .eq('id', snapId);

  if (error) {
    throw error;
  }

  if (shelfId) {
    await touchShelf(userId, shelfId, snapId);
  }
}

export async function updateSnapDetails(userId: string, snapId: string, input: UpdateSnapInput): Promise<void> {
  const client = requireSupabaseClient();
  const updates: Record<string, unknown> = {
    updated_at: getSnapUpdateTimestamp(),
  };

  if ('shelfId' in input) {
    updates.shelf_id = input.shelfId ?? null;
  }

  if ('title' in input) {
    updates.title = input.title ?? null;
  }

  if ('thought' in input) {
    updates.thought = input.thought ?? null;
  }

  if ('labels' in input) {
    updates.labels = input.labels ?? [];
  }

  const { error } = await client.from('snaps').update(updates).eq('user_id', userId).eq('id', snapId);

  if (error) {
    throw error;
  }

  if (input.shelfId) {
    await touchShelf(userId, input.shelfId, snapId);
  }
}

export async function setSnapFavorite(userId: string, snapId: string, isFavorite: boolean): Promise<void> {
  const client = requireSupabaseClient();
  const { error } = await client
    .from('snaps')
    .update({
      is_favorite: isFavorite,
      favorited_at: isFavorite ? getSnapUpdateTimestamp() : null,
      updated_at: getSnapUpdateTimestamp(),
    })
    .eq('user_id', userId)
    .eq('id', snapId);

  if (error) {
    throw error;
  }
}

export async function setSnapArchived(userId: string, snapId: string, isArchived: boolean): Promise<void> {
  const client = requireSupabaseClient();
  const { error } = await client
    .from('snaps')
    .update({
      is_archived: isArchived,
      archived_at: isArchived ? getSnapUpdateTimestamp() : null,
      updated_at: getSnapUpdateTimestamp(),
    })
    .eq('user_id', userId)
    .eq('id', snapId);

  if (error) {
    throw error;
  }
}

export async function replaceSnapLocalImage(userId: string, snap: Snap, sourceUri: string): Promise<Snap> {
  const client = requireSupabaseClient();
  const nextLocalPath = await saveSnapImageLocally(sourceUri);

  try {
    const deviceId = await getDeviceId();
    const { error } = await client.rpc('set_snap_media_location', {
      target_snap_id: snap.id,
      target_device_id: deviceId,
      expected_local_path: snap.localPath,
      next_local_path: nextLocalPath,
    });

    if (error) {
      throw error;
    }

    if (snap.localPath && snap.localPath !== nextLocalPath) {
      await deleteImageLocally(snap.localPath);
    }

    return { ...snap, localPath: nextLocalPath, updatedAt: new Date() };
  } catch (error) {
    try {
      const locations = await getMediaLocationMap(client, userId, snapMediaLocation, [snap.id]);
      const currentLocalPath = locations.get(snap.id) ?? null;

      if (currentLocalPath === nextLocalPath) {
        if (snap.localPath && snap.localPath !== nextLocalPath) {
          await deleteImageLocally(snap.localPath);
        }
        return { ...snap, localPath: nextLocalPath, updatedAt: new Date() };
      }

      if (currentLocalPath === snap.localPath) {
        await deleteImageLocally(nextLocalPath);
        throw error;
      }
    } catch (reconciliationError) {
      if (reconciliationError === error) {
        throw error;
      }
      throw new SnapSaveOutcomeUnknownError('SnapShelf could not confirm which image is active. Both local files were preserved; reopen the Snap before trying again.');
    }

    throw new SnapSaveOutcomeUnknownError('This image changed while it was being saved. Both local files were preserved; reopen the Snap before trying again.');
  }
}

export async function removeSnapLocalImageReference(userId: string, snap: Snap): Promise<Snap> {
  const client = requireSupabaseClient();
  const deviceId = await getDeviceId();
  const { error } = await client.rpc('set_snap_media_location', {
    target_snap_id: snap.id,
    target_device_id: deviceId,
    expected_local_path: snap.localPath,
    next_local_path: null,
  });

  if (error) {
    try {
      const locations = await getMediaLocationMap(client, userId, snapMediaLocation, [snap.id]);
      const currentLocalPath = locations.get(snap.id) ?? null;

      if (currentLocalPath === null) {
        await deleteImageLocally(snap.localPath);
        return { ...snap, localPath: null, updatedAt: new Date() };
      }

      if (currentLocalPath === snap.localPath) {
        throw error;
      }
    } catch (reconciliationError) {
      if (reconciliationError === error) {
        throw error;
      }
      throw new SnapSaveOutcomeUnknownError('SnapShelf could not confirm whether the image reference was removed. The local file was preserved; reopen the Snap before trying again.');
    }

    throw new SnapSaveOutcomeUnknownError('This image changed while it was being removed. The local file was preserved; reopen the Snap before trying again.');
  }

  await deleteImageLocally(snap.localPath);
  return { ...snap, localPath: null, updatedAt: new Date() };
}

export async function deleteSnap(userId: string, snapId: string, localPath: string | null, shelfId?: string | null): Promise<void> {
  const client = requireSupabaseClient();
  const { error } = await client.from('snaps').delete().eq('user_id', userId).eq('id', snapId);

  if (error) {
    throw error;
  }

  if (shelfId) {
    clearShelfCoverSnap(userId, shelfId, snapId).catch((error) => {
      if (__DEV__) {
        console.warn('[deleteSnap] Unable to clear stale shelf cover after deleting a Snap.', error);
      }
    });
  }

  if (localPath) {
    await deleteImageLocally(localPath);
  }
}
