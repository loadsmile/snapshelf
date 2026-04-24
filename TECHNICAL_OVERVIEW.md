# SnapShelf - Detailed Technical Overview

## 1. Authentication Flow

### Sign-Up (`features/auth/api.ts:57-61`)
1. `createUserWithEmailAndPassword` - Creates Firebase auth user
2. `ensureUserProfile(user)` - Syncs user to Firestore at `users/{userId}`
3. `createDefaultShelf(uid)` - Creates "Inspiration" shelf for new user

### Sign-In (`features/auth/api.ts:63-65`)
- `signInWithEmailAndPassword` - Email/password only

### Auth State Management (`features/auth/AuthProvider.tsx:14-42`)
- `onAuthStateChanged` subscription with three states: `'loading' | 'signedOut' | 'signedIn'`
- On user detected: maps to `AuthUser`, calls `ensureUserProfile()`, sets signedIn
- On no user: clears all null

### Navigation Guards (`app/_layout.tsx:122-140`)
- `signedOut` → redirects `/sign-in`
- `signedIn` + `hasShareIntent` → redirects `/share-intent`
- `signedIn` + in auth group → redirects `/board`
- Android has special share intent gate with retry timeouts (250ms delays)

### Firebase Persistence (`services/firebase.ts:13-43`)
- Web: browser persistence (default)
- Mobile: `initializeAuth` with `getReactNativePersistence(AsyncStorage)`
- Graceful fallback if persistence fails

---

## 2. Data Flow

### Architecture Pattern
```
UI (screens/components) → API functions (features/*/api.ts) → Firestore → Real-time subscriptions → UI
```

### Real-Time Subscriptions
All use Firestore `onSnapshot()`:

| Subscription | Query | Sort |
|---|---|---|
| `subscribeToShelves` | `users/{userId}/shelves` | `createdAt` asc |
| `subscribeToAllSnaps` | `users/{userId}/snaps` | `createdAt` desc |
| `subscribeToDropSnaps` | `where('shelfId', '==', null)` | `createdAt` desc |
| `subscribeToShelfSnaps` | `where('shelfId', '==', shelfId)` | `createdAt` desc |
| `subscribeToThreads` | `users/{userId}/threads` | — |

### State Management
- Local `useState` in each screen
- No external state library
- Subscriptions cleaned up in `useEffect` returns

---

## 3. Board Canvas Architecture

### Canvas Dimensions (`app/(tabs)/board.tsx:32-33`)
```typescript
CANVAS_WIDTH = 980, CANVAS_HEIGHT = 1360
```

### Transform State (`app/(tabs)/board.tsx:800-800`)
```typescript
const [boardTransform, setBoardTransform] = useState<BoardTransform>({ x: 0, y: 0, scale: 1 });
```

### Pan Gesture (`app/(tabs)/board.tsx:1052-1068`)
- Single-finger pan moves entire canvas
- Uses `transformRef` to track current transform during gesture

### Pinch-to-Zoom (`app/(tabs)/board.tsx:1087-1123`)
- `handlePinchStart`: captures initial transform, distance, focal point
- `handlePinchMove`: calculates scale from pinch distance ratio
- `clamp()` constrains scale between `fitScale` and `MAX_SCALE (1.9)`
- Focal point converts screen coords → canvas coords

### Zoom Controls (`app/(tabs)/board.tsx:1405-1439`)
- `+` button: `scale += 0.12`
- `-` button: `scale -= 0.12` or fit to bounds

### Transform Clamping (`app/(tabs)/board.tsx:140-168`)
- `getFitScale()`: minimum scale to fit content in viewport
- `clampTransform()`: keeps canvas within bounds
- Small content centered; large content pannable

### Draggable Shelves (`app/(tabs)/board.tsx:690-779`, `1125-1161`)
- Movement threshold: 2px before recognizing drag
- `onDrag`: optimistic local state update
- `onDragEnd`: persists via `updateShelfPosition()`
- `scale` prop divides gesture delta for coordinate conversion

### Shelf Visual Variants (`app/(tabs)/board.tsx:184-198`)
| Variant | Size |
|---|---|
| `primary` | 196x196 |
| `arch` | 116x152 |
| `circle-large` | 140x140 |
| `circle-small` | 92x92 |
| `circle-medium` | 154x154 |
| `tall` | 76x152 |

