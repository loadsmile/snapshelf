# SnapShelf Product Notes

This is the product source of truth for SnapShelf. It combines the previous PRD and roadmap into one concise document.

## Product Summary

SnapShelf is a mobile-first visual inspiration app for capturing, finding, and organizing screenshots and references that would otherwise disappear into a camera roll.

The product should feel like a sun-drenched personal archive: calm, editorial, tactile, visual, and useful without feeling like a productivity database.

## Positioning

SnapShelf is not a generic file manager, shopping app, social app, or task tool. It is a visual memory system for people who collect inspiration and want it to remain findable, contextual, and pleasing to revisit.

Core loop:

1. Capture a visual idea quickly.
2. Let unsorted items land in The Tray.
3. Add enough context to remember why it mattered.
4. Retrieve later through Library search and filters.
5. Move keepers into Shelves and arrange the larger system on the Board.

## Target Users

### Visual Homemaker

Collects interiors, furniture, paint colors, lighting, tableware, renovation ideas, and home inspiration.

Core need: one warm, organized place for home ideas scattered across screenshots, Pinterest, Instagram, and shopping sites.

### Style Curator

Saves outfits, accessories, beauty references, brands, styling ideas, and wishlist items.

Core need: fashion screenshots become a curated personal lookbook instead of disappearing into the camera roll.

### Creative Planner

Designers, stylists, content creators, event planners, or visual thinkers collecting references for projects.

Core need: a tactile visual workspace where references become useful, organized boards instead of random saved images.

## Core Concepts

### Snap

A saved visual reference. A Snap can have an image, source, title, thought, labels, favorite state, archive state, saved/captured date, and optional Shelf assignment.

### The Tray

The inbox for new or unsorted Snaps. Items shared into SnapShelf or saved without a Shelf land here until the user processes them.

The Tray should be compact, quick, and action-oriented. It is a triage queue, not a permanent archive.

### Library

The trusted retrieval surface for the whole account. Users should be able to find anything by searching title, thought, label, shelf, or source, then refine with lightweight filters.

### Shelf

A named collection of Snaps. Shelves give structure to inspiration and can be placed on the Board. Deleting a Shelf moves its Snaps back to The Tray.

### Stack

A visual-only Board organizer for grouping Shelves. Stacks do not contain Snaps and are not Snap destinations.

### Board

The spatial organization surface. Shelves and Stacks should feel like memorable objects arranged in a personal workspace rather than rows in a database.

### Settings

An account panel focused on profile, password reset, account deletion, sign out, theme, dev-only sample data, and local media checks.

## Product Principles

- Keep capture effortless and forgiving.
- Keep The Tray fast to process.
- Make Library build retrieval trust.
- Make organization feel spatial and memorable.
- Prefer calm over clutter.
- Preserve the warm, tactile, editorial visual language.
- Keep settings focused and practical.
- Avoid adding out-of-scope productivity or social features by default.

## Current Product State

SnapShelf currently supports:

- Email/password account flow
- Account profile management, password reset, delete account, and sign out
- Native share-intent capture into SnapShelf
- Quick Snap creation from inside the app
- The Tray for unsorted incoming Snaps
- Library search, filtering, sorting, and retrieval
- Shelves for named collections
- Stacks for visual Board grouping
- Board-based spatial organization
- Favorites, archive status, labels, sources, dates, thoughts, and shelf assignment
- Dev-only sample data seeding
- Light mode and Midnight Archive dark mode
- Local media health checks
- Capture-first onboarding and up-to-20-image imports
- Accessible loaded-result bulk triage in The Tray and Library
- Shelf/Stack rename, safe Stack deletion, and Stack-aware Board search/list mode
- Daily deterministic archive rediscovery

## Backend Direction

Supabase is the chosen backend direction.

- Supabase Auth replaces Firebase Auth.
- Supabase Postgres replaces Firestore for structured metadata.
- Supabase Realtime replaces Firestore live subscriptions.
- Supabase Storage is prepared for future Snap media, but current media remains local-only.
- Supabase Edge Functions should handle secure account deletion that requires service role access.

Existing Firebase data does not need to be migrated. Supabase can start fresh.

