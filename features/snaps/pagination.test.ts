import { describe, expect, it } from 'vitest';

import { appendUniqueSnaps, mergeFirstPageSnaps } from '@/features/snaps/pagination';
import type { Snap } from '@/features/snaps/types';

function buildSnap(id: string): Snap {
  return {
    id,
    shelfId: null,
    title: id,
    imageUrl: null,
    localPath: null,
    thought: null,
    labels: [],
    source: 'manual',
    createdAt: null,
    updatedAt: null,
    capturedAt: null,
  };
}

describe('pagination helpers', () => {
  it('replaces the first page while preserving later unique snaps', () => {
    const current = [buildSnap('b'), buildSnap('c'), buildSnap('d')];
    const nextPage = [buildSnap('a'), buildSnap('b')];

    expect(mergeFirstPageSnaps(current, nextPage).map((snap) => snap.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('appends only snaps that are not already loaded', () => {
    const current = [buildSnap('a'), buildSnap('b')];
    const nextPage = [buildSnap('b'), buildSnap('c'), buildSnap('d')];

    expect(appendUniqueSnaps(current, nextPage).map((snap) => snap.id)).toEqual(['a', 'b', 'c', 'd']);
  });
});