### Thread Connections (`app/(tabs)/board.tsx:244-265`, `1376-1385`)
- Dashed lines between shelf centers
- Center: `(shelfX + width/2, shelfY + height/2)`
- CSS `transform: rotate()` positions line along angle

---

## 4. Shelf Management

### Default Placement (`features/shelves/api.ts:7-37`)
8 preset positions cycling with `index % 8`:
```typescript
boardLayoutPresets = [
  { boardX: 320, boardY: 470, boardVariant: 'primary' },
  { boardX: 170, boardY: 360, boardVariant: 'arch' },
  { boardX: 560, boardY: 240, boardVariant: 'circle-large' },
  // ... 5 more
];
```
Row offset for `index >= 8`: `+180px` horizontal, `+110px` vertical per row

### Bootstrap Placement (`features/shelves/api.ts:182-195`)
- Assigns defaults when `boardX/Y/Variant` is null
- Called in Board `useEffect` (`app/(tabs)/board.tsx:952-971`)
- `bootstrappingIds` Set prevents duplicate calls

### Position Update (`features/shelves/api.ts:168-179`)
- `updateShelfPosition(userId, shelfId, boardX, boardY)` - merges board coords

---

## 5. Snap Management

### Creation (`features/snaps/api.ts:165-187`)
```typescript
createSnap(userId, {
  shelfId,        // null for Drop
  title,
  imageUrl,       // optional remote URL fallback
  localPath,      // relative path under Expo documentDirectory
  thought,        // user's notes
  labels,         // string[]
  source,         // 'quick-snap' | 'camera-roll' | 'web-clip' | 'instagram' | 'manual' | 'unknown'
  capturedAt,     // original capture time
})
```

### Local Image Storage (`features/snaps/api.ts:63-101`, `189-200`)
1. `compressSnapImage()` reads image dimensions
2. If needed, resizes the long edge down to `1800px`
3. Re-encodes to JPEG with `0.78` compression
4. `saveSnapImageLocally()` copies the processed asset into `documentDirectory/snaps/`
5. Firestore stores the relative `localPath`; `resolveSnapImageUri()` reconstructs the device URI at render time

### Moving Between Shelves (`features/snaps/api.ts:274-284`)
- `moveSnapToShelf(userId, snapId, shelfId | null)`
- Calls `touchShelf()` to update cover on target

### Deletion (`features/snaps/api.ts:286-300`)
- Deletes the Firestore doc
- Clears a stale shelf cover reference when needed
- Removes the locally cached image file if `localPath` exists

### Pagination
- Drop and Shelf views use cursor-based pagination (`listDropSnaps`, `listShelfSnaps`)
- `usePaginatedSnaps()` keeps the first page live via `onSnapshot()` and appends older pages on demand

### Labels
- Stored as string array in Firestore
- Parsed from comma-separated input in `shared/components/CreateSnapModal.tsx:27-32`

---

## 6. Share Intent Flow

### iOS Configuration (`app.json:35-43`)
```json
"expo-share-intent": {
  "iosActivationRules": {
    "NSExtensionActivationSupportsText": true,
    "NSExtensionActivationSupportsWebURLWithMaxCount": 1,
    "NSExtensionActivationSupportsWebPageWithMaxCount": 1,
    "NSExtensionActivationSupportsImageWithMaxCount": 1
  }
}
```

### Android Configuration (`app.json:44-47`)
```json
"androidIntentFilters": ["text/*", "image/*"]
```

### Provider Setup (`app/_layout.tsx:43-57`)
```tsx
<ShareIntentProvider resetOnBackground={false} onResetShareIntent={() => router.replace('/board')}>
```

### Processing Screen (`app/share-intent.tsx:19-37`, `72-84`, `117-160`)
1. Extracts first shared file path if an image is present
2. Title priority: metaTitle → fileName → webUrl → text
3. Save flow:
   - Save image locally if present
   - Combine note + webUrl/text into `thought`
   - `createSnap()` with source `'quick-snap'`
   - Route to shelf view or Drop

### Android Gate (`app/_layout.tsx:71-120`)
- Android share intents arrive after activity resume
- Retries `getShareIntent('')` twice with 250ms delays

---

## 7. Component Architecture

### Layout
| Component | Purpose |
|---|---|
| `Screen` | SafeAreaView + optional ScrollView with themed padding |
| `SurfaceCard` | Themed background, border radius, shadow |

