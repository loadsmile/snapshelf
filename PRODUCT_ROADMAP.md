# SnapShelf Product Roadmap

## Product Direction

SnapShelf should stay local-first for Snap media.

- Keep images on-device under Expo `documentDirectory/snaps/`.
- Keep Firestore as the source of truth for structured metadata: users, shelves, snaps, favorites, archive state, labels, board positions, and threads.
- Do not add Firebase Storage, image uploads, or cross-device media sync unless that scope is explicitly reprioritized later.
- Prioritize making the current local-first experience safer, clearer, faster, and easier to trust on one device.

## Best New Product Steps

These are the best next product steps excluding Maestro work and iOS/Android QA passes.

1. Improve dev/test data reset tooling.

Add a dev-only reset action for sample data and make sample records deterministic and safe to recreate. This supports manual demos, future test automation, and local debugging without touching real user data.

2. Tighten local-first media recovery UX.

Improve Library and Snap detail states for missing local images with clearer explanation copy and recovery options such as replacing the image or removing a broken local reference.

3. Add image replacement for existing Snaps.

Let users replace a Snap's local image from Snap detail while preserving metadata, labels, Shelf assignment, favorite state, and archive state. This is especially useful when local media is missing or the wrong image was saved.

4. Improve onboarding and empty states.

Add first-run guidance that explains Board, The Tray, Library, Shelves, and local-first storage. Keep it compact and embedded in the current surfaces instead of adding heavy setup scaffolding.

5. Strengthen the capture-to-curation loop.

After saving a Quick Snap, show a lightweight confirmation with destination context and useful next actions such as viewing The Tray or filing now.

6. Add safer account and data management.

Improve destructive account/data flows with clearer previews of what will be deleted, keeping the scope focused on Firestore metadata and current-device local images.

7. Improve Library retrieval ergonomics.

Consider recent searches, common filter shortcuts, or persisted last-used Library sort/filter settings if they make retrieval faster without adding complexity.

8. Run a targeted performance and polish pass.

Review image-heavy screens, large lists, and Board rendering. Add pagination, memoization, or rendering adjustments only where measured or obvious.

Suggested priority order:

1. Dev/test data reset strategy.
2. Missing local image recovery UX.
3. Replace image from Snap detail.
4. First-run/onboarding clarity.
5. Capture confirmation and file-now loop.

## Current Product State

Already completed:

- Library is the trusted retrieval surface with search, filters, sorting, result copy, chips, and empty states.
- The Tray is the compact triage queue with direct Move, Favorite, Archive, and Delete actions.
- Board and Shelf views now explain the organization model and make Shelves feel more meaningful.
- Stacks now act as visual-only Board organizers: Shelves can be stacked under a parent visual node without the parent becoming a Shelf or Snap container.
- Settings is focused on account/profile/security/dev tools rather than setup scaffolding.
- Snap media is compressed and saved locally; deletion and account deletion clean up local image files idempotently.
- Local media failures now have graceful UI fallbacks, clearer save errors, and a dev-only health check in Settings.
- Appearance supports a persisted light/dark toggle, with Midnight Archive as the warm dark palette and the SnapShelf title retaining its original brand color and font.
- Stack covers support manual local images, preserving the local-first media model while making Board organization more visual.
- Snap creation and share-intent capture now provide source-aware copy, clearer validation, labels, and destination messaging while preserving fast Tray-first saving.
- Board search now works in grid mode with highlighted matching Shelves, auto-focus zoom to the best matching Shelf, and callouts for Tray-only results.
- Snap detail is now the consistent curation surface across Library, Tray, and Shelf, with metadata editing plus Favorite, Archive, Restore, Delete, and destination refinement.
- Library image timestamp badges now use stronger contrast so capture timing remains readable in light and Midnight Archive themes.
- First-pass Maestro smoke coverage now protects launch/navigation, Settings dark mode, Board search, and Create Snap validation with stable selectors.

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

