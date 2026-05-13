# Maestro Mobile Testing

Maestro is the recommended first E2E layer for SnapShelf because it is lightweight, readable, and works well for smoke-testing Expo/React Native flows on iOS and Android.

## Install

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

Verify the install:

```bash
maestro --version
```

## Run The App

Start the app on a simulator or connected device before running Maestro.

For iOS:

```bash
npm run ios
```

For Android:

```bash
npm run android
```

SnapShelf app IDs:

- iOS: `com.anonymous.snapshelf`
- Android: `com.anonymous.snapshelf`

## Committed Smoke Flows

Smoke flows live under `.maestro/`:

```text
.maestro/
  smoke.yaml
  auth.yaml
  settings-theme.yaml
  navigation.yaml
  board-search.yaml
  create-snap.yaml
```

Run all flows:

```bash
maestro test .maestro
```

Run one flow:

```bash
maestro test .maestro/settings-theme.yaml
```

## Critical Flows

Prioritize these before adding broader coverage:

1. App launches and reaches either Sign In or the signed-in Board.
2. Sign in with a dedicated test account.
3. Navigate between Board, Library, The Tray, and Settings.
4. Toggle Dark Mode from Settings.
5. Seed sample data in dev builds.
6. Search Library and open a Snap detail.
7. Search Board in list and grid modes.
8. Confirm matching Board Shelves are highlighted and search summary copy appears.
9. Move a Snap from The Tray to a Shelf.
10. Create a Snap with title, thought, labels, and a Tray or Shelf destination.
11. Save from share intent with source-aware copy, labels, and destination messaging.
12. Delete or archive a Snap only against disposable seeded/test data.

## Starter Flows

These examples are intentionally small. Maestro can use visible text first, which is useful while the app has limited `testID` coverage.

### Smoke

Save as `.maestro/smoke.yaml`:

```yaml
appId: com.anonymous.snapshelf
---
- launchApp
- assertVisible: SnapShelf
```

### Sign In

Save as `.maestro/auth.yaml` and provide credentials through environment variables:

```yaml
appId: com.anonymous.snapshelf
---
- launchApp
- assertVisible: SnapShelf
- tapOn: Email
- inputText: ${SNAPSHELF_TEST_EMAIL}
- tapOn: Password
- inputText: ${SNAPSHELF_TEST_PASSWORD}
- tapOn: Sign In
- assertVisible: SnapShelf
```

Run with:

```bash
SNAPSHELF_TEST_EMAIL="test@example.com" SNAPSHELF_TEST_PASSWORD="password" maestro test .maestro/auth.yaml
```

### Settings Theme Toggle

Save as `.maestro/settings-theme.yaml`:

```yaml
appId: com.anonymous.snapshelf
---
- launchApp
- assertVisible: SnapShelf
- tapOn: Settings
- assertVisible: Appearance
- assertVisible: Dark Mode
- tapOn:
    point: 90%, 30%
- assertVisible: Dark Mode
```

The toggle currently uses the native switch hit area, so the coordinate tap is a pragmatic starting point. Replace it with a stable selector after adding `testID` props.

### Navigation

Save as `.maestro/navigation.yaml`:

```yaml
appId: com.anonymous.snapshelf
---
- launchApp
- assertVisible: SnapShelf
- tapOn: Library
- assertVisible: Library
- tapOn: The Tray
- assertVisible: The Tray
- tapOn: Board
- assertVisible: Board
- tapOn: Settings
- assertVisible: Settings
```

### Library And Tray

Save as `.maestro/library-tray.yaml`:

```yaml
appId: com.anonymous.snapshelf
---
- launchApp
- tapOn: Settings
- scrollUntilVisible:
    element: Seed Sample Data
    direction: DOWN
- tapOn: Seed Sample Data
- tapOn: Library
- assertVisible: Library
- tapOn: Search
- inputText: chair
- assertVisible: chair
- tapOn: The Tray
- assertVisible: The Tray
```

This flow assumes a dev build where sample data seeding is visible and safe to run repeatedly.

### Board Search

Save as `.maestro/board-search.yaml`:

```yaml
appId: com.anonymous.snapshelf
---
- launchApp
- tapOn: Settings
- scrollUntilVisible:
    element: Seed Sample Data
    direction: DOWN
- tapOn: Seed Sample Data
- tapOn: Board
- assertVisible: Board
- tapOn: Search Board
- inputText: chair
- assertVisible: Board Search
- assertVisible: shelf match
- assertVisible: snap result
- tapOn: Grid
- assertVisible: Matching Shelves are highlighted
```

This flow should become selector-based after adding `testID` props for the Board search input and view-mode controls. Visible text is enough for a first manual smoke test, but grid highlight itself is better verified by the summary copy and stable selectors than by image matching.

### Create Snap

Save as `.maestro/create-snap.yaml`:

```yaml
appId: com.anonymous.snapshelf
---
- launchApp
- tapOn: Board
- tapOn: Add
- tapOn: Snap
- assertVisible: Choose image
- tapOn: Title
- inputText: Test inspiration
- tapOn: Thought
- inputText: Saved by Maestro smoke test
- tapOn: Labels
- inputText: maestro, smoke
- assertVisible: Saving to The Tray
```

