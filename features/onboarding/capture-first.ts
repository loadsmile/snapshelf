export function getCaptureFirstOnboardingStorageKey(userId: string) {
  return `capture-first-onboarding-completed:v1:${userId}`;
}

export function shouldShowCaptureFirstOnboarding(input: {
  hasCompleted: boolean;
  hasLoadedAccountData: boolean;
  hasLoadedPreference: boolean;
  isCaptureVisible: boolean;
  isConfigured: boolean;
  snapCount: number;
  userId: string | null | undefined;
}) {
  return Boolean(
    input.isConfigured &&
      input.userId &&
      input.hasLoadedPreference &&
      input.hasLoadedAccountData &&
      !input.hasCompleted &&
      input.snapCount === 0 &&
      !input.isCaptureVisible,
  );
}
