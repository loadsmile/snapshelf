import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as Crypto from 'expo-crypto';

import { deleteImageLocally, saveImageLocally } from '@/features/images/local';
import { getMediaLocationMap } from '@/features/images/locations';
import { createSnap, importSnapImages, removeSnapLocalImageReference, replaceSnapLocalImage, SnapSaveOutcomeUnknownError } from '@/features/snaps/api';
import type { Snap } from '@/features/snaps/types';
import { getDeviceId } from '@/services/device';

vi.mock('expo-crypto', () => ({
  randomUUID: vi.fn(() => 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
}));

const mockClient = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/services/supabase', () => ({
  requireSupabaseClient: () => mockClient,
}));

vi.mock('@/features/images/local', () => ({
  deleteImageLocally: vi.fn(),
  saveImageLocally: vi.fn(),
}));

vi.mock('@/features/images/locations', () => ({
  getMediaLocationMap: vi.fn(),
  setMediaLocation: vi.fn(),
}));

vi.mock('@/services/device', () => ({
  getDeviceId: vi.fn(),
}));

vi.mock('@/features/shelves/api', () => ({
  clearShelfCoverSnap: vi.fn(),
  touchShelf: vi.fn(),
}));

function buildSnap(): Snap {
  return {
    id: 'snap-1',
    shelfId: null,
    title: 'Chair',
    imageUrl: null,
    sourceUrl: 'https://example.com/chair',
    localPath: 'snaps/old.jpg',
    thought: null,
    labels: [],
    source: 'web-clip',
    isFavorite: false,
    favoritedAt: null,
    isArchived: false,
    archivedAt: null,
    createdAt: new Date('2026-08-01T10:00:00.000Z'),
    updatedAt: new Date('2026-08-01T10:00:00.000Z'),
    capturedAt: new Date('2026-08-01T10:00:00.000Z'),
  };
}

function buildSnapRow(id = 'snap-1', title = 'Chair') {
  return {
    id,
    shelf_id: null,
    title,
    image_url: null,
    source_url: 'https://example.com/chair',
    thought: null,
    labels: [],
    source: 'web-clip',
    is_favorite: false,
    favorited_at: null,
    is_archived: false,
    archived_at: null,
    captured_at: '2026-08-01T10:00:00.000Z',
    created_at: '2026-08-01T10:00:00.000Z',
    updated_at: '2026-08-01T10:00:00.000Z',
  };
}

