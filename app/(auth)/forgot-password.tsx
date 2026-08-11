import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { getAuthErrorMessage, requestPasswordReset } from '@/features/auth/api';
import { useAuth } from '@/features/auth/useAuth';
import { FormField } from '@/shared/components/FormField';
import { PillButton } from '@/shared/components/PillButton';
import { Screen } from '@/shared/components/Screen';
import { SurfaceCard } from '@/shared/components/SurfaceCard';
import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { isConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleResetRequest() {
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await requestPasswordReset(email.trim());
      setSent(true);
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
        <Text style={[textStyles.displaySm, { marginBottom: theme.spacing.xs }]}>Reset Password</Text>
        <Text style={textStyles.bodyMd}>We will email you a secure link to choose a new password.</Text>
      </View>

      <SurfaceCard style={{ padding: theme.spacing.lg }}>
        {sent ? (
          <>
            <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.sm }]}>Check Your Email</Text>
            <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.md }]}>If an account exists for {email.trim()}, a reset link is on its way. Open it on this device.</Text>
            <PillButton label="Back to Sign In" onPress={() => router.replace('/sign-in')} fullWidth />
          </>
        ) : (
          <>
            <FormField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
            />
            {error ? <Text style={[textStyles.bodySm, { color: theme.colors.primary, marginBottom: theme.spacing.md }]}>{error}</Text> : null}
            <PillButton
              label={isSubmitting ? 'Sending...' : 'Send Reset Link'}
              onPress={handleResetRequest}
              disabled={isSubmitting || !isConfigured}
              fullWidth
            />
            <Pressable onPress={() => router.replace('/sign-in')} style={{ alignSelf: 'center', marginTop: theme.spacing.lg }}>
              <Text style={[textStyles.bodySm, { color: theme.colors.primary }]}>Back to sign in</Text>
            </Pressable>
          </>
        )}
      </SurfaceCard>
    </Screen>
  );
}
