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

## Maestro Smoke Tests

First-pass E2E smoke flows live in `.maestro/`. Install Maestro, start the app on a simulator or connected device, sign in with a disposable Firebase test account, then run:

```bash
maestro test .maestro
```

Use `Maestro.md` for local setup, test credential guidance, and device assumptions. The committed flows preserve local-first media storage and avoid destructive account deletion or real user data cleanup.

Recommended next E2E additions are documented in `Maestro.md`: fixture-image Create Snap saves, Tray triage, Library search/filter coverage, Snap detail edits, iOS parity, CI scope, and a safe test data reset strategy.

## Notes

- Snap images are saved locally with `expo-file-system` under the app document directory.
- Cross-device media sync is not implemented yet.
- Additional architecture notes live in `TECHNICAL_OVERVIEW.md`.

## V1 Local-First Limitations

- Snap metadata syncs through Firestore, but Snap image files stay on the device where they were saved.
- Signing in on another device can show synced Snap records without their local image files until media sync is added.
- Reinstalling the app, clearing app data, or restoring only Firestore data can leave Snap records without local media.
- Deleting a Snap removes its local file on the current device through the local-first delete flow; there is no Firebase Storage cleanup because image uploads are not enabled.
- Share intent behavior depends on OS-level handoff and file permissions, so image saves should be verified on real iOS and Android targets before release.
