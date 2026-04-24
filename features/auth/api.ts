import type { User as FirebaseUser } from 'firebase/auth';
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, Timestamp, writeBatch } from 'firebase/firestore';

import type { AuthUser, UserProfile } from '@/features/auth/types';
import { listAllSnaps } from '@/features/snaps/api';
import { deleteSnapImageLocally } from '@/features/snaps/utils';
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
    displayName: typeof data.displayName === 'string' ? data.displayName : null,
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
      displayName: user.displayName ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(
      userRef,
      {
        email: user.email ?? snapshot.data().email ?? null,
        displayName: user.displayName ?? (typeof snapshot.data().displayName === 'string' ? snapshot.data().displayName : null),
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

export async function updateUserDisplayName(displayName: string): Promise<void> {
  const auth = requireAuth();
  const db = requireDb();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('Sign in again before updating your profile.');
  }

  const trimmedDisplayName = displayName.trim();
  await updateProfile(currentUser, {
    displayName: trimmedDisplayName || null,
  });

  await setDoc(
    doc(db, 'users', currentUser.uid),
    {
      email: currentUser.email ?? null,
      displayName: trimmedDisplayName || null,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function sendPasswordReset(): Promise<void> {
  const auth = requireAuth();
  const currentUser = auth.currentUser;

  if (!currentUser?.email) {
    throw new Error('This account does not have an email address for password reset.');
  }

  await sendPasswordResetEmail(auth, currentUser.email);
}

async function deleteCollectionDocs(pathSegments: [string, string, string]) {
  const db = requireDb();
  const snapshot = await getDocs(collection(db, ...pathSegments));

  if (snapshot.empty) {
    return;
  }

  for (let index = 0; index < snapshot.docs.length; index += 400) {
    const batch = writeBatch(db);
    snapshot.docs.slice(index, index + 400).forEach((entry) => {
      batch.delete(entry.ref);
    });
    await batch.commit();
  }
}

async function deleteUserData(userId: string) {
  const db = requireDb();
  const snaps = await listAllSnaps(userId);

  await Promise.all(snaps.map((snap) => deleteSnapImageLocally(snap.localPath)));
  await deleteCollectionDocs(['users', userId, 'threads']);
  await deleteCollectionDocs(['users', userId, 'snaps']);
  await deleteCollectionDocs(['users', userId, 'shelves']);
  await deleteDoc(doc(db, 'users', userId));
}

export async function deleteCurrentUserAccount(password: string): Promise<void> {
  const auth = requireAuth();
  const currentUser = auth.currentUser;

  if (!currentUser?.email) {
    throw new Error('Sign in again before deleting this account.');
  }

  const trimmedPassword = password.trim();
  if (!trimmedPassword) {
    throw new Error('Enter your current password to delete this account.');
  }

  const credential = EmailAuthProvider.credential(currentUser.email, trimmedPassword);
  await reauthenticateWithCredential(currentUser, credential);
  await deleteUserData(currentUser.uid);
  await deleteUser(currentUser);
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
      'auth/requires-recent-login': 'Please sign in again, then retry this action.',
      'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
      'auth/user-not-found': 'No SnapShelf account was found for that email.',
      'auth/wrong-password': 'That password was not recognized.',
      'auth/weak-password': 'Choose a stronger password with at least 6 characters.',
      'auth/network-request-failed': 'Network error. Check your connection and try again.',
      'permission-denied': 'Your Firebase rules blocked this request. Check Firestore/Auth setup.',
    };

    return messages[error.code] ?? error.message;
  }

  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
