import { Feather, Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { getAuthErrorMessage } from '@/features/auth/api';
import { useAuth } from '@/features/auth/useAuth';
import { seedSampleData } from '@/features/sample-data/api';
import { listAllSnaps } from '@/features/snaps/api';
import { listShelves } from '@/features/shelves/api';
import { AppHeader } from '@/shared/components/AppHeader';
import { FormField } from '@/shared/components/FormField';
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

const DELETE_CONFIRMATION_TEXT = 'DELETE';

export default function SettingsScreen() {
  const {
    configError,
    deleteAccount,
    isConfigured,
    profile,
    sendPasswordReset,
    signOut,
    status,
    updateDisplayName,
    user,
  } = useAuth();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSendingPasswordReset, setIsSendingPasswordReset] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [shelfCount, setShelfCount] = useState<number | null>(null);
  const [snapCount, setSnapCount] = useState<number | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordResetMessage, setPasswordResetMessage] = useState<string | null>(null);
  const [passwordResetError, setPasswordResetError] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const accountEmail = profile?.email ?? user?.email ?? null;
  const accountDisplayName = profile?.displayName ?? user?.displayName ?? null;

  useEffect(() => {
    setDisplayNameInput(accountDisplayName ?? '');
  }, [accountDisplayName]);

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

  async function handleSaveProfile() {
    try {
      setIsSavingProfile(true);
      setProfileMessage(null);
      setProfileError(null);
      await updateDisplayName(displayNameInput);
      setProfileMessage(displayNameInput.trim() ? 'Display name updated.' : 'Display name cleared.');
    } catch (error) {
      setProfileError(getAuthErrorMessage(error));
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleSendPasswordReset() {
    try {
      setIsSendingPasswordReset(true);
      setPasswordResetMessage(null);
      setPasswordResetError(null);
      await sendPasswordReset();
      setPasswordResetMessage(`Password reset instructions were sent to ${accountEmail ?? 'your email address'}.`);
    } catch (error) {
      setPasswordResetError(getAuthErrorMessage(error));
    } finally {
      setIsSendingPasswordReset(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmation.trim().toUpperCase() !== DELETE_CONFIRMATION_TEXT) {
      setDeleteError(`Type ${DELETE_CONFIRMATION_TEXT} to confirm account deletion.`);
      return;
    }

    try {
      setIsDeletingAccount(true);
      setDeleteError(null);
      await deleteAccount(deletePassword);
    } catch (error) {
      setDeleteError(getAuthErrorMessage(error));
    } finally {
      setIsDeletingAccount(false);
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
        <Text style={textStyles.bodyMd}>Account controls, sync verification, and the first pass of user preferences now live here.</Text>
      </View>

      <SurfaceCard style={{ marginBottom: theme.spacing.lg, padding: theme.spacing.lg }}>
        <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.sm }]}>{isConfigured ? 'Account' : 'Firebase Setup'}</Text>
        <Text style={[textStyles.titleLg, { marginBottom: theme.spacing.sm }]}>{isConfigured ? 'Sync is ready for real user data' : 'Auth foundation is installed'}</Text>
        <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}> 
          {isConfigured
            ? `Signed in as ${accountEmail ?? 'your SnapShelf account'}.`
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
            <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.xs }]}>{accountDisplayName || 'No display name yet'}</Text>
            <Text style={[textStyles.bodySm, { marginBottom: theme.spacing.xs }]}>{accountEmail ?? 'No email available'}</Text>
            <Text style={textStyles.bodySm}>UID: {user?.id ?? 'Unavailable'}</Text>
          </SurfaceCard>

          <SurfaceCard style={{ marginBottom: theme.spacing.md, padding: theme.spacing.lg }}>
            <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.sm }]}>Profile</Text>
            <Text style={[textStyles.titleMd, { marginBottom: theme.spacing.sm }]}>Edit display name</Text>
            <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>Choose the name SnapShelf shows for your account without touching your sign-in email.</Text>

            <FormField
              label="Display Name"
              value={displayNameInput}
              onChangeText={setDisplayNameInput}
              placeholder="Mariana"
              autoCapitalize="words"
              autoCorrect={false}
              error={profileError}
            />

            {profileMessage ? <Text style={[textStyles.bodySm, { marginBottom: theme.spacing.md }]}>{profileMessage}</Text> : null}

            <PillButton
              label={isSavingProfile ? 'Saving Profile...' : 'Save Display Name'}
              icon="user"
              onPress={handleSaveProfile}
              disabled={isSavingProfile}
              fullWidth
            />
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

          <SurfaceCard style={{ marginBottom: theme.spacing.md, padding: theme.spacing.lg }}>
            <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.sm }]}>Security</Text>
            <Text style={[textStyles.titleMd, { marginBottom: theme.spacing.sm }]}>Password reset</Text>
            <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>Send a reset link to {accountEmail ?? 'your current email'} if you want to rotate your password outside the app.</Text>

            <PillButton
              label={isSendingPasswordReset ? 'Sending Reset Link...' : 'Email Password Reset Link'}
              icon="mail"
              onPress={handleSendPasswordReset}
              disabled={isSendingPasswordReset || !accountEmail}
              fullWidth
            />

            {passwordResetMessage ? <Text style={[textStyles.bodySm, { marginTop: theme.spacing.sm }]}>{passwordResetMessage}</Text> : null}
            {passwordResetError ? <Text style={[textStyles.bodySm, { color: theme.colors.primary, marginTop: theme.spacing.sm }]}>{passwordResetError}</Text> : null}

            <View style={{ height: 1, backgroundColor: theme.colors.borderSoft, marginVertical: theme.spacing.lg }} />

            <Text style={[textStyles.titleMd, { marginBottom: theme.spacing.sm }]}>Delete account</Text>
            <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.sm }]}>This removes your user profile, shelves, snaps, threads, and local snap images from this device.</Text>
            <Text style={[textStyles.bodySm, { color: theme.colors.primary, marginBottom: theme.spacing.lg }]}>To protect against mistakes, type DELETE and then enter your current password.</Text>

            <FormField
              label="Type DELETE to Confirm"
              value={deleteConfirmation}
              onChangeText={setDeleteConfirmation}
              placeholder={DELETE_CONFIRMATION_TEXT}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <FormField
              label="Current Password"
              value={deletePassword}
              onChangeText={setDeletePassword}
              placeholder="Enter your password"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              error={deleteError}
            />

            <PillButton
              label={isDeletingAccount ? 'Deleting Account...' : 'Delete Account'}
              icon="trash-2"
              variant="secondary"
              onPress={handleDeleteAccount}
              disabled={isDeletingAccount}
              fullWidth
            />
          </SurfaceCard>

          {__DEV__ ? (
            <SurfaceCard style={{ marginBottom: theme.spacing.md, padding: theme.spacing.lg }}>
              <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.sm }]}>Dev Tools</Text>
              <Text style={[textStyles.titleMd, { marginBottom: theme.spacing.sm }]}>Seed Sample Data</Text>
              <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>Add a few sample Shelves and Snaps so the live Drop, Board, and Shelf View are easy to test before Quick Snap exists.</Text>
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
