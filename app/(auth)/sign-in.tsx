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

export default function SignInScreen() {
  const router = useRouter();
  const { configError, isConfigured, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await signIn(email.trim(), password);
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
        <Text style={[textStyles.displaySm, { marginBottom: theme.spacing.xs }]}>Sign In</Text>
        <Text style={textStyles.bodyMd}>Pick up your Board, Drop, and Shelves from any device.</Text>
      </View>

      {configError ? (
        <SurfaceCard style={{ marginBottom: theme.spacing.lg, padding: theme.spacing.lg }}>
          <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.sm }]}>Firebase Setup Needed</Text>
          <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.sm }]}>{configError}</Text>
          <Text style={textStyles.bodySm}>Add your Firebase keys locally, then restart Expo to enable sign-in.</Text>
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
          placeholder="Enter your password"
          secureTextEntry
          textContentType="password"
          autoComplete="password"
        />

        {error ? <Text style={[textStyles.bodySm, { color: theme.colors.primary, marginBottom: theme.spacing.md }]}>{error}</Text> : null}

        <PillButton
          label={isSubmitting ? 'Signing In...' : 'Sign In'}
          onPress={handleSignIn}
          disabled={isSubmitting || !isConfigured}
          fullWidth
        />

        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: theme.spacing.lg }}>
          <Text style={textStyles.bodySm}>Need an account? </Text>
          <Pressable onPress={() => router.push('/sign-up')}>
            <Text style={[textStyles.bodySm, { color: theme.colors.primary }]}>Create one</Text>
          </Pressable>
        </View>
      </SurfaceCard>
    </Screen>
  );
}
