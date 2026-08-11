import { useURL } from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { completeAuthRedirect, getAuthErrorMessage, updatePassword } from '@/features/auth/api';
import { FormField } from '@/shared/components/FormField';
import { PillButton } from '@/shared/components/PillButton';
import { Screen } from '@/shared/components/Screen';
import { SurfaceCard } from '@/shared/components/SurfaceCard';
import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

export default function ResetPasswordScreen() {
  const url = useURL();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLinkReady, setIsLinkReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      return;
    }

    let isActive = true;

    completeAuthRedirect(url, 'recovery')
      .then((result) => {
        if (!isActive) {
          return;
        }

        if (result !== 'recovery') {
          throw new Error('This link cannot be used to reset a password.');
        }

        setIsLinkReady(true);
      })
      .catch((nextError) => {
        if (isActive) {
          setError(getAuthErrorMessage(nextError));
        }
      });

    return () => {
      isActive = false;
    };
  }, [url]);

  async function handleUpdatePassword() {
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await updatePassword(password);
      router.replace('/board');
    } catch (nextError) {
      setError(getAuthErrorMessage(nextError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen scrollable contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingBottom: 72 }}>
      <View style={{ marginBottom: theme.spacing.xl }}>
        <Text style={[textStyles.brand, { marginBottom: theme.spacing.lg }]}>SnapShelf</Text>
        <Text style={[textStyles.displaySm, { marginBottom: theme.spacing.xs }]}>Choose a New Password</Text>
        <Text style={textStyles.bodyMd}>Use at least six characters and keep it somewhere safe.</Text>
      </View>

      <SurfaceCard style={{ padding: theme.spacing.lg }}>
        {!isLinkReady && !error ? <Text style={textStyles.bodyMd}>Verifying your reset link...</Text> : null}
        {isLinkReady ? (
          <>
            <FormField
              label="New Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Choose a new password"
              secureTextEntry
              textContentType="newPassword"
              autoComplete="new-password"
            />
            <FormField
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter your new password"
              secureTextEntry
              textContentType="newPassword"
              autoComplete="new-password"
            />
          </>
        ) : null}
        {error ? <Text style={[textStyles.bodySm, { color: theme.colors.primary, marginBottom: theme.spacing.md }]}>{error}</Text> : null}
        {isLinkReady ? (
          <PillButton
            label={isSubmitting ? 'Updating...' : 'Update Password'}
            onPress={handleUpdatePassword}
            disabled={isSubmitting}
            fullWidth
          />
        ) : null}
        {error && !isLinkReady ? <PillButton label="Request Another Link" onPress={() => router.replace('/forgot-password')} fullWidth /> : null}
      </SurfaceCard>
    </Screen>
  );
}
