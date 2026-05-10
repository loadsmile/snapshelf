import { describe, expect, it } from 'vitest';

import { collectSnapLabels, filterLibrarySnaps, type SnapLibraryFilters } from '@/features/snaps/library';
import type { Snap } from '@/features/snaps/types';

function buildSnap(overrides: Partial<Snap>): Snap {
  return {
    id: overrides.id ?? 'snap-1',
    shelfId: overrides.shelfId ?? null,
    title: overrides.title ?? null,
    imageUrl: overrides.imageUrl ?? null,
    localPath: overrides.localPath ?? null,
    thought: overrides.thought ?? null,
    labels: overrides.labels ?? [],
    source: overrides.source ?? 'manual',
    isFavorite: overrides.isFavorite ?? false,
    favoritedAt: overrides.favoritedAt ?? null,
    isArchived: overrides.isArchived ?? false,
    archivedAt: overrides.archivedAt ?? null,
    createdAt: overrides.createdAt ?? null,
    updatedAt: overrides.updatedAt ?? null,
    capturedAt: overrides.capturedAt ?? null,
  };
}

function buildFilters(overrides: Partial<SnapLibraryFilters> = {}): SnapLibraryFilters {
  return {
    query: '',
    shelfId: 'all',
    source: 'all',
    label: 'all',
    dateRange: 'any',
    status: 'active',
    favoritesOnly: false,
    sort: 'newest',
    ...overrides,
  };
}

describe('library snap helpers', () => {
  const now = new Date('2026-04-24T12:00:00.000Z').getTime();
  const shelfNamesById = new Map([
    ['shelf-1', 'Reading Room'],
    ['shelf-2', 'Travel Notes'],
  ]);
  const snaps = [
    buildSnap({
      id: 'active-favorite',
      shelfId: 'shelf-1',
      title: 'Morning Light',
      labels: ['cozy', 'home'],
      source: 'camera-roll',
      isFavorite: true,
      favoritedAt: new Date('2026-04-20T10:00:00.000Z'),
      capturedAt: new Date('2026-04-21T09:00:00.000Z'),
      updatedAt: new Date('2026-04-22T09:00:00.000Z'),
    }),
    buildSnap({
      id: 'tray-snap',
      shelfId: null,
      title: 'Packing List',
      labels: ['travel'],
      source: 'web-clip',
      capturedAt: new Date('2026-03-01T09:00:00.000Z'),
      updatedAt: new Date('2026-03-02T09:00:00.000Z'),
    }),
    buildSnap({
      id: 'archived-snap',
      shelfId: 'shelf-2',
      title: 'Archived View',
      labels: ['travel', 'sunset'],
      source: 'instagram',
      isArchived: true,
      archivedAt: new Date('2026-04-18T09:00:00.000Z'),
      capturedAt: new Date('2026-02-01T09:00:00.000Z'),
      updatedAt: new Date('2026-04-18T09:00:00.000Z'),
    }),
  ];

  it('filters by active status by default', () => {
    expect(filterLibrarySnaps(snaps, buildFilters(), shelfNamesById, now).map((snap) => snap.id)).toEqual(['active-favorite', 'tray-snap']);
  });

  it('searches across shelf names and source labels', () => {
    expect(filterLibrarySnaps(snaps, buildFilters({ query: 'reading camera' }), shelfNamesById, now).map((snap) => snap.id)).toEqual(['active-favorite']);
  });

  it('supports shelf, label, favorites, and archived filters together', () => {
    expect(
      filterLibrarySnaps(
        snaps,
        buildFilters({ shelfId: 'shelf-2', label: 'travel', status: 'archived' }),
        shelfNamesById,
        now,
      ).map((snap) => snap.id),
    ).toEqual(['archived-snap']);

    expect(filterLibrarySnaps(snaps, buildFilters({ favoritesOnly: true }), shelfNamesById, now).map((snap) => snap.id)).toEqual(['active-favorite']);
  });

  it('supports date and favorites sorting', () => {
    expect(filterLibrarySnaps(snaps, buildFilters({ dateRange: '30d' }), shelfNamesById, now).map((snap) => snap.id)).toEqual(['active-favorite']);

    expect(filterLibrarySnaps(snaps, buildFilters({ status: 'all', sort: 'favorites' }), shelfNamesById, now).map((snap) => snap.id)).toEqual([
      'active-favorite',
      'tray-snap',
      'archived-snap',
    ]);
  });

  it('collects unique labels alphabetically', () => {
    expect(collectSnapLabels(snaps)).toEqual(['cozy', 'home', 'sunset', 'travel']);
  });
});
