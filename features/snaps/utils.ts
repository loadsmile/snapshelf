import * as FileSystem from 'expo-file-system/legacy';

import type { Snap } from '@/features/snaps/types';

export function resolveSnapImageUri(snap: Snap): string | null {
  if (snap.localPath && FileSystem.documentDirectory) {
    return `${FileSystem.documentDirectory}${snap.localPath}`;
  }

  if (snap.imageUrl) {
    return snap.imageUrl;
  }

  return null;
}
