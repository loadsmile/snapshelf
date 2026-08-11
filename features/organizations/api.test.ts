import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createShelf, renameShelf } from '@/features/shelves/api';
import { createStack, renameStack } from '@/features/stacks/api';

const mocks = vi.hoisted(() => ({
  client: { from: vi.fn() },
}));

vi.mock('@/services/supabase', () => ({
  requireSupabaseClient: () => mocks.client,
}));

vi.mock('@/features/images/local', () => ({
  deleteImageLocally: vi.fn(),
  saveImageLocally: vi.fn(),
}));

vi.mock('@/features/images/locations', () => ({
  getMediaLocationMap: vi.fn(),
  setMediaLocation: vi.fn(),
}));

vi.mock('@/features/threads/api', () => ({
  deleteThreadsForShelf: vi.fn(),
}));

function buildQuery(table: string) {
  const query = {
    insert: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
  };

  query.insert.mockReturnValue(query);
  query.update.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.select.mockReturnValue(query);
  query.single.mockResolvedValue({
    data: table === 'shelves'
      ? {
          id: 'shelf-1',
          name: 'Summer Plans',
          cover_snap_id: null,
          board_x: null,
          board_y: null,
          board_variant: null,
          created_at: null,
          updated_at: null,
        }
      : {
          id: 'stack-1',
          name: 'Travel',
          board_x: null,
          board_y: null,
          created_at: null,
          updated_at: null,
        },
    error: null,
  });

  return query;
}

describe('organization name API boundaries', () => {
  const queries = new Map<string, ReturnType<typeof buildQuery>>();

  beforeEach(() => {
    vi.clearAllMocks();
    queries.clear();
    mocks.client.from.mockImplementation((table: string) => {
      const query = buildQuery(table);
      queries.set(table, query);
      return query;
    });
  });

  it('normalizes Shelf and Stack names during creation', async () => {
    await createShelf('user-1', { name: '  Summer Plans  ' });
    expect(queries.get('shelves')?.insert).toHaveBeenCalledWith(expect.objectContaining({ name: 'Summer Plans' }));

    await createStack('user-1', { name: '\nTravel\t' });
    expect(queries.get('stacks')?.insert).toHaveBeenCalledWith(expect.objectContaining({ name: 'Travel' }));
  });

  it('normalizes names during rename and scopes updates to the owner and record', async () => {
    await renameShelf('user-1', 'shelf-1', '  New Shelf  ');
    const shelfQuery = queries.get('shelves');
    expect(shelfQuery?.update).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Shelf' }));
    expect(shelfQuery?.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(shelfQuery?.eq).toHaveBeenCalledWith('id', 'shelf-1');

    await renameStack('user-1', 'stack-1', '  New Stack  ');
    const stackQuery = queries.get('stacks');
    expect(stackQuery?.update).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Stack' }));
    expect(stackQuery?.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(stackQuery?.eq).toHaveBeenCalledWith('id', 'stack-1');
  });

  it('rejects invalid names before reaching Supabase', async () => {
    await expect(createShelf('user-1', { name: '   ' })).rejects.toThrow('Shelf name is required.');
    await expect(renameStack('user-1', 'stack-1', 'a'.repeat(81))).rejects.toThrow('Stack name must be 80 characters or fewer.');
    expect(mocks.client.from).not.toHaveBeenCalled();
  });
});
