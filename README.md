# SnapShelf

SnapShelf is a local-first inspiration board built with Expo Router, React Native, and Firebase.

The current MVP stores Snap media on-device and keeps structured metadata in Firestore. Firebase Storage scaffolding is present for future expansion, but image uploads are not enabled today.

## Features

- Board, The Tray, and Shelf views
- Email/password auth with Firebase Auth
- Firestore-backed shelves, snaps, and threads
- On-device image processing and local file storage for Snap media
- Share intent support for text and images
- In-memory board search and cursor-based pagination

## Tech Stack

- Expo SDK 54
- Expo Router
- React Native 0.81
- Firebase Auth + Firestore
- Vitest for lightweight unit tests

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file with these Expo public variables:

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

3. Start the app:

```bash
npm start
```

## Scripts

- `npm start` - start Expo
- `npm run ios` - run iOS app
- `npm run android` - run Android app
- `npm run web` - run web build locally
- `npm run typecheck` - run TypeScript checks
- `npm test` - run unit tests

## Notes

- Snap images are saved locally with `expo-file-system` under the app document directory.
- Cross-device media sync is not implemented yet.
- Additional architecture notes live in `TECHNICAL_OVERVIEW.md`.
