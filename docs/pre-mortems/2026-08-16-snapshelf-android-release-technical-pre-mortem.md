# SnapShelf Technical Pre-Mortem

**Date:** 2026-08-16  
**Assumed target:** The next Android Google Play release after archived `rc-1.0.1`. The milestone field was blank, so this is inferred from the release documentation and current changes.  
**Failure horizon:** 14 days after production rollout.  
**Mode:** Solo Developer Mode. Simulated perspectives: developer/maintainer, end user, security reviewer, reliability/operations reviewer, product reviewer, privacy reviewer.  
**Repository guidance:** No `AGENTS.md` was found. No application files were edited.

## Re-validation (2026-10-21)

The Validation Baseline below records what was observed on 2026-08-16 and is deliberately left as written. Re-running the same checks on 2026-10-21 produced:

**EVIDENCE:** `npm run typecheck` still passes.

**EVIDENCE:** `npm test` still passes: 21 test files and 92 tests.

**EVIDENCE:** `npx expo-doctor` initially failed 1 of 17 checks because Expo published patch releases after this document was written (`expo` `~54.0.37`, `expo-constants` `~18.0.14`, `expo-file-system` `~19.0.24` were expected). The dependencies were aligned and expo-doctor now passes 17/17. This confirms that the Expo dependency set is a rolling release target and must be re-checked immediately before every build.

**EVIDENCE:** `npm audit --omit=dev --audit-level=critical` reported 1 critical finding (`shell-quote` 1.10.0 via `react-native` → `react-devtools-core`). An `overrides` entry pinning `shell-quote` to `^1.11.0` clears it; critical findings are now 0. A separate `tinypool` prototype-pollution advisory remains in `vitest` and is dev-only, so it does not ship and does not gate the release audit.

**EVIDENCE:** `npm run release:verify-contact` now resolves the three production contact values from `eas.json` `build.production.env` when the process environment does not supply them, so the gate is meaningful both locally and in CI.

**EVIDENCE:** The three public pages are deployed and return HTTP 200 without authentication, and the `delete-account` Supabase Edge Function is active with a service-role secret. Neither the public deployment nor the function configuration verifies account deletion end to end; that still requires a disposable production account.

## Executive Summary

The imagined failure is not primarily a catastrophic infrastructure outage. The most plausible failure is a release that:

- ships from an inadequately frozen and tested artifact,
- makes incomplete privacy/deletion representations,
- leaves account deletion and local-media cleanup unreliable,
- exposes auth and destructive-operation race conditions,
- and lacks enough monitoring or operational coverage to discover these problems before reviews and support requests arrive.

The repository already calls the current release state non-publish-ready and explicitly archives the only existing AAB. That evidence supports a **NO-GO** rather than a speculative caution.

**Risk distribution**

- Tigers: 12
- Launch-Blocking Tigers: 7
- Fast-Follow Tigers: 4
- Track Tigers: 1
- Paper Tigers: 3
- Elephants: 3

## Validation Baseline

**EVIDENCE:** `npm run typecheck` passed.

**EVIDENCE:** `npm test` passed: 21 test files and 92 tests.

**EVIDENCE:** `npx expo-doctor` passed all 17 checks.

**EVIDENCE:** `git diff --check` passed.

**EVIDENCE:** `npm run release:verify-contact` failed because all three production contact values are missing.

**EVIDENCE:** `npm audit --omit=dev --audit-level=high` reported 12 high and 11 moderate findings.

**EVIDENCE:** Tests run in a Node environment and include only `features/**/*.test.ts`; native UI, filesystem, deep-link, and release-artifact behavior are excluded (`vitest.config.mjs:14-17`).

**EVIDENCE:** The basic Maestro smoke flow only launches and finds the app name (`.maestro/smoke.yaml:1-4`). The Create Snap flow stops before actually saving (`.maestro/create-snap.yaml:21-27`).

**UNKNOWN:** Local database tests, Android export, production EAS build, and real-device tests were not run during this analysis.

## Tigers

### T1. No releasable, QA-approved artifact exists

**Category:** Deployment, testing, recent changes  
**Urgency:** **Launch-Blocking**

**Concrete risk:** The wrong artifact is submitted, or a new artifact is built from a broad unreviewed working tree and treated as equivalent to the archived RC.

**EVIDENCE:**

