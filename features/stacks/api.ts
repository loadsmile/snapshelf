import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';

import { deleteImageLocally, saveImageLocally } from '@/features/images/local';
import { deleteThreadsForStack } from '@/features/threads/api';
import type { CreateStackInput, Stack, UpdateStackCoverInput } from '@/features/stacks/types';
import { requireDb } from '@/services/firebase';

const stackLayoutPresets: Array<{ boardX: number; boardY: number }> = [
  { boardX: 260, boardY: 220 },
  { boardX: 520, boardY: 420 },
  { boardX: 160, boardY: 620 },
  { boardX: 580, boardY: 760 },
];

export function getDefaultStackPlacement(index: number) {
  const preset = stackLayoutPresets[index % stackLayoutPresets.length];
  const row = Math.floor(index / stackLayoutPresets.length);

  return {
    boardX: preset.boardX + row * 160,
    boardY: preset.boardY + row * 120,
  };
}

function toDate(value: unknown) {
  return value instanceof Timestamp ? value.toDate() : null;
}

function mapStack(id: string, data: Record<string, unknown>): Stack {
  return {
    id,
    name: typeof data.name === 'string' ? data.name : 'Untitled Stack',
    coverLocalPath: typeof data.coverLocalPath === 'string' ? data.coverLocalPath : null,
    boardX: typeof data.boardX === 'number' ? data.boardX : null,
    boardY: typeof data.boardY === 'number' ? data.boardY : null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export async function createStack(userId: string, input: CreateStackInput): Promise<Stack> {
  const db = requireDb();
  const collectionRef = collection(db, 'users', userId, 'stacks');
  const created = await addDoc(collectionRef, {
    name: input.name,
    coverLocalPath: input.coverLocalPath ?? null,
    boardX: input.boardX ?? null,
    boardY: input.boardY ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const snapshot = await getDoc(doc(collectionRef, created.id));
  return mapStack(created.id, snapshot.data() ?? {
    name: input.name,
    coverLocalPath: input.coverLocalPath ?? null,
    boardX: input.boardX ?? null,
    boardY: input.boardY ?? null,
  });
}

export async function saveStackCoverImageLocally(uri: string): Promise<string> {
  return saveImageLocally(uri, 'stack-covers');
}

export async function updateStackCover(userId: string, stackId: string, input: UpdateStackCoverInput) {
  const db = requireDb();
  const stackRef = doc(db, 'users', userId, 'stacks', stackId);
  const snapshot = await getDoc(stackRef);
  const previousCoverLocalPath = snapshot.exists() ? mapStack(snapshot.id, snapshot.data()).coverLocalPath : null;

  await setDoc(
    stackRef,
    {
      coverLocalPath: input.coverLocalPath,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  if (previousCoverLocalPath && previousCoverLocalPath !== input.coverLocalPath) {
    await deleteImageLocally(previousCoverLocalPath);
  }
}

export function subscribeToStacks(userId: string, callback: (stacks: Stack[]) => void, onError?: (error: Error) => void) {
  const db = requireDb();

  return onSnapshot(
    collection(db, 'users', userId, 'stacks'),
    (snapshot) => {
      const stacks = snapshot.docs
        .map((entry) => mapStack(entry.id, entry.data()))
        .sort((left, right) => (left.createdAt?.getTime() ?? 0) - (right.createdAt?.getTime() ?? 0));

      callback(stacks);
    },
    (error) => {
      onError?.(error);
    },
  );
}

export async function updateStackPosition(userId: string, stackId: string, boardX: number, boardY: number) {
  const db = requireDb();

  await setDoc(
    doc(db, 'users', userId, 'stacks', stackId),
    {
      boardX,
      boardY,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function deleteStack(userId: string, stackId: string) {
  const db = requireDb();
  const stackSnapshot = await getDoc(doc(db, 'users', userId, 'stacks', stackId));
  const stackCoverLocalPath = stackSnapshot.exists() ? mapStack(stackSnapshot.id, stackSnapshot.data()).coverLocalPath : null;

  await deleteThreadsForStack(userId, stackId);
  await deleteDoc(doc(db, 'users', userId, 'stacks', stackId));
  await deleteImageLocally(stackCoverLocalPath);
}
