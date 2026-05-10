import type { Snap } from '@/features/snaps/types';

export function mergeFirstPageSnaps(current: Snap[], nextPage: Snap[], previousFirstPageIds?: Set<string>) {
  const nextPageIds = new Set(nextPage.map((snap) => snap.id));
  return [...nextPage, ...current.filter((snap) => !nextPageIds.has(snap.id) && !previousFirstPageIds?.has(snap.id))];
}

export function appendUniqueSnaps(current: Snap[], nextPage: Snap[]) {
  const existingIds = new Set(current.map((snap) => snap.id));
  return [...current, ...nextPage.filter((snap) => !existingIds.has(snap.id))];
}
