# Release And Device QA

Use this checklist only with production EAS artifacts created from a clean, reviewed commit. Preview APKs and local development clients are not release evidence.

## Forbidden And Superseded Artifacts

These artifacts exist but must never be submitted to Google Play or installed as release evidence:

| Artifact | Build ID | Reason |
| --- | --- | --- |
| `snapshelf-android-1.0.0-3.aab` (`rc-1.0.1`) | `332c3587-66ad-40be-972f-1e378d3685c1` | Archived release candidate. Never submitted, never QA-approved. |
| `snapshelf-android-1.0.0-2.aab` | `a09efdc8-2f9e-49d6-a9ca-ed280f8fa6e9` | Built from older commit `d960e8e`. |
| `snapshelf-preview.apk` | Local | Preview build, not a store artifact. |
| `snapshelf-android-1.0.0-2.apk` (preview) | `62640dda-aaed-4e79-9b15-80887b371ec6` | Internal-distribution preview build. |

The next release must use an Android build number greater than `3`. The EAS remote version for `com.loadsmile.snapshelf` is `1.0.0` with build number `3`; `autoIncrement` in the `production` profile produces the next number. Re-read this table before any upload and confirm the build ID and SHA-256 in the Build Record below match the artifact actually uploaded.

## Build Record

The record below is the **next** release. Replace every pending value with the values from the new build. Do not reuse the `rc-1.0.1` values.

- Release commit: Pending (must be the clean, reviewed commit that the AAB was built from)
- Release tag: Pending (a new tag; `rc-1.0.1` is archived and must not be moved or reused)
- GitHub Actions run: Pending
- iOS EAS build ID: Deferred for this Android-only release
- iOS SHA-256: Deferred for this Android-only release
- Android EAS build ID: Pending
- Android artifact: Pending
- Android app version / build number: Pending (must be `1.0.0` / greater than `3`)
- Android SHA-256: Pending
- Android build completed: Pending
- Tester and date: Pending

### Archived Build Record (`rc-1.0.1`, not release evidence)

- Release commit: `9e4e2aee595ef8065f620afb0287e12d4df3100d`
- Release tag: `rc-1.0.1`
- GitHub Actions run: `31597495357` (failed historical run; not release evidence)
- Android EAS build ID: `332c3587-66ad-40be-972f-1e378d3685c1`
- Android artifact: `snapshelf-android-1.0.0-3.aab`
- Android app version / build number: `1.0.0` / `3`
- Android SHA-256: `f743faeec6fee2808a580925636eb0efb2d5c789da47d6e1139bb63406d54712`
- Android build completed: August 12, 2026 at 13:18:10 UTC
- Status: archived, unreleased, and never approved for device QA or Google Play submission

The `EAS Build` workflow waits for each build and stores the application archives, complete EAS metadata, and checksums as a GitHub Actions artifact. Do not use the `EAS Submit` workflow until the exact build ID above has passed this checklist. Never use Android build `a09efdc8-2f9e-49d6-a9ca-ed280f8fa6e9`; it came from older commit `d960e8e`.

## Artifact Inspection

Record Android results only. iOS rows remain deferred and must not be marked complete from Android evidence. The table below holds the results observed on the **archived** `rc-1.0.1` artifact; they are historical and must be re-run against the new AAB, which will differ in at least the build number, the embedded release-contact URLs, and the dependency set.

| Android artifact check | Archived `rc-1.0.1` result / evidence | New build result / evidence |
| --- | --- | --- |
| Exact EAS source commit | PASS: EAS metadata reports `9e4e2aee595ef8065f620afb0287e12d4df3100d` | Pending |
| Production store build | PASS: Android, `production`, `STORE` | Pending |
| App version and build number | PASS: `1.0.0` / `3` | Pending |
| Download integrity | PASS: AAB ZIP integrity test completed without errors | Pending |
| AAB signing | PASS: JAR signature verified; upload certificate SHA-256 `4B:AE:A2:7C:26:8A:15:77:C4:09:99:3D:65:9E:3F:BC:4F:68:27:33:D7:D0:49:13:96:BC:BE:EA:66:0A:28:31` | Pending (confirm the same upload certificate) |
| Android package ID | PASS: manifest reports `com.loadsmile.snapshelf` | Pending |
| `snapshelf://` scheme | PASS (manifest): exported browsable `VIEW` intent filter is present; runtime opening remains pending device QA | Pending |
| Release permissions | PASS: `INTERNET`, `VIBRATE`, biometrics, fingerprint, and the app-scoped dynamic receiver permission only; microphone, overlay, and broad-storage permissions are absent | Pending |
| Embedded release-contact URLs | Not present in this artifact | Pending: confirm `https://snapshelf-legal.vercel.app/privacy/`, `https://snapshelf-legal.vercel.app/`, and `codecrafting.ltd@gmail.com` are the values compiled into the bundle |
| Backup behavior | PARTIAL: manifest enables backup with SecureStore extraction and backup rules; privacy-policy review remains pending | Pending |

