import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getMediaLocationMap, setMediaLocation } from '@/features/images/locations';
import { getDeviceId } from '@/services/device';

vi.mock('@/services/device', () => ({
  getDeviceId: vi.fn(),
}));

const config = {
  table: 'snap_media_locations' as const,
  entityColumn: 'snap_id' as const,
};

describe('device media locations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDeviceId).mockResolvedValue('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  });

  it('loads only the current device paths and maps them by entity id', async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      in: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.in.mockResolvedValue({
      data: [
        { snap_id: 'snap-1', local_path: 'snaps/one.jpg' },
        { snap_id: 'snap-2', local_path: 'snaps/two.jpg' },
      ],
      error: null,
    });
    const client = { from: vi.fn(() => query) } as unknown as SupabaseClient;

    const locations = await getMediaLocationMap(client, 'user-1', config, ['snap-1', 'snap-2', 'snap-1']);

    expect(client.from).toHaveBeenCalledWith('snap_media_locations');
    expect(query.eq).toHaveBeenNthCalledWith(1, 'user_id', 'user-1');
    expect(query.eq).toHaveBeenNthCalledWith(2, 'device_id', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    expect(query.in).toHaveBeenCalledWith('snap_id', ['snap-1', 'snap-2']);
    expect(Object.fromEntries(locations)).toEqual({
      'snap-1': 'snaps/one.jpg',
      'snap-2': 'snaps/two.jpg',
    });
  });

  it('upserts a path for the current device', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const client = { from: vi.fn(() => ({ upsert })) } as unknown as SupabaseClient;

    await setMediaLocation(client, 'user-1', config, 'snap-1', 'snaps/one.jpg');

    expect(upsert).toHaveBeenCalledWith(
      {
        user_id: 'user-1',
        device_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        snap_id: 'snap-1',
        local_path: 'snaps/one.jpg',
      },
      { onConflict: 'user_id,device_id,snap_id' },
    );
  });

  it('deletes only the current device path when clearing media', async () => {
    const query = {
      delete: vi.fn(),
      eq: vi.fn(),
      then: undefined as unknown,
    };
    query.delete.mockReturnValue(query);
    query.eq.mockImplementation((_column: string, _value: string) => query);
    Object.assign(query, {
      then(resolve: (value: { error: null }) => void) {
        return Promise.resolve({ error: null }).then(resolve);
      },
    });
    const client = { from: vi.fn(() => query) } as unknown as SupabaseClient;

    await setMediaLocation(client, 'user-1', config, 'snap-1', null);

    expect(query.eq).toHaveBeenNthCalledWith(1, 'user_id', 'user-1');
    expect(query.eq).toHaveBeenNthCalledWith(2, 'device_id', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    expect(query.eq).toHaveBeenNthCalledWith(3, 'snap_id', 'snap-1');
  });
});
