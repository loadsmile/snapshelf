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

1. Continue product tweaks and local-phone testing; do not release or submit `rc-1.0.1`.
2. Replace release-contact placeholders with a real privacy-policy URL, public support URL, monitored support email, and public account-deletion page; legally review and publish the privacy policy.
3. Assign support and incident owners, configure Supabase and Google Play monitoring, and add privacy-reviewed crash/error telemetry.
4. Complete the Google Play listing with release-build screenshots and feature graphic, then revalidate the prepared description, Data safety answers, content rating, app access, and review notes against the exact AAB.
5. Complete Android accessibility and real-device QA, including email confirmation, password recovery, account deletion, Settings legal/support links, and the post-release smoke procedure.
6. Define production retention periods and an account-data export process.
7. Resume iOS credentials, production build, and device QA only when iOS release work is reprioritized.
8. Bound Library reads, remove the Board's 200-Snap limitation, and reconcile orphaned local media.

## Android Release Foundation Status

The release foundation is implemented but not publish-ready. Placeholder contact details are intentional and release-blocking until real public values are supplied.

Completed in the working tree:

- Settings now provides Privacy Policy, Support website, and Support email actions for signed-in and signed-out states.
- Public contact values are centralized in `shared/config/release.ts` through `EXPO_PUBLIC_PRIVACY_POLICY_URL`, `EXPO_PUBLIC_SUPPORT_URL`, and `EXPO_PUBLIC_SUPPORT_EMAIL`.
- `npm run release:verify-contact` rejects missing, placeholder, non-HTTPS, or invalid contact values and runs first in `npm run release:verify`.
- `docs/PRIVACY_POLICY.md` contains a behavior-specific publication draft covering account data, synced metadata, local-only image contents, service providers, backups, retention, deletion, security, children, rights, and contact details.
- `docs/GOOGLE_PLAY_SUBMISSION.md` contains the proposed app name, short and full descriptions, category/tags, screenshot plan, feature-graphic requirement, Data safety filing, content-rating facts, reviewer-account requirements, and review-notes template.
- `docs/RELEASE_OPERATIONS.md` defines support intake and severity, monitoring ownership, incident response, staged rollout, forward-fix rollback, and post-release smoke procedures.
- `docs/RELEASE_QA.md` now includes legal, store, support, reviewer-account, monitoring, screenshot, and rollback gates.
- Verification passed with TypeScript, all 92 unit tests, `npx expo-doctor` (17/17), `git diff --check`, and `npm audit --omit=dev --audit-level=critical` (0 critical). The contact validator passed with valid sample values and failed with repository placeholders as intended.

Still release-blocking:

- Replace every bracketed runbook field (`[NAME]`) in `docs/RELEASE_OPERATIONS.md` with reviewed ownership details. The `example.invalid` contact placeholders now exist only as code-level fallbacks; the reviewed production values live in `eas.json` `build.production.env` and are embedded at build time.
- Obtain legal/owner approval for the privacy policy, including exact Supabase hosting, operational-log, backup, support-mailbox, and deletion-request retention periods.
- Confirm whether Supabase is contractually a service provider before filing `Data shared: No`; revalidate all Data safety answers against the exact production behavior.
- Assign primary and backup owners for release command, support, Supabase/Auth/Edge Functions, Google Play health, privacy/deletion requests, and incident communications.
- Configure and test the monitored support inbox, Supabase alerts, Google Play Android vitals, and privacy-reviewed production crash/error reporting.
- Verify the deployed in-app deletion flow with a disposable production account; the public account-deletion page is already published.
- Capture rights-cleared phone screenshots and the 1024 x 500 feature graphic from the exact next release build; do not use the archived `rc-1.0.1` artifact.
- Create and verify a disposable reviewer account with representative sample data, then enter the final listing, app access, content rating, Data safety, and review notes in Play Console.
- Run the complete Android release QA and post-release smoke procedures from the Play-delivered artifact before staged production rollout.
- Upgrade `vitest` past 4.1.10 to clear the remaining dev-only `tinypool` prototype-pollution advisory. It is not shipped in the app and does not gate `npm audit --omit=dev --audit-level=critical`, so it is tracked separately from the release.