### Navigation
| Component | Purpose |
|---|---|
| `CustomTabBar` | Floating pill-style tab bar, 10px above bottom safe area |
| `AppHeader` | Logo + menu icon left, search icon right |

### Form
| Component | Purpose |
|---|---|
| `FormField` | Label + input with themed styling |
| `PillButton` | Primary/secondary variants, sm/md sizes, icon support |

### Modals
| Component | Purpose |
|---|---|
| `CreateShelfModal` | Shelf creation with name + thread-to selector |
| `CreateSnapModal` | Snap creation with image picker, title, thought, labels |
| `ShelfPickerModal` | List shelves for snap placement |
| `EditThreadModal` | Thread creation/exclusion of current shelf |
| `ActionSheetModal` | Reusable bottom-sheet style action list for Snap and Shelf actions |

### Display
| Component | Purpose |
|---|---|
| `SnapArtwork` | Image with gradient fallback |
| `SectionLabel` | Pill-shaped eyebrow text |
| `EmptyState` | Bordered container for empty lists |
| `BoardIcon` / `DropIcon` | SVG tab bar icons |

### Providers & Hooks
| Export | Purpose |
|---|---|
| `AuthProvider` / `useAuth()` | Auth state, profile data, and auth actions for the app tree |
| `RetainedShareIntentProvider` / `useRetainedShareIntentContext()` | Keeps share payloads available across route transitions and Android resume timing |
| `usePaginatedSnaps()` | Live first-page Snap subscription with cursor-based pagination for Drop and Shelf views |

---

## 8. Theme System

### Colors (`shared/theme/tokens.ts:1-15`)
```typescript
background:    '#F7F1EB'  // Warm cream
surface:       '#FFF9F3'  // Off-white
surfaceSoft:   '#F7E3BF'  // Golden tan
primary:       '#C63A06'  // Burnt orange
primaryDeep:   '#A92E00'  // Deep orange
accentDeep:    '#7D1F00'  // Very dark orange
text:          '#2E231A'  // Dark brown
textMuted:     '#74675D'  // Medium brown
borderSoft:    '#F0E3D7'  // Light tan
thread:        '#EDC3B0'  // Thread connections
```

### Spacing (`shared/theme/tokens.ts:17-24`)
```typescript
xs: 6, sm: 10, md: 16, lg: 20, xl: 28, xxl: 36
```

### Typography (`shared/theme/typography.ts:5-65`)
Font: **Manrope** (Google Fonts) — weights 400, 500, 600, 700

| Style | Spec |
|---|---|
| `displaySm` | bold 24px, -0.8 letter spacing |
| `titleLg` | bold 20px, -0.5 letter spacing |
| `titleMd` | semibold 17px |
| `bodyMd` | regular 15px, muted |
| `eyebrow` | semibold 11px uppercase, 0.8 letter spacing |
| `button` | semibold 15px |

### Theme Exports (`shared/theme/index.ts:1-17`, `shared/theme/typography.ts:12-65`)
- `theme` bundles `colors`, `spacing`, `radii`, `shadows`, and `typography.fonts`
- `AppTheme` is exported as `typeof theme`
- `shared/theme/index.ts:1-17` also re-exports `colors`, `spacing`, `radii`, `shadows`, `fonts`, and `textStyles`
- `textStyles` centralizes named text presets used across screens and components

---

## 9. Navigation Structure

```
app/
├── _layout.tsx              # Root: AuthProvider, ShareIntentProvider, RootNavigator
├── index.tsx                # Redirects based on auth state
├── share-intent.tsx         # Quick Snap processing
├── (auth)/
│   ├── _layout.tsx          # Stack: no headers, fade animation
│   ├── sign-in.tsx
│   └── sign-up.tsx
├── (tabs)/
│   ├── _layout.tsx          # Tabs: CustomTabBar, no headers
│   ├── board.tsx            # Tab 1: Shelf canvas
│   ├── drop.tsx             # Tab 2: Unsorted snaps
│   └── settings.tsx         # Tab 3: Settings
└── shelf/
    └── [id].tsx             # Shelf detail view (outside tabs)
```

Deep linking: `snapshelf://board`, `snapshelf://drop`, etc.

---

## 10. API Layer Summary

