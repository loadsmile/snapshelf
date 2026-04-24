const firebaseEnv = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

export const missingFirebaseEnv = Object.entries({
  EXPO_PUBLIC_FIREBASE_API_KEY: firebaseEnv.apiKey,
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: firebaseEnv.authDomain,
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: firebaseEnv.projectId,
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: firebaseEnv.messagingSenderId,
  EXPO_PUBLIC_FIREBASE_APP_ID: firebaseEnv.appId,
})
  .filter(([, value]) => !value)
  .map(([key]) => key);

export const isFirebaseConfigured = missingFirebaseEnv.length === 0;

export const firebaseConfigError = isFirebaseConfigured
  ? null
  : `Missing Firebase environment values: ${missingFirebaseEnv.join(', ')}`;

export { firebaseEnv };
