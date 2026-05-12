import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Switch, Text, View } from 'react-native';

import { getAuthErrorMessage } from '@/features/auth/api';
import { useAuth } from '@/features/auth/useAuth';
import { summarizeLocalMediaHealth, type LocalMediaHealthSummary } from '@/features/images/health';
import { getLocalImageAvailability } from '@/features/images/local';
import { seedSampleData } from '@/features/sample-data/api';
import { listAllSnaps } from '@/features/snaps/api';
import { AppHeader } from '@/shared/components/AppHeader';
import { FormField } from '@/shared/components/FormField';
import { PillButton } from '@/shared/components/PillButton';
import { Screen } from '@/shared/components/Screen';
import { SurfaceCard } from '@/shared/components/SurfaceCard';
import { theme, useThemeMode } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

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
  const { mode, setMode } = useThemeMode();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isCheckingMedia, setIsCheckingMedia] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSendingPasswordReset, setIsSendingPasswordReset] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordResetMessage, setPasswordResetMessage] = useState<string | null>(null);
  const [passwordResetError, setPasswordResetError] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [mediaHealth, setMediaHealth] = useState<LocalMediaHealthSummary | null>(null);
  const [mediaHealthMessage, setMediaHealthMessage] = useState<string | null>(null);

  const accountEmail = profile?.email ?? user?.email ?? null;
  const accountDisplayName = profile?.displayName ?? user?.displayName ?? null;

  useEffect(() => {
    setDisplayNameInput(accountDisplayName ?? '');
  }, [accountDisplayName]);

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
    } catch (error) {
      setSeedMessage(error instanceof Error ? error.message : 'Unable to seed sample data right now.');
    } finally {
      setIsSeeding(false);
    }
  }

  async function handleCheckLocalMedia() {
    if (!user?.id) {
      return;
    }

    try {
      setIsCheckingMedia(true);
      setMediaHealth(null);
      setMediaHealthMessage(null);

      const snaps = await listAllSnaps(user.id);
      const localPaths = [...new Set(snaps.map((snap) => snap.localPath).filter((localPath): localPath is string => Boolean(localPath)))];
      const availabilityEntries = await Promise.all(localPaths.map(async (localPath) => [localPath, await getLocalImageAvailability(localPath)] as const));
      const summary = summarizeLocalMediaHealth(snaps, new Map(availabilityEntries));

      setMediaHealth(summary);
      if (summary.unavailable > 0) {
        setMediaHealthMessage('Local file storage is unavailable on this device right now. Snap metadata is still safe in Firestore.');
      } else if (summary.missing > 0) {
        setMediaHealthMessage('Some Snap images are missing from this device. Their titles, notes, labels, and Shelf assignments are still available.');
      } else {
        setMediaHealthMessage('Local media looks healthy on this device.');
      }
    } catch (error) {
      setMediaHealthMessage(error instanceof Error ? error.message : 'Unable to check local media right now.');
    } finally {
      setIsCheckingMedia(false);
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

  return (
    <Screen scrollable contentContainerStyle={{ paddingBottom: 150 }}>
      <AppHeader />

      <View style={{ marginBottom: theme.spacing.xl }}>
        <Text style={[textStyles.displaySm, { marginBottom: theme.spacing.xs }]}>Settings</Text>
        <Text style={textStyles.bodyMd}>Manage your account and SnapShelf data.</Text>
      </View>

      <SurfaceCard style={{ marginBottom: theme.spacing.lg, padding: theme.spacing.lg }}>
        <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.sm }]}>Appearance</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text style={[textStyles.titleMd, { marginBottom: theme.spacing.xs }]}>Midnight Archive</Text>
            <Text style={textStyles.bodyMd}>Use the warm dark palette across SnapShelf.</Text>
          </View>
          <Switch
            value={mode === 'dark'}
            onValueChange={(enabled) => setMode(enabled ? 'dark' : 'light')}
            trackColor={{ false: theme.colors.surfaceSoft, true: theme.colors.primaryDeep }}
            thumbColor={mode === 'dark' ? theme.colors.primary : theme.colors.surface}
            ios_backgroundColor={theme.colors.surfaceSoft}
          />
        </View>
      </SurfaceCard>

      {isConfigured ? (
        <>
          <SurfaceCard style={{ marginBottom: theme.spacing.lg, padding: theme.spacing.lg }}>
            <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.sm }]}>Account</Text>
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
              <Text style={textStyles.titleMd}>{accountDisplayName || 'SnapShelf account'}</Text>
            </View>
            <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>{accountEmail ?? 'No email available'}</Text>

            {status === 'signedIn' ? (
              <PillButton
                label={isSigningOut ? 'Signing Out...' : 'Sign Out'}
                icon="log-out"
                onPress={handleSignOut}
                disabled={isSigningOut}
                fullWidth
              />
            ) : null}
          </SurfaceCard>

          <SurfaceCard style={{ marginBottom: theme.spacing.md, padding: theme.spacing.lg }}>
            <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.sm }]}>Profile</Text>
            <Text style={[textStyles.titleMd, { marginBottom: theme.spacing.sm }]}>Edit display name</Text>
            <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>Choose the name shown on your account.</Text>

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
            <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.sm }]}>Security</Text>
            <Text style={[textStyles.titleMd, { marginBottom: theme.spacing.sm }]}>Password reset</Text>
            <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>Send a reset link to {accountEmail ?? 'your current email'}.</Text>

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
            <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.sm }]}>This removes your profile, shelves, snaps, threads, and local snap images from this device.</Text>
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
              <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>Add sample Shelves and Snaps for testing Library, The Tray, Board, and Shelf flows.</Text>
              <PillButton
                label={isSeeding ? 'Seeding...' : 'Seed Sample Data'}
                icon="database"
                onPress={handleSeedSampleData}
                disabled={isSeeding || !user?.id}
                fullWidth
              />
              {seedMessage ? <Text style={[textStyles.bodySm, { marginTop: theme.spacing.sm }]}>{seedMessage}</Text> : null}

              <View style={{ height: 1, backgroundColor: theme.colors.borderSoft, marginVertical: theme.spacing.lg }} />

              <Text style={[textStyles.titleMd, { marginBottom: theme.spacing.sm }]}>Local Media Health</Text>
              <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>Check whether Snap image files saved on this device still match Firestore metadata.</Text>
              <PillButton
                label={isCheckingMedia ? 'Checking Media...' : 'Check Local Media'}
                icon="hard-drive"
                onPress={handleCheckLocalMedia}
                disabled={isCheckingMedia || !user?.id}
                fullWidth
              />
              {mediaHealth ? (
                <Text style={[textStyles.bodySm, { marginTop: theme.spacing.sm }]}>Snaps: {mediaHealth.totalSnaps} | Local paths: {mediaHealth.withLocalPath} | Available: {mediaHealth.available} | Missing: {mediaHealth.missing} | No local media: {mediaHealth.withoutLocalMedia}</Text>
              ) : null}
              {mediaHealthMessage ? <Text style={[textStyles.bodySm, { color: mediaHealth?.missing || mediaHealth?.unavailable ? theme.colors.primary : theme.colors.textMuted, marginTop: theme.spacing.sm }]}>{mediaHealthMessage}</Text> : null}
            </SurfaceCard>
          ) : null}
        </>
      ) : (
        <SurfaceCard style={{ marginBottom: theme.spacing.md, padding: theme.spacing.lg }}>
          <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.sm }]}>Developer Setup</Text>
          <Text style={[textStyles.titleLg, { marginBottom: theme.spacing.sm }]}>Firebase is not configured</Text>
          <Text style={[textStyles.bodyMd, { marginBottom: configError ? theme.spacing.sm : 0 }]}>Add the required EXPO_PUBLIC_FIREBASE_* values to your local .env file, then restart Expo.</Text>
          {configError ? <Text style={[textStyles.bodySm, { color: theme.colors.primary }]}>{configError}</Text> : null}
        </SurfaceCard>
      )}
    </Screen>
  );
}