This starter intentionally stops before choosing an image or saving because native photo-library automation needs device-specific setup. Once the simulator has a known fixture image, extend the flow to pick that image and tap Save.

### Share Intent

Save as `.maestro/share-intent.yaml` once the test device can launch the share extension or route directly to the share-intent screen with fixture data:

```yaml
appId: com.anonymous.snapshelf
---
- launchApp
- assertVisible: Quick Snap
- tapOn: Title
- inputText: Shared test clip
- tapOn: Quick Thought
- inputText: Captured through share intent
- tapOn: Labels
- inputText: shared, maestro
- assertVisible: Saving to The Tray
```

Treat this as a future flow until the app has a repeatable way to seed share-intent input on iOS and Android. The important assertions are source-aware copy, labels, destination messaging, and a safe save path against test data.

## Test Account Guidance

Use a dedicated Firebase test account for Maestro. Keep credentials out of committed YAML by passing them with environment variables.

Recommended local variables:

```bash
export SNAPSHELF_TEST_EMAIL="test@example.com"
export SNAPSHELF_TEST_PASSWORD="password"
```

Run the auth helper flow when the simulator or device is not already signed in:

```bash
SNAPSHELF_TEST_EMAIL="test@example.com" SNAPSHELF_TEST_PASSWORD="password" maestro test .maestro/auth.yaml
```

The navigation, Settings theme, Board search, and Create Snap flows assume the app is already signed in with a disposable dev/test account. `board-search.yaml` also assumes a dev build where Settings exposes `Seed Sample Data`; it seeds disposable data before searching for `chair`.

`create-snap.yaml` is intentionally non-destructive. It opens the Quick Snap modal, fills metadata, keeps the destination as The Tray, and verifies the save control is reachable without writing a real Snap. Extend it with a simulator fixture image only when photo-library setup is repeatable on both iOS and Android.

## Selector Guidance

Use stable `testID` props for controls that are hard to target by text. Current smoke selectors include:

- `auth-email-input`
- `auth-password-input`
- `auth-sign-in-button`
- `tab-board`
- `tab-library`
- `tab-tray`
- `tab-settings`
- `settings-theme-toggle`
- `settings-seed-sample-data-button`
- `board-search-input`
- `board-search-open-button`
- `board-view-grid-toggle`
- `board-view-list-toggle`
- `board-search-summary`
- `create-snap-open-button`
- `create-snap-image-picker`
- `create-snap-title-input`
- `create-snap-thought-input`
- `create-snap-labels-input`
- `create-snap-destination-tray`
- `create-snap-destination-shelf-{shelfId}`
- `create-snap-save-button`
- `share-title-input`
- `share-thought-input`
- `share-labels-input`
- `share-destination-tray`
- `share-destination-shelf-{shelfId}`
- `share-save-button`

Prioritize stable selectors for controls before decorative surfaces. For example, Maestro needs to tap the Board search field and Create Snap save button more than it needs to inspect exact visual styling.

## Next Test Coverage

Recommended next steps for expanding Maestro coverage:

1. Add a repeatable image fixture path for Create Snap.

Seed a known image into the Android emulator and iOS simulator photo library. Extend `create-snap.yaml` to pick that image, save a disposable Snap, and assert the saved Snap appears in The Tray or Library.

2. Add a Tray triage flow.

Use dev sample data, move a disposable Snap from The Tray into a Shelf, and assert it leaves The Tray and appears in the destination Shelf or Library. Keep delete and archive out until the flow creates or resets isolated disposable data.

3. Add Library search and filter smoke coverage.

Search for seeded data, assert the result summary appears, toggle a simple source or status filter, and open Snap detail to verify metadata is visible.

4. Add Snap detail edit smoke coverage.

Open a disposable seeded Snap, update title, thought, or labels, save, and assert the updated copy appears. This protects the curation surface without requiring destructive cleanup.

5. Run the same Maestro suite on iOS.

The current local pass was on Android. Validate iOS separately because share intent, file permissions, native switches, and photo-picker behavior differ by platform.

6. Decide CI scope.

Start CI with non-mutating flows: `smoke`, `navigation`, and `settings-theme`. Add `board-search` only when CI can seed sample data safely. Hold image and save flows until fixture media is stable.

7. Add a small test data reset strategy.

A dev-only reset for sample data or an isolated test user makes E2E tests safer and assertions more deterministic by avoiding duplicate seeded records.

## CI Notes

Maestro can run in CI, but start locally first. Once local flows are stable, add CI only for smoke and navigation flows before testing destructive actions.

Recommended CI order:

1. `npm run typecheck`
2. `npm test`
3. Build/install app on simulator or emulator
4. `maestro test .maestro/smoke.yaml`
5. `maestro test .maestro/navigation.yaml`
6. `maestro test .maestro/settings-theme.yaml`
7. `maestro test .maestro/board-search.yaml`

Avoid account deletion and destructive cleanup in CI unless the flow creates isolated disposable data first.
