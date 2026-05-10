import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  Timestamp,
  updateDoc,
  where,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type { Action } from 'expo-image-manipulator';
import { Image } from 'react-native';

import type { CreateSnapInput, Snap } from '@/features/snaps/types';
import { clearShelfCoverSnap, touchShelf } from '@/features/shelves/api';
import { requireDb } from '@/services/firebase';

const SNAP_IMAGE_MAX_LONG_EDGE = 1800;
const SNAP_IMAGE_COMPRESSION = 0.78;
const DEFAULT_SNAP_PAGE_SIZE = 20;

export type SnapCursor = QueryDocumentSnapshot<unknown>;

type SnapPageResult = {
  cursor: SnapCursor | null;
  snaps: Snap[];
};

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

async function compressSnapImage(uri: string) {
  try {
    const dimensions = await getImageDimensions(uri);
    const actions: Action[] = [];

    if (dimensions) {
      const longestEdge = Math.max(dimensions.width, dimensions.height);

      if (longestEdge > SNAP_IMAGE_MAX_LONG_EDGE) {
        actions.push(
          dimensions.width >= dimensions.height
            ? { resize: { width: SNAP_IMAGE_MAX_LONG_EDGE } }
            : { resize: { height: SNAP_IMAGE_MAX_LONG_EDGE } },
        );
      }
    }

    const processed = await manipulateAsync(uri, actions, {
      compress: SNAP_IMAGE_COMPRESSION,
      format: SaveFormat.JPEG,
    });

    return {
      contentType: 'image/jpeg',
      extension: 'jpg',
      uri: processed.uri,
    };
  } catch (error) {
    if (__DEV__) {
      console.warn('[compressSnapImage] Falling back to original asset after image compression failed.', error);
    }

    return {
      contentType: null,
      extension: getImageExtension(uri),
      uri,
    };
  }
}

function toDate(value: unknown) {
  return value instanceof Timestamp ? value.toDate() : null;
}

export function mapSnap(id: string, data: Record<string, unknown>): Snap {
  return {
    id,
    shelfId: typeof data.shelfId === 'string' ? data.shelfId : null,
    title: typeof data.title === 'string' ? data.title : null,
    imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : null,
    localPath: typeof data.localPath === 'string' ? data.localPath : null,
    thought: typeof data.thought === 'string' ? data.thought : null,
    labels: Array.isArray(data.labels) ? data.labels.filter((value): value is string => typeof value === 'string') : [],
    source:
      data.source === 'quick-snap' ||
      data.source === 'camera-roll' ||
      data.source === 'web-clip' ||
      data.source === 'instagram' ||
      data.source === 'manual'
        ? data.source
        : 'unknown',
    isFavorite: data.isFavorite === true,
    favoritedAt: toDate(data.favoritedAt),
    isArchived: data.isArchived === true,
    archivedAt: toDate(data.archivedAt),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    capturedAt: toDate(data.capturedAt),
  };
}

function mapSnapDocument(snapshot: QueryDocumentSnapshot<unknown>) {
  return mapSnap(snapshot.id, snapshot.data() as Record<string, unknown>);
}

function buildAllSnapsQuery(userId: string, pageSize?: number) {
  const db = requireDb();
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

  if (typeof pageSize === 'number') {
    constraints.push(limit(pageSize));
  }

  return query(collection(db, 'users', userId, 'snaps'), ...constraints);
}

function buildScopedSnapsQuery(userId: string, shelfId: string | null, cursor?: SnapCursor | null, pageSize: number = DEFAULT_SNAP_PAGE_SIZE) {
  const db = requireDb();
  const constraints: QueryConstraint[] = [where('shelfId', '==', shelfId), orderBy('createdAt', 'desc')];

  if (cursor) {
    constraints.push(startAfter(cursor));
  }

  constraints.push(limit(pageSize));

  return query(collection(db, 'users', userId, 'snaps'), ...constraints);
}

function mapSnapPage(snapshot: { docs: SnapCursor[] }): SnapPageResult {
  return {
    cursor: snapshot.docs[snapshot.docs.length - 1] ?? null,
    snaps: snapshot.docs.map(mapSnapDocument),
  };
}

