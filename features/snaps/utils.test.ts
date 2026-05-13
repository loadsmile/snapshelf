import { describe, expect, it, vi } from 'vitest';

import { resolveLocalImageUri } from '@/features/images/resolve';
import { parseSnapLabels, resolveSnapImageUri } from '@/features/snaps/utils';
import type { Snap } from '@/features/snaps/types';

vi.mock('@/features/images/local', () => ({
  deleteImageLocally: vi.fn(),
}));

vi.mock('@/features/images/resolve', () => ({
  resolveLocalImageUri: vi.fn((localPath: string | null) => (localPath ? `file:///docs/${localPath}` : null)),
}));

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

describe('snap utility helpers', () => {
  it('prefers resolved local image URIs over remote image URLs', () => {
    const snap = buildSnap({ localPath: 'snaps/local.jpg', imageUrl: 'https://example.com/remote.jpg' });

    expect(resolveSnapImageUri(snap)).toBe('file:///docs/snaps/local.jpg');
  });

  it('falls back to the remote image URL when local media cannot resolve', () => {
    vi.mocked(resolveLocalImageUri).mockReturnValueOnce(null);

    const snap = buildSnap({ localPath: 'snaps/missing.jpg', imageUrl: 'https://example.com/remote.jpg' });

    expect(resolveSnapImageUri(snap)).toBe('https://example.com/remote.jpg');
  });

  it('parses comma-separated labels and removes empty entries', () => {
    expect(parseSnapLabels(' editorial, travel ,, warm neutrals, ')).toEqual(['editorial', 'travel', 'warm neutrals']);
  });
});
