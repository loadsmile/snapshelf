import type { User as FirebaseUser } from 'firebase/auth';
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { doc, getDoc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';

import type { AuthUser, UserProfile } from '@/features/auth/types';
import { createDefaultShelf } from '@/features/shelves/api';
import { requireAuth, requireDb } from '@/services/firebase';

function toDate(value: unknown) {
  return value instanceof Timestamp ? value.toDate() : null;
}

export function mapAuthUser(user: FirebaseUser): AuthUser {
  return {
    id: user.uid,
    email: user.email,
    displayName: user.displayName,
  };
}

function mapUserProfile(userId: string, data: Record<string, unknown>): UserProfile {
  return {
    id: userId,
    email: typeof data.email === 'string' ? data.email : null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export async function ensureUserProfile(user: FirebaseUser): Promise<UserProfile> {
  const db = requireDb();
  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    await setDoc(userRef, {
      email: user.email ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(
      userRef,
      {
        email: user.email ?? snapshot.data().email ?? null,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  const refreshedSnapshot = await getDoc(userRef);
  return mapUserProfile(user.uid, refreshedSnapshot.data() ?? {});
}

export async function signUp(email: string, password: string): Promise<void> {
  const credentials = await createUserWithEmailAndPassword(requireAuth(), email, password);
  await ensureUserProfile(credentials.user);
  await createDefaultShelf(credentials.user.uid);
}

export async function signIn(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(requireAuth(), email, password);
}

export async function signOutUser(): Promise<void> {
  await firebaseSignOut(requireAuth());
}

export function subscribeToAuth(listener: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(requireAuth(), listener);
}

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    const messages: Record<string, string> = {
      'auth/email-already-in-use': 'That email is already in use.',
      'auth/invalid-email': 'Enter a valid email address.',
      'auth/invalid-credential': 'That email/password combination was not recognized.',
      'auth/missing-password': 'Enter your password to continue.',
      'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
      'auth/user-not-found': 'No SnapShelf account was found for that email.',
      'auth/weak-password': 'Choose a stronger password with at least 6 characters.',
      'auth/network-request-failed': 'Network error. Check your connection and try again.',
      'permission-denied': 'Your Firebase rules blocked this request. Check Firestore/Auth setup.',
    };

    return messages[error.code] ?? error.message;
  }

  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
