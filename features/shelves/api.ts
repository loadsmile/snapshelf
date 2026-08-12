import { deleteImageLocally, saveImageLocally } from '@/features/images/local';
import { getMediaLocationMap, setMediaLocation, type MediaLocationConfig } from '@/features/images/locations';
import { validateOrganizationName } from '@/features/organizations/name';
import type { CreateShelfInput, Shelf, ShelfBoardVariant, UpdateShelfCoverInput } from '@/features/shelves/types';
import { deleteThreadsForShelf } from '@/features/threads/api';
import { requireSupabaseClient } from '@/services/supabase';

const boardLayoutPresets: Array<{ boardX: number; boardY: number; boardVariant: ShelfBoardVariant }> = [
  { boardX: 320, boardY: 470, boardVariant: 'primary' },
  { boardX: 170, boardY: 360, boardVariant: 'arch' },
  { boardX: 560, boardY: 240, boardVariant: 'circle-large' },
  { boardX: 80, boardY: 690, boardVariant: 'circle-small' },
  { boardX: 640, boardY: 560, boardVariant: 'tall' },
  { boardX: 320, boardY: 870, boardVariant: 'circle-medium' },
  { boardX: 560, boardY: 820, boardVariant: 'circle-small' },
  { boardX: 130, boardY: 930, boardVariant: 'circle-large' },
];

function isShelfBoardVariant(value: unknown): value is ShelfBoardVariant {
  return (
    value === 'primary' ||
    value === 'arch' ||
    value === 'circle-large' ||
    value === 'circle-small' ||
    value === 'circle-medium' ||
    value === 'tall'
  );
}

export function getDefaultShelfPlacement(index: number) {
  const preset = boardLayoutPresets[index % boardLayoutPresets.length];
  const row = Math.floor(index / boardLayoutPresets.length);

  return {
    boardX: preset.boardX + row * 180,
    boardY: preset.boardY + row * 110,
    boardVariant: preset.boardVariant,
  };
}

type ShelfRow = {
  id: string;
  name: string | null;
  cover_snap_id: string | null;
  board_x: number | null;
  board_y: number | null;
  board_variant: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const shelfColumns = 'id,name,cover_snap_id,board_x,board_y,board_variant,created_at,updated_at';

const shelfCoverLocation: MediaLocationConfig = {
  table: 'shelf_cover_locations',
  entityColumn: 'shelf_id',
};

function toDate(value: unknown) {
  return typeof value === 'string' ? new Date(value) : null;
}

function mapShelf(row: ShelfRow, coverLocalPath: string | null = null): Shelf {
  return {
    id: row.id,
    name: row.name ?? 'Untitled Shelf',
    coverSnapId: row.cover_snap_id,
    coverLocalPath,
    boardX: typeof row.board_x === 'number' ? row.board_x : null,
    boardY: typeof row.board_y === 'number' ? row.board_y : null,
    boardVariant: isShelfBoardVariant(row.board_variant) ? row.board_variant : null,
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  };
}

async function mapShelvesForCurrentDevice(userId: string, rows: ShelfRow[]): Promise<Shelf[]> {
  const client = requireSupabaseClient();
  const locations = await getMediaLocationMap(client, userId, shelfCoverLocation, rows.map((row) => row.id));
  return rows.map((row) => mapShelf(row, locations.get(row.id) ?? null));
}

function getShelfUpdateTimestamp() {
  return new Date().toISOString();
}

export async function createShelf(userId: string, input: CreateShelfInput): Promise<Shelf> {
  const name = validateOrganizationName(input.name, 'Shelf');
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('shelves')
    .insert({
      user_id: userId,
      name,
      cover_snap_id: input.coverSnapId ?? null,
      board_x: input.boardX ?? null,
      board_y: input.boardY ?? null,
      board_variant: input.boardVariant ?? null,
    })
    .select(shelfColumns)
    .single<ShelfRow>();

  if (error) {
    throw error;
  }

  try {
    if (input.coverLocalPath) {
      await setMediaLocation(client, userId, shelfCoverLocation, data.id, input.coverLocalPath);
      const { error: signalError } = await client
        .from('shelves')
        .update({ updated_at: getShelfUpdateTimestamp() })
        .eq('user_id', userId)
        .eq('id', data.id)
        .select('id')
        .single<{ id: string }>();

      if (signalError) {
        throw signalError;
      }
    }
  } catch (locationError) {
    await client.from('shelves').delete().eq('user_id', userId).eq('id', data.id);
    throw locationError;
  }

  return mapShelf(data, input.coverLocalPath ?? null);
}

export async function renameShelf(userId: string, shelfId: string, name: string): Promise<void> {
  const normalizedName = validateOrganizationName(name, 'Shelf');
  const client = requireSupabaseClient();
  const { error } = await client
    .from('shelves')
    .update({ name: normalizedName, updated_at: getShelfUpdateTimestamp() })
    .eq('user_id', userId)
    .eq('id', shelfId)
    .select('id')
    .single<{ id: string }>();

  if (error) {
    throw error;
  }
}

export async function listShelves(userId: string): Promise<Shelf[]> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('shelves')
    .select(shelfColumns)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return mapShelvesForCurrentDevice(userId, data as ShelfRow[]);
}

