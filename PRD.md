# SnapShelf PRD

## Product Summary

SnapShelf is a mobile-first visual inspiration app for capturing, finding, and organizing screenshots and references that would otherwise disappear into a camera roll. It gives users a warm, tactile place to save visual ideas from anywhere, add quick context, process new items through The Tray, retrieve anything through Library, and curate saved inspiration into Shelves on a spatial Board.

The product should feel like a sun-drenched personal archive: calm, editorial, visual, and useful without feeling like a productivity database.

## Current Product State

SnapShelf currently supports:

- Firebase email/password authentication
- Account profile management, password reset, delete account, and sign out
- Native share-intent capture into SnapShelf
- Quick Snap creation from inside the app
- The Tray for unsorted incoming Snaps
- Library for full-account search, filtering, sorting, and retrieval
- Shelves for named collections
- Board for spatial shelf organization
- Favorites, archive status, labels, sources, dates, thoughts, and shelf assignment
- Dev-only sample data seeding from Settings

Recent product cleanup:

- Library has been polished as the trusted retrieval surface.
- Advanced Library filters are lightweight and chip-based rather than settings-like.
- Settings has been simplified to account, profile, security, and dev tools.
- The Tray is the canonical unsorted inbox concept across UI, route, docs, and code symbols.
- The Tray route is `/tray`.
- The Tray has been redesigned as a compact triage queue with direct move, favorite, archive, and delete actions.
- The Tray tab icon now uses an inbox tray with an incoming checked Snap cue instead of an email/envelope metaphor.

## Product Positioning

SnapShelf is not a generic file manager, shopping app, social app, or productivity tool. It is a visual memory system for people who collect inspiration and want it to remain findable, contextual, and pleasing to revisit.

The core product loop:

1. Capture a visual idea quickly.
2. Let it land in The Tray if it is not organized yet.
3. Add enough context to remember why it mattered.
4. Retrieve it later through Library search and filters.
5. Move it into Shelves and arrange the larger system on the Board.

## Target Users

### Visual Homemaker

Someone collecting interiors, furniture, paint colors, lighting, tableware, renovation ideas, and home inspiration.

What they care about:

- Saving inspiration quickly before it disappears
- Grouping ideas by room, project, style, or purchase priority
- Seeing ideas visually instead of buried in folders or notes
- Remembering why they saved something
- A calm, beautiful space that feels like a mood board

Core need:

> I want one warm, organized place for all the home ideas scattered across screenshots, Pinterest, Instagram, and shopping sites.

### Style Curator

Someone saving outfits, accessories, beauty references, brands, styling ideas, and wishlist items.

What they care about:

- Capturing looks from anywhere, especially social apps and online stores
- Organizing by occasion, season, aesthetic, brand, or wishlist
- Comparing pieces visually before buying
- Building a personal taste archive over time
- Feeling inspired when browsing, not overwhelmed

Core need:

> I want my fashion screenshots to become a curated personal lookbook instead of disappearing into my camera roll.

### Creative Planner

Designers, stylists, content creators, event planners, or highly visual thinkers who collect references for projects.

What they care about:

- Creating named collections for clients, shoots, campaigns, rooms, trips, or events
- Arranging references spatially so ideas feel connected
- Adding context at the moment of capture
- Returning to boards and finding items exactly where they left them
- Eventually sharing collections or collaborative wishlists

Core need:

> I want a tactile visual workspace where references become useful, organized boards instead of random saved images.

## Core Concepts

### Snap

A saved visual reference. A Snap can have an image, source, title, thought, labels, favorite state, archive state, saved/captured date, and optional Shelf assignment.

### The Tray

The Tray is the inbox for new or unsorted Snaps. Items shared into SnapShelf or saved without a Shelf land here until the user processes them. The Tray should feel quick, temporary, and easy to clear.

Current Tray behavior:

- Compact row-based triage layout instead of large stacked preview cards
- Direct row actions for Move, Favorite, Archive, and Delete
- Move opens Shelf selection directly so filing a Snap is a two-step flow
- After a successful Move, the Snap disappears from The Tray immediately without requiring navigation or a screen refresh
- Favorite toggles inline without leaving The Tray
- Archive removes the Snap from the active Tray queue
- Delete keeps a destructive confirmation before removing the Snap and saved image

### Library

