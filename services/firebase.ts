import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import type { Auth, Persistence } from 'firebase/auth';
import * as FirebaseAuth from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

import { firebaseConfigError, firebaseEnv, isFirebaseConfigured, missingFirebaseEnv } from '@/shared/config/env';

const { getAuth, initializeAuth } = FirebaseAuth;

const getReactNativePersistence = (
  FirebaseAuth as typeof FirebaseAuth & {
    getReactNativePersistence?: (storage: typeof AsyncStorage) => Persistence;
  }
).getReactNativePersistence;

const app = isFirebaseConfigured ? (getApps().length > 0 ? getApp() : initializeApp(firebaseEnv)) : null;

function createAuthInstance(): Auth | null {
  if (!app) {
    return null;
  }

  if (Platform.OS === 'web') {
    return getAuth(app);
  }

  if (!getReactNativePersistence) {
    return getAuth(app);
  }

  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
}

export const auth = createAuthInstance();
export const db: Firestore | null = app ? getFirestore(app) : null;

function requireService<T>(service: T | null): T {
  if (!service) {
    throw new Error(firebaseConfigError ?? 'Firebase has not been configured yet.');
  }

  return service;
}

export function requireAuth() {
  return requireService(auth);
}

export function requireDb() {
  return requireService(db);
}

export { app, firebaseConfigError, isFirebaseConfigured, missingFirebaseEnv };
