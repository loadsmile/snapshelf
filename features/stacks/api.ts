import { deleteImageLocally, saveImageLocally } from '@/features/images/local';
import { getMediaLocationMap, setMediaLocation, type MediaLocationConfig } from '@/features/images/locations';
import { validateOrganizationName } from '@/features/organizations/name';
import type { CreateStackInput, Stack, UpdateStackCoverInput } from '@/features/stacks/types';
import { requireSupabaseClient } from '@/services/supabase';

const stackLayoutPresets: Array<{ boardX: number; boardY: number }> = [
  { boardX: 260, boardY: 220 },
  { boardX: 520, boardY: 420 },
  { boardX: 160, boardY: 620 },
  { boardX: 580, boardY: 760 },
];

export function getDefaultStackPlacement(index: number) {
  const preset = stackLayoutPresets[index % stackLayoutPresets.length];
  const row = Math.floor(index / stackLayoutPresets.length);

  return {
    boardX: preset.boardX + row * 160,
    boardY: preset.boardY + row * 120,
  };
}

type StackRow = {
  id: string;
  name: string | null;
  board_x: number | null;
  board_y: number | null;
  created_at: string | null;
  updated_at: string | null;
};

const stackColumns = 'id,name,board_x,board_y,created_at,updated_at';

const stackCoverLocation: MediaLocationConfig = {
  table: 'stack_cover_locations',
  entityColumn: 'stack_id',
};

function toDate(value: unknown) {
  return typeof value === 'string' ? new Date(value) : null;
}

function getStackUpdateTimestamp() {
  return new Date().toISOString();
}

function mapStack(row: StackRow, coverLocalPath: string | null = null): Stack {
  return {
    id: row.id,
    name: row.name ?? 'Untitled Stack',
    coverLocalPath,
    boardX: typeof row.board_x === 'number' ? row.board_x : null,
    boardY: typeof row.board_y === 'number' ? row.board_y : null,
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  };
}

async function mapStacksForCurrentDevice(userId: string, rows: StackRow[]): Promise<Stack[]> {
  const client = requireSupabaseClient();
  const locations = await getMediaLocationMap(client, userId, stackCoverLocation, rows.map((row) => row.id));
  return rows.map((row) => mapStack(row, locations.get(row.id) ?? null));
}

async function getStack(userId: string, stackId: string): Promise<Stack | null> {
  const client = requireSupabaseClient();
  const { data, error } = await client.from('stacks').select(stackColumns).eq('user_id', userId).eq('id', stackId).maybeSingle<StackRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const [stack] = await mapStacksForCurrentDevice(userId, [data]);
  return stack;
}

export async function createStack(userId: string, input: CreateStackInput): Promise<Stack> {
  const name = validateOrganizationName(input.name, 'Stack');
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('stacks')
    .insert({
      user_id: userId,
      name,
      board_x: input.boardX ?? null,
      board_y: input.boardY ?? null,
    })
    .select(stackColumns)
    .single<StackRow>();

  if (error) {
    throw error;
  }

  try {
    if (input.coverLocalPath) {
      await setMediaLocation(client, userId, stackCoverLocation, data.id, input.coverLocalPath);
      const { error: signalError } = await client
        .from('stacks')
        .update({ updated_at: getStackUpdateTimestamp() })
        .eq('user_id', userId)
        .eq('id', data.id)
        .select('id')
        .single<{ id: string }>();

      if (signalError) {
        throw signalError;
      }
    }
  } catch (locationError) {
    await client.from('stacks').delete().eq('user_id', userId).eq('id', data.id);
    throw locationError;
  }

  return mapStack(data, input.coverLocalPath ?? null);
}

export async function renameStack(userId: string, stackId: string, name: string): Promise<void> {
  const normalizedName = validateOrganizationName(name, 'Stack');
  const client = requireSupabaseClient();
  const { error } = await client
    .from('stacks')
    .update({ name: normalizedName, updated_at: getStackUpdateTimestamp() })
    .eq('user_id', userId)
    .eq('id', stackId)
    .select('id')
    .single<{ id: string }>();

  if (error) {
    throw error;
  }
}

export async function saveStackCoverImageLocally(uri: string): Promise<string> {
  return saveImageLocally(uri, 'stack-covers');
}

export async function updateStackCover(userId: string, stackId: string, input: UpdateStackCoverInput) {
  const client = requireSupabaseClient();
  const existingStack = await getStack(userId, stackId);
  const previousCoverLocalPath = existingStack?.coverLocalPath ?? null;

  try {
    await setMediaLocation(client, userId, stackCoverLocation, stackId, input.coverLocalPath);
    const { error } = await client
      .from('stacks')
      .update({ updated_at: getStackUpdateTimestamp() })
      .eq('user_id', userId)
      .eq('id', stackId)
      .select('id')
      .single<{ id: string }>();

    if (error) {
      throw error;
    }
  } catch (updateError) {
    await setMediaLocation(client, userId, stackCoverLocation, stackId, previousCoverLocalPath).catch(() => undefined);
    throw updateError;
  }

  if (previousCoverLocalPath && previousCoverLocalPath !== input.coverLocalPath) {
    await deleteImageLocally(previousCoverLocalPath);
  }
}

export async function listStacks(userId: string): Promise<Stack[]> {
  const client = requireSupabaseClient();
  const { data, error } = await client.from('stacks').select(stackColumns).eq('user_id', userId).order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return mapStacksForCurrentDevice(userId, data as StackRow[]);
}

export function subscribeToStacks(userId: string, callback: (stacks: Stack[]) => void, onError?: (error: Error) => void) {
  const client = requireSupabaseClient();
  let isSubscribed = true;

  const refetchStacks = async () => {
    try {
      const stacks = await listStacks(userId);
      if (isSubscribed) {
        callback(stacks);
      }
    } catch (error) {
      if (isSubscribed) {
        onError?.(error instanceof Error ? error : new Error('Unable to load stacks.'));
      }
    }
  };

  void refetchStacks();

  const channel = client
    .channel(`stacks:${userId}:${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'stacks',
        filter: `user_id=eq.${userId}`,
      },
      () => {
        void refetchStacks();
      },
    )
    .subscribe((status, error) => {
      if (status === 'CHANNEL_ERROR' && error) {
        onError?.(error instanceof Error ? error : new Error('Stack realtime subscription failed.'));
      }
    });

  return () => {
    isSubscribed = false;
    void client.removeChannel(channel);
  };
}

export async function updateStackPosition(userId: string, stackId: string, boardX: number, boardY: number) {
  const client = requireSupabaseClient();
  const { error } = await client
    .from('stacks')
    .update({
      board_x: boardX,
      board_y: boardY,
      updated_at: getStackUpdateTimestamp(),
    })
    .eq('user_id', userId)
    .eq('id', stackId);

  if (error) {
    throw error;
  }
}

export async function deleteStack(userId: string, stackId: string) {
  const client = requireSupabaseClient();
  const stack = await getStack(userId, stackId);
  const stackCoverLocalPath = stack?.coverLocalPath ?? null;

  const { error } = await client.from('stacks').delete().eq('user_id', userId).eq('id', stackId);

  if (error) {
    throw error;
  }

  await deleteImageLocally(stackCoverLocalPath);
}
