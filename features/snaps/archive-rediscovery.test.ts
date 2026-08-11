import { describe, expect, it, vi } from 'vitest';

import type { LocalImageAvailability } from '@/features/images/local';
import {
  ARCHIVE_REDISCOVERY_MAX_ITEMS,
  getLocalDayKey,
  loadDailyArchiveRediscovery,
  rankDailyArchiveRediscovery,
  selectDailyArchiveRediscovery,
  type ArchiveRediscoveryAvailabilityCache,
} from '@/features/snaps/archive-rediscovery';
import type { Snap } from '@/features/snaps/types';

const NOW = new Date(2026, 7, 11, 12).getTime();
const DAY = 24 * 60 * 60 * 1000;

function buildSnap(overrides: Partial<Snap> = {}): Snap {
  return {
    id: overrides.id ?? 'snap-1',
    shelfId: overrides.shelfId ?? null,
    title: overrides.title ?? null,
    imageUrl: overrides.imageUrl ?? null,
    sourceUrl: overrides.sourceUrl ?? null,
    localPath: overrides.localPath ?? null,
    thought: overrides.thought ?? null,
    labels: overrides.labels ?? [],
    source: overrides.source ?? 'manual',
    isFavorite: overrides.isFavorite ?? false,
    favoritedAt: overrides.favoritedAt ?? null,
    isArchived: overrides.isArchived ?? false,
    archivedAt: overrides.archivedAt ?? null,
    createdAt: overrides.createdAt ?? new Date(NOW - 45 * DAY),
    updatedAt: overrides.updatedAt ?? null,
    capturedAt: overrides.capturedAt ?? null,
  };
}

describe('archive rediscovery ranking', () => {
  it('uses a local calendar day key', () => {
    expect(getLocalDayKey(new Date(2026, 0, 2, 23, 59).getTime())).toBe('2026-01-02');
  });

  it('requires an active Snap that is at least 30 days old', () => {
    const availability = new Map<string, LocalImageAvailability>([['snaps/photo.jpg', 'available']]);
    const snaps = [
      buildSnap({ id: 'exactly-old-enough', localPath: 'snaps/photo.jpg', createdAt: new Date(NOW - 30 * DAY) }),
      buildSnap({ id: 'one-ms-too-new', localPath: 'snaps/photo.jpg', createdAt: new Date(NOW - 30 * DAY + 1) }),
      buildSnap({ id: 'archived', localPath: 'snaps/photo.jpg', isArchived: true }),
      {
        ...buildSnap({ id: 'undated', localPath: 'snaps/photo.jpg' }),
        createdAt: null,
        updatedAt: null,
        capturedAt: null,
      },
    ];

    expect(rankDailyArchiveRediscovery(snaps, availability, NOW).map((item) => item.snap.id)).toEqual(['exactly-old-enough']);
  });

  it('uses the Library timeline date precedence', () => {
    const availability = new Map<string, LocalImageAvailability>([['snaps/photo.jpg', 'available']]);
    const snap = buildSnap({
      localPath: 'snaps/photo.jpg',
      capturedAt: new Date(NOW - 10 * DAY),
      createdAt: new Date(NOW - 60 * DAY),
      updatedAt: new Date(NOW - 90 * DAY),
    });

    expect(selectDailyArchiveRediscovery([snap], availability, NOW)).toEqual([]);
  });

  it('requires an actually available local image or a normalized actionable source URL', () => {
    const availability = new Map<string, LocalImageAvailability>([
      ['snaps/available.jpg', 'available'],
      ['snaps/missing.jpg', 'missing'],
      ['snaps/unavailable.jpg', 'unavailable'],
    ]);
    const snaps = [
      buildSnap({ id: 'local', localPath: 'snaps/available.jpg', sourceUrl: 'http://invalid.example' }),
      buildSnap({ id: 'source', localPath: 'snaps/missing.jpg', sourceUrl: ' https://example.com/archive ' }),
      buildSnap({ id: 'missing', localPath: 'snaps/missing.jpg' }),
      buildSnap({ id: 'unavailable', localPath: 'snaps/unavailable.jpg' }),
      buildSnap({ id: 'remote-image-only', imageUrl: 'https://images.example/photo.jpg' }),
      buildSnap({ id: 'unsafe-source', sourceUrl: 'https://localhost/private' }),
    ];

    const ranked = rankDailyArchiveRediscovery(snaps, availability, NOW);

    expect(ranked.map((item) => item.snap.id).sort()).toEqual(['local', 'source']);
    expect(ranked.find((item) => item.snap.id === 'source')).toMatchObject({
      hasLocalImage: false,
      normalizedSourceUrl: 'https://example.com/archive',
    });
  });

  it('prefers favorites and caps the daily selection at five', () => {
    const snaps = Array.from({ length: 9 }, (_, index) =>
      buildSnap({
        id: `snap-${index}`,
        isFavorite: index === 7 || index === 8,
        sourceUrl: `https://example.com/${index}`,
      }),
    );

    const selected = selectDailyArchiveRediscovery(snaps, new Map(), NOW);

    expect(selected).toHaveLength(ARCHIVE_REDISCOVERY_MAX_ITEMS);
    expect(selected.slice(0, 2).every((item) => item.snap.isFavorite)).toBe(true);
  });

  it('is deterministic for a local day regardless of input order and does not mutate input', () => {
    const snaps = Array.from({ length: 12 }, (_, index) => buildSnap({ id: `snap-${index}`, sourceUrl: `https://example.com/${index}` }));
    const originalOrder = snaps.map((snap) => snap.id);
    const first = selectDailyArchiveRediscovery(snaps, new Map(), NOW).map((item) => item.snap.id);
    const second = selectDailyArchiveRediscovery([...snaps].reverse(), new Map(), NOW + 60 * 60 * 1000).map((item) => item.snap.id);

    expect(second).toEqual(first);
    expect(snaps.map((snap) => snap.id)).toEqual(originalOrder);
  });

  it('rotates the deterministic selection on another local day', () => {
    const snaps = Array.from({ length: 20 }, (_, index) => buildSnap({ id: `snap-${index}`, sourceUrl: `https://example.com/${index}` }));
    const first = selectDailyArchiveRediscovery(snaps, new Map(), NOW).map((item) => item.snap.id);
    const nextDay = selectDailyArchiveRediscovery(snaps, new Map(), NOW + DAY).map((item) => item.snap.id);

    expect(nextDay).not.toEqual(first);
  });
});

