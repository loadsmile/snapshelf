import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, serverTimestamp, Timestamp, where } from 'firebase/firestore';

import type { CreateShelfThreadInput, ShelfThread, ShelfThreadAnchorType } from '@/features/threads/types';
import { requireDb } from '@/services/firebase';

function toDate(value: unknown) {
  return value instanceof Timestamp ? value.toDate() : null;
}

function mapThread(id: string, data: Record<string, unknown>): ShelfThread {
  const legacyFromShelfId = typeof data.fromShelfId === 'string' ? data.fromShelfId : '';
  const fromStackId = typeof data.fromStackId === 'string' ? data.fromStackId : null;
  const fromType: ShelfThreadAnchorType = data.fromType === 'stack' || fromStackId ? 'stack' : 'shelf';
  const fromId = typeof data.fromId === 'string' ? data.fromId : fromType === 'stack' ? fromStackId ?? '' : legacyFromShelfId;

  return {
    id,
    fromType,
    fromId,
    fromShelfId: legacyFromShelfId,
    fromStackId,
    toShelfId: typeof data.toShelfId === 'string' ? data.toShelfId : '',
    createdAt: toDate(data.createdAt),
  };
}

export async function createShelfThread(userId: string, input: CreateShelfThreadInput): Promise<ShelfThread> {
  const db = requireDb();
  const fromType: ShelfThreadAnchorType = input.fromStackId ? 'stack' : 'shelf';
  const fromId = input.fromStackId ?? input.fromShelfId ?? '';

  if (!fromId) {
    throw new Error('Thread anchor is required.');
  }

  const created = await addDoc(collection(db, 'users', userId, 'threads'), {
    fromType,
    fromId,
    fromShelfId: input.fromShelfId ?? null,
    fromStackId: input.fromStackId ?? null,
    toShelfId: input.toShelfId,
    createdAt: serverTimestamp(),
  });

  return {
    id: created.id,
    fromType,
    fromId,
    fromShelfId: input.fromShelfId ?? '',
    fromStackId: input.fromStackId ?? null,
    toShelfId: input.toShelfId,
    createdAt: null,
  };
}

export async function deleteShelfThread(userId: string, threadId: string): Promise<void> {
  const db = requireDb();
  await deleteDoc(doc(db, 'users', userId, 'threads', threadId));
}

export async function deleteThreadsForShelf(userId: string, shelfId: string): Promise<void> {
  const db = requireDb();
  const collectionRef = collection(db, 'users', userId, 'threads');
  const [incomingThreads, outgoingThreads] = await Promise.all([
    getDocs(query(collectionRef, where('toShelfId', '==', shelfId))),
    getDocs(query(collectionRef, where('fromShelfId', '==', shelfId))),
  ]);

  const seenThreadIds = new Set<string>();
  const deletes = [...incomingThreads.docs, ...outgoingThreads.docs].flatMap((thread) => {
    if (seenThreadIds.has(thread.id)) {
      return [];
    }

    seenThreadIds.add(thread.id);
    return [deleteDoc(thread.ref)];
  });

  await Promise.all(deletes);
}

export async function deleteThreadsForStack(userId: string, stackId: string): Promise<void> {
  const db = requireDb();
  const collectionRef = collection(db, 'users', userId, 'threads');
  const [modernThreads, legacyThreads] = await Promise.all([
    getDocs(query(collectionRef, where('fromId', '==', stackId))),
    getDocs(query(collectionRef, where('fromStackId', '==', stackId))),
  ]);

  const seenThreadIds = new Set<string>();
  const deletes = [...modernThreads.docs, ...legacyThreads.docs].flatMap((thread) => {
    if (seenThreadIds.has(thread.id)) {
      return [];
    }

    const data = thread.data();
    if (data.fromType !== 'stack' && data.fromStackId !== stackId) {
      return [];
    }

    seenThreadIds.add(thread.id);
    return [deleteDoc(thread.ref)];
  });

  await Promise.all(deletes);
}

export async function setShelfAnchor(userId: string, shelfId: string, anchorShelfId: string | null): Promise<void> {
  const db = requireDb();
  const existingThreads = await getDocs(query(collection(db, 'users', userId, 'threads'), where('toShelfId', '==', shelfId)));

  await Promise.all(existingThreads.docs.map((thread) => deleteDoc(thread.ref)));

  if (!anchorShelfId) {
    return;
  }

  await addDoc(collection(db, 'users', userId, 'threads'), {
    fromType: 'shelf',
    fromId: anchorShelfId,
    fromShelfId: anchorShelfId,
    fromStackId: null,
    toShelfId: shelfId,
    createdAt: serverTimestamp(),
  });
}

export async function setShelfStack(userId: string, shelfId: string, stackId: string | null): Promise<void> {
  const db = requireDb();
  const existingThreads = await getDocs(query(collection(db, 'users', userId, 'threads'), where('toShelfId', '==', shelfId)));

  await Promise.all(existingThreads.docs.map((thread) => deleteDoc(thread.ref)));

  if (!stackId) {
    return;
  }

  await addDoc(collection(db, 'users', userId, 'threads'), {
    fromType: 'stack',
    fromId: stackId,
    fromShelfId: null,
    fromStackId: stackId,
    toShelfId: shelfId,
    createdAt: serverTimestamp(),
  });
}

export function subscribeToThreads(userId: string, callback: (threads: ShelfThread[]) => void, onError?: (error: Error) => void) {
  const db = requireDb();

  return onSnapshot(
    collection(db, 'users', userId, 'threads'),
    (snapshot) => {
      const threads = snapshot.docs
        .map((entry) => mapThread(entry.id, entry.data()))
        .filter((thread) => thread.fromId && thread.toShelfId);

      callback(threads);
    },
    (error) => {
      onError?.(error);
    },
  );
}
