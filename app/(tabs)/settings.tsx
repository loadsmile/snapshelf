import { Feather, Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { seedSampleData } from '@/features/sample-data/api';
import { useAuth } from '@/features/auth/useAuth';
import { listAllSnaps } from '@/features/snaps/api';
import { listShelves } from '@/features/shelves/api';
import { AppHeader } from '@/shared/components/AppHeader';
import { PillButton } from '@/shared/components/PillButton';
import { Screen } from '@/shared/components/Screen';
import { SurfaceCard } from '@/shared/components/SurfaceCard';
import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

const firebaseSetupSteps = [
  {
    icon: <Ionicons name="key-outline" size={18} color={theme.colors.primary} />,
    title: 'Firebase Config',
    description: 'Add your EXPO_PUBLIC_FIREBASE_* keys to a local .env file so the app can initialize Firebase.',
  },
  {
    icon: <Feather name="shield" size={18} color={theme.colors.primary} />,
    title: 'Email Auth',
    description: 'Enable Email/Password sign-in in the Firebase console to unlock the auth routes.',
  },
  {
    icon: <Feather name="database" size={18} color={theme.colors.primary} />,
    title: 'Firestore',
    description: 'Create the database so Shelves, notes, and on-device image references can sync across devices.',
  },
];

export default function SettingsScreen() {
  const { configError, isConfigured, profile, signOut, status, user } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [shelfCount, setShelfCount] = useState<number | null>(null);
  const [snapCount, setSnapCount] = useState<number | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  const loadAccountSummary = useCallback(async () => {
    if (!isConfigured || !user?.id) {
      setShelfCount(null);
      setSnapCount(null);
      return;
    }

    try {
      const [shelves, snaps] = await Promise.all([listShelves(user.id), listAllSnaps(user.id)]);
      setShelfCount(shelves.length);
      setSnapCount(snaps.length);
      setDataError(null);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Unable to load account data yet.');
    }
  }, [isConfigured, user?.id]);

  useEffect(() => {
    loadAccountSummary();
  }, [loadAccountSummary]);

  async function handleSignOut() {
    try {
      setIsSigningOut(true);
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  }

  async function handleSeedSampleData() {
    if (!user?.id) {
      return;
    }

    try {
      setIsSeeding(true);
      const result = await seedSampleData(user.id);
      setSeedMessage(result.message);
      await loadAccountSummary();
    } catch (error) {
      setSeedMessage(error instanceof Error ? error.message : 'Unable to seed sample data right now.');
    } finally {
      setIsSeeding(false);
    }
  }

  const verificationMessage = dataError
    ? dataError
    : shelfCount === null || snapCount === null
      ? 'Loading verification data from Firestore...'
      : `This account currently has ${shelfCount} shelf${shelfCount === 1 ? '' : 'es'} and ${snapCount} snap${snapCount === 1 ? '' : 's'} in Firestore.`;

  return (
    <Screen scrollable contentContainerStyle={{ paddingBottom: 150 }}>
      <AppHeader />

      <View style={{ marginBottom: theme.spacing.xl }}>
        <Text style={[textStyles.displaySm, { marginBottom: theme.spacing.xs }]}>Settings</Text>
        <Text style={textStyles.bodyMd}>
          A quiet place for account setup, sync controls, and later app-level preferences.
        </Text>
      </View>

      <SurfaceCard style={{ marginBottom: theme.spacing.lg, padding: theme.spacing.lg }}>
        <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.sm }]}>{isConfigured ? 'Account' : 'Firebase Setup'}</Text>
        <Text style={[textStyles.titleLg, { marginBottom: theme.spacing.sm }]}>{isConfigured ? 'Sync is ready for real user data' : 'Auth foundation is installed'}</Text>
        <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>
          {isConfigured
            ? `Signed in as ${profile?.email ?? user?.email ?? 'your SnapShelf account'}.`
            : 'Finish the Firebase setup and SnapShelf will switch from local shell mode into real authentication and sync.'}
        </Text>

        {isConfigured && status === 'signedIn' ? (
          <PillButton
            label={isSigningOut ? 'Signing Out...' : 'Sign Out'}
            icon="log-out"
            onPress={handleSignOut}
            disabled={isSigningOut}
            fullWidth
          />
        ) : null}

        {!isConfigured && configError ? <Text style={textStyles.bodySm}>{configError}</Text> : null}
      </SurfaceCard>

      {isConfigured ? (
        <>
          <SurfaceCard style={{ marginBottom: theme.spacing.md, padding: theme.spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: theme.colors.surfaceSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Feather name="mail" size={18} color={theme.colors.primary} />
              </View>
              <Text style={textStyles.titleMd}>Signed-in account</Text>
            </View>
            <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.xs }]}>{profile?.email ?? user?.email ?? 'No email available'}</Text>
            <Text style={textStyles.bodySm}>UID: {user?.id ?? 'Unavailable'}</Text>
          </SurfaceCard>

          <SurfaceCard style={{ marginBottom: theme.spacing.md, padding: theme.spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: theme.colors.surfaceSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {shelfCount === null || snapCount === null ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <Feather name="check-circle" size={18} color={theme.colors.primary} />
                )}
              </View>
              <Text style={textStyles.titleMd}>Verification</Text>
            </View>
            <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.sm }]}>{verificationMessage}</Text>
            {shelfCount !== null && snapCount !== null ? (
              <Text style={textStyles.bodySm}>Default shelf bootstrap is considered healthy once shelf count is at least 1.</Text>
            ) : null}
          </SurfaceCard>

          {__DEV__ ? (
            <SurfaceCard style={{ marginBottom: theme.spacing.md, padding: theme.spacing.lg }}>
              <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.sm }]}>Dev Tools</Text>
              <Text style={[textStyles.titleMd, { marginBottom: theme.spacing.sm }]}>Seed Sample Data</Text>
              <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>
                Add a few sample Shelves and Snaps so the live Drop, Board, and Shelf View are easy to test before Quick Snap exists.
              </Text>
              <PillButton
                label={isSeeding ? 'Seeding...' : 'Seed Sample Data'}
                icon="database"
                onPress={handleSeedSampleData}
                disabled={isSeeding || !user?.id}
                fullWidth
              />
              {seedMessage ? <Text style={[textStyles.bodySm, { marginTop: theme.spacing.sm }]}>{seedMessage}</Text> : null}
            </SurfaceCard>
          ) : null}
        </>
      ) : (
        firebaseSetupSteps.map((section) => (
          <SurfaceCard key={section.title} style={{ marginBottom: theme.spacing.md, padding: theme.spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: theme.colors.surfaceSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {section.icon}
              </View>
              <Text style={textStyles.titleMd}>{section.title}</Text>
            </View>
            <Text style={textStyles.bodyMd}>{section.description}</Text>
          </SurfaceCard>
        ))
      )}

      <SurfaceCard style={{ marginBottom: theme.spacing.md, padding: theme.spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: theme.colors.surfaceSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Feather name="sun" size={18} color={theme.colors.primary} />
          </View>
          <Text style={textStyles.titleMd}>Appearance</Text>
        </View>
        <Text style={textStyles.bodyMd}>The Sun-Drenched Library palette remains the shared visual system for the auth and content flows.</Text>
      </SurfaceCard>
    </Screen>
  );
}