- The working tree contains 33 modified tracked files and numerous untracked implementation and release files.
- Current changes total roughly 701 insertions and 286 deletions across navigation, Board, Tray, Library, Realtime, lifecycle, Settings, dependencies, and release documentation.
- The only recorded AAB, build 3 from `rc-1.0.1`, is explicitly archived and forbidden from submission (`PRODUCT_ROADMAP.md:231-248`).
- Any code change requires a new commit, tag, build ID, checksum, and build number greater than 3 (`PRODUCT_ROADMAP.md:244-257`).
- Every Android device QA result is blank (`docs/RELEASE_QA.md:49-78`).
- The release checklist explicitly says submission remains blocked (`docs/RELEASE_QA.md:118-125`).
- EAS requires committed source (`eas.json:2-5`).

**INFERENCE:** Shipping the archived AAB omits current fixes. Shipping a new AAB without repeating exact-artifact QA introduces unmeasured regressions.

**UNKNOWN:** Whether a newer artifact or QA record exists outside the repository.

**Plausible failure scenario:** A new build is rushed to Play after static checks. Within 14 days, users report share-intent, layout, authentication, or local-media failures that were not present in the archived artifact inspection.

**Mitigation:** Freeze and review a clean commit; create a new RC tag and production AAB; retain its EAS metadata and checksum; install the Play-delivered artifact; complete the Android matrix.

**Verification method:** Every applicable row in `docs/RELEASE_QA.md` records PASS/FAIL, tester, date, device, Android version, exact build ID, and checksum.

**Owner:** Solo developer as release owner.

**Decision condition:** Do not submit until the new artifact, not build 3, has explicit QA approval and no open SEV-1/SEV-2 defects.

### T2. Privacy, support, deletion, and Data Safety representations are unfinished

**Category:** Privacy, compliance, UX  
**Urgency:** **Launch-Blocking**

**Concrete risk:** Play rejects the submission, or users receive broken or inaccurate privacy, support, backup, and deletion information.

**EVIDENCE:**

- Runtime defaults use `example.invalid` (`shared/config/release.ts:1-9`).
- The release contact validator currently fails.
- The privacy policy is marked as a draft and contains unresolved legal entity, date, deletion URL, retention, region, minimum age, address, and contact fields (`docs/PRIVACY_POLICY.md:3-7`, `31-43`, `53-59`).
- Public privacy, support, and unauthenticated account-deletion pages remain required (`docs/GOOGLE_PLAY_SUBMISSION.md:5-12`).
- "Data shared: No" depends on an unresolved determination of Supabase's contractual role (`docs/GOOGLE_PLAY_SUBMISSION.md:74-80`).
- Android backup behavior remains only partially validated (`docs/RELEASE_QA.md:31-43`).

**INFERENCE:** Even if EAS receives valid URLs, the repository has no evidence that the published pages, policy text, backup claims, and Play filing agree with the exact build.

**UNKNOWN:** Production environment values, Supabase contract/region/retention, final Android backup rules, and any externally published pages.

**Plausible failure scenario:** The app passes technical review but is rejected for missing deletion access, or ships with inaccurate "on-device only" and retention claims requiring emergency correction.

**Mitigation:** Publish reviewed pages; resolve retention, backup, hosting, and service-provider facts; use identical links in EAS, Settings, and Play Console; revalidate Data Safety against the final AAB.

**Verification method:** Open every link without authentication from a clean device, inspect final backup rules, and conduct a line-by-line policy/Data Safety review against production behavior.

**Owner:** Solo developer as privacy/release owner, with a named legal or policy reviewer.

**Decision condition:** Launch only after all placeholders are removed, the contact gate passes in the production environment, and policy approval is recorded.

### T3. Production backend, account isolation, auth redirects, and deletion are unverified

**Category:** Security, authorization, reliability  
**Urgency:** **Launch-Blocking**

**Concrete risk:** Production differs from versioned migrations or configuration, causing broken auth, cross-account policy gaps, stale Realtime data, or unusable deletion.

**EVIDENCE:**

- Production migration parity, redirects, cross-account RLS, Realtime, Edge Function deployment, and deletion checks are all unchecked (`docs/RELEASE_QA.md:95-103`).
- The deletion function requires a working `snap-media` bucket before deleting the Auth user; listing failure returns HTTP 500 (`supabase/functions/delete-account/index.ts:135-153`).
- Existing RLS tests cover Snaps and Snap media locations but not every public table and cover-location boundary (`supabase/tests/database/rls.test.sql:19-127`).
- The Firebase-to-Supabase cutover was a single 107-file, approximately 10,683-insertion commit (`47c5975`).

