import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold, useFonts } from '@expo-google-fonts/manrope';
import { Stack, useRouter, useSegments } from 'expo-router';
import { getShareExtensionKey, ShareIntentModule, ShareIntentProvider } from 'expo-share-intent';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/features/auth/AuthProvider';
import { useAuth } from '@/features/auth/useAuth';
import { RetainedShareIntentProvider, useRetainedShareIntentContext } from '@/shared/providers/RetainedShareIntentProvider';
import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore duplicate calls during Fast Refresh.
});

export default function RootLayout() {
  const [loaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    CabinetGrotesk_800ExtraBold: require('../assets/fonts/CabinetGrotesk-ExtraBold.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync().catch(() => {
        // Ignore hide failures during app reloads.
      });
    }
  }, [loaded]);

  if (!loaded) {
    return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor={theme.colors.background} />
      <ShareIntentProvider
        options={{
          debug: __DEV__,
          resetOnBackground: false,
          onResetShareIntent: () => {
            routerRef.current?.replace('/board');
          },
        }}
      >
        <RetainedShareIntentProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </RetainedShareIntentProvider>
      </ShareIntentProvider>
    </SafeAreaProvider>
  );
}

const routerRef: { current: ReturnType<typeof useRouter> | null } = { current: null };

function RootNavigator() {
  const { isConfigured, status } = useAuth();
  const { hasShareIntent, isReady } = useRetainedShareIntentContext();
  const router = useRouter();
  const segments = useSegments();
  const inAuthGroup = segments[0] === '(auth)';
  const inShareRoute = segments[0] === 'share-intent';
  const [androidShareGateResolved, setAndroidShareGateResolved] = useState(Platform.OS !== 'android');
  const androidRetryTriggeredRef = useRef(false);
  const androidRetryTimeoutRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const hasPendingNativeShare = Platform.OS === 'android' && Boolean(ShareIntentModule?.hasShareIntent(getShareExtensionKey()));
  const shouldResolveAndroidShareLaunch = isConfigured && status === 'signedIn' && hasPendingNativeShare && !hasShareIntent;

  useEffect(() => {
    return () => {
      androidRetryTimeoutRef.current.forEach(clearTimeout);
      androidRetryTimeoutRef.current = [];
    };
  }, []);

  useEffect(() => {
    routerRef.current = router;
    return () => {
      routerRef.current = null;
    };
  }, [router]);

  useEffect(() => {
    if (!isConfigured || status === 'loading' || !isReady) {
      setAndroidShareGateResolved(Platform.OS !== 'android');
      return;
    }

    if (!shouldResolveAndroidShareLaunch) {
      androidRetryTriggeredRef.current = false;
      setAndroidShareGateResolved(true);
      return;
    }

    if (androidRetryTriggeredRef.current) {
      setAndroidShareGateResolved(true);
      return;
    }

    androidRetryTriggeredRef.current = true;
    setAndroidShareGateResolved(false);
    ShareIntentModule?.getShareIntent('');

    const firstTimeout = setTimeout(() => {
      ShareIntentModule?.getShareIntent('');
      const secondTimeout = setTimeout(() => {
        setAndroidShareGateResolved(true);
      }, 250);
      androidRetryTimeoutRef.current.push(secondTimeout);
    }, 250);
    androidRetryTimeoutRef.current.push(firstTimeout);
  }, [isConfigured, isReady, shouldResolveAndroidShareLaunch, status]);

  useEffect(() => {
    if (!isConfigured || status === 'loading' || !isReady || !androidShareGateResolved) {
      return;
    }

    if (status === 'signedOut' && !inAuthGroup) {
      router.replace('/sign-in');
      return;
    }

    if (status === 'signedIn' && hasShareIntent && !inShareRoute) {
      router.replace('/share-intent');
      return;
    }

    if (status === 'signedIn' && inAuthGroup) {
      router.replace('/board');
    }
  }, [androidShareGateResolved, hasShareIntent, inAuthGroup, inShareRoute, isConfigured, isReady, router, status]);

  const isRedirecting =
    isConfigured &&
    isReady &&
    androidShareGateResolved &&
    ((status === 'signedOut' && !inAuthGroup) ||
      (status === 'signedIn' && hasShareIntent && !inShareRoute) ||
      (status === 'signedIn' && inAuthGroup));

  if (status === 'loading' || !isReady || !androidShareGateResolved || isRedirecting) {
    return <LoadingShell message={!isReady || shouldResolveAndroidShareLaunch ? 'Receiving your Quick Snap...' : 'Setting up your Shelf...'} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="share-intent" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

function LoadingShell({ message }: { message: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: theme.spacing.xl,
      }}
    >
      <Text style={[textStyles.brand, { marginBottom: theme.spacing.sm }]}>SnapShelf</Text>
      <Text style={textStyles.bodyMd}>{message}</Text>
    </View>
  );
}
