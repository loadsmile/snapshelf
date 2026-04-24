import type { Snap } from '@/features/snaps/types';

function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

function getSnapSearchText(snap: Snap, additionalText?: string | null) {
  return normalizeSearchValue([snap.title, snap.thought, ...snap.labels, additionalText].filter(Boolean).join(' '));
}

export function searchSnaps(snaps: Snap[], query: string, getAdditionalText?: (snap: Snap) => string | null | undefined) {
  const terms = normalizeSearchValue(query)
    .split(/\s+/)
    .filter(Boolean);

  if (terms.length === 0) {
    return snaps;
  }

  return snaps.filter((snap) => {
    const searchText = getSnapSearchText(snap, getAdditionalText?.(snap));
    return terms.every((term) => searchText.includes(term));
  });
}