### Completed: Visual Board Stacks

Product goal: separate visual Board organization from Shelf contents so parent nodes do not behave like Snap containers.

Completed outcomes:

- Added Firestore-backed Stacks as visual-only Board nodes with positions and manual local cover images.
- Updated Board creation so users can add either a Shelf or a Stack.
- Updated Shelf creation and Shelf detail assignment so each Shelf can belong to one Stack, while a Stack can organize multiple Shelves.
- Extended thread metadata to support Stack-to-Shelf links while preserving legacy Shelf-to-Shelf thread rendering.
- Reworked Stack nodes with a primary-color frame, overlapping primary label, manual cover support, and a clean no-cover placeholder.
- Kept Snaps scoped to Shelves and The Tray; Stacks do not appear as Snap destinations.
- Verified typecheck and tests.

Why this matters:

- Users can organize the Board visually without creating empty parent Shelves that imply they should hold Snaps.
- Keeping Stacks separate from Shelves clarifies the mental model: Snaps live in Shelves, Shelves can be arranged into Stacks, and Library finds everything.

### Completed: Improve Capture Context

Product goal: help users save a useful Snap the first time, while keeping capture fast.

Completed outcomes:

- Improved `CreateSnapModal` with source-specific copy for camera roll, Instagram-style saves, manual Shelf saves, Quick Snaps, web clips, and unknown sources.
- Kept title, thought, labels, and Shelf assignment optional, but made each field clearer at the moment of capture.
- Added shared comma-separated label parsing so modal and share-intent saves behave consistently.
- Added better image selection and missing-image validation, including manual Shelf-specific error copy.
- Made the modal scrollable so smaller screens can reach every field and action reliably.
- Improved share-intent capture with source detection for web clips, camera roll images, text Quick Snaps, and unknown content.
- Added labels and clearer destination messaging to share-intent saves, including Tray-first copy when no Shelf is selected.
- Preserved local-first media handling through `saveSnapImageLocally`; no Firebase Storage or image upload path was added.

Why this matters:

- Better first-save context improves Library retrieval and reduces cleanup work later.
- Capture remains fast because metadata is helpful and visible, not mandatory.

### Completed: Board Search Focus

Product goal: make Board search useful without forcing users out of the visual organization map.

Completed outcomes:

- Board search can now stay in grid mode instead of switching only to a list results surface.
- Matching Shelves are visually highlighted on the Board.
- Search auto-focuses and zooms to the first matching Shelf, or to the Shelf containing the first matching Snap.
- Search summary copy explains how many Shelf and Snap matches were found.
- Tray-only Snap results are called out when they cannot be shown on the Board grid.
- Board guidance changes during search so users know to clear search before arranging the full Board.

Why this matters:

- Search and spatial memory now reinforce each other instead of competing.
- Users can find where something lives on the Board, not just read a detached result list.

### Completed: Make Curation More Useful

Product goal: make saved Snaps easier to refine after capture without turning the app into a database.

Completed outcomes:

- Extended `SnapDetailModal` so Snap detail is the consistent place to edit title, thought, labels, and Shelf or Tray destination.
- Added direct Favorite, Remove Favorite, Archive, Restore, and Delete actions to Snap detail from Library, Tray, and Shelf.
- Standardized action labels and busy states across Library action sheets, Tray triage rows, Shelf action sheets, and Snap detail.
- Kept delete confirmation and local image deletion behavior unchanged through the existing local-first `deleteSnap` flow.
- Reused shared comma-separated label parsing for Snap detail edits so capture and curation handle labels consistently.
- Improved Library capture-time badges with stronger contrast for readability over images in both light and Midnight Archive themes.
- Verified typecheck and tests.

Why this matters:

- Snap detail now feels like the dependable place to understand, clean up, and refine a saved Snap.
- Users can curate after capture from every major surface without learning different action patterns.
- Better timestamp contrast keeps Library cards readable while preserving the warm visual style.

