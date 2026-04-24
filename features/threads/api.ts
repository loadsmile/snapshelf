import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, serverTimestamp, Timestamp, where } from 'firebase/firestore';

import type { CreateShelfThreadInput, ShelfThread } from '@/features/threads/types';
import { requireDb } from '@/services/firebase';

function toDate(value: unknown) {
  return value instanceof Timestamp ? value.toDate() : null;
}

function mapThread(id: string, data: Record<string, unknown>): ShelfThread {
  return {
    id,
    fromShelfId: typeof data.fromShelfId === 'string' ? data.fromShelfId : '',
    toShelfId: typeof data.toShelfId === 'string' ? data.toShelfId : '',
    createdAt: toDate(data.createdAt),
  };
}

export async function createShelfThread(userId: string, input: CreateShelfThreadInput): Promise<ShelfThread> {
  const db = requireDb();
  const created = await addDoc(collection(db, 'users', userId, 'threads'), {
    fromShelfId: input.fromShelfId,
    toShelfId: input.toShelfId,
    createdAt: serverTimestamp(),
  });

  return {
    id: created.id,
    fromShelfId: input.fromShelfId,
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

export async function setShelfAnchor(userId: string, shelfId: string, anchorShelfId: string | null): Promise<void> {
  const db = requireDb();
  const existingThreads = await getDocs(query(collection(db, 'users', userId, 'threads'), where('toShelfId', '==', shelfId)));

  await Promise.all(existingThreads.docs.map((thread) => deleteDoc(thread.ref)));

  if (!anchorShelfId) {
    return;
  }

  await addDoc(collection(db, 'users', userId, 'threads'), {
    fromShelfId: anchorShelfId,
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
        .filter((thread) => thread.fromShelfId && thread.toShelfId);

      callback(threads);
    },
    (error) => {
      onError?.(error);
    },
  );
}