export function subscribeToShelves(userId: string, callback: (shelves: Shelf[]) => void, onError?: (error: Error) => void) {
  const client = requireSupabaseClient();
  let isSubscribed = true;

  const refetchShelves = async () => {
    try {
      const shelves = await listShelves(userId);
      if (isSubscribed) {
        callback(shelves);
      }
    } catch (error) {
      if (isSubscribed) {
        onError?.(error instanceof Error ? error : new Error('Unable to load shelves.'));
      }
    }
  };

  void refetchShelves();

  const channel = client
    .channel(`shelves:${userId}:${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'shelves',
        filter: `user_id=eq.${userId}`,
      },
      () => {
        void refetchShelves();
      },
    )
    .subscribe((status, error) => {
      if (isSubscribed && (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT')) {
        onError?.(error instanceof Error ? error : new Error('Shelf realtime subscription failed.'));
      }
    });

  return () => {
    isSubscribed = false;
    void client.removeChannel(channel);
  };
}

export async function getShelf(userId: string, shelfId: string): Promise<Shelf | null> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('shelves')
    .select(shelfColumns)
    .eq('user_id', userId)
    .eq('id', shelfId)
    .maybeSingle<ShelfRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const [shelf] = await mapShelvesForCurrentDevice(userId, [data]);
  return shelf;
}

export async function createDefaultShelf(userId: string): Promise<Shelf> {
  const existingShelves = await listShelves(userId);

  if (existingShelves[0]) {
    return existingShelves[0];
  }

  return createShelf(userId, { name: 'Inspiration', ...getDefaultShelfPlacement(0) });
}

export async function touchShelf(userId: string, shelfId: string, coverSnapId?: string | null) {
  const client = requireSupabaseClient();
  const updates: { updated_at: string; cover_snap_id?: string } = {
    updated_at: getShelfUpdateTimestamp(),
  };

  if (coverSnapId) {
    updates.cover_snap_id = coverSnapId;
  }

  let query = client.from('shelves').update(updates).eq('user_id', userId).eq('id', shelfId);

  if (coverSnapId) {
    query = query.is('cover_snap_id', null);
  }

  const { error } = await query;

  if (error) {
    throw error;
  }
}

export async function clearShelfCoverSnap(userId: string, shelfId: string, snapId: string) {
  const client = requireSupabaseClient();
  const { error } = await client
    .from('shelves')
    .update({
      cover_snap_id: null,
      updated_at: getShelfUpdateTimestamp(),
    })
    .eq('user_id', userId)
    .eq('id', shelfId)
    .eq('cover_snap_id', snapId);

  if (error) {
    throw error;
  }
}

export async function saveShelfCoverImageLocally(uri: string): Promise<string> {
  return saveImageLocally(uri, 'shelf-covers');
}

export async function updateShelfCover(userId: string, shelfId: string, input: UpdateShelfCoverInput) {
  const client = requireSupabaseClient();
  const existingShelf = await getShelf(userId, shelfId);
  const previousCoverLocalPath = existingShelf?.coverLocalPath ?? null;
  const previousCoverSnapId = existingShelf?.coverSnapId ?? null;

  try {
    await setMediaLocation(client, userId, shelfCoverLocation, shelfId, input.coverLocalPath);
    const { error } = await client
      .from('shelves')
      .update({
        cover_snap_id: input.coverSnapId,
        updated_at: getShelfUpdateTimestamp(),
      })
      .eq('user_id', userId)
      .eq('id', shelfId)
      .select('id')
      .single<{ id: string }>();

    if (error) {
      throw error;
    }
  } catch (updateError) {
    await setMediaLocation(client, userId, shelfCoverLocation, shelfId, previousCoverLocalPath).catch(() => undefined);
    await client
      .from('shelves')
      .update({ cover_snap_id: previousCoverSnapId, updated_at: getShelfUpdateTimestamp() })
      .eq('user_id', userId)
      .eq('id', shelfId);
    throw updateError;
  }

  if (previousCoverLocalPath && previousCoverLocalPath !== input.coverLocalPath) {
    await deleteImageLocally(previousCoverLocalPath);
  }
}

export async function updateShelfPosition(userId: string, shelfId: string, boardX: number, boardY: number) {
  const client = requireSupabaseClient();
  const { error } = await client
    .from('shelves')
    .update({
      board_x: boardX,
      board_y: boardY,
      updated_at: getShelfUpdateTimestamp(),
    })
    .eq('user_id', userId)
    .eq('id', shelfId);

  if (error) {
    throw error;
  }
}

export async function bootstrapShelfPlacement(userId: string, shelfId: string, index: number) {
  const client = requireSupabaseClient();
  const placement = getDefaultShelfPlacement(index);
  const { error } = await client
    .from('shelves')
    .update({
      board_x: placement.boardX,
      board_y: placement.boardY,
      board_variant: placement.boardVariant,
      updated_at: getShelfUpdateTimestamp(),
    })
    .eq('user_id', userId)
    .eq('id', shelfId);

  if (error) {
    throw error;
  }
}

export async function deleteShelf(userId: string, shelfId: string) {
  const client = requireSupabaseClient();
  const shelf = await getShelf(userId, shelfId);
  const shelfCoverLocalPath = shelf?.coverLocalPath ?? null;

  const { error: snapUpdateError } = await client
    .from('snaps')
    .update({
      shelf_id: null,
      updated_at: getShelfUpdateTimestamp(),
    })
    .eq('user_id', userId)
    .eq('shelf_id', shelfId);

  if (snapUpdateError) {
    throw snapUpdateError;
  }

  await deleteThreadsForShelf(userId, shelfId);

  const { error: shelfDeleteError } = await client.from('shelves').delete().eq('user_id', userId).eq('id', shelfId);

  if (shelfDeleteError) {
    throw shelfDeleteError;
  }

  await deleteImageLocally(shelfCoverLocalPath);
}