## RC 1.0.1 Release Status

`rc-1.0.1` is archived and will not be released. Product tweaks and local-phone testing continue. iOS release work remains intentionally deferred; no iOS credential setup, build, QA, or submission is currently planned.

- Release tag: `rc-1.0.1`
- Release commit: `9e4e2aee595ef8065f620afb0287e12d4df3100d`
- Release tag and commit verification: `main`, `origin/main`, and `rc-1.0.1` all resolved to the release commit before this release-status documentation update
- Android production EAS build: `332c3587-66ad-40be-972f-1e378d3685c1`
- Android build source: exact release commit, app version `1.0.0`, build number `3`
- Android build status: finished successfully August 12, 2026 at 13:18:10 UTC
- Android production artifact: `snapshelf-android-1.0.0-3.aab`
- Android SHA-256: `f743faeec6fee2808a580925636eb0efb2d5c789da47d6e1139bb63406d54712`
- Release decision: archived, unreleased, and not approved for device QA or Google Play submission
- Reuse policy: any code or configuration change requires a new clean commit, new RC tag, new production EAS build ID, Android build number greater than `3`, and new SHA-256
- Forbidden obsolete Android build: `a09efdc8-2f9e-49d6-a9ca-ed280f8fa6e9` from commit `d960e8e`
- Failed GitHub Actions run retained for history: `31597495357`
- iOS production build: not created and intentionally deferred
- Store submissions: none; never submit this archived artifact

## Before The Actual Android Release

1. Finish product tweaks and local testing, then resolve known severity-one and severity-two defects.
2. Freeze a clean, reviewed commit and create a new RC tag. Do not move or reuse `rc-1.0.1`.
3. From the clean release commit, run `npm ci`, `npm run typecheck`, `npm test`, `npx expo-doctor`, `npm run db:start`, `npm run db:reset`, `npm run test:db`, `npx expo export --platform android`, and the production dependency/security review.
4. Verify production Supabase migrations, RLS account isolation, Realtime recovery, Auth confirmation and recovery redirects from cold and warm app states, the deployed `delete-account` function, backups, limits, secrets, and monitoring ownership.
5. Finalize the existing release foundation: replace contact placeholders, publish and legally approve the privacy/support/deletion pages, assign operational owners, configure monitoring, capture release-build store assets, and enter/revalidate the prepared Play Console content from `docs/GOOGLE_PLAY_SUBMISSION.md`.
6. Create a new Android production AAB from the frozen commit with an Android build number greater than `3`.
7. Retain the exact AAB, EAS build ID, source commit, app version, build number, and SHA-256. Inspect its package ID, signing, permissions, `snapshelf://` scheme, backup behavior, adaptive icon, and splash screen.
8. Only with explicit approval, upload that exact AAB to Google Play internal testing. Never substitute a preview APK or independently generated build.
9. Install the Play-delivered artifact and complete every Android-applicable check in `docs/RELEASE_QA.md`, recording tester, date, device model, Android version, OS build/security patch, and every PASS, FAIL, or BLOCKED result.
10. Cover a current and an older supported Android OS where possible, including auth, recovery, imports, share intents, restart persistence, upgrade behavior, missing-image recovery, offline/reconnect behavior, permissions, dark mode, largest text, TalkBack, destructive actions, and account deletion.
11. Give every failure an owner and disposition. Any release-affecting fix requires another commit, build, checksum, and complete applicable retest.
12. Approve a staged production rollout only when the exact internal-test artifact has passed QA, no severity-one or severity-two release defect remains, and support and rollback owners are available.

## Soft Launch TODO

Assumes an invite-only TestFlight and Google Play internal-testing launch before broader store distribution.

### Release Blockers

