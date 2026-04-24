import { describe, expect, it } from 'vitest';

import { searchSnaps } from '@/features/snaps/search';
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
    createdAt: overrides.createdAt ?? null,
    updatedAt: overrides.updatedAt ?? null,
    capturedAt: overrides.capturedAt ?? null,
  };
}

describe('searchSnaps', () => {
  const snaps = [
    buildSnap({
      id: 'quiet-luxury',
      title: 'Quiet Luxury Desk',
      thought: 'Warm walnut and linen palette',
      labels: ['workspace', 'editorial'],
    }),
    buildSnap({
      id: 'beach-club',
      title: 'Beach Club',
      thought: 'Poolside blue and citrus accents',
      labels: ['travel'],
    }),
    buildSnap({
      id: 'reading-nook',
      title: 'Reading Nook',
      thought: 'Layered lamp light for evening reading',
      labels: ['home', 'cozy'],
    }),
  ];

  it('returns all snaps for an empty query', () => {
    expect(searchSnaps(snaps, '   ')).toEqual(snaps);
  });

  it('matches across title, thought, labels, and additional text', () => {
    const results = searchSnaps(snaps, 'quiet editorial walnut loft', (snap) => {
      if (snap.id === 'quiet-luxury') {
        return 'Loft inspiration';
      }

      return null;
    });

    expect(results.map((snap) => snap.id)).toEqual(['quiet-luxury']);
  });

  it('requires every search term to be present', () => {
    const results = searchSnaps(snaps, 'blue walnut');

    expect(results).toEqual([]);
  });
});
