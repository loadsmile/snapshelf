# Release And Device QA

Use this checklist only with production EAS artifacts created from a clean, reviewed commit. Preview APKs and local development clients are not release evidence.

## Build Record

- Release commit:
- Release tag:
- GitHub Actions run:
- iOS EAS build ID:
- iOS SHA-256:
- Android EAS build ID:
- Android SHA-256:
- Tester and date:

The `EAS Build` workflow waits for each build and stores the application archives, complete EAS metadata, and checksums as a GitHub Actions artifact. Do not use the `EAS Submit` workflow until the exact build ID below has passed this checklist. Never use Android build `a09efdc8-2f9e-49d6-a9ca-ed280f8fa6e9`; it came from older commit `d960e8e`.

## Artifact Inspection

- [ ] App version and build numbers match the build record.
- [ ] Bundle IDs are `com.loadsmile.snapshelf` and `com.loadsmile.snapshelf.share-extension` where applicable.
- [ ] Signing and provisioning are valid for App Store/TestFlight and Play internal testing.
- [ ] The `snapshelf://` scheme opens the app.
- [ ] iOS contains the expected app group and ShareExtension entitlement.
- [ ] Android contains only expected release permissions; microphone, overlay, and broad-storage permissions are absent.
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

## Release Decision

- [ ] Every failure has an owner and disposition.
- [ ] No open severity-one or severity-two release defect remains.
- [ ] Post-release smoke and rollback owners are available.
- [ ] The reviewed EAS build IDs and SHA-256 checksums are approved for internal-store submission.

Production Android AAB and App Store iOS IPA archives are not generally direct-install artifacts. This release remains blocked before submission until there is an approved way to install the exact artifacts for device QA; do not mark `qa_approved`, run `EAS Submit`, or treat an independently generated preview build as equivalent evidence.
