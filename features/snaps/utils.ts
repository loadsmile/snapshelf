import { deleteImageLocally } from '@/features/images/local';
import { resolveLocalImageUri } from '@/features/images/resolve';
import type { Snap } from '@/features/snaps/types';

export function resolveSnapImageUri(snap: Snap): string | null {
  const localUri = resolveLocalImageUri(snap.localPath);

  if (localUri) {
    return localUri;
  }

  return snap.imageUrl;
}

export async function deleteSnapImageLocally(localPath: string | null) {
  await deleteImageLocally(localPath);
}

export function parseSnapLabels(value: string) {
  return value
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean);
}