- [x] Finish the frozen Android release candidate build from clean tag `rc-1.0.1` at `9e4e2aee595ef8065f620afb0287e12d4df3100d`; retain build ID `332c3587-66ad-40be-972f-1e378d3685c1` and SHA-256 `f743faeec6fee2808a580925636eb0efb2d5c789da47d6e1139bb63406d54712`.
- [x] Review the release worktree and ensure preview APKs are not treated as authoritative release artifacts.
- [ ] Verify the production Supabase project has every migration, RLS policy, Realtime publication, Auth redirect, and required secret applied.
- [ ] Verify the deployed `delete-account` Edge Function against a disposable production account.
- [ ] Verify production email confirmation and password-recovery delivery and deep links from cold and warm app states.
- [ ] Confirm Supabase rate limits, backups, spending limits, and production monitoring ownership.
- [x] Add centralized privacy/support configuration and Settings actions for Privacy Policy, Support website, and Support email.
- [x] Add a release-contact validator and make it the first step of `npm run release:verify`.
- [x] Draft the behavior-specific privacy policy in `docs/PRIVACY_POLICY.md`.
- [x] Prepare Google Play description, screenshot plan, Data safety answers, content-rating facts, reviewer-account requirements, and review notes in `docs/GOOGLE_PLAY_SUBMISSION.md`.
- [x] Document support triage, incident response, staged rollout, forward-fix rollback, and post-release smoke procedures in `docs/RELEASE_OPERATIONS.md`.
- [ ] Publish a privacy policy and support contact that accurately describe synced metadata, device-local images, retention, deletion, backups, and telemetry.
- [ ] Replace placeholder release contacts with real production values and confirm `npm run release:verify-contact` passes in the EAS production environment.
- [ ] Publish public privacy, support, and account-deletion pages; add the same links to Play Console and verify every in-app/store link without authentication.
- [ ] Verify account deletion removes backend records and current-device images; report local cleanup failures or adjust the user-facing promise.
- [ ] Inspect the final Android artifact for permissions, URL schemes, signing, and backup behavior. Inspect iOS separately when its release resumes.
- [ ] Remove unused microphone, overlay, and broad-storage permissions from the final Android artifact.
- [ ] Complete Android release-build QA on real devices for auth, recovery, imports, share intents, restart persistence, missing-image recovery, destructive actions, and account deletion.
- [ ] Test denied permissions, connection loss, dark mode, large text, and TalkBack on the Android release build. Defer iOS and VoiceOver QA.
- [ ] Verify Android EAS production variables, signing credentials, Play Console, and submission access. Defer iOS credentials and App Store Connect setup.
- [ ] Capture rights-cleared screenshots and a feature graphic from the exact release build; enter and revalidate the prepared description, Data safety answers, content rating, app access, and review notes in Play Console.
- [ ] Assign named primary/backup operational owners and set up a tested monitored support inbox, privacy-reviewed crash/error reporting, Supabase auth/function/usage alerts, and Google Play health monitoring.
- [ ] Complete every bracketed ownership field in `docs/RELEASE_OPERATIONS.md` and rehearse incident, rollback, and post-release smoke procedures.
- [ ] After Android device QA approval, launch through Google Play internal testing first, then expand access gradually after monitoring early usage. TestFlight is deferred.

### Release Gate

- [ ] Run `npm ci` from the clean release commit.
- [ ] Run `npm run release:verify-contact` with real production contact values.
- [ ] Run `npm run typecheck` and `npm test`.
- [ ] Run `npx expo-doctor`.
- [ ] Run `npm run db:start`, `npm run db:reset`, and `npm run test:db`.
- [ ] Export Android with `npx expo export --platform android`; defer the iOS export until iOS release work resumes.
- [ ] Build Android with EAS, install the exact resulting artifact through an approved path, and complete the Android real-device QA matrix before inviting testers.

### Safe To Defer

- [ ] Paginate or server-filter Library before accounts can approach the 1,000-row response limit.
- [ ] Remove the Board's 200-Snap search limitation.
- [ ] Add full offline metadata synchronization and cloud image synchronization.
- [ ] Add advanced product analytics and OTA updates.
- [ ] Expand component, Edge Function, and end-to-end automation coverage.
- [ ] Add automated account-data export if the initial documented manual process is insufficient.

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
