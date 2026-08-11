import { describe, expect, it } from 'vitest';

import { shouldShowCaptureFirstOnboarding } from '@/features/onboarding/capture-first';

const eligibleState = {
  hasCompleted: false,
  hasLoadedAccountData: true,
  hasLoadedPreference: true,
  isCaptureVisible: false,
  isConfigured: true,
  snapCount: 0,
  userId: 'user-1',
};

describe('capture-first onboarding eligibility', () => {
  it('waits for account data before showing first-run capture', () => {
    expect(shouldShowCaptureFirstOnboarding({ ...eligibleState, hasLoadedAccountData: false })).toBe(false);
    expect(shouldShowCaptureFirstOnboarding(eligibleState)).toBe(true);
  });

  it('does not show when the account already has Snaps', () => {
    expect(shouldShowCaptureFirstOnboarding({ ...eligibleState, snapCount: 1 })).toBe(false);
  });

  it('stays hidden after capture or explicit skip completes onboarding', () => {
    expect(shouldShowCaptureFirstOnboarding({ ...eligibleState, hasCompleted: true })).toBe(false);
  });
});