### Auth API
| Function | Returns | Notes |
|---|---|---|
| `mapAuthUser` | `AuthUser` | Firebase → app user |
| `ensureUserProfile` | `Promise<UserProfile>` | Creates or updates |
| `signUp` | `Promise<void>` | Creates auth + profile + default shelf |
| `signIn` | `Promise<void>` | Firebase sign-in |
| `signOutUser` | `Promise<void>` | Firebase sign-out |
| `subscribeToAuth` | unsubscribe | `onAuthStateChanged` wrapper |
| `getAuthErrorMessage` | `string` | Maps FirebaseError codes |

### Auth Context Exports
| Export | Returns | Notes |
|---|---|---|
| `AuthProvider` | React component | Provides auth context to the app |
| `useAuthContext` | `AuthContextValue` | Internal context accessor used by `useAuth()` |
| `useAuth` | `AuthContextValue` | Public auth hook consumed by screens and components |

### Shelves API
| Function | Returns | Notes |
|---|---|---|
| `getDefaultShelfPlacement` | placement object | Cycles 8 presets |
| `createShelf` | `Promise<Shelf>` | Add doc |
| `listShelves` | `Promise<Shelf[]>` | All shelves |
| `subscribeToShelves` | unsubscribe | Real-time |
| `getShelf` | `Promise<Shelf \| null>` | Single shelf |
| `createDefaultShelf` | `Promise<Shelf>` | "Inspiration" if none exist |
| `touchShelf` | `Promise<void>` | Update + optionally set cover |
| `clearShelfCoverSnap` | `Promise<void>` | Clears stale `coverSnapId` after Snap deletion |
| `updateShelfPosition` | `Promise<void>` | Merge board coords |
| `bootstrapShelfPlacement` | `Promise<void>` | Set default placement |
| `deleteShelf` | `Promise<void>` | Moves Shelf Snaps to Drop, deletes related threads, then deletes Shelf |

### Snaps API
| Function | Returns | Notes |
|---|---|---|
| `mapSnap` | `Snap` | Firestore → snap |
| `SnapCursor` | type alias | Firestore cursor used for paginated queries |
| `createSnap` | `Promise<Snap>` | Create + touch shelf |
| `saveSnapImageLocally` | `Promise<string>` | Compress + cache image under `documentDirectory/snaps/` |
| `listAllSnaps` | `Promise<Snap[]>` | All snaps, newest first |
| `subscribeToAllSnaps` | unsubscribe | Real-time all, optional page cap |
| `listDropSnaps` | `Promise<{snaps, cursor}>` | First or next Drop page |
| `subscribeToDropSnaps` | unsubscribe | Real-time Drop first page |
| `listShelfSnaps` | `Promise<{snaps, cursor}>` | First or next Shelf page |
| `subscribeToShelfSnaps` | unsubscribe | Real-time Shelf first page |
| `moveSnapToShelf` | `Promise<void>` | Move + touch shelf |
| `deleteSnap` | `Promise<void>` | Delete doc + local file cleanup |

### Snap Helper Exports
| Export | Returns | Notes |
|---|---|---|
| `resolveSnapImageUri` | `string \| null` | Resolves `localPath` against `documentDirectory`, falling back to `imageUrl` |
| `searchSnaps` | `Snap[]` | In-memory search across title, thought, labels, and optional additional text |
| `getSnapSourceLabel` | `string` | User-facing label for a Snap source |
| `getSnapHeadline` | `string` | Preferred title/fallback text for Snap cards |
| `formatCapturedAt` | `string` | Relative date display for Snap timestamps |
| `getPaletteFromSeed` | `[string, string]` | Deterministic palette from a seed string |
| `getSnapPalette` | `[string, string]` | Palette derived from Snap content |
| `getShelfPalette` | `[string, string]` | Palette derived from Shelf name |
| `getShelfCoverSnap` | `Snap \| null` | Chooses explicit or fallback cover art for a Shelf |

### Threads API
| Function | Returns | Notes |
|---|---|---|
| `createShelfThread` | `Promise<ShelfThread>` | Create connection |
| `deleteShelfThread` | `Promise<void>` | Remove connection |
| `deleteThreadsForShelf` | `Promise<void>` | Deletes incoming and outgoing threads for a Shelf |
| `setShelfAnchor` | `Promise<void>` | Delete existing + create new |
| `subscribeToThreads` | unsubscribe | Real-time |

