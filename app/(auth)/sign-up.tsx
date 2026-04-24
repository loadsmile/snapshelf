import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { getAuthErrorMessage } from '@/features/auth/api';
import { useAuth } from '@/features/auth/useAuth';
import { FormField } from '@/shared/components/FormField';
import { PillButton } from '@/shared/components/PillButton';
import { Screen } from '@/shared/components/Screen';
import { SurfaceCard } from '@/shared/components/SurfaceCard';
import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

export default function SignUpScreen() {
  const router = useRouter();
  const { configError, isConfigured, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignUp() {
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Email, password, and confirmation are required.');
      return;
    }

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
      await signUp(email.trim(), password);
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
        <Text style={[textStyles.displaySm, { marginBottom: theme.spacing.xs }]}>Create Account</Text>
        <Text style={textStyles.bodyMd}>Start a synced SnapShelf that follows you across your devices.</Text>
      </View>

      {configError ? (
        <SurfaceCard style={{ marginBottom: theme.spacing.lg, padding: theme.spacing.lg }}>
          <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.sm }]}>Firebase Setup Needed</Text>
          <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.sm }]}>{configError}</Text>
          <Text style={textStyles.bodySm}>Add your Firebase keys locally, then restart Expo to enable sign-up.</Text>
        </SurfaceCard>
      ) : null}

      <SurfaceCard style={{ padding: theme.spacing.lg }}>
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
        <FormField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Choose a password"
          secureTextEntry
          textContentType="newPassword"
          autoComplete="new-password"
        />
        <FormField
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter your password"
          secureTextEntry
          textContentType="newPassword"
          autoComplete="new-password"
        />

        {error ? <Text style={[textStyles.bodySm, { color: theme.colors.primary, marginBottom: theme.spacing.md }]}>{error}</Text> : null}

        <PillButton
          label={isSubmitting ? 'Creating Account...' : 'Create Account'}
          onPress={handleSignUp}
          disabled={isSubmitting || !isConfigured}
          fullWidth
        />

        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: theme.spacing.lg }}>
          <Text style={textStyles.bodySm}>Already have an account? </Text>
          <Pressable onPress={() => router.replace('/sign-in')}>
            <Text style={[textStyles.bodySm, { color: theme.colors.primary }]}>Sign in</Text>
          </Pressable>
        </View>
      </SurfaceCard>
    </Screen>
  );
}