describe('Snap local image mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(saveImageLocally).mockResolvedValue('snaps/new.jpg');
    vi.mocked(deleteImageLocally).mockResolvedValue(undefined);
    vi.mocked(getDeviceId).mockResolvedValue('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    vi.mocked(getMediaLocationMap).mockResolvedValue(new Map([['snap-1', 'snaps/old.jpg']]));
    mockClient.rpc.mockResolvedValue({ error: null });
    vi.mocked(Crypto.randomUUID).mockReturnValue('cccccccc-cccc-cccc-cccc-cccccccccccc');
  });

  it('creates Snap metadata and the device path through one transaction', async () => {
    mockClient.rpc.mockResolvedValue({ data: buildSnapRow(), error: null });

    const createdSnap = await createSnap('user-1', {
      title: 'Chair',
      source: 'web-clip',
      sourceUrl: 'https://example.com/chair',
      localPath: 'snaps/new.jpg',
    });

    expect(mockClient.rpc).toHaveBeenCalledWith('create_snap_with_media', expect.objectContaining({
      target_snap_id: expect.any(String),
      target_device_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      snap_title: 'Chair',
      snap_source_url: 'https://example.com/chair',
      snap_local_path: 'snaps/new.jpg',
    }));
    expect(createdSnap.localPath).toBe('snaps/new.jpg');
  });

  it('replaces only the current device path and deletes the old file after success', async () => {
    const updatedSnap = await replaceSnapLocalImage('user-1', buildSnap(), 'picker://new-image');

    expect(saveImageLocally).toHaveBeenCalledWith('picker://new-image', 'snaps');
    expect(mockClient.rpc).toHaveBeenCalledWith('set_snap_media_location', {
      target_snap_id: 'snap-1',
      target_device_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      expected_local_path: 'snaps/old.jpg',
      next_local_path: 'snaps/new.jpg',
    });
    expect(deleteImageLocally).toHaveBeenCalledWith('snaps/old.jpg');
    expect(updatedSnap.localPath).toBe('snaps/new.jpg');
    expect(updatedSnap.sourceUrl).toBe('https://example.com/chair');
  });

  it('deletes the new file when the transactional update fails', async () => {
    mockClient.rpc.mockResolvedValue({ error: new Error('update failed') });

    await expect(replaceSnapLocalImage('user-1', buildSnap(), 'picker://new-image')).rejects.toThrow('update failed');

    expect(deleteImageLocally).toHaveBeenCalledWith('snaps/new.jpg');
    expect(deleteImageLocally).not.toHaveBeenCalledWith('snaps/old.jpg');
  });

  it('keeps the committed replacement when only the RPC response is lost', async () => {
    mockClient.rpc.mockResolvedValue({ error: new Error('network response lost') });
    vi.mocked(getMediaLocationMap).mockResolvedValue(new Map([['snap-1', 'snaps/new.jpg']]));

    const updatedSnap = await replaceSnapLocalImage('user-1', buildSnap(), 'picker://new-image');

    expect(updatedSnap.localPath).toBe('snaps/new.jpg');
    expect(deleteImageLocally).toHaveBeenCalledWith('snaps/old.jpg');
    expect(deleteImageLocally).not.toHaveBeenCalledWith('snaps/new.jpg');
  });

  it('removes only the current device reference before deleting its file', async () => {
    const updatedSnap = await removeSnapLocalImageReference('user-1', buildSnap());

    expect(mockClient.rpc).toHaveBeenCalledWith('set_snap_media_location', {
      target_snap_id: 'snap-1',
      target_device_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      expected_local_path: 'snaps/old.jpg',
      next_local_path: null,
    });
    expect(deleteImageLocally).toHaveBeenCalledWith('snaps/old.jpg');
    expect(updatedSnap.localPath).toBeNull();
  });

  it('copies image batches sequentially and persists them in one transaction', async () => {
    vi.mocked(Crypto.randomUUID)
      .mockReturnValueOnce('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
      .mockReturnValueOnce('22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
    vi.mocked(saveImageLocally)
      .mockResolvedValueOnce('snaps/first.jpg')
      .mockResolvedValueOnce('snaps/second.jpg');
    mockClient.rpc.mockResolvedValue({
      data: [
        buildSnapRow('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'First'),
        buildSnapRow('22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Second'),
      ],
      error: null,
    });
    const progress = vi.fn();

    const snaps = await importSnapImages(
      'user-1',
      [
        { title: 'First', uri: 'picker://first' },
        { title: 'Second', uri: 'picker://second' },
      ],
      { labels: ['shared'], source: 'camera-roll', thought: 'Shared thought' },
      progress,
    );

    expect(saveImageLocally).toHaveBeenNthCalledWith(1, 'picker://first', 'snaps');
    expect(saveImageLocally).toHaveBeenNthCalledWith(2, 'picker://second', 'snaps');
    expect(mockClient.rpc).toHaveBeenCalledWith('create_snaps_with_media', expect.objectContaining({
      snap_inputs: expect.arrayContaining([
        expect.objectContaining({ local_path: 'snaps/first.jpg', thought: 'Shared thought' }),
        expect.objectContaining({ local_path: 'snaps/second.jpg', labels: ['shared'] }),
      ]),
    }));
    expect(snaps.map((snap) => snap.localPath)).toEqual(['snaps/first.jpg', 'snaps/second.jpg']);
    expect(progress).toHaveBeenLastCalledWith({ completed: 2, phase: 'saving', total: 2 });
  });

  it('deletes every copied image after a confirmed batch persistence failure', async () => {
    vi.mocked(Crypto.randomUUID)
      .mockReturnValueOnce('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
      .mockReturnValueOnce('22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
    vi.mocked(saveImageLocally)
      .mockResolvedValueOnce('snaps/first.jpg')
      .mockResolvedValueOnce('snaps/second.jpg');
    mockClient.rpc.mockResolvedValue({ data: null, error: new Error('batch failed') });
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    mockClient.from.mockReturnValue(query);

    await expect(importSnapImages(
      'user-1',
      [{ uri: 'picker://first' }, { uri: 'picker://second' }],
      { source: 'camera-roll' },
    )).rejects.toThrow('batch failed');

    expect(deleteImageLocally).toHaveBeenCalledWith('snaps/first.jpg');
    expect(deleteImageLocally).toHaveBeenCalledWith('snaps/second.jpg');
  });

  it('preserves copied images when the batch outcome cannot be reconciled', async () => {
    vi.mocked(saveImageLocally).mockResolvedValue('snaps/uncertain.jpg');
    mockClient.rpc.mockResolvedValue({ data: null, error: new Error('response lost') });
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      in: vi.fn().mockResolvedValue({ data: null, error: new Error('offline') }),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    mockClient.from.mockReturnValue(query);

    await expect(importSnapImages('user-1', [{ uri: 'picker://one' }], { source: 'camera-roll' }))
      .rejects.toBeInstanceOf(SnapSaveOutcomeUnknownError);
    expect(deleteImageLocally).not.toHaveBeenCalledWith('snaps/uncertain.jpg');
  });

  it('rejects imports larger than 20 before copying files', async () => {
    await expect(importSnapImages(
      'user-1',
      Array.from({ length: 21 }, (_, index) => ({ uri: `picker://${index}` })),
      { source: 'camera-roll' },
    )).rejects.toThrow('between 1 and 20 images');

    expect(saveImageLocally).not.toHaveBeenCalled();
  });
});