### Dev / Seed API
| Function | Returns | Notes |
|---|---|---|
| `seedSampleData` | `Promise<{created, message, shelfCount, snapCount}>` | Dev-only helper used from Settings to populate a test account |

### Shared Hook / Provider Exports
| Export | Returns | Notes |
|---|---|---|
| `usePaginatedSnaps` | `{ error, hasMore, loadMore, loading, loadingMore, snaps }` | Live first page + incremental pagination |
| `RetainedShareIntentProvider` | React component | Stores the last non-empty share payload |
| `useRetainedShareIntentContext` | retained share context | Exposes `hasShareIntent`, `isReady`, `resetShareIntent`, and `shareIntent` |

### Firebase Service Exports
| Export | Returns | Notes |
|---|---|---|
| `auth` | `Auth \| null` | Initialized Firebase Auth instance when config is present |
| `db` | `Firestore \| null` | Initialized Firestore instance when config is present |
| `requireAuth` | `Auth` | Throws when Firebase auth is unavailable |
| `requireDb` | `Firestore` | Throws when Firestore is unavailable |
| `app` | `FirebaseApp \| null` | Root Firebase app instance |
| `isFirebaseConfigured` | `boolean` | True when required env vars are present |
| `firebaseConfigError` | `string \| null` | Human-readable missing-config message |
| `missingFirebaseEnv` | `string[]` | Missing required env var names |

---

## 11. Database Schema

### Firestore
```
users/{userId}
  ├── email, createdAt, updatedAt
  │
  ├── shelves/{shelfId}
  │   ├── name, coverSnapId
  │   ├── boardX, boardY, boardVariant
  │   └── createdAt, updatedAt
  │
  ├── snaps/{snapId}
  │   ├── shelfId, title, imageUrl, localPath
  │   ├── thought, labels[], source
  │   ├── capturedAt, createdAt, updatedAt
  │
  └── threads/{threadId}
      ├── fromShelfId, toShelfId
      └── createdAt
```

### Security Rules
```javascript
// firestore.rules
match /users/{userId} {
  allow read, write: if request.auth.uid == userId;
  match /{document=**} {
    allow read, write: if request.auth.uid == userId;
  }
}

// storage.rules
match /users/{userId}/{allPaths=**} {
  allow read, write: if request.auth.uid == userId;
}
```

---

## 12. Type System

### Auth (`features/auth/types.ts:1-25`)
```typescript
AuthStatus = 'loading' | 'signedOut' | 'signedIn'
AuthUser = { id, email, displayName }
UserProfile = { id, email, createdAt, updatedAt }
AuthContextValue = { status, user, profile, isConfigured, configError, signIn, signUp, signOut }
```

### Shelves (`features/shelves/types.ts:1-20`)
```typescript
ShelfBoardVariant = 'primary' | 'arch' | 'circle-large' | 'circle-small' | 'circle-medium' | 'tall'
Shelf = { id, name, coverSnapId, boardX, boardY, boardVariant, createdAt, updatedAt }
CreateShelfInput = { name, coverSnapId?, boardX?, boardY?, boardVariant? }
```

### Snaps (`features/snaps/types.ts:1-26`)
```typescript
SnapSource = 'quick-snap' | 'camera-roll' | 'web-clip' | 'instagram' | 'manual' | 'unknown'
Snap = { id, shelfId, title, imageUrl, localPath, thought, labels, source, createdAt, updatedAt, capturedAt }
CreateSnapInput = { shelfId?, title?, imageUrl?, localPath?, thought?, labels?, source?, capturedAt? }
```

### Threads (`features/threads/types.ts:1-11`)
```typescript
ShelfThread = { id, fromShelfId, toShelfId, createdAt }
CreateShelfThreadInput = { fromShelfId, toShelfId }
```

---

## 13. Configuration

### Environment (`.env`)
```env
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=snapshelf-c5d3e.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=snapshelf-c5d3e
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=snapshelf-c5d3e.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=455485105075
EXPO_PUBLIC_FIREBASE_APP_ID=1:455485105075:web:...
```

### Env Helpers (`shared/config/env.ts:1-26`)
- `firebaseEnv` exposes the assembled Firebase config object
- `missingFirebaseEnv` lists missing required keys
- `isFirebaseConfigured` gates app initialization
- `firebaseConfigError` builds the user-facing configuration error string

