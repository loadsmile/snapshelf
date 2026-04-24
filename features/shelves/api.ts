import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, onSnapshot, query, serverTimestamp, setDoc, Timestamp, updateDoc, where } from 'firebase/firestore';

import { deleteThreadsForShelf } from '@/features/threads/api';
import type { CreateShelfInput, Shelf, ShelfBoardVariant } from '@/features/shelves/types';
import { requireDb } from '@/services/firebase';

const boardLayoutPresets: Array<{ boardX: number; boardY: number; boardVariant: ShelfBoardVariant }> = [
  { boardX: 320, boardY: 470, boardVariant: 'primary' },
  { boardX: 170, boardY: 360, boardVariant: 'arch' },
  { boardX: 560, boardY: 240, boardVariant: 'circle-large' },
  { boardX: 80, boardY: 690, boardVariant: 'circle-small' },
  { boardX: 640, boardY: 560, boardVariant: 'tall' },
  { boardX: 320, boardY: 870, boardVariant: 'circle-medium' },
  { boardX: 560, boardY: 820, boardVariant: 'circle-small' },
  { boardX: 130, boardY: 930, boardVariant: 'circle-large' },
];

function isShelfBoardVariant(value: unknown): value is ShelfBoardVariant {
  return (
    value === 'primary' ||
    value === 'arch' ||
    value === 'circle-large' ||
    value === 'circle-small' ||
    value === 'circle-medium' ||
    value === 'tall'
  );
}

export function getDefaultShelfPlacement(index: number) {
  const preset = boardLayoutPresets[index % boardLayoutPresets.length];
  const row = Math.floor(index / boardLayoutPresets.length);

  return {
    boardX: preset.boardX + row * 180,
    boardY: preset.boardY + row * 110,
    boardVariant: preset.boardVariant,
  };
}

function toDate(value: unknown) {
  return value instanceof Timestamp ? value.toDate() : null;
}

function mapShelf(id: string, data: Record<string, unknown>): Shelf {
  return {
    id,
    name: typeof data.name === 'string' ? data.name : 'Untitled Shelf',
    coverSnapId: typeof data.coverSnapId === 'string' ? data.coverSnapId : null,
    boardX: typeof data.boardX === 'number' ? data.boardX : null,
    boardY: typeof data.boardY === 'number' ? data.boardY : null,
    boardVariant: isShelfBoardVariant(data.boardVariant) ? data.boardVariant : null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export async function createShelf(userId: string, input: CreateShelfInput): Promise<Shelf> {
  const db = requireDb();
  const collectionRef = collection(db, 'users', userId, 'shelves');
  const created = await addDoc(collectionRef, {
    name: input.name,
    coverSnapId: input.coverSnapId ?? null,
    boardX: input.boardX ?? null,
    boardY: input.boardY ?? null,
    boardVariant: input.boardVariant ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const snapshot = await getDoc(doc(collectionRef, created.id));
  return mapShelf(created.id, snapshot.data() ?? {
    name: input.name,
    coverSnapId: input.coverSnapId ?? null,
    boardX: input.boardX ?? null,
    boardY: input.boardY ?? null,
    boardVariant: input.boardVariant ?? null,
  });
}

export async function listShelves(userId: string): Promise<Shelf[]> {
  const db = requireDb();
  const snapshot = await getDocs(collection(db, 'users', userId, 'shelves'));

  return snapshot.docs
    .map((entry) => mapShelf(entry.id, entry.data()))
    .sort((left, right) => (left.createdAt?.getTime() ?? 0) - (right.createdAt?.getTime() ?? 0));
}

export function subscribeToShelves(userId: string, callback: (shelves: Shelf[]) => void, onError?: (error: Error) => void) {
  const db = requireDb();

  return onSnapshot(
    collection(db, 'users', userId, 'shelves'),
    (snapshot) => {
      const shelves = snapshot.docs
        .map((entry) => mapShelf(entry.id, entry.data()))
        .sort((left, right) => (left.createdAt?.getTime() ?? 0) - (right.createdAt?.getTime() ?? 0));

      callback(shelves);
    },
    (error) => {
      onError?.(error);
    },
  );
}

export async function getShelf(userId: string, shelfId: string): Promise<Shelf | null> {
  const db = requireDb();
  const snapshot = await getDoc(doc(db, 'users', userId, 'shelves', shelfId));

  if (!snapshot.exists()) {
    return null;
  }

  return mapShelf(snapshot.id, snapshot.data());
}

export async function createDefaultShelf(userId: string): Promise<Shelf> {
  const db = requireDb();
  const collectionRef = collection(db, 'users', userId, 'shelves');
  const existingShelves = await getDocs(query(collectionRef, limit(1)));

  if (!existingShelves.empty) {
    const existingShelf = existingShelves.docs[0];
    return mapShelf(existingShelf.id, existingShelf.data());
  }

  return createShelf(userId, { name: 'Inspiration', ...getDefaultShelfPlacement(0) });
}

export async function touchShelf(userId: string, shelfId: string, coverSnapId?: string | null) {
  const db = requireDb();

  await setDoc(
    doc(db, 'users', userId, 'shelves', shelfId),
    {
      updatedAt: serverTimestamp(),
      ...(coverSnapId ? { coverSnapId } : {}),
    },
    { merge: true },
  );
}

export async function clearShelfCoverSnap(userId: string, shelfId: string, snapId: string) {
  const db = requireDb();
  const shelfRef = doc(db, 'users', userId, 'shelves', shelfId);
  const snapshot = await getDoc(shelfRef);

  if (!snapshot.exists()) {
    return;
  }

  const shelf = mapShelf(snapshot.id, snapshot.data());
  if (shelf.coverSnapId !== snapId) {
    return;
  }

  await setDoc(
    shelfRef,
    {
      coverSnapId: null,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function updateShelfPosition(userId: string, shelfId: string, boardX: number, boardY: number) {
  const db = requireDb();

  await setDoc(
    doc(db, 'users', userId, 'shelves', shelfId),
    {
      boardX,
      boardY,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function bootstrapShelfPlacement(userId: string, shelfId: string, index: number) {
  const db = requireDb();
  const placement = getDefaultShelfPlacement(index);

  await setDoc(
    doc(db, 'users', userId, 'shelves', shelfId),
    {
      boardX: placement.boardX,
      boardY: placement.boardY,
      boardVariant: placement.boardVariant,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function deleteShelf(userId: string, shelfId: string) {
  const db = requireDb();
  const snapsSnapshot = await getDocs(query(collection(db, 'users', userId, 'snaps'), where('shelfId', '==', shelfId)));

  await Promise.all(
    snapsSnapshot.docs.map((snap) =>
      updateDoc(snap.ref, {
        shelfId: null,
        updatedAt: serverTimestamp(),
      }),
    ),
  );

  await deleteThreadsForShelf(userId, shelfId);
  await deleteDoc(doc(db, 'users', userId, 'shelves', shelfId));
}
