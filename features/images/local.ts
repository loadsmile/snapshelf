import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type { Action } from 'expo-image-manipulator';
import { Image } from 'react-native';

export { resolveLocalImageUri } from '@/features/images/resolve';

const LOCAL_IMAGE_MAX_LONG_EDGE = 1800;
const LOCAL_IMAGE_COMPRESSION = 0.78;

export type LocalImageAvailability = 'available' | 'missing' | 'unavailable' | 'not-needed';

export const LOCAL_IMAGE_SAVE_ERROR_MESSAGE = 'SnapShelf could not save this image on this device. Try choosing it again.';

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
  try {
    const compressedImage = await compressLocalImage(uri);
    const documentDirectory = getDocumentDirectory();
    const normalizedFolder = folder.replace(/^\/+|\/+$/g, '');
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${compressedImage.extension}`;
    const relativePath = `${normalizedFolder}/${filename}`;
    const fullPath = `${documentDirectory}${relativePath}`;

    await FileSystem.makeDirectoryAsync(`${documentDirectory}${normalizedFolder}/`, { intermediates: true });
    await FileSystem.copyAsync({ from: compressedImage.uri, to: fullPath });

    return relativePath;
  } catch (error) {
    if (__DEV__) {
      console.warn('[saveImageLocally] Unable to save image locally.', error);
    }

    throw new Error(error instanceof Error && error.message.includes('Local file storage') ? error.message : LOCAL_IMAGE_SAVE_ERROR_MESSAGE);
  }
}

export async function deleteImageLocally(localPath: string | null) {
  if (!localPath || !FileSystem.documentDirectory) {
    return;
  }

  try {
    await FileSystem.deleteAsync(`${FileSystem.documentDirectory}${localPath}`, { idempotent: true });
  } catch (error) {
    if (__DEV__) {
      console.warn('[deleteImageLocally] Unable to delete local image.', error);
    }
  }
}

export async function getLocalImageAvailability(localPath: string | null): Promise<LocalImageAvailability> {
  if (!localPath) {
    return 'not-needed';
  }

  if (!FileSystem.documentDirectory) {
    return 'unavailable';
  }

  try {
    const info = await FileSystem.getInfoAsync(`${FileSystem.documentDirectory}${localPath}`);
    return info.exists ? 'available' : 'missing';
  } catch (error) {
    if (__DEV__) {
      console.warn('[getLocalImageAvailability] Unable to check local image.', error);
    }

    return 'missing';
  }
}