### tsconfig (`tsconfig.json:1-11`)
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": { "@/*": ["./*"] }
  }
}
```
Path alias: `@/` → project root

### app.json (`app.json:2-50`)
```json
{
  "expo": {
    "scheme": "snapshelf",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "plugins": ["expo-router", "expo-font", ["expo-share-intent", {...}]]
  }
}
```

### Firebase Bootstrap (`services/firebase.ts:1-62`)
- Initializes Firebase only when required env values are present
- Uses browser auth persistence on web
- On native, attempts `initializeAuth()` with AsyncStorage-backed persistence
- Falls back to `getAuth()` if React Native persistence setup fails

### Key Dependencies
| Package | Version | Purpose |
|---|---|---|
| expo | ~54.0.33 | Framework |
| expo-router | ~6.0.23 | File-based routing |
| firebase | ^12.12.0 | Backend |
| react-native-reanimated | ~4.1.1 | Animations |
| react-native-gesture-handler | ~2.28.0 | Touch |
| expo-share-intent | ^5.1.1 | Share extension |
| expo-image-picker | ~17.0.10 | Photos |
| react-native-svg | ~15.12.1 | Icons |
| @expo-google-fonts/manrope | ^0.4.2 | Typography |

---

## 14. Known Gaps & Tech Debt

- **No offline mode** — All operations require network connectivity
- **No batch operations** — Creating multiple items requires sequential calls
- **No input validation** — Minimal validation on API inputs before Firestore writes
- **No analytics** — No event tracking or user behavior data
- **No testing** — No test suite present
- **No dark mode** — Theme is light-only
- **Single auth method** — Email/password only, no OAuth/social login
- **No user settings** — No profile editing, password reset, account deletion
- **Image sync is local-first** — Snaps currently persist `localPath` on-device; media is not yet uploaded for cross-device sync
- **Board search is capped** — Board-wide search only sees the 200 most recent Snaps because the board subscription is intentionally limited
- **Threads are one-way** — `fromShelfId` → `toShelfId` with no bidirectional support
- **No shelf search** — Can't search shelves by name
- **Thread anchors are fragile** — `setShelfAnchor` deletes all existing threads for a shelf

---

## 15. Potential Improvements

### High Priority
- [ ] Decide whether Snap media should stay local-first or move to Firebase Storage sync
- [ ] Add input validation layer
- [ ] Add test and lint scripts plus a minimal automated test suite
- [ ] Run a device QA pass for auth, share intent, Board drag/zoom, and delete flows

### Medium Priority
- [ ] Add offline mode with Firestore persistence
- [ ] Extend search beyond the Board's 200-snap live cap
- [ ] Add shelf search functionality
- [ ] Add dark mode theme
- [ ] Add analytics/event tracking

### Lower Priority
- [ ] Add OAuth providers (Google, Apple)
- [ ] Add user profile settings
- [ ] Add password reset flow
- [ ] Add account deletion
- [ ] Add export/import data feature
- [ ] Add collaborative shelves (sharing with other users)
- [ ] Add smart thread suggestions based on labels/content
- [ ] Add batch operations for bulk snap management

---

## 16. Brainstorming Questions

### Features
- Should users be able to share shelves with others?
- Should shelves support nested sub-shelves?
- Should threads carry semantic meaning (e.g., "inspired by", "related to")?
- Should snaps have a "favorites" or "archive" state?
- Should there be a search/filter across all snaps?
- Should there be a grid view alternative to the board?
- Should threads be bidirectional?
- Should snaps support multiple images?
- Should there be a "recently viewed" or history feature?

### Business Rules
- What's the max number of snaps per shelf?
- What's the max number of shelves?
- What's the max image size?
- Should old snaps be auto-archived?
- Should there be a subscription model with limits?
- How should shared shelves work (read-only? collaborative?)?

### UI/UX Decisions
- How should the board handle 50+ shelves?
- Should the board support zoom levels below the fit scale?
- Should shelves support custom colors or just variants?
- Should there be a "focus mode" for a single shelf?
- How should snap thumbnails scale on different device sizes?
- Should there be haptic feedback on shelf drag?
- Should the tab bar animate between tabs?

### Architecture
- Should state be moved to a global store (Zustand, Jotai)?
- Should Firestore queries be paginated?
- Should images be served through Cloudflare/CDN?
- Should the app support widget extensions (iOS/Android)?
- Should share intent support more types (video, audio, files)?
- Should the app work as a Progressive Web App (PWA)?
