# Release Support and Operations

Complete the bracketed ownership fields before an internal or production rollout. A mailbox or alert without a named on-call owner does not satisfy this runbook.

## Ownership and Monitoring

| Responsibility | Primary | Backup | Coverage / target |
| --- | --- | --- | --- |
| Release commander | [NAME] | [NAME] | Entire rollout window |
| Support inbox | [NAME] | [NAME] | Check each business day; every 2 hours during rollout |
| Supabase/Auth/Edge Functions | [NAME] | [NAME] | Dashboard alerts plus rollout watch |
| Google Play health | [NAME] | [NAME] | Android vitals and crash/ANR review |
| Privacy and deletion requests | [NAME] | [NAME] | Acknowledge within 2 business days |
| Incident communications | [NAME] | [NAME] | Severity-one updates every 30 minutes |

Before release:

- Route `EXPO_PUBLIC_SUPPORT_EMAIL` to a shared, access-controlled inbox with primary and backup owners.
- Configure mailbox alerts and test delivery/reply from an external address.
- Configure Supabase Auth, database, function failure, quota, and usage alerts available on the selected plan.
- Monitor Google Play Android vitals, crashes, ANRs, review feedback, install failures, and staged-rollout health.
- Add privacy-reviewed crash reporting before relying on automated client error detection. The current app has no production crash/error telemetry.
- Store Play, EAS, GitHub, email, and Supabase recovery access in the approved password manager; verify two maintainers can access it.

## Support Procedure

1. Every request receives an owner, severity, timestamp, app version/build, device/Android version, and sanitized reproduction notes.
2. Never request a password, authentication token, full database export, or unnecessary personal image.
3. Confirm receipt within one business day for normal support and within two business days for privacy/deletion requests.
4. Escalate security, privacy, deletion, widespread auth, data-loss, and account-isolation reports immediately to the incident procedure.
5. Record resolution and update user-facing documentation when the issue is repeatable.

Severity definitions:

- SEV-1: cross-account access, credential exposure, destructive data loss affecting multiple users, unusable sign-in/deletion for most users, or major service compromise.
- SEV-2: critical workflow unavailable for a meaningful segment, repeated local-media loss beyond documented limitations, or release-wide crash/ANR regression.
- SEV-3: degraded noncritical feature with a workaround.
- SEV-4: cosmetic issue, question, or enhancement.

## Incident Procedure

1. Open an incident record with start time, commander, severity, affected versions, symptoms, and known scope.
2. Protect users first: halt the Play rollout, disable affected backend capability where safe, revoke exposed credentials, or place the service in a safe state.
3. Preserve evidence without collecting unnecessary user data. Record dashboards, logs, deploy/build IDs, configuration changes, and timestamps.
4. Establish impact and whether confidentiality, integrity, availability, deletion, or local-only media promises are affected.
5. Send status updates on the severity cadence. Do not speculate; state facts, impact, mitigation, and next update time.
6. Validate recovery with a disposable account and the post-release smoke tests before resuming rollout.
7. Complete a blameless review within five business days for SEV-1/2 incidents, with owners and due dates for corrective actions.

## Release and Rollback

Pre-release evidence must include the source commit/tag, EAS build ID, Android version/build number, AAB SHA-256, Play track, migration versions, reviewer, and QA approval in `docs/RELEASE_QA.md`.

Rollout sequence:

1. Upload the QA-approved AAB to internal testing and install the Play-delivered artifact.
2. Complete smoke and device QA. Promote the same artifact to a closed test before production when feasible.
3. Start production with a small staged percentage. The release commander records start time and monitors support, vitals, Supabase, auth, and deletion.
4. Expand only after the agreed observation window has no unexplained SEV-1/2 signal.

Rollback procedure:

1. Halt the staged rollout immediately for a release-caused SEV-1/2 or material privacy/deletion mismatch.
2. Google Play cannot downgrade users to an older version. Prepare a forward-fix AAB from the last known-good commit with a build number higher than the failed release.
3. Do not reverse a database migration unless a separately reviewed down migration is proven safe. Prefer backward-compatible schema fixes or feature disablement.
4. Run release verification and targeted regression tests, create a new EAS production build, retain its checksum and metadata, and submit through the expedited incident path.
5. Validate the Play-delivered fix, monitor it, and document which users may remain on the affected version.

## Post-Release Smoke

Run after each Play promotion and backend change:

- Fresh install and launch from Play.
- Sign-up/confirmation and sign-in with a disposable account.
- Password recovery from cold and warm app states.
- Create/import a Snap, share image/text/URL, edit metadata, and restart.
- Tray, Library, Board, Shelf, Stack, favorite, archive, search, and source-link actions.
- Privacy and support links.
- Account deletion, backend record removal, current-device file cleanup, and signed-out state.
- Supabase Realtime recovery after disconnect/reconnect.
- Android vitals, Supabase errors/usage, and support inbox review.

Record tester, device, OS, app version/build, time, and PASS/FAIL for every check. Any release-affecting code or configuration change requires a new artifact and applicable retest.