Current implementation status:

- Implemented: Supabase foundation/config, auth and profiles, Shelves, Snaps, Stacks, Threads, cursor pagination, Realtime refetching, account-deletion local media cleanup, deployed `delete-account` Edge Function, and obsolete Firebase cleanup.
- Remaining: run device QA with a disposable account before enabling production self-serve account deletion.

## Local-First Media Policy

SnapShelf remains local-first for media.

- Snap images stay on the device under Expo `documentDirectory`.
- Stack and Shelf covers stay on the device.
- Local paths are stored per installation, so one device never replaces another device's media location.
- Backend metadata can outlive local files after reinstall, app data clear, or OS cleanup.
- Missing local media should be explained calmly and recoverably.
- Do not add cloud image upload, cross-device image sync, image CDN paths, or background media processing unless that scope is explicitly reprioritized.

## V1 Scope

V1 should prioritize:

- Fast capture
- The Tray triage
- Reliable retrieval through Library
- Shelf organization
- Board-based spatial organization
- Account safety and basic profile controls
- Local media clarity and recovery
- A polished mobile experience

## Out Of Scope For V1

- Automatic product recognition
- Automatic price detection
- AI-generated labels or metadata
- Shared wishlists or collaborative boards
- Public profiles or social following
- In-app purchasing or checkout
- Browser extension
- Full desktop web app
- Marketplace features
- Brand affiliate integrations
- Advanced analytics dashboards
- Complex permission roles for teams
- Realtime multi-user collaboration
- Automated screenshot deduplication
- Computer vision search
- Cross-device image sync

## Completed Product Work

- Library became the trusted retrieval surface with search, filters, sorting, result copy, chips, and empty states.
- The Tray became a compact triage queue with direct Move, Favorite, Archive, and Delete actions.
- Board and Shelf views now explain the organization model and make Shelves feel more meaningful.
- Stacks became visual-only Board organizers.
- Settings was focused on account, profile, security, theme, and dev tools.
- Snap media save/delete/status helpers were hardened around missing files and unavailable local storage.
- Local media failures now have graceful UI fallbacks and a dev-only health check.
- Appearance supports persisted light/dark mode with the Midnight Archive palette.
- Stack covers support manual local images.
- Snap creation and share-intent capture provide source-aware copy, validation, labels, and destination messaging.
- Web clips preserve a structured original source with safe open and copy actions.
- New saves provide View, File now, Undo, and destination-aware continuation.
- Missing or unusable current-device images can be replaced without changing Snap metadata.
- Board search works in grid mode with highlighted matching Shelves, auto-focus, and Tray-only result callouts.
- Snap detail became the consistent curation surface across Library, Tray, and Shelf.
- First-pass Maestro smoke coverage protects launch/navigation, Settings dark mode, Board search, and Create Snap validation.
- First-run guidance starts with capture and explains that images remain on the current device.
- In-app photo picking and native share flows import up to 20 images with shared context and atomic persistence.
- Tray and Library support explicit selection, loaded-result Select All, bounded bulk mutations, and partial-failure retention.
- Shelves and Stacks support validated rename flows; Stack deletion preserves Shelves and Snaps.
- Board list/search includes Stacks, and Library surfaces deterministic older saves through From Your Archive.

## Best Next Product Steps

1. Link the Expo project and configure EAS/GitHub credentials for the checked-in build and submission workflows.
2. Add privacy-reviewed crash/error telemetry, legal/support surfaces, retention policy, and account-data export.
3. Complete accessibility and real-device QA across iOS and Android, including email confirmation and password recovery links.
4. Bound Library reads, remove the Board's 200-Snap limitation, and reconcile orphaned local media.

## QA Priorities

Run a real-device or simulator pass for:

- Sign-up, sign-in, sign-out, password reset, and account deletion
- Share intent on iOS and Android
- Local image save, render, missing-file fallback, and delete
- Tray triage
- Library search and filters
- Board drag, zoom, search, and view mode
- Shelf detail and Snap detail actions
- Theme switching
- Dev sample data seeding

Unit tests and typecheck are necessary but not enough for native file, share intent, auth, or photo-picker confidence.
