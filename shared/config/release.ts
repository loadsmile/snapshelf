const PLACEHOLDER_HOST = 'example.invalid';

export const releaseContact = {
  privacyPolicyUrl: process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? `https://${PLACEHOLDER_HOST}/snapshelf/privacy`,
  supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? `support@${PLACEHOLDER_HOST}`,
  supportUrl: process.env.EXPO_PUBLIC_SUPPORT_URL ?? `https://${PLACEHOLDER_HOST}/snapshelf/support`,
};

export const isReleaseContactConfigured = !Object.values(releaseContact).some((value) => value.includes(PLACEHOLDER_HOST));
