import * as FileSystem from 'expo-file-system/legacy';

export function resolveLocalImageUri(localPath: string | null) {
  if (!localPath || !FileSystem.documentDirectory) {
    return null;
  }

  return `${FileSystem.documentDirectory}${localPath}`;
}
