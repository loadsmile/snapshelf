import type { Shelf } from '@/features/shelves/types';
import type { Snap } from '@/features/snaps/types';

const palettes: Array<[string, string]> = [
  ['#153330', '#1D4E49'],
  ['#D9E9DA', '#F3F2DE'],
  ['#EFE9DD', '#DDE4D5'],
  ['#244D63', '#86B0C1'],
  ['#6B3C32', '#E6B27F'],
  ['#2D4859', '#A6C8D5'],
];

export function getSnapSourceLabel(source: Snap['source']) {
  const labels: Record<Snap['source'], string> = {
    'camera-roll': 'Camera Roll',
    instagram: 'Instagram Save',
    manual: 'Manual',
    'quick-snap': 'Quick Snap',
    'web-clip': 'Web Clip',
    unknown: 'Snap',
  };

  return labels[source];
}

export function getSnapHeadline(snap: Snap) {
  return snap.title ?? snap.thought ?? snap.labels[0] ?? 'Untitled Snap';
}

export function formatCapturedAt(value: Date | null) {
  if (!value) {
    return 'Saved just now';
  }

  const diff = Date.now() - value.getTime();
  const hour = 1000 * 60 * 60;
  const day = hour * 24;

  if (diff < hour) {
    const minutes = Math.max(1, Math.round(diff / (1000 * 60)));
    return `Captured ${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }

  if (diff < day) {
    const hours = Math.max(1, Math.round(diff / hour));
    return `Captured ${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  if (diff < day * 7) {
    const days = Math.max(1, Math.round(diff / day));
    return `Captured ${days} day${days === 1 ? '' : 's'} ago`;
  }

  return `Captured ${value.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

export function getPaletteFromSeed(seed: string) {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = seed.charCodeAt(index) + ((hash << 5) - hash);
  }

  return palettes[Math.abs(hash) % palettes.length];
}

export function getSnapPalette(snap: Snap) {
  return getPaletteFromSeed(`${snap.source}-${snap.title ?? ''}-${snap.labels.join('-')}`);
}

export function getShelfPalette(name: string) {
  return getPaletteFromSeed(name);
}

export function getShelfCoverSnap(shelf: Shelf, snaps: Snap[]) {
  const explicitCover = snaps.find((snap) => snap.id === shelf.coverSnapId && snap.shelfId === shelf.id);
  if (explicitCover) {
    return explicitCover;
  }

  return snaps.find((snap) => snap.shelfId === shelf.id) ?? null;
}