export async function createSnap(userId: string, input: CreateSnapInput): Promise<Snap> {
  const db = requireDb();
  const collectionRef = collection(db, 'users', userId, 'snaps');
  const created = await addDoc(collectionRef, {
    shelfId: input.shelfId ?? null,
    title: input.title ?? null,
    imageUrl: input.imageUrl ?? null,
    localPath: input.localPath ?? null,
    thought: input.thought ?? null,
    labels: input.labels ?? [],
    source: input.source ?? 'unknown',
    isFavorite: input.isFavorite ?? false,
    favoritedAt: input.favoritedAt ? Timestamp.fromDate(input.favoritedAt) : null,
    isArchived: input.isArchived ?? false,
    archivedAt: input.archivedAt ? Timestamp.fromDate(input.archivedAt) : null,
    capturedAt: input.capturedAt ? Timestamp.fromDate(input.capturedAt) : serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (input.shelfId) {
    await touchShelf(userId, input.shelfId, created.id);
  }

  const snapshot = await getDoc(doc(collectionRef, created.id));
  return mapSnap(created.id, snapshot.data() ?? {});
}

export async function saveSnapImageLocally(uri: string): Promise<string> {
  const compressedImage = await compressSnapImage(uri);
  const documentDirectory = getDocumentDirectory();
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${compressedImage.extension}`;
  const relativePath = `snaps/${filename}`;
  const fullPath = `${documentDirectory}${relativePath}`;

  await FileSystem.makeDirectoryAsync(`${documentDirectory}snaps/`, { intermediates: true });
  await FileSystem.copyAsync({ from: compressedImage.uri, to: fullPath });

  return relativePath;
}

export async function listAllSnaps(userId: string): Promise<Snap[]> {
  const snapshot = await getDocs(buildAllSnapsQuery(userId));
  return snapshot.docs.map(mapSnapDocument);
}

export function subscribeToAllSnaps(userId: string, callback: (snaps: Snap[]) => void, onError?: (error: Error) => void, pageSize?: number) {

  return onSnapshot(
    buildAllSnapsQuery(userId, pageSize),
    (snapshot) => {
      callback(snapshot.docs.map(mapSnapDocument));
    },
    (error) => {
      onError?.(error);
    },
  );
}

export async function listTraySnaps(userId: string, cursor?: SnapCursor | null, pageSize: number = DEFAULT_SNAP_PAGE_SIZE): Promise<SnapPageResult> {
  const snapshot = await getDocs(buildScopedSnapsQuery(userId, null, cursor, pageSize));
  return mapSnapPage(snapshot);
}

export function subscribeToTraySnaps(
  userId: string,
  callback: (snaps: Snap[], cursor: SnapCursor | null) => void,
  onError?: (error: Error) => void,
  cursor?: SnapCursor,
  pageSize: number = DEFAULT_SNAP_PAGE_SIZE,
) {

  return onSnapshot(
    buildScopedSnapsQuery(userId, null, cursor, pageSize),
    (snapshot) => {
      callback(snapshot.docs.map(mapSnapDocument), snapshot.docs[snapshot.docs.length - 1] ?? null);
    },
    (error) => {
      onError?.(error);
    },
  );
}

export async function listShelfSnaps(
  userId: string,
  shelfId: string,
  cursor?: SnapCursor | null,
  pageSize: number = DEFAULT_SNAP_PAGE_SIZE,
): Promise<SnapPageResult> {
  const snapshot = await getDocs(buildScopedSnapsQuery(userId, shelfId, cursor, pageSize));
  return mapSnapPage(snapshot);
}

export function subscribeToShelfSnaps(
  userId: string,
  shelfId: string,
  callback: (snaps: Snap[], cursor: SnapCursor | null) => void,
  onError?: (error: Error) => void,
  cursor?: SnapCursor,
  pageSize: number = DEFAULT_SNAP_PAGE_SIZE,
) {

  return onSnapshot(
    buildScopedSnapsQuery(userId, shelfId, cursor, pageSize),
    (snapshot) => {
      callback(snapshot.docs.map(mapSnapDocument), snapshot.docs[snapshot.docs.length - 1] ?? null);
    },
    (error) => {
      onError?.(error);
    },
  );
}

export async function moveSnapToShelf(userId: string, snapId: string, shelfId: string | null): Promise<void> {
  const db = requireDb();
  await updateDoc(doc(db, 'users', userId, 'snaps', snapId), {
    shelfId,
    updatedAt: serverTimestamp(),
  });

  if (shelfId) {
    await touchShelf(userId, shelfId, snapId);
  }
}

export async function setSnapFavorite(userId: string, snapId: string, isFavorite: boolean): Promise<void> {
  const db = requireDb();

  await updateDoc(doc(db, 'users', userId, 'snaps', snapId), {
    isFavorite,
    favoritedAt: isFavorite ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  });
}

export async function setSnapArchived(userId: string, snapId: string, isArchived: boolean): Promise<void> {
  const db = requireDb();

  await updateDoc(doc(db, 'users', userId, 'snaps', snapId), {
    isArchived,
    archivedAt: isArchived ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteSnap(userId: string, snapId: string, localPath: string | null, shelfId?: string | null): Promise<void> {
  const db = requireDb();
  await deleteDoc(doc(db, 'users', userId, 'snaps', snapId));

  if (shelfId) {
    clearShelfCoverSnap(userId, shelfId, snapId).catch((error) => {
      if (__DEV__) {
        console.warn('[deleteSnap] Unable to clear stale shelf cover after deleting a Snap.', error);
      }
    });
  }

  if (localPath) {
    await FileSystem.deleteAsync(`${getDocumentDirectory()}${localPath}`, { idempotent: true });
  }
}