**INFERENCE:** Local migration tests cannot establish production policy, publication, redirect, secret, bucket, or function parity.

**UNKNOWN:** Production migration list, bucket existence, Edge Function version/secrets, Auth allowlist, Realtime publication, backups, rate limits, and cross-account results.

**Plausible failure scenario:** Email recovery fails from Play, or account deletion fails for every user because the future-media bucket was not created. The defect is discovered through a Play review or user complaint.

**Mitigation:** Run production parity and disposable-account checks, including adversarial two-account RLS tests and deletion with an empty bucket.

**Verification method:** Record command output and backend screenshots; verify account removal from Auth and all public tables; reinstall and retest cold/warm confirmation and recovery links.

**Owner:** Solo developer as backend owner.

**Decision condition:** All production backend rows in `docs/RELEASE_QA.md` must pass against the exact release environment.

### T4. Deletion can leave local image files while appearing successful

**Category:** Filesystem/media, privacy, error handling  
**Urgency:** **Launch-Blocking**

**Concrete risk:** Snap or account deletion removes metadata but silently leaves files in application storage.

**EVIDENCE:**

- `deleteImageLocally` catches all filesystem errors and returns success (`features/images/local.ts:98-109`).
- `deleteSnap` deletes the backend row before local cleanup (`features/snaps/api.ts:785-803`).
- Account cleanup uses `Promise.allSettled` without inspecting results (`features/auth/api.ts:59-69`).
- Account deletion signs out after cleanup regardless of individual file outcomes (`features/auth/api.ts:302-320`).
- Settings promises removal of local Snap images, while QA requires failures to be reported accurately (`docs/RELEASE_QA.md:101-103`).

**INFERENCE:** A filesystem failure can leave private media behind after the app removes the location records needed to identify it.

**UNKNOWN:** Failure frequency across supported Android versions and backup/restore behavior.

**Plausible failure scenario:** A user deletes an account on a device with an I/O issue. SnapShelf reports success, but image files remain in backup or local app storage.

**Mitigation:** Return structured deletion results, preserve or reconcile failed paths, and tell the user when local cleanup is incomplete. Add an orphan-media reconciliation path.

**Verification method:** Inject deletion failures and verify the UI does not claim full cleanup; confirm successful deletion using filesystem inspection on a Play-installed build.

**Owner:** Solo developer as media/data owner.

**Decision condition:** Launch only when cleanup success is observable and failure messaging matches the privacy policy.

### T5. Auth callbacks can restore stale signed-in state after sign-out or account switching

**Category:** Authentication, privacy boundary, application state  
**Urgency:** **Launch-Blocking**

**Concrete risk:** An older asynchronous profile request writes state after a newer auth event.

**EVIDENCE:**

- Every auth callback starts `ensureUserProfile`, then unconditionally writes `profile` and `signedIn` after the await (`features/auth/AuthProvider.tsx:30-49`).
- A signed-out callback clears state immediately, but it does not invalidate an earlier pending callback.
- `subscribeToAuth` independently calls `getSession()` and installs `onAuthStateChange`, allowing overlapping callbacks (`features/auth/api.ts:323-340`).
- There is no request generation, current-user comparison, or cancellation guard.

**INFERENCE:** A slow user-A profile fetch can complete after sign-out or user-B sign-in and restore stale profile/status. RLS limits backend exposure, but the same-device UI may display prior-account identity or enter an invalid signed-in state.

**UNKNOWN:** Reproduction frequency under production latency and token refresh behavior.

**Plausible failure scenario:** A user signs out and hands the device to another person. SnapShelf briefly or persistently displays the previous user's profile and broken signed-in screens.

**Mitigation:** Sequence auth events and apply async results only when the current session user ID still matches.

**Verification method:** Add deterministic tests with deferred profile requests covering sign-out and rapid A-to-B account switching.

**Owner:** Solo developer as auth owner.

**Decision condition:** Launch only after stale callback results are demonstrably ignored.

### T6. Shelf deletion is non-transactional and can partially destroy organization

**Category:** Data integrity, destructive UX  
**Urgency:** **Launch-Blocking**

**Concrete risk:** The UI presents Shelf deletion as one action, but the implementation performs separate destructive requests without rollback.

**EVIDENCE:**

- Deletion first clears every Snap's Shelf, then deletes threads, then deletes the Shelf (`features/shelves/api.ts:376-400`).
- A failure between stages leaves earlier mutations committed.
- The schema already supports `ON DELETE SET NULL` for Snap Shelf assignments and cascading thread deletion.
- No fault-injection test covers interruption between these operations.

