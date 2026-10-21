import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getMediaLocationMap } from '@/features/images/locations';
import { subscribeToTraySnaps } from '@/features/snaps/api';

const mockClient = vi.hoisted(() => ({
  channel: vi.fn(),
  from: vi.fn(),
  removeChannel: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/services/supabase', () => ({ requireSupabaseClient: () => mockClient }));
vi.mock('expo-crypto', () => ({ randomUUID: vi.fn() }));
vi.mock('@/features/images/locations', () => ({ getMediaLocationMap: vi.fn() }));
vi.mock('@/features/images/local', () => ({ deleteImageLocally: vi.fn(), saveImageLocally: vi.fn() }));
vi.mock('@/services/device', () => ({ getDeviceId: vi.fn().mockResolvedValue('device-1') }));
vi.mock('@/features/shelves/api', () => ({ clearShelfCoverSnap: vi.fn(), touchShelf: vi.fn() }));

function createQuery() {
  const query: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'is', 'or', 'order', 'limit']) {
    query[method] = vi.fn(() => query);
  }
  query.then = (resolve: (value: unknown) => void) => Promise.resolve().then(() => resolve({ data: [], error: null }));
  return query;
}

describe('Snap realtime subscriptions', () => {
  let eventCallback: () => void;
  let statusCallback: (status: string, error?: Error) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMediaLocationMap).mockResolvedValue(new Map());
    mockClient.from.mockImplementation(() => createQuery());
    const channel = {
      on: vi.fn((_event, _config, callback) => {
        eventCallback = callback;
        return channel;
      }),
      subscribe: vi.fn((callback) => {
        statusCallback = callback;
        return channel;
      }),
    };
    mockClient.channel.mockReturnValue(channel);
  });

  it.each(['CHANNEL_ERROR', 'TIMED_OUT'])('reports %s as a recoverable connection error and clears it after refetch', async (status) => {
    const onData = vi.fn();
    const onLoadError = vi.fn();
    const onConnectionError = vi.fn();
    const onRecovered = vi.fn();
    const unsubscribe = subscribeToTraySnaps('user-1', onData, onLoadError, undefined, 20, onConnectionError, onRecovered);
    await vi.waitFor(() => expect(onData).toHaveBeenCalled());

    const cause = new Error('socket unavailable');
    statusCallback(status, cause);
    expect(onConnectionError).toHaveBeenCalledWith(expect.objectContaining({ status, cause }));
    expect(onLoadError).not.toHaveBeenCalled();

    statusCallback('SUBSCRIBED');
    await vi.waitFor(() => expect(onRecovered).toHaveBeenCalledTimes(2));
    unsubscribe();
  });

  it('cleans up and ignores late events and status callbacks', async () => {
    const onData = vi.fn();
    const onConnectionError = vi.fn();
    const unsubscribe = subscribeToTraySnaps('user-1', onData, undefined, undefined, 20, onConnectionError);
    await vi.waitFor(() => expect(onData).toHaveBeenCalledOnce());
    const queryCount = mockClient.from.mock.calls.length;

    unsubscribe();
    eventCallback();
    statusCallback('SUBSCRIBED');
    statusCallback('CHANNEL_ERROR', new Error('late'));
    await Promise.resolve();

    expect(mockClient.removeChannel).toHaveBeenCalledOnce();
    expect(mockClient.from).toHaveBeenCalledTimes(queryCount);
    expect(onConnectionError).not.toHaveBeenCalled();
  });
});