- [x] App version and build numbers match the build record (archived artifact).
- [ ] Bundle IDs are `com.loadsmile.snapshelf` and `com.loadsmile.snapshelf.share-extension` where applicable.
- [ ] Signing and provisioning are valid for App Store/TestFlight and Play internal testing.
- [ ] The `snapshelf://` scheme opens the app.
- [ ] iOS contains the expected app group and ShareExtension entitlement.
- [x] Android contains only expected release permissions; microphone, overlay, and broad-storage permissions are absent (archived artifact; re-confirm on the new build).
- [ ] Backup behavior and store purpose strings match the privacy policy.

## Device Matrix

Record OS version and device model beside each result. Test one current and one older supported OS where possible.

| Flow | iOS result/device | Android result/device |
| --- | --- | --- |
| Install and first launch | | |
| Sign up and email confirmation, cold app | | |
| Email confirmation, warm app | | |
| Sign in and sign out | | |
| Password recovery, cold app | | |
| Password recovery, warm app | | |
| Create Snap from photo picker | | |
| Import 20 images | | |
| Share one image into SnapShelf | | |
| Share multiple images into SnapShelf | | |
| Share URL/text into SnapShelf | | |
| Restart persistence | | |
| Missing-image replacement | | |
| Tray bulk actions and partial failure | | |
| Shelf and Stack rename/delete | | |
| Account deletion and local cleanup | | |
| Upgrade from the previous release with existing local images | | |
| Board pan, pinch, zoom controls, and search focus | | |
| Create Snap backdrop dismissal and keyboard-visible scrolling | | |
| Settings local-media health check | | |
| App icon, adaptive icon, and splash screen | | |

### Android Test Devices

| Device | Model | Android version | Build / security patch | Tester | Date |
| --- | --- | --- | --- | --- | --- |
| Current supported OS | Pending | Pending | Pending | Pending | Pending |
| Older supported OS, where possible | Pending | Pending | Pending | Pending | Pending |

### Android QA Notes

Record every PASS, FAIL, or BLOCKED result in the Android column above with the device model and Android version. Give every failure an owner and disposition before approving submission.

## Resilience And Accessibility

- [ ] Deny photo permission and verify recovery copy and retry behavior.
- [ ] Lose connectivity during authentication and metadata changes, then recover.
- [ ] Disconnect and reconnect Realtime; verify Snaps, Shelves, Stacks, and Threads recover or show an error.
- [ ] Verify light and dark mode on both platforms.
- [ ] Verify the largest supported text size without blocked actions or clipped critical copy.
- [ ] Complete the critical path with VoiceOver on iOS.
- [ ] Complete the critical path with TalkBack on Android.
- [ ] Confirm destructive actions require clear intent and leave consistent state.

## Production Backend Checks

- [ ] Local and production migration versions match with `npx supabase migration list`.
- [ ] Production Auth allows `snapshelf://` redirects for confirmation and recovery.
- [ ] RLS prevents one disposable account from reading or mutating another account's rows.
- [ ] Realtime updates arrive for Snaps, Shelves, Stacks, and Threads.
- [ ] `delete-account` is active and has a server-side service-role secret.
- [ ] A disposable production account deletion removes Auth and backend rows.
- [ ] Current-device images are removed or any cleanup failure is reported accurately.

## Store And Operations Checks

- [ ] `npm run release:verify-contact` passes in the production EAS environment.
- [ ] The published privacy policy has completed legal/owner review and matches the exact release behavior, Supabase retention, Android backup behavior, and Data safety filing.
- [ ] Privacy, support, and public account-deletion pages load without authentication and match the links in Settings and Play Console.
- [ ] The monitored support inbox has tested primary and backup owners.
- [ ] Play description, screenshots, feature graphic, content rating, Data safety answers, app access, and review notes have been reviewed from `docs/GOOGLE_PLAY_SUBMISSION.md`.
- [ ] Screenshots come from the exact release build, use rights-cleared content, and contain no personal or placeholder data.
- [ ] The disposable reviewer account works from a clean Play-installed device and contains representative sample data.
- [ ] Named release, support, backend, privacy, and incident owners completed `docs/RELEASE_OPERATIONS.md`.
- [ ] Supabase and Google Play monitoring alerts were tested before rollout.
- [ ] Rollback uses a higher-build-number forward fix; database recovery steps are separately reviewed and do not assume Play can downgrade installed apps.

## Release Decision

- [ ] Every failure has an owner and disposition.
- [ ] No open severity-one or severity-two release defect remains.
- [ ] Post-release smoke and rollback owners are available.
- [ ] The reviewed EAS build IDs and SHA-256 checksums are approved for internal-store submission.

Production Android AAB and App Store iOS IPA archives are not generally direct-install artifacts. This release remains blocked before submission until there is an approved way to install the exact artifacts for device QA; do not mark `qa_approved`, run `EAS Submit`, or treat an independently generated preview build as equivalent evidence.
