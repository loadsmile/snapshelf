import { useURL } from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { completeAuthRedirect, getAuthErrorMessage } from '@/features/auth/api';
import { PillButton } from '@/shared/components/PillButton';
import { Screen } from '@/shared/components/Screen';
import { SurfaceCard } from '@/shared/components/SurfaceCard';
import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

export default function AuthCallbackScreen() {
  const url = useURL();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      return;
    }

    let isActive = true;

    completeAuthRedirect(url)
      .then((result) => {
        if (!isActive) {
          return;
        }

        router.replace(result === 'recovery' ? '/reset-password' : '/board');
      })
      .catch((nextError) => {
        if (isActive) {
          setError(getAuthErrorMessage(nextError));
        }
      });

    return () => {
      isActive = false;
    };
  }, [router, url]);

  return (
    <Screen contentContainerStyle={{ flex: 1, justifyContent: 'center' }}>
      <SurfaceCard style={{ padding: theme.spacing.lg }}>
        <View>
          <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.sm }]}>{error ? 'Link Problem' : 'Confirming Your Email'}</Text>
          <Text style={[textStyles.bodyMd, { marginBottom: error ? theme.spacing.md : 0 }]}>{error ?? 'One moment while SnapShelf verifies your link.'}</Text>
          {error ? <PillButton label="Back to Sign In" onPress={() => router.replace('/sign-in')} fullWidth /> : null}
        </View>
      </SurfaceCard>
    </Screen>
  );
}
