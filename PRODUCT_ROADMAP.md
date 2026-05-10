# SnapShelf Product Roadmap

## Next 3 Sessions

### Session 1: Make Library Feel Finished

Product goal: turn Library into the trusted place to find anything fast.

Focus:
- QA and polish the new Library UX on real device sizes
- Fix any remaining layout, wrapping, spacing, or modal inconsistencies
- Improve filter clarity:
  - chip labels
  - result copy
  - empty states
- Make sure advanced filters feel lightweight, not settings-like

Why this matters:
- Library is now the retrieval surface for the whole app
- If search and filtering feel polished, the app immediately feels more mature

Success criteria:
- No horizontal overflow
- No giant or awkward controls
- Applied filters are always understandable
- First result appears quickly
- Sort, filter, status, and favorites behavior feels obvious

Suggested prompt:

```text
Do a QA + polish pass on the Library screen redesign.

Goals:
- verify the Library layout on small Android and iPhone-sized screens
- fix any spacing, wrapping, overflow, chip, modal, or typography inconsistencies
- keep behavior unchanged unless a bug is found
- run typecheck and tests after changes

Focus on:
- top controls sizing
- applied filter chips
- filter sheet spacing and CTA
- sort modal row styling
- result count and empty states
- first snap card visibility in first viewport
```

### Session 2: Make The Tray Fast to Triage

Product goal: help users process new snaps quickly instead of letting The Tray pile up.

Focus:
- Redesign `The Tray` around fast triage
- Make the most common actions feel one-tap or two-tap:
  - move to shelf
  - favorite
  - archive
  - delete
- Consider lightweight bulk actions if the UI supports it cleanly
- Improve list density and action clarity

Why this matters:
- Capture without triage leads to clutter
- The Tray is the inbox; if inbox cleanup is painful, the whole product feels heavy

Success criteria:
- A user can process several snaps quickly
- Action targets are clear and consistent
- The screen feels calmer and more task-oriented
- Moving snaps to shelves is friction-light

Suggested prompt:

```text
Redesign The Tray screen for faster triage.

Goals:
- make it easier to move, favorite, archive, and delete snaps
- keep the UI mobile-native and fast to scan
- prioritize the most common triage actions
- avoid large stacked cards if a denser layout works better
- keep existing data behavior unless a bug is found

Please inspect the current Tray screen first, then implement the smallest good redesign and run typecheck/tests afterward.
```

### Session 3: Make Organization Feel Meaningful

Product goal: make Board and Shelf views feel like intentional organization, not just storage.

Focus:
- Improve the Board and/or Shelf experience so saved snaps feel connected to a system
- Possible directions:
  - better shelf detail view
  - stronger shelf metadata and context
  - improved board readability
  - clearer relationship between The Tray, Library, and Shelves
- Add small UX touches that reinforce mental models:
  - better shelf summaries
  - more helpful empty states
  - clearer thread and anchor explanations

Why this matters:
- Once capture and retrieval work, the next product question is: why organize here?
- This session should make the app feel more distinct, not just functional

Success criteria:
- Shelves feel useful, not decorative
- Board navigation is easier to understand
- Shelf detail gives users a reason to revisit and curate
- The product’s organizing metaphor feels stronger

Suggested prompt:

```text
Improve the product value of Board and Shelf organization.

Goals:
- make shelves and the board feel more meaningful and easier to understand
- improve clarity, readability, and usefulness of the organization flow
- keep the visual language consistent with the calmer Library redesign
- prefer focused UX improvements over broad rewrites

Please inspect Board, Shelf view, and their relationship to The Tray/Library first, then recommend and implement the highest-value improvements.
```

## Why This Order

1. Retrieval trust
2. Inbox speed
3. Organization meaning

This sequence gives the product:
- Confidence that users can find things
- Speed to process new things
- A stronger reason to keep using the system