describe('archive rediscovery availability loading', () => {
  it('checks each potentially eligible local path once and reuses a fresh cache', async () => {
    const cache: ArchiveRediscoveryAvailabilityCache = new Map();
    const getAvailability = vi.fn(async (): Promise<LocalImageAvailability> => 'available');
    const snaps = [
      buildSnap({ id: 'first', localPath: 'snaps/shared.jpg' }),
      buildSnap({ id: 'second', localPath: 'snaps/shared.jpg' }),
      buildSnap({ id: 'young', localPath: 'snaps/young.jpg', createdAt: new Date(NOW - DAY) }),
      buildSnap({ id: 'archived', localPath: 'snaps/archived.jpg', isArchived: true }),
    ];

    const first = await loadDailyArchiveRediscovery(snaps, {
      availabilityCache: cache,
      getLocalImageAvailability: getAvailability,
      now: NOW,
    });
    const second = await loadDailyArchiveRediscovery(snaps, {
      availabilityCache: cache,
      getLocalImageAvailability: getAvailability,
      now: NOW + 1000,
    });

    expect(first).toHaveLength(2);
    expect(second.map((item) => item.snap.id)).toEqual(first.map((item) => item.snap.id));
    expect(getAvailability).toHaveBeenCalledTimes(1);
    expect(getAvailability).toHaveBeenCalledWith('snaps/shared.jpg');
  });

  it('refreshes expired cache entries', async () => {
    const cache: ArchiveRediscoveryAvailabilityCache = new Map([
      ['snaps/photo.jpg', { availability: 'missing', checkedAt: NOW - 1000 }],
    ]);
    const getAvailability = vi.fn(async (): Promise<LocalImageAvailability> => 'available');

    const items = await loadDailyArchiveRediscovery([buildSnap({ localPath: 'snaps/photo.jpg' })], {
      availabilityCache: cache,
      availabilityCacheTtlMs: 500,
      getLocalImageAvailability: getAvailability,
      now: NOW,
    });

    expect(items).toHaveLength(1);
    expect(items[0].hasLocalImage).toBe(true);
    expect(getAvailability).toHaveBeenCalledTimes(1);
  });

  it('treats failed availability checks as unavailable without dropping an actionable source', async () => {
    const items = await loadDailyArchiveRediscovery(
      [
        buildSnap({ id: 'source-fallback', localPath: 'snaps/failure.jpg', sourceUrl: 'https://example.com/item' }),
        buildSnap({ id: 'local-only', localPath: 'snaps/failure.jpg' }),
      ],
      {
        getLocalImageAvailability: async () => {
          throw new Error('filesystem unavailable');
        },
        now: NOW,
      },
    );

    expect(items.map((item) => item.snap.id)).toEqual(['source-fallback']);
    expect(items[0]).toMatchObject({ hasLocalImage: false, normalizedSourceUrl: 'https://example.com/item' });
  });

  it('excludes normalized source URLs the current device cannot open', async () => {
    const items = await loadDailyArchiveRediscovery(
      [
        buildSnap({ id: 'blocked', sourceUrl: 'https://blocked.example/item' }),
        buildSnap({ id: 'open', sourceUrl: 'https://example.com/item' }),
      ],
      {
        canOpenSourceUrl: async (url) => url.includes('example.com'),
        getLocalImageAvailability: async () => 'not-needed',
        now: NOW,
      },
    );

    expect(items.map((item) => item.snap.id)).toEqual(['open']);
  });

  it('does not let an older overlapping request replace a newer cache result', async () => {
    const cache: ArchiveRediscoveryAvailabilityCache = new Map();
    let finishOlder: ((availability: LocalImageAvailability) => void) | undefined;
    const olderCheck = new Promise<LocalImageAvailability>((resolve) => {
      finishOlder = resolve;
    });
    const snap = buildSnap({ localPath: 'snaps/photo.jpg' });
    const olderLoad = loadDailyArchiveRediscovery([snap], {
      availabilityCache: cache,
      getLocalImageAvailability: async () => olderCheck,
      now: NOW,
    });
    const newerLoad = loadDailyArchiveRediscovery([snap], {
      availabilityCache: cache,
      getLocalImageAvailability: async () => 'missing',
      now: NOW + 1000,
    });

    await newerLoad;
    finishOlder?.('available');
    await olderLoad;

    expect(cache.get('snaps/photo.jpg')).toEqual({ availability: 'missing', checkedAt: NOW + 1000 });
  });
});