### Completed: Session 5, Maestro Smoke Coverage And Test IDs

Product goal: create a reliable first E2E safety net for the current local-first MVP.

Completed outcomes:

- Added stable `testID` props for auth sign-in, tab navigation, Settings dark mode and sample seeding, Board search and view mode, Create Snap controls, and share-intent save controls.
- Added committed Maestro smoke flows for app launch, auth helper sign-in, tab navigation, Settings dark mode, Board search with dev sample data, and Create Snap metadata entry plus reachable save-control validation.
- Kept destructive account deletion and real data cleanup out of the smoke suite.
- Documented local Maestro setup, test credential expectations, signed-in simulator assumptions, dev sample-data requirements, and the reason Create Snap stops before writing media without a repeatable fixture image.
- Preserved local-first media storage; no Firebase Storage, uploads, or cross-device media sync were added.

Why this matters:

- High-value mobile paths now have a small real-runtime safety net beyond unit tests.
- Stable selectors make future E2E expansion less brittle as UI copy and layout evolve.

Success criteria status:

- Maestro launch/navigation, Settings dark mode, Board search, and Create Snap smoke flows are present under `.maestro/`.
- Typecheck and unit tests pass after selector and documentation updates.
- Maestro flow execution still requires a running signed-in simulator/device with real Firebase credentials.

Recommended test follow-ups:

- Add repeatable fixture-image coverage so Create Snap can pick a known simulator image, save a disposable Snap, and assert it appears in The Tray or Library.
- Add Tray triage coverage for moving disposable seeded Snaps into Shelves without deleting or archiving real data.
- Add Library search/filter and Snap detail edit smoke flows around seeded or disposable data.
- Run the same Maestro suite on iOS because native switches, share intent, file permissions, and photo picker behavior differ from Android.
- Start CI with non-mutating Maestro flows only, then add seeded/search and image-save flows after test data reset and fixture media are stable.
- Add a small dev/test data reset strategy or isolated test user so E2E assertions stay deterministic.

## Next Sessions

### Session 4: Device QA And V1 Readiness

Product goal: make the current local-first MVP feel shippable on real devices.

Completed repo-side readiness outcomes:

- Reviewed the V1 flow code paths for auth, share intent save, local image save/render/delete, Tray triage, Library filtering/actions, Board search/view state, Shelf detail/actions, Settings, and account deletion while preserving local-first media storage.
- Added lightweight unit coverage for Snap utility helpers covering local image URI preference, remote image URL fallback, and comma-separated label parsing.
- Documented V1 local-first media limitations in the README and PRD, including same-device media storage, missing cross-device image sync, app reinstall/data-clear risk, local delete behavior, and share intent device variability.
- Verified `npm run typecheck` and `npm test` pass after the readiness updates.
- Did not add a lint script because there is no existing lint setup and adding one cleanly would require broader unrelated setup work.
- Confirmed no Firebase Storage, uploads, or cross-device media sync were added.

Remaining device QA:

- Run the checklist on at least one iOS target and one Android target with real Firebase credentials.
- Confirm OS-level share intent handoff, local image file permissions, image preview/rendering, and local deletion behavior on each platform.
- Confirm account deletion removes Firestore user data and current-device local Snap images after reauthentication.

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
5. E2E smoke coverage

This sequence improves the current product without expanding the storage model:

- First, make local media safe and understandable.
- Then, improve the quality of what users save.
- Then, make refinement easier as the archive grows.
- Then, validate the local-first MVP on real devices.
- Finally, add a small E2E safety net around the flows most likely to regress.

## Explicitly Not Next

These are not next steps unless intentionally reprioritized:

- Firebase Storage image uploads
- Cross-device image sync
- AI labeling or enrichment
- Product recognition or price detection
- Shared/collaborative shelves
- Public profiles or social features
- Browser extension or full desktop web app