Library is the trusted retrieval surface for the whole account. Users should be able to find anything fast by searching title, thought, label, shelf, or source, then refine with lightweight filters.

Current Library behavior:

- Full-account Snap search
- Filters for status, Shelf/The Tray, source, label, saved date, and favorites
- Sorting by newest, oldest, updated, or favorites first
- Clear applied filter chips
- Search/filter-specific result copy and empty states
- Lightweight bottom-sheet advanced filters

### Shelf

A named collection of Snaps. Shelves give structure to inspiration and can be placed on the Board. Deleting a Shelf moves its Snaps back to The Tray.

### Board

The spatial organization surface. The Board should make Shelves feel like memorable objects arranged in a personal workspace rather than rows in a database.

### Settings

Settings is an account panel, not a product status dashboard. It should stay focused on:

- Signed-in account summary
- Display name editing
- Password reset
- Account deletion
- Sign out
- Dev-only sample data seeding

When Firebase is not configured, Settings shows one concise developer-facing setup message.

## User Stories

1. As a Visual Homemaker, I want to save screenshots from any app via the native share sheet so home inspiration does not get lost in my camera roll.

2. As a Style Curator, I want new Snaps to land in The Tray when I am not ready to organize them so capture stays fast.

3. As a Creative Planner, I want to add a quick thought when I save an image so I can remember the context, client, or intended use later.

4. As a Visual Homemaker, I want to search my whole Library so I can find saved ideas by title, thought, label, shelf, source, or date.

5. As a Style Curator, I want filters to be clear and lightweight so I can narrow results without feeling like I am configuring settings.

6. As a Creative Planner, I want to move Snaps from The Tray into Shelves so my inbox does not pile up.

7. As a Creative Planner, I want to arrange Shelves on a spatial Board so related references stay exactly where I placed them.

## UI/UX Principles

### Warm, Tactile, And Editorial

The app should feel like a beautifully organized sketchbook or mood board. Use cream backgrounds, burnt orange accents, soft shadows, rounded forms, and thoughtful typography. Avoid anything corporate, sterile, or overly productivity-focused.

### Capture Should Be Effortless

Saving inspiration should be fast and forgiving. Users can add context or choose a Shelf, but capture should never become a chore.

### The Tray Should Be Quick To Process

The Tray is a working surface, not a permanent archive. It should make move, favorite, archive, and delete actions obvious and fast.

Prefer compact, scannable rows over large showcase cards when the user is in triage mode. The Tray should prioritize action clarity and queue-clearing speed over browsing.

### Library Should Build Retrieval Trust

Library should answer, “Can I find this later?” Search, filters, sort, result copy, chips, and empty states should all reinforce confidence.

### Organization Should Feel Spatial

The Board should feel like a place. Users should be able to arrange collections in a way that feels memorable and satisfying.

### Calm Over Clutter

SnapShelf should reduce camera roll chaos, not recreate it. Use restrained controls, generous spacing, clear hierarchy, and lightweight empty states.

## Technical Stack

### Frontend

**Expo + React Native + Expo Router**

SnapShelf should continue with the existing Expo React Native foundation. It supports native share capture, image handling, iOS/Android delivery, and route-based mobile surfaces.

Current route direction:

- `/board`
- `/library`
- `/tray`
- `/settings`
- Shelf detail routes
- Share-intent route

### Styling

**React Native styles + shared design tokens**

The app should keep using centralized theme tokens and custom components. SnapShelf's aesthetic depends on warmth, spacing, rounded surfaces, editorial typography, and subtle tactile details.

Core design language:

- Cream, burnt orange, and warm neutral palette
- Rounded cards and pill controls
- Soft tactile shadows
- Generous whitespace
- Visual-first content cards
- Lightweight sheets and modals
- Custom navigation icons that reinforce product metaphors, including the Tray as an inbox tray/triage queue rather than email

### Backend

**Firebase Firestore + Firebase Auth**

Firestore remains the primary database for structured user data such as users, shelves, snaps, labels, board positions, favorites, archive status, and threads.

Firebase Auth remains the authentication layer. Email/password auth is implemented. Future auth expansion may include Apple Sign-In, Google Sign-In, and anonymous-to-account upgrade flows.

Firebase Storage should be added when cross-device synced images and thumbnails become part of v1 scope. Current image references can remain local until that scope is explicitly prioritized.

Current V1 local-first media limitations:

- Snap metadata syncs through Firestore, but Snap image files stay on the device where they were saved.
- Signing in on another device can show synced Snap records without their local image files until media sync is added.
- Reinstalling the app, clearing app data, or restoring only Firestore data can leave Snap records without local media.
- Share intent image saves depend on OS handoff and file permissions, so iOS and Android device checks are required before release.

Future backend expansion:

- Firebase Storage for synced snap images and thumbnails
- Firebase Cloud Functions for image processing
- AI enrichment jobs
- Product recognition
- Price detection
- Metadata extraction
- Shared wishlist workflows

## Near-Term Roadmap

### Completed: Session 1, Make Library Feel Finished

Product goal:

- Turn Library into the trusted place to find anything fast.

Completed outcomes:

- Responsive Library controls for narrow device widths
- Clearer result copy
- Clearer applied filter chip labels
- Search/filter-aware empty states
- Lightweight filter sheet copy and spacing
- Advanced filters that feel like quick refinements, not settings

### Completed: Settings Cleanup

Product goal:

- Make Settings reflect current product maturity instead of exposing setup/debug scaffolding.

Completed outcomes:

- Removed Firestore verification counts
- Removed raw UID display
- Removed Appearance placeholder card
- Replaced multi-card Firebase setup checklist with one developer-facing config message
- Kept account, profile, security, sign out, delete account, and dev-only sample seeding

### Completed: Establish The Tray Naming

Product goal:

- Align the unsorted inbox concept with the warmer product metaphor.

Completed outcomes:

- UI label is The Tray
- Route is `/tray`
- Code symbols and docs use Tray naming
- Library filter value is `tray`
- No legacy inbox route is retained

### Completed: Session 2, Make The Tray Fast To Triage

Product goal:

- Help users process new Snaps quickly instead of letting The Tray pile up.

Completed outcomes:

- Replaced large stacked Tray cards with compact, mobile-native triage rows
- Added clear row-level actions for Move, Favorite, Archive, and Delete
- Kept Move friction-light by opening Shelf selection directly from the row
- Made successful Move behave like triage completion by removing the Snap from The Tray immediately
- Added shared busy states so actions are clear while mutations are running
- Hid archived Snaps from the active Tray queue so Archive behaves like triage completion
- Updated the Tray tab icon from an envelope to an inbox tray with an incoming checked Snap cue
- Deferred bulk actions because selection mode would add complexity and visual weight before the core single-item triage loop is proven

### Completed: Session 3, Make Organization Feel Meaningful

Product goal:

- Make Board and Shelf views feel like intentional organization, not just storage.

Focus:

- Improve Board readability and Shelf usefulness
- Strengthen the relationship between The Tray, Library, Board, and Shelves
- Add small UX touches that reinforce mental models
- Improve shelf summaries, empty states, and thread or anchor explanations

Success criteria:

- Shelves feel useful, not decorative
- Board navigation is easier to understand
- Shelf detail gives users a reason to revisit and curate
- The product's organizing metaphor feels stronger

Delivered:

- Added a compact, dismissible Board Organization Map that explains how The Tray, Library, Board, Shelves, and Threads relate
- Added a Board help icon so users can bring the Organization Map back after dismissing it
- Improved Board list summaries with Shelf status, latest Snap context, empty Shelf cues, and clearer thread labels
- Added lightweight Board guidance for zooming, dragging, and list mode using the same explanatory text style as Library
- Repositioned Board zoom controls so they do not conflict with the add Shelf action
- Expanded Shelf detail into a useful Shelf Summary with Snap count, favorite count, latest activity, and label/source highlights
- Improved Shelf empty states with clear paths from The Tray, Library, or direct Snap creation
- Rewrote Anchor Shelf and Thread copy so relationships feel intentional and visible on the Board
- Tightened Tray and Library copy so each surface reinforces its role in the organization system

## V1 Scope

V1 should prioritize:

- Fast capture
- The Tray triage
- Reliable retrieval through Library
- Shelf organization
- Board-based spatial organization
- Account safety and basic profile controls
- A calm, polished mobile experience

## Out Of Scope For V1

The following features are explicitly not part of v1 unless reprioritized:

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
- Real-time multi-user collaboration
- Automated deduplication of screenshots
- Computer vision-based visual search
- Cross-device image sync unless Firebase Storage is added to the v1 implementation scope
