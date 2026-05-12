# SnapShelf Product Roadmap

## Product Direction

SnapShelf should stay local-first for Snap media.

- Keep images on-device under Expo `documentDirectory/snaps/`.
- Keep Firestore as the source of truth for structured metadata: users, shelves, snaps, favorites, archive state, labels, board positions, and threads.
- Do not add Firebase Storage, image uploads, or cross-device media sync unless that scope is explicitly reprioritized later.
- Prioritize making the current local-first experience safer, clearer, faster, and easier to trust on one device.

## Current Product State

Already completed:

- Library is the trusted retrieval surface with search, filters, sorting, result copy, chips, and empty states.
- The Tray is the compact triage queue with direct Move, Favorite, Archive, and Delete actions.
- Board and Shelf views now explain the organization model and make Shelves feel more meaningful.
- Settings is focused on account/profile/security/dev tools rather than setup scaffolding.
- Snap media is compressed and saved locally; deletion and account deletion clean up local image files idempotently.
- Local media failures now have graceful UI fallbacks, clearer save errors, and a dev-only health check in Settings.
- Appearance supports a persisted light/dark toggle, with Midnight Archive as the warm dark palette and the SnapShelf title retaining its original brand color and font.

Important constraint:

- Local image storage is a product choice, not a temporary gap for the next phase.

## Completed Sessions

### Completed: Session 1, Harden Local-First Media

Product goal: make on-device media storage feel dependable and recoverable without adding cloud image sync.

Completed outcomes:

- Audit every path that creates, reads, moves, edits, archives, deletes, or account-deletes Snaps.
- Hardened local image save/delete/status helpers around failed copies, failed compression, missing files, and unavailable `documentDirectory`.
- Added graceful fallback copy when a Snap's local image is unavailable while metadata remains available.
- Added clearer user-facing errors for failed local image saves and previews.
- Added a lightweight dev-only local media health check in Settings.
- Kept `localPath` as the canonical image reference for saved media.
- Added focused helper coverage and verified typecheck/tests.

Why this matters:

- Local-first only works if users trust that saved images remain visible and failures are understandable.
- Firestore metadata can outlive local files after reinstall, device migration, or OS cleanup; the product needs a calm fallback state.

### Completed: Midnight Archive Dark Mode

Product goal: make SnapShelf comfortable to use in dark environments without changing the established brand typography.

Completed outcomes:

- Added dynamic light and Midnight Archive theme tokens for background, surfaces, primary actions, text, borders, thread accents, and shadows.
- Added a persisted Settings toggle for switching between light mode and Midnight Archive dark mode.
- Updated system status bar styling to match the selected theme.
- Preserved the SnapShelf title font and original brand color.
- Replaced obvious hardcoded light surfaces and borders with theme-aware tokens.
- Verified typecheck and tests.

Why this matters:

- A reliable dark mode makes the product feel more polished and usable across lighting contexts.
- Keeping the brand title stable preserves recognizability while the rest of the interface adapts.

## Next 3 Sessions

### Session 2: Improve Capture Context

Product goal: help users save a useful Snap the first time, while keeping capture fast.

Focus:

- Polish `CreateSnapModal` and `share-intent` save flow.
- Make title, thought, labels, source, and Shelf assignment clearer without adding friction.
- Improve validation for empty/manual Snaps and failed image selection.
- Preserve fast Tray-first capture as the default when the user does not choose a Shelf.
- Consider small source-specific copy for web clips, camera roll images, and manual saves.

Why this matters:

- Library and Shelf quality depend on the context captured at save time.
- Better first-save metadata reduces cleanup work later.

Success criteria:

- Users can still save quickly to The Tray.
- Adding context feels optional but obvious.
- Labels and thoughts are easier to enter consistently.
- Error states for local image save failures are clear.

Suggested prompt:

```text
Improve Snap creation and share-intent capture context while preserving fast local-first saving.

Goals:
- inspect CreateSnapModal and app/share-intent.tsx first
- keep local image storage as-is via saveSnapImageLocally
- improve copy, validation, and error handling around title, thought, labels, source, and Shelf assignment
- keep Tray-first capture fast
- do not add Firebase Storage or synced image uploads
- run typecheck and tests after changes
```

### Session 3: Make Curation More Useful

Product goal: make saved Snaps easier to refine after capture without turning the app into a database.

Focus:

- Improve Snap detail editing from Library, Tray, and Shelf.
- Make Move, Favorite, Archive, Delete, title edits, thought edits, and label edits feel consistent across surfaces.
- Add clearer post-capture organization affordances from Snap detail.
- Keep the UI warm, visual, and lightweight.
- Avoid bulk workflows unless a very small version clearly improves triage or curation.

Why this matters:

- Once the user has captured enough Snaps, the product needs low-friction cleanup and refinement.
- Good curation keeps the local archive useful over time.

Success criteria:

- Snap detail feels like the consistent place to understand and refine a Snap.
- Editing metadata is easy from every major surface.
- Actions use consistent labels, confirmations, busy states, and error handling.
- Local image behavior remains unchanged.

Suggested prompt:

```text
Improve Snap curation across Library, Tray, Shelf, and Snap detail.

Goals:
- inspect SnapDetailModal and the action flows in Library, Tray, and Shelf
- make edit, move, favorite, archive, and delete behavior feel consistent
- improve metadata editing for title, thought, labels, and Shelf assignment
- keep the design lightweight and visual
- do not change local image storage or add cloud sync
- run typecheck and tests after changes
```

### Session 4: Device QA And V1 Readiness

Product goal: make the current local-first MVP feel shippable on real devices.

Focus:

- Run a device QA pass across iOS and Android.
- Verify auth, share intent, local image save/render/delete, Tray triage, Library filters, Board drag/zoom, Shelf detail, Settings, and account deletion.
- Add or update lightweight automated coverage for pure helpers where useful.
- Add a lint script only if it can be introduced cleanly without broad unrelated cleanup.
- Document known local-first limitations clearly in the README/PRD.

Why this matters:

- The product is now more about reliability and polish than new large features.
- Local-first image storage has device-specific edge cases that need real-device confidence.

Success criteria:

- Core flows pass on at least one iOS and one Android target.
- Typecheck and unit tests pass.
- Known limitations are documented plainly.
- No new cloud media dependency is added.

Suggested prompt:

```text
Do a V1 readiness QA pass for SnapShelf while preserving local-first media storage.

Goals:
- verify auth, share intent, local image save/render/delete, Tray, Library, Board, Shelf, Settings, and account deletion flows
- run typecheck and tests
- add small helper tests only where they reduce clear risk
- document any local-first limitations that users or developers should know
- do not add Firebase Storage, uploads, or cross-device media sync
```

## Why This Order

1. Local media trust
2. Better capture context
3. Better post-capture curation
4. Device confidence

This sequence improves the current product without expanding the storage model:

- First, make local media safe and understandable.
- Then, improve the quality of what users save.
- Then, make refinement easier as the archive grows.
- Finally, validate the local-first MVP on real devices.

## Explicitly Not Next

These are not next steps unless intentionally reprioritized:

- Firebase Storage image uploads
- Cross-device image sync
- AI labeling or enrichment
- Product recognition or price detection
- Shared/collaborative shelves
- Public profiles or social features
- Browser extension or full desktop web app