**INFERENCE:** Network failure can leave the Shelf present but emptied or disconnected while the UI reports deletion failure.

**UNKNOWN:** Production frequency of partial PostgREST failures.

**Plausible failure scenario:** A user deletes a large Shelf on unstable connectivity. It remains visible, but all Snaps have moved to The Tray and thread organization is gone.

**Mitigation:** Perform deletion in one database transaction/RPC or rely on verified foreign-key behavior from a single Shelf delete.

**Verification method:** Force failures at each stage and prove atomic pre-state or post-state, never an intermediate state.

**Owner:** Solo developer as data-integrity owner.

**Decision condition:** Destructive Shelf deletion must be atomic or recoverable before launch.

### T7. There is no operational detection or accountable rollout coverage

**Category:** Reliability, deployment, maintainability  
**Urgency:** **Launch-Blocking**

**Concrete risk:** Release failures remain invisible until Play reviews or support messages arrive, and nobody is explicitly available to halt or repair the rollout.

**EVIDENCE:**

- Every operations owner remains `[NAME]` (`docs/RELEASE_OPERATIONS.md:7-14`).
- The app has no production crash/error telemetry (`docs/RELEASE_OPERATIONS.md:18-23`).
- Support, Supabase alert, Play health, rollback, and post-release ownership checks are incomplete (`docs/RELEASE_QA.md:110-122`).
- Play rollback requires a higher-build-number forward fix (`docs/RELEASE_OPERATIONS.md:61-67`).

**INFERENCE:** Share-intent crashes, ANRs, auth failures, and deletion errors may not be detected during a staged rollout quickly enough to limit impact.

**UNKNOWN:** External monitoring or informal backup coverage not represented in the repository.

**Plausible failure scenario:** A device-specific crash affects a meaningful segment for several days. The solo developer learns about it from one-star reviews and cannot immediately access every recovery credential.

**Mitigation:** Name an actual release owner and backup, configure/test support and alerts, and rehearse halt plus forward-fix procedures.

**Verification method:** Trigger test alerts and support messages; confirm access from both designated operators; perform a tabletop incident exercise.

**Owner:** Solo developer as release commander. Backup owner is currently **UNKNOWN** and must be named rather than invented.

**Decision condition:** Do not start rollout without live monitoring, a monitored support channel, and real backup coverage.

### T8. Native installation-ID migration can break legacy local-media mappings

**Category:** Persistence, upgrade behavior  
**Urgency:** **Fast-Follow**, but launch-blocking if any existing cohort upgrades

**EVIDENCE:**

- Commit `47c5975` used native SecureStore key `snapshelf:installation-id`.
- Commit `f0e4fd3` changed it to `snapshelf.installation-id`.
- Legacy migration runs only on web (`services/device.ts:6-29`).
- Media lookup requires exact `device_id` (`features/images/locations.ts:32-41`).

**INFERENCE:** An upgrade from a legacy native build creates a new UUID and makes every prior local image mapping appear missing, even though files remain.

**UNKNOWN:** Whether any internal tester or user has a legacy build with valuable data. The archived RC already uses the new key.

**Mitigation:** Migrate the legacy SecureStore key on native or establish that no upgrade cohort exists.

**Verification:** Install a legacy build, create media, upgrade in place, and verify every image resolves.

**Owner:** Solo developer.

**Decision condition:** Resolve before any in-place upgrade cohort receives the release.

### T9. Realtime recovery is inconsistent across resource types

**Category:** Reliability, architecture  
**Urgency:** **Fast-Follow**

**EVIDENCE:**

- Snaps serialize refetches and recover on app resume (`features/snaps/api.ts:153-240`).
- Stacks and Threads do not refetch on `SUBSCRIBED` or app recovery (`features/stacks/api.ts:182-224`, `features/threads/api.ts:164-206`).
- Realtime reconnect QA remains unchecked (`docs/RELEASE_QA.md:84-93`).

**INFERENCE:** Board Stacks or Threads can remain stale after backgrounding or a connection interruption.

**UNKNOWN:** Supabase channel self-recovery behavior on target Android devices.

**Mitigation:** Apply the same guarded recovery strategy to Stacks and Threads.

**Verification:** Disconnect, mutate remotely, reconnect/resume, and verify all four resource types converge.

**Owner:** Solo developer.

