import type { CreateShelfThreadInput, ShelfThread, ShelfThreadAnchorType } from '@/features/threads/types';
import { requireSupabaseClient } from '@/services/supabase';

function toDate(value: unknown) {
  return typeof value === 'string' ? new Date(value) : null;
}

type ThreadRow = {
  id: string;
  from_type: string | null;
  from_id: string | null;
  from_shelf_id: string | null;
  from_stack_id: string | null;
  to_shelf_id: string | null;
  created_at: string | null;
};

const threadColumns = 'id,from_type,from_id,from_shelf_id,from_stack_id,to_shelf_id,created_at';

type ReplacementThreadInput = {
  fromType: ShelfThreadAnchorType;
  fromId: string;
  fromShelfId: string | null;
  fromStackId: string | null;
};

function mapThread(row: ThreadRow): ShelfThread {
  const fromShelfId = row.from_shelf_id ?? '';
  const fromStackId = row.from_stack_id;
  const fromType: ShelfThreadAnchorType = row.from_type === 'stack' || fromStackId ? 'stack' : 'shelf';
  const fromId = row.from_id ?? (fromType === 'stack' ? fromStackId ?? '' : fromShelfId);

  return {
    id: row.id,
    fromType,
    fromId,
    fromShelfId,
    fromStackId,
    toShelfId: row.to_shelf_id ?? '',
    createdAt: toDate(row.created_at),
  };
}

export async function listThreads(userId: string): Promise<ShelfThread[]> {
  const client = requireSupabaseClient();
  const { data, error } = await client.from('threads').select(threadColumns).eq('user_id', userId).order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return (data as ThreadRow[]).map(mapThread).filter((thread) => thread.fromId && thread.toShelfId);
}

export async function createShelfThread(userId: string, input: CreateShelfThreadInput): Promise<ShelfThread> {
  const fromType: ShelfThreadAnchorType = input.fromStackId ? 'stack' : 'shelf';
  const fromId = input.fromStackId ?? input.fromShelfId ?? '';

  if (!fromId) {
    throw new Error('Thread anchor is required.');
  }

  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('threads')
    .insert({
      user_id: userId,
      from_type: fromType,
      from_id: fromId,
      from_shelf_id: input.fromShelfId ?? null,
      from_stack_id: input.fromStackId ?? null,
      to_shelf_id: input.toShelfId,
    })
    .select(threadColumns)
    .single<ThreadRow>();

  if (error) {
    throw error;
  }

  return mapThread(data);
}

export async function deleteShelfThread(userId: string, threadId: string): Promise<void> {
  const client = requireSupabaseClient();
  const { error } = await client.from('threads').delete().eq('user_id', userId).eq('id', threadId);

  if (error) {
    throw error;
  }
}

export async function deleteThreadsForShelf(userId: string, shelfId: string): Promise<void> {
  const client = requireSupabaseClient();
  const results = await Promise.all([
    client.from('threads').delete().eq('user_id', userId).eq('to_shelf_id', shelfId),
    client.from('threads').delete().eq('user_id', userId).eq('from_shelf_id', shelfId),
    client.from('threads').delete().eq('user_id', userId).eq('from_type', 'shelf').eq('from_id', shelfId),
  ]);

  for (const { error } of results) {
    if (error) {
      throw error;
    }
  }
}

export async function deleteThreadsForStack(userId: string, stackId: string): Promise<void> {
  const client = requireSupabaseClient();
  const results = await Promise.all([
    client.from('threads').delete().eq('user_id', userId).eq('from_type', 'stack').eq('from_id', stackId),
    client.from('threads').delete().eq('user_id', userId).eq('from_stack_id', stackId),
  ]);

  for (const { error } of results) {
    if (error) {
      throw error;
    }
  }
}

async function replaceShelfThread(userId: string, shelfId: string, input: ReplacementThreadInput | null): Promise<void> {
  const client = requireSupabaseClient();

  const { error } = await client.rpc('replace_shelf_thread', {
    destination_shelf_id: shelfId,
    anchor_type: input?.fromType ?? null,
    anchor_id: input?.fromId ?? null,
  });

  if (error) {
    throw error;
  }
}

export async function setShelfAnchor(userId: string, shelfId: string, anchorShelfId: string | null): Promise<void> {
  if (!anchorShelfId) {
    await replaceShelfThread(userId, shelfId, null);
    return;
  }

  await replaceShelfThread(userId, shelfId, {
    fromType: 'shelf',
    fromId: anchorShelfId,
    fromShelfId: anchorShelfId,
    fromStackId: null,
  });
}

export async function setShelfStack(userId: string, shelfId: string, stackId: string | null): Promise<void> {
  if (!stackId) {
    await replaceShelfThread(userId, shelfId, null);
    return;
  }

  await replaceShelfThread(userId, shelfId, {
    fromType: 'stack',
    fromId: stackId,
    fromShelfId: null,
    fromStackId: stackId,
  });
}

export function subscribeToThreads(userId: string, callback: (threads: ShelfThread[]) => void, onError?: (error: Error) => void) {
  const client = requireSupabaseClient();
  let isSubscribed = true;

  const refetchThreads = async () => {
    try {
      const threads = await listThreads(userId);
      if (isSubscribed) {
        callback(threads);
      }
    } catch (error) {
      if (isSubscribed) {
        onError?.(error instanceof Error ? error : new Error('Unable to load threads.'));
      }
    }
  };

  void refetchThreads();

  const channel = client
    .channel(`threads:${userId}:${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'threads',
        filter: `user_id=eq.${userId}`,
      },
      () => {
        void refetchThreads();
      },
    )
    .subscribe((status, error) => {
      if (status === 'CHANNEL_ERROR' && error) {
        onError?.(error instanceof Error ? error : new Error('Thread realtime subscription failed.'));
      }
    });

  return () => {
    isSubscribed = false;
    void client.removeChannel(channel);
  };
}
