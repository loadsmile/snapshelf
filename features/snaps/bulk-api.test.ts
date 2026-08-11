import { beforeEach, describe, expect, it, vi } from 'vitest';

import { deleteImageLocally } from '@/features/images/local';
import { bulkDeleteSnaps, bulkFavoriteSnaps, bulkMoveSnaps, bulkSetSnapsArchived } from '@/features/snaps/api';
import type { Snap } from '@/features/snaps/types';

vi.mock('expo-crypto', () => ({ randomUUID: vi.fn() }));

const mockClient = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('@/services/supabase', () => ({ requireSupabaseClient: () => mockClient }));
vi.mock('@/features/images/local', () => ({ deleteImageLocally: vi.fn(), saveImageLocally: vi.fn() }));
vi.mock('@/features/images/locations', () => ({ getMediaLocationMap: vi.fn() }));
vi.mock('@/features/shelves/api', () => ({ clearShelfCoverSnap: vi.fn(), touchShelf: vi.fn() }));
vi.mock('@/services/device', () => ({ getDeviceId: vi.fn() }));

function snap(id: string, localPath: string | null = null): Snap {
  return {
    id,
    shelfId: null,
    title: id,
    imageUrl: null,
    sourceUrl: null,
    localPath,
    thought: null,
    labels: [],
    source: 'camera-roll',
    isFavorite: false,
    favoritedAt: null,
    isArchived: false,
    archivedAt: null,
    createdAt: null,
    updatedAt: null,
    capturedAt: null,
  };
}

describe('Snap bulk APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.rpc.mockImplementation((_name: string, args: { target_snap_ids: string[] }) => Promise.resolve({ data: args.target_snap_ids, error: null }));
  });

  it('deduplicates and chunks requests at 50 ids', async () => {
    const ids = [...Array.from({ length: 51 }, (_, index) => `snap-${index}`), 'snap-0'];
    const result = await bulkFavoriteSnaps('user-1', ids);

    expect(mockClient.rpc).toHaveBeenCalledTimes(2);
    expect(mockClient.rpc.mock.calls[0][1].target_snap_ids).toHaveLength(50);
    expect(mockClient.rpc.mock.calls[1][1].target_snap_ids).toEqual(['snap-50']);
    expect(result.succeededIds).toHaveLength(51);
  });

  it('reports missing and uncertain ids without hiding successes', async () => {
    mockClient.rpc
      .mockResolvedValueOnce({ data: ['a'], error: null })
      .mockResolvedValueOnce({ data: null, error: new Error('offline') });
    const ids = [...Array.from({ length: 50 }, (_, index) => (index === 0 ? 'a' : index === 1 ? 'missing' : `ok-${index}`)), 'uncertain'];
    const result = await bulkSetSnapsArchived('user-1', ids, true);

    expect(result.succeededIds).toEqual(['a']);
    expect(result.failures.find((failure) => failure.snapId === 'missing')?.code).toBe('not_found');
    expect(result.failures.find((failure) => failure.snapId === 'uncertain')?.code).toBe('outcome_unknown');
  });

  it('passes deterministic desired states and destinations', async () => {
    await bulkMoveSnaps('user-1', ['a'], 'shelf-1');
    await bulkSetSnapsArchived('user-1', ['a'], false);

    expect(mockClient.rpc).toHaveBeenNthCalledWith(1, 'bulk_move_snaps', { target_snap_ids: ['a'], target_shelf_id: 'shelf-1' });
    expect(mockClient.rpc).toHaveBeenNthCalledWith(2, 'bulk_set_snaps_archived', { target_snap_ids: ['a'], target_is_archived: false });
  });

  it('deletes local files only for confirmed database deletions', async () => {
    mockClient.rpc.mockResolvedValue({ data: ['a'], error: null });
    const result = await bulkDeleteSnaps('user-1', [snap('a', 'snaps/a.jpg'), snap('b', 'snaps/b.jpg')]);

    expect(result.succeededIds).toEqual(['a']);
    expect(deleteImageLocally).toHaveBeenCalledWith('snaps/a.jpg');
    expect(deleteImageLocally).not.toHaveBeenCalledWith('snaps/b.jpg');
  });
});