**Decision condition:** Complete within the first post-launch cycle, or before launch if reconnect testing reproduces stale state.

### T10. Core cross-device copy overpromises the local-media model

**Category:** Product, UX, privacy expectations  
**Urgency:** **Fast-Follow**

**EVIDENCE:**

- Sign-up says SnapShelf "follows you across your devices" (`app/(auth)/sign-up.tsx:56-62`).
- Sign-in says users can pick up Board, Tray, and Shelves "from any device" (`app/(auth)/sign-in.tsx:39-45`).
- Images remain device-local; another device receives metadata without image files (`README.md:25-34`).
- The limitation appears only in the final onboarding Library step (`shared/components/OnboardingWelcomeModal.tsx:40-45`).

**INFERENCE:** Users may interpret missing images after second-device sign-in as data loss or failed sync.

**UNKNOWN:** User comprehension or acceptance; no research or analytics evidence was found.

**Mitigation:** State "metadata syncs; images remain on this device" at sign-up/sign-in and in missing-media states.

**Verification:** Conduct comprehension testing with users unfamiliar with the implementation.

**Owner:** Solo developer as product owner.

**Decision condition:** Correct before broad production promotion if internal testers misunderstand the behavior.

### T11. Accessibility failures are plausible on primary navigation

**Category:** UX, accessibility, testing  
**Urgency:** **Fast-Follow**

**EVIDENCE:**

- Custom tabs lack explicit role, label, and selected state (`shared/components/CustomTabBar.tsx:73-105`).
- The icon-only header search button lacks an accessibility label (`shared/components/AppHeader.tsx:35-38`).
- Filter pills do not expose selected state (`shared/components/LibraryFilterSheet.tsx:61-85`).
- Largest-text and TalkBack QA are pending (`docs/RELEASE_QA.md:84-92`).

**INFERENCE:** TalkBack users may not know which tab or filter is selected; large text may clip fixed-height controls.

**UNKNOWN:** Actual traversal and clipping on target devices.

**Mitigation:** Add semantics and test the critical path with TalkBack and maximum supported font scale.

**Verification:** Record TalkBack traversal and accessibility scanner results on the exact AAB.

**Owner:** Solo developer.

**Decision condition:** Fix before broad rollout if critical navigation or first-run completion is blocked.

### T12. Full-account reads and Board caps will erode retrieval trust

**Category:** Architecture, performance, product assumption  
**Urgency:** **Track**

**EVIDENCE:**

- Library fetches every Snap without a limit and refetches after changes (`features/snaps/api.ts:484-492`, `516-543`).
- Board fetches only 200 recent Snaps (`app/(tabs)/board.tsx:1651-1670`).
- Board copy says it searches "every Snap" before later disclosing the 200-Snap cap (`app/(tabs)/board.tsx:2076`, `2100-2103`).
- The roadmap already calls for bounding Library reads and removing the Board cap (`PRODUCT_ROADMAP.md:201-202`).

**INFERENCE:** Larger accounts get increasing network/memory cost in Library and incomplete counts, covers, or search on Board.

**UNKNOWN:** Expected account size, low-memory profiling, and how quickly users reach 200 Snaps.

**Mitigation:** Add server-side search/filtering and bounded pagination; compute Board summaries independently of the recent-Snap display cap.

**Verification:** Profile 200, 1,000, and 5,000-Snap accounts on a lower-memory Android device.

**Owner:** Solo developer.

**Decision condition:** Escalate to launch-blocking if pilot users approach 200 Snaps or performance exceeds agreed thresholds.

## Paper Tigers

### P1. "The app will leak uploaded images through Supabase"

**EVIDENCE:** Current image copies are written under Expo `documentDirectory`; backend records contain metadata and relative paths, not image contents (`features/images/local.ts:76-88`, `README.md:25-34`).

**INFERENCE:** An application-level Supabase image-upload leak is not supported by the current implementation.

**UNKNOWN:** Android OS backup/device-transfer behavior remains unresolved and is a separate privacy risk.

**Classification rationale:** Scary consequence, but no current image-upload path was found.

### P2. "The 12 high audit findings prove the shipped app is remotely exploitable"

**EVIDENCE:** Audit findings flow mainly through Expo/Metro/PostCSS/image-size/build dependencies. The available automatic fix requires a breaking Expo 57 upgrade.

**INFERENCE:** Scanner severity alone does not establish runtime reachability in the mobile artifact.

