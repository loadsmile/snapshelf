import { describe, expect, it } from 'vitest';

import { searchShelves } from '@/features/shelves/search';
import type { Shelf } from '@/features/shelves/types';

function buildShelf(overrides: Partial<Shelf>): Shelf {
  return {
    id: overrides.id ?? 'shelf-1',
    name: overrides.name ?? 'Untitled Shelf',
    coverSnapId: overrides.coverSnapId ?? null,
    boardX: overrides.boardX ?? null,
    boardY: overrides.boardY ?? null,
    boardVariant: overrides.boardVariant ?? null,
    createdAt: overrides.createdAt ?? null,
    updatedAt: overrides.updatedAt ?? null,
  };
}

describe('searchShelves', () => {
  const shelves = [
    buildShelf({ id: 'paris-apartments', name: 'Paris Apartments' }),
    buildShelf({ id: 'ceramic-lighting', name: 'Ceramic Lighting' }),
    buildShelf({ id: 'summer-travel', name: 'Summer Travel Plans' }),
  ];

  it('returns all shelves for an empty query', () => {
    expect(searchShelves(shelves, '   ')).toEqual(shelves);
  });

  it('matches shelf names case-insensitively', () => {
    expect(searchShelves(shelves, 'ceramic').map((shelf) => shelf.id)).toEqual(['ceramic-lighting']);
  });

  it('requires every search term to match the shelf name', () => {
    expect(searchShelves(shelves, 'summer plans').map((shelf) => shelf.id)).toEqual(['summer-travel']);
  });
});
