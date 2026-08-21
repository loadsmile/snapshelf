# SnapShelf

**Device-local images, cloud-synced organization.**

SnapShelf is a mobile-first visual reference library built with Expo, React Native, TypeScript, and Supabase. It gives people a fast path from capture to retrieval: import an image or share a link, process it in **The Tray**, find it later in **Library**, and arrange related ideas into **Shelves** and **Stacks** on a spatial **Board**.

This README is the starting point for running, understanding, and contributing to the project. Use `supabase/migrations/` for the exact schema and [TECHNICAL_OVERVIEW.md](TECHNICAL_OVERVIEW.md) for explanatory implementation context.

## Contents

- [Product model](#product-model)
- [Capabilities](#capabilities)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Supabase development](#supabase-development)
- [Developer guide](#developer-guide)
- [Testing](#testing)
- [Scripts](#scripts)
- [Troubleshooting](#troubleshooting)
- [Constraints and recovery](#constraints-and-recovery)
- [Security](#security)
- [Release process](#release-process)
- [Documentation](#documentation)

## Product Model

| Concept | Purpose |
| --- | --- |
| **Snap** | A saved reference with an optional image, title, thought, labels, source link, favorite state, and archive state. |
| **The Tray** | The inbox for Snaps that have not been assigned to a Shelf. |
| **Library** | Account-wide search, filtering, sorting, and bulk management for loaded Snaps. |
| **Shelf** | A named collection of Snaps. A Snap can belong to one Shelf. |
| **Stack** | A visual Board grouping for Shelves. Stacks do not contain Snaps directly. |
| **Thread** | The relationship that connects a Shelf to a Stack on the Board. The data model retains legacy Shelf-to-Shelf anchors. |
| **Board** | A spatial or list view of Shelves, Stacks, and their relationships. |

The primary workflow is intentionally short:

```text
Import or share
    -> save to The Tray or a Shelf
    -> add context such as a title, thought, labels, or source
    -> retrieve through Library
    -> curate with Shelves and Stacks on the Board
```

## Capabilities

- Email and password authentication with email-confirmation and password-recovery deep links
- In-app image imports and native share imports for up to 20 images
- Native sharing of images, HTTPS links, and text into SnapShelf
- Post-save View, File Now, and Undo actions for single imports
- On-device image processing and application-scoped file storage
- Missing-media detection, replacement, and reference removal
- Shelf, Stack, Thread, label, favorite, archive, and source metadata
- Bulk Move, Favorite, Archive/Restore, and Delete actions
- Cursor pagination for The Tray and Shelf views
- In-memory Library search, filtering, and sorting
- Board grid/list modes, search, drag positioning, pan, and zoom
- Deterministic daily rediscovery of older active Snaps
- Light and Midnight Archive themes
- Supabase Realtime refetching for shared metadata

## Architecture

SnapShelf separates screen orchestration, domain behavior, backend access, and local media handling.

```text
Expo Router screens in app/
    -> domain APIs and hooks in features/
        -> Supabase client in services/supabase.ts
            -> Auth, Postgres, and Realtime
        -> local image helpers in features/images/
            -> Expo documentDirectory
    -> shared UI, providers, hooks, and theme in shared/
```

When a relevant Postgres change arrives through Realtime, the feature subscription refetches its current query instead of merging database payloads into UI state. This favors predictable state over a more complex client-side cache.

### Data Ownership

| Data | Location | Behavior |
| --- | --- | --- |
| Snap images | Current device | Stored under Expo's application document directory. They are not uploaded by the current app flow. |
| Shelf and Stack custom covers | Current device | Stored locally and resolved through device-scoped location records. |
| Snap, Shelf, Stack, and Thread metadata | Supabase Postgres | Synced by account and protected with Row Level Security. |
| Device media locations | Supabase Postgres | Relative paths are keyed by user, installation, and entity so one device cannot overwrite another device's path. |
| Auth session | SecureStore on native; AsyncStorage on web | Persisted and refreshed by the Supabase client. |
| `snap-media` Storage bucket | Supabase Storage | Private bucket prepared for future media sync; the app does not currently upload images to it. |

"Device-local images" does not mean the entire application works offline. Authentication and metadata operations require Supabase, and there is no offline mutation queue.

### Project Structure

```text
app/                         Expo Router routes and screen orchestration
features/                    Domain APIs, types, helpers, and unit tests
  auth/                      Authentication, profile, and account actions
  images/                    Local files and device-scoped media locations
  shelves/                   Shelf persistence and Board placement
  snaps/                     Capture, retrieval, pagination, and bulk actions
  stacks/                    Stack persistence and local cover handling
  threads/                   Shelf-to-Stack relationships
shared/                      Reusable UI, hooks, providers, config, and theme
services/                    Supabase client, auth storage, and device ID
supabase/migrations/         Executable database source of truth
supabase/functions/          Account-deletion Edge Function
supabase/tests/database/     Transactional database and RLS tests
.maestro/                    Optional mobile smoke flows
.github/workflows/           CI, EAS build, and EAS submission workflows
docs/                        Release and device-QA guidance
patches/                     Native dependency fixes applied after install
```

Generated `ios/`, `android/`, and `dist/` directories are not canonical source.

## Getting Started

### Prerequisites

- Node.js 20 and npm
- A Supabase project, or Docker for the local Supabase stack
- Xcode for iOS development or Android Studio for Android development
- Maestro installed separately if you want to run mobile smoke flows

Use a native development build. The current root layout waits for the native share-intent provider, which is unavailable in Expo Go and on web; those targets are not reliable onboarding or UI-preview paths for this version. Native builds are also required for share-intent, deep-link, permission, and local-file testing.

### 1. Install Dependencies

```bash
npm ci
```

Installation runs `patch-package`. Do not disable install scripts: the repository includes required patches for `expo-share-intent` and Xcode project generation.

### 2. Configure the Environment

Create `.env` in the repository root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-or-anon-public-key>
```

| Variable | Required | Used by |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | App connection to Supabase |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Public client authorization; a legacy anon public key is also supported |
| `SNAPSHELF_TEST_EMAIL` | Maestro only | Disposable smoke-test account |
| `SNAPSHELF_TEST_PASSWORD` | Maestro only | Disposable smoke-test account |
| `EXPO_TOKEN` | CI/EAS only | Authenticates EAS build and submit workflows |

All `EXPO_PUBLIC_*` values are embedded in client bundles. Never place a Supabase `service_role` key or any other privileged secret in one of these variables.

### 3. Start the App

Start Metro:

```bash
npm start
```

Or compile and run a native development build directly:

```bash
npm run ios
npm run android
```

`npm run web` starts Expo's web development server, but the current share-intent provider prevents web from completing app initialization. Treat web as an unsupported target until that provider is explicitly disabled or replaced for web.

### 4. Confirm the First-Run Flow

1. Create an account with a disposable development email.
2. Confirm the email before signing in. Confirmations are enabled locally and requested by the versioned hosted configuration; verify the hosted project after pushing that configuration.
3. Import an image from The Tray or share an image into the native app.
4. File the Snap into a Shelf and verify it appears in Library and updates the Shelf's count or cover on the Board.

## Supabase Development

The migrations in `supabase/migrations/` are the executable backend source of truth. They create the schema, functions, constraints, RLS policies, Realtime publication entries, profile trigger, and private Storage bucket.

### Local Stack

Start Supabase, rebuild it from versioned migrations, and run database tests:

```bash
npm run db:start
npm run db:reset
npm run test:db
```

`npm run db:reset` destroys local database data. Use `npx supabase status` to retrieve the local API URL, public key, Studio URL, and local mail-capture URL, then place the API URL and public key in `.env`.

To exercise account deletion locally, serve the Edge Function in another terminal and use a disposable account through the native app:

```bash
npx supabase functions serve delete-account
```

The migrations create the private `snap-media` bucket required by the function. Stop the local stack when you finish:

```bash
npx supabase stop
```

Local defaults are API port `54321`, Postgres port `54322`, Studio port `54323`, and Postgres 17. A physical device or Android emulator may not be able to reach a `127.0.0.1` API URL; use an address or forwarding route reachable from that runtime.

### Hosted Project

Authenticate the Supabase CLI, assign the target project reference to a shell variable, and review the linked project before applying backend changes:

```bash
npx supabase login
export SUPABASE_PROJECT_REF="your-project-ref"
npx supabase link --project-ref "$SUPABASE_PROJECT_REF"
npx supabase db push
npx supabase config push
npx supabase functions deploy delete-account
npx supabase migration list
```

The function accepts either a server-side `SERVICE_ROLE_KEY` or Supabase's built-in `SUPABASE_SERVICE_ROLE_KEY`. Never expose either through app environment variables or command history. The repository does not deploy hosted migrations, Auth configuration, or Edge Functions automatically.

## Developer Guide

### Keep Backend Access Behind Feature APIs

Screens should call domain functions from `features/*/api.ts`; they should not construct Supabase queries directly. This keeps database row mapping, device-local path resolution, pagination, error handling, and Realtime behavior in one place.

For example, a caller can page through The Tray without knowing its Postgres query or media-location schema:

```ts
import { listTraySnaps, type SnapCursor } from '@/features/snaps/api';

async function loadTrayPage(userId: string, cursor: SnapCursor | null = null) {
  return listTraySnaps(userId, cursor, 20);
}

const firstPage = await loadTrayPage(userId);
const nextPage = firstPage.cursor
  ? await loadTrayPage(userId, firstPage.cursor)
  : null;
```

The feature API filters unfiled rows, orders them by `created_at` and `id`, resolves local paths for the current installation, and returns a serializable cursor for the next page.

### Add Domain Behavior

1. Define or update domain types in the relevant `features/<domain>/types.ts` file.
2. Keep database and local-file orchestration in the feature API, not in a route component.
3. Put deterministic transforms, validation, search, and filtering in pure helpers where possible.
4. Let routes in `app/` coordinate loading state, user input, navigation, and presentation.
5. Add Vitest coverage for helper and API behavior.
6. Add a transactional SQL test when a migration, RLS policy, constraint, or Postgres function changes.
7. Run native device QA for share intents, deep links, permissions, filesystem behavior, and account deletion.

### Realtime Model

Feature subscriptions listen for Postgres changes scoped to the signed-in user and refetch the current resource. Snap subscriptions also coalesce changes received while a request is in flight. Preserve cleanup functions when subscribing from a component so channels are removed on unmount.

### Pagination Model

The Tray and Shelf queries use a stable two-part cursor:

```ts
type SnapCursor = {
  createdAt: string;
  id: string;
};
```

Rows are ordered by `created_at DESC, id DESC`. Subsequent pages request rows older than the cursor, using `id` as the tie-breaker for identical timestamps.

## Testing

Use the narrowest test layer that can prove the change, then add native QA when platform behavior is involved.

| Layer | Command | Covers | Does not prove |
| --- | --- | --- | --- |
| TypeScript | `npm run typecheck` | Strict application type checking | Runtime behavior or Edge Function types |
| Unit/API | `npm test` | Pure helpers and mocked feature API behavior | React Native rendering or native modules |
| Database | `npm run test:db` | Selected RLS boundaries, constraints, and Postgres functions | Hosted parity, Storage policies, or Edge Functions |
| Expo health | `npx expo-doctor` | Expo dependency and configuration checks | Store artifact behavior |
| Maestro | `maestro test .maestro` | Optional, narrow mobile smoke flows | Complete share, filesystem, and deletion coverage |
| Device QA | Follow `docs/RELEASE_QA.md` | Native integrations on an exact build | Automated regression coverage |

The default application checks are:

```bash
npm run typecheck
npm test
```

For backend changes:

```bash
npm run db:start
npm run db:reset
npm run test:db
```

Use disposable accounts for smoke and device testing. Keep credentials out of committed Maestro files by supplying `SNAPSHELF_TEST_EMAIL` and `SNAPSHELF_TEST_PASSWORD` through the environment.

Maestro expects the native app ID `com.loadsmile.snapshelf` to be installed. Auth flows need valid test credentials, and the Board-search flow needs a development build because it uses dev-only sample data.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Start the Expo/Metro development server |
| `npm run ios` | Compile and run the native iOS app |
| `npm run android` | Compile and run the native Android app |
| `npm run web` | Start the currently unsupported Expo web target for diagnosis |
| `npm run typecheck` | Run TypeScript checks without emitting files |
| `npm test` | Run the Vitest suite once |
| `npm run db:start` | Start the local Supabase stack with Docker |
| `npm run db:reset` | Rebuild the local database from migrations; destructive to local data |
| `npm run test:db` | Run transactional database and RLS tests |
| `npm run release:verify` | Run types, unit tests, Expo Doctor, iOS/Android exports, and a critical production dependency audit |

`npm run release:verify` does not run database tests, Maestro, Edge Function tests, store-native builds, or device QA.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| The app reports that Supabase is not configured | Confirm both Supabase variables exist in `.env`, then restart Metro so Expo reloads them. |
| Local Supabase works on the computer but not a device | Replace loopback with a host address or forwarding route reachable by the device/emulator. |
| Sign-up succeeds but sign-in is blocked | Open the confirmation email. For local Supabase, find the mail-capture URL in `npx supabase status`. |
| Native share does not appear or route correctly | Use an iOS/Android native build, not Expo Go or web, and confirm install scripts applied the repository patches. |
| An RPC, table, or RLS error appears | Compare the target project with `npx supabase migration list` and apply missing migrations. |
| Account deletion returns a server error | Verify `delete-account` is deployed, the platform service-role secret is available, and the private `snap-media` bucket exists. |
| Images are missing after reinstalling or changing devices | This is expected for device-local media. Replace the image, remove its local reference, or use its source link when available. |
| Database tests cannot connect | Start Docker and run `npm run db:start` before `npm run test:db`. |

## Constraints and Recovery

- Image files do not sync across devices. A second device can receive metadata without the original media.
- Reinstalling, clearing app data, OS cleanup, or changing the installation identity can leave metadata without a usable local file.
- Application document storage does not establish file-level encryption or exclusion from operating-system backup and transfer features; review release-platform backup behavior separately.
- Deletion removes backend state first and then attempts current-device file cleanup. It cannot remove orphaned files from another device.
- The Library loads account data and filters it in memory; the Supabase API row cap still applies. Local Supabase is configured for at most 1,000 rows per response.
- The Board uses the 200 newest Snaps for Snap-derived search, counts, and covers.
- Bulk Snap operations are bounded to 50 IDs per database transaction. A larger selection is processed in multiple transactions rather than as one atomic operation.
- Native share intent, photo selection, deep links, file permissions, local deletion, and account deletion require simulator or physical-device validation.

## Security

- Public Expo bundles receive public Supabase connection values, but no privileged Supabase credential.
- The service-role key is restricted to the account-deletion Edge Function.
- Every public user-data table uses Row Level Security, and composite foreign keys prevent cross-account relationships.
- Native auth sessions use SecureStore; web sessions use AsyncStorage.
- Device media locations store relative paths and reject absolute/path-traversal values at the database boundary.
- Shared source links must use HTTPS and are rejected when they contain credentials or match the client's blocked localhost/private-host patterns.
- Android explicitly blocks camera, microphone, overlay, and broad external-storage permissions that SnapShelf does not need.

See [docs/RELEASE_QA.md](docs/RELEASE_QA.md) for the privacy, security, backend, and device checks that must be completed against release behavior.

## Release Process

Native builds use `com.loadsmile.snapshelf` on iOS and Android. `eas.json` defines an internal preview profile and an auto-incrementing production profile.

> **Current status:** No production artifact is approved for submission. Complete [docs/RELEASE_QA.md](docs/RELEASE_QA.md) against an exact production artifact before using EAS Submit. Never use obsolete Android build `a09efdc8-2f9e-49d6-a9ca-ed280f8fa6e9`.

Before requesting a production build:

1. Confirm the linked EAS project and authenticated account with `npx eas-cli whoami` and `npx eas-cli project:info`.
2. Configure the two public Supabase variables for the EAS `preview` and `production` environments.
3. Add `EXPO_TOKEN` to GitHub Actions secrets.
4. Configure App Store Connect or Google Play credentials in EAS.
5. Apply and verify hosted Supabase migrations, Auth redirects, secrets, and the account-deletion function.

The `EAS Build` workflow accepts `main` or an `rc-*` tag, verifies a clean release ref, runs release checks, waits for EAS, and stores each archive with build metadata and a SHA-256 checksum. The separate `EAS Submit` workflow accepts only an exact reviewed build ID, release commit, checksum, and explicit QA approval from `main`.

Passing CI or `npm run release:verify` is not release approval. Complete [docs/RELEASE_QA.md](docs/RELEASE_QA.md) against the exact production artifact before submission.

## Documentation

| Document | Audience and purpose |
| --- | --- |
| [README.md](README.md) | Contributors: product model, setup, development workflow, and troubleshooting |
| [TECHNICAL_OVERVIEW.md](TECHNICAL_OVERVIEW.md) | Engineers: architecture, schema, RLS, Realtime, and backend implementation details |
| [PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md) | Product and engineering: scope, priorities, constraints, and release direction |
| [docs/RELEASE_QA.md](docs/RELEASE_QA.md) | Release team: artifact inspection, device matrix, backend checks, and approval |

When documentation and implementation disagree, treat current code and versioned Supabase migrations as the technical source of truth, then update the affected documentation in the same change.
