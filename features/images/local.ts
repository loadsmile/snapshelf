import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type { Action } from 'expo-image-manipulator';
import { Image } from 'react-native';

export { resolveLocalImageUri } from '@/features/images/resolve';

const LOCAL_IMAGE_MAX_LONG_EDGE = 1800;
const LOCAL_IMAGE_COMPRESSION = 0.78;

function getImageExtension(uri: string) {
  const extensionMatch = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return extensionMatch?.[1]?.toLowerCase() ?? 'jpg';
}

async function getImageDimensions(uri: string) {
  return await new Promise<{ width: number; height: number } | null>((resolve) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => resolve(null),
    );
  });
}

function getDocumentDirectory() {
  if (!FileSystem.documentDirectory) {
    throw new Error('Local file storage is unavailable on this device.');
  }

  return FileSystem.documentDirectory;
}

async function compressLocalImage(uri: string) {
  try {
    const dimensions = await getImageDimensions(uri);
    const actions: Action[] = [];

    if (dimensions) {
      const longestEdge = Math.max(dimensions.width, dimensions.height);

      if (longestEdge > LOCAL_IMAGE_MAX_LONG_EDGE) {
        actions.push(
          dimensions.width >= dimensions.height
            ? { resize: { width: LOCAL_IMAGE_MAX_LONG_EDGE } }
            : { resize: { height: LOCAL_IMAGE_MAX_LONG_EDGE } },
        );
      }
    }

    const processed = await manipulateAsync(uri, actions, {
      compress: LOCAL_IMAGE_COMPRESSION,
      format: SaveFormat.JPEG,
    });

    return {
      extension: 'jpg',
      uri: processed.uri,
    };
  } catch (error) {
    if (__DEV__) {
      console.warn('[compressLocalImage] Falling back to original asset after image compression failed.', error);
    }

    return {
      extension: getImageExtension(uri),
      uri,
    };
  }
}

export async function saveImageLocally(uri: string, folder: string): Promise<string> {
  const compressedImage = await compressLocalImage(uri);
  const documentDirectory = getDocumentDirectory();
  const normalizedFolder = folder.replace(/^\/+|\/+$/g, '');
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${compressedImage.extension}`;
  const relativePath = `${normalizedFolder}/${filename}`;
  const fullPath = `${documentDirectory}${relativePath}`;

  await FileSystem.makeDirectoryAsync(`${documentDirectory}${normalizedFolder}/`, { intermediates: true });
  await FileSystem.copyAsync({ from: compressedImage.uri, to: fullPath });

  return relativePath;
}

export async function deleteImageLocally(localPath: string | null) {
  if (!localPath || !FileSystem.documentDirectory) {
    return;
  }

  await FileSystem.deleteAsync(`${FileSystem.documentDirectory}${localPath}`, { idempotent: true });
}
