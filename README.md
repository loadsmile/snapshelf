# SnapShelf

SnapShelf is a local-first visual inspiration board built with Expo Router and React Native. It helps users capture references, process new items through The Tray, retrieve anything through Library, and organize saved inspiration into Shelves and Stacks on a spatial Board.

Supabase is the selected backend. The Firebase-to-Supabase cutover is implemented for auth/profile metadata, Shelves, Snaps, Stacks, Threads, pagination, Realtime refetching, account-deletion code, Firebase cleanup, and Edge Function deployment.

## Features

- Board, Library, The Tray, Shelf, and Settings views
- Email/password account flow with confirmation and signed-out recovery deep links
- Capture-first onboarding with local-storage guidance
- In-app and native share imports for up to 20 images
- Original-source links with safe open and copy actions
- Post-save View, File now, and Undo actions
- On-device image processing and local file storage for Snap media
- Current-device image replacement and missing-media recovery
- Shelves, Stacks, threads, labels, favorites, archive state, and source metadata
- Accessible bulk Move, Favorite, Archive/Restore, and Delete in The Tray and Library
- Shelf and Stack rename, safe Stack deletion, and Stack-aware Board list/search
- Deterministic daily "From Your Archive" rediscovery
- In-memory search/filtering and cursor-style pagination
- Light mode and Midnight Archive dark mode
- Dev-only sample data and local media health checks

## Local-First Media

SnapShelf intentionally stores Snap images on the device where they are captured or imported. Backend metadata stores titles, labels, thoughts, source links, Shelf assignments, Board positions, favorites, and archive state. Device-scoped location records keep each installation's local paths separate, so replacing an image on one device cannot break another device's copy.

Expected limitations:

- Signing in on another device can show synced metadata without local image files until images are added on that device.
- Reinstalling the app, clearing app data, or OS cleanup can leave metadata without local media.
- Deleting a Snap removes its local file on the current device when the current flow owns that file.
- Cloud image upload and cross-device image sync are not part of the current scope.

## Tech Stack

- Expo SDK 54
- Expo Router
- React Native 0.81
- TypeScript
- Supabase Auth/Postgres/Realtime/Storage as backend target
- Vitest for helper-level unit tests
- Maestro smoke flows under `.maestro/`

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file with Supabase public values:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-public-key
```

3. Start Expo:

```bash
npm start
```

Do not put the Supabase `service_role` key in `.env`. It belongs only in Supabase Edge Function secrets.

## Supabase Setup

The versioned files under `supabase/migrations/` are the backend source of truth. At a high level:

- Create a free Supabase project.
- Enable Email auth.
- Keep `snapshelf://**` in the hosted project's Auth redirect URLs.
- Keep email confirmation enabled in production.
- Apply the versioned schema, including user-owned metadata and device-scoped media-location tables.
- Enable Row Level Security on all public tables.
- Add user-owned RLS policies.
- Enable Realtime for `shelves`, `snaps`, `stacks`, and `threads`.
- Create a private `snap-media` bucket for future media sync.
- Deploy the `supabase/functions/delete-account` Edge Function before enabling production self-serve account deletion.

## Backend Migration Status

- Implemented: versioned Supabase config/schema, auth and profiles, Shelves, Snaps with cursor pagination and source links, atomic single/batch media creation, bounded bulk mutations, Stacks, Threads, device-scoped media locations, Realtime refetch subscriptions, account-deletion local media cleanup, obsolete Firebase cleanup, and the `delete-account` Edge Function source.
- Remaining: run device QA with a disposable account before enabling production self-serve account deletion.

## Scripts

- `npm start` - start Expo
- `npm run ios` - run iOS app
- `npm run android` - run Android app
- `npm run web` - run web build locally
- `npm run typecheck` - run TypeScript checks
- `npm test` - run unit tests
- `npm run db:start` - start the local Supabase stack with Docker
- `npm run db:reset` - rebuild the local database from versioned migrations
- `npm run test:db` - run transactional database and RLS tests

## Production Builds

Native builds use `com.loadsmile.snapshelf` on both platforms. `eas.json` defines an internal preview build and an auto-incrementing production build with store submission settings.

Before the first EAS build:

1. Run `npx eas-cli login` and `npx eas-cli init` to create or link the Expo project. Commit the generated `expo.extra.eas.projectId` value in `app.json`.
2. Configure `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the EAS `preview` and `production` environments.
3. Add an `EXPO_TOKEN` repository secret in GitHub.
4. Configure App Store Connect and Google Play credentials in EAS.

The `EAS Build` GitHub Actions workflow can then create production builds on demand and optionally submit successful builds. The regular `CI` workflow runs TypeScript, unit tests, Expo Doctor, an iOS production export, a critical-vulnerability dependency audit, and local Supabase database tests.

Push hosted Auth settings from the linked Supabase project after reviewing `supabase/config.toml`:

```bash
npx supabase config push
```

## Documentation

- `README.md` - project entry point and setup
- `TECHNICAL_OVERVIEW.md` - architecture, Supabase setup, schema, RLS, Realtime, and QA notes
- `PRODUCT_ROADMAP.md` - product direction, scope, roadmap, and product constraints

## Testing

Run helper-level validation with:

```bash
npm run typecheck
npm test
```

Validate the backend schema when Docker is available:

```bash
npm run db:start
npm run db:reset
npm run test:db
```

Optional Maestro smoke flows can be run when a simulator or device is available:

```bash
maestro test .maestro
```

Use disposable test accounts for mobile smoke testing. Native share intent, photo picker, file permissions, local file deletion, and account deletion still require simulator or device QA.