**UNKNOWN:** Exact reachability and upstream patches require dependency triage.

**Classification rationale:** Do not force-upgrade immediately without exploitability analysis; continue tracking advisories.

### P3. "AI or an autonomous agent could destructively reorganize user data"

**EVIDENCE:** AI labeling, computer vision, and agents are explicitly out of V1 scope (`PRODUCT_ROADMAP.md:149-166`), and no AI SDK or agent execution path appears in `package.json`.

**INFERENCE:** AI autonomy, prompt injection, hallucinated actions, and runaway model spend are not current release risks.

**UNKNOWN:** Future roadmap changes could introduce these risks.

## Elephants

### E1. The repository says "do not release," while release preparation continues

**EVIDENCE:** The roadmap says to continue product tweaks and local testing and "do not release or submit `rc-1.0.1`" (`PRODUCT_ROADMAP.md:192-200`). It separately lists substantial unresolved blockers (`PRODUCT_ROADMAP.md:218-229`).

**INFERENCE:** Schedule or momentum pressure could cause documented gates to be treated as paperwork rather than actual stop conditions.

**UNKNOWN:** External launch commitments or deadlines.

**Decision:** Acknowledge that release readiness, not feature completion, controls the date.

### E2. A solo-maintained product has a two-operator incident model without the second operator

**EVIDENCE:** The runbook requires primary and backup ownership and says two maintainers must have recovery access (`docs/RELEASE_OPERATIONS.md:7-23`), but every owner remains blank.

**INFERENCE:** The current operational design assumes staffing that is not evidenced.

**UNKNOWN:** Whether a trusted backup operator is available outside the repository.

**Decision:** Either name and train a real backup or consciously narrow the rollout until solo coverage is acceptable.

### E3. The core product promise depends on users accepting intentional image fragility

**EVIDENCE:** SnapShelf is positioned as a trusted visual archive, but images do not sync and can become unavailable after reinstall, app-data clearing, OS cleanup, or device change (`README.md:25-34`; `PRODUCT_ROADMAP.md:125-134`).

**INFERENCE:** Metadata durability without image durability may violate what users naturally expect from an account-based archive.

**UNKNOWN:** Whether target users understand and accept this tradeoff; no user research evidence was found.

**Decision:** Validate the product assumption explicitly rather than treating disclosure alone as sufficient mitigation.

## Launch Recommendation

## NO-GO

1. **Launch blockers**
   - No new clean, frozen, QA-approved production AAB exists.
   - Public privacy, support, and deletion materials are incomplete.
   - Production backend, RLS, Auth redirects, Realtime, and deletion are unverified.
   - Local deletion failures can be silently reported as success.
   - Auth state has an unguarded stale-callback race.
   - Shelf deletion can partially destroy organization.
   - Monitoring, support, incident, and backup ownership are absent.

2. **Conditions for launch**
   - Freeze and review a clean commit; create a new RC and build number greater than 3.
   - Complete exact Play-delivered artifact QA on current and older supported Android versions.
   - Publish and approve matching privacy, support, and public deletion pages.
   - Pass the production contact gate in EAS.
   - Validate production migrations, RLS, Auth redirects, Realtime, deletion, storage bucket, secrets, backups, and alerting.
   - Make local cleanup failures observable.
   - Guard auth callbacks against stale async results.
   - Make Shelf deletion atomic or recoverable.
   - Name real rollout, support, backend, privacy, and incident owners.

3. **Fast-follow work**
   - Migrate legacy native installation IDs where an upgrade cohort exists.
   - Add Stack and Thread recovery after reconnect/resume.
   - Align cross-device copy with local-only image behavior.
   - Complete TalkBack and large-text remediation.

4. **Risks to monitor**
   - Full-account Library refetch cost and Board's 200-Snap cap.
   - Dependency advisories and upstream Expo-compatible fixes.
   - Local orphan files across devices.
   - Android backup/device-transfer behavior.
   - Support volume around missing images and cross-device expectations.

5. **Unknowns requiring validation**
   - Production EAS environment values and externally published pages.
   - Production Supabase migration/configuration parity, region, retention, backups, limits, and alerts.
   - Supabase contractual role for Play Data Safety.
   - Exact next-AAB permissions and backup rules.
   - Real-device auth, share intent, filesystem, upgrade, offline, Realtime, TalkBack, and deletion behavior.
   - Existence of legacy-build users with local media.
   - Expected collection sizes and lower-end Android performance.
   - Availability of a genuine backup operator.
