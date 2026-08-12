import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Switch, Text, View } from 'react-native';

import { getAuthErrorMessage } from '@/features/auth/api';
import { useAuth } from '@/features/auth/useAuth';
import { getLocalMediaHealthMessage, summarizeLocalMediaHealth, type LocalMediaHealthSummary } from '@/features/images/health';
import { getLocalImageAvailability } from '@/features/images/local';
import { seedSampleData } from '@/features/sample-data/api';
import { listAllSnaps } from '@/features/snaps/api';
import { AppHeader } from '@/shared/components/AppHeader';
import { FormField } from '@/shared/components/FormField';
import { OnboardingWelcomeModal } from '@/shared/components/OnboardingWelcomeModal';
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
  const router = useRouter();
  const { mode, setMode } = useThemeMode();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isTutorialVisible, setIsTutorialVisible] = useState(false);
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
      const availabilityEntries: Array<readonly [string, Awaited<ReturnType<typeof getLocalImageAvailability>>]> = [];
      for (let index = 0; index < localPaths.length; index += 20) {
        availabilityEntries.push(...await Promise.all(
          localPaths.slice(index, index + 20).map(async (localPath) => [localPath, await getLocalImageAvailability(localPath)] as const),
        ));
      }
      const summary = summarizeLocalMediaHealth(snaps, new Map(availabilityEntries));

      setMediaHealth(summary);
      setMediaHealthMessage(getLocalMediaHealthMessage(summary));
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

  function handleTutorialOpenBoard() {
    setIsTutorialVisible(false);
    router.push('/board');
  }

  function handleTutorialOpenTray() {
    setIsTutorialVisible(false);
    router.push('/tray');
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
            <Text style={[textStyles.titleMd, { marginBottom: theme.spacing.xs }]}>Dark Mode</Text>
            <Text style={textStyles.bodyMd}>Use the warm dark palette across SnapShelf.</Text>
          </View>
          <Switch
            value={mode === 'dark'}
            onValueChange={(enabled) => setMode(enabled ? 'dark' : 'light')}
            testID="settings-theme-toggle"
            trackColor={{ false: theme.colors.surfaceSoft, true: theme.colors.primaryDeep }}
            thumbColor={mode === 'dark' ? theme.colors.primary : theme.colors.surface}
            ios_backgroundColor={theme.colors.surfaceSoft}
          />
        </View>
      </SurfaceCard>

      <SurfaceCard style={{ marginBottom: theme.spacing.lg, padding: theme.spacing.lg }}>
        <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.sm }]}>Guided Tour</Text>
        <Text style={[textStyles.titleMd, { marginBottom: theme.spacing.sm }]}>Revisit the tutorial</Text>
        <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>Walk through The Tray, Shelves, Board, and Library again whenever you need a refresher.</Text>
        <PillButton
          label="Revisit Tutorial"
          icon="compass"
          variant="secondary"
          onPress={() => setIsTutorialVisible(true)}
          testID="settings-revisit-tutorial-button"
          fullWidth
        />
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
              maxLength={80}
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

          <SurfaceCard style={{ marginBottom: theme.spacing.md, padding: theme.spacing.lg }}>
            <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.sm }]}>On-Device Images</Text>
            <Text style={[textStyles.titleMd, { marginBottom: theme.spacing.sm }]}>Local media health</Text>
            <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.sm }]}>Titles, notes, labels, and Shelf assignments sync with your account. Images stay only on the device where you added them and cannot be restored after uninstalling SnapShelf.</Text>
            <Text style={[textStyles.bodySm, { marginBottom: theme.spacing.lg }]}>If an image is missing, open its Snap to replace the image, remove the old reference, or open the original source link when available.</Text>
            <PillButton
              label={isCheckingMedia ? 'Checking Media...' : 'Check Local Media'}
              icon="hard-drive"
              onPress={handleCheckLocalMedia}
              disabled={isCheckingMedia || !user?.id}
              testID="settings-check-local-media-button"
              fullWidth
            />
            {mediaHealth ? (
              <Text style={[textStyles.bodySm, { marginTop: theme.spacing.sm }]}>Snaps: {mediaHealth.totalSnaps} | Local paths: {mediaHealth.withLocalPath} | Available: {mediaHealth.available} | Missing: {mediaHealth.missing} | No local media: {mediaHealth.withoutLocalMedia}</Text>
            ) : null}
            {mediaHealthMessage ? <Text accessibilityLiveRegion="polite" style={[textStyles.bodySm, { color: mediaHealth?.missing || mediaHealth?.unavailable ? theme.colors.primary : theme.colors.textMuted, marginTop: theme.spacing.sm }]}>{mediaHealthMessage}</Text> : null}
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
                testID="settings-seed-sample-data-button"
                fullWidth
              />
              {seedMessage ? <Text style={[textStyles.bodySm, { marginTop: theme.spacing.sm }]}>{seedMessage}</Text> : null}
            </SurfaceCard>
          ) : null}
        </>
      ) : (
        <SurfaceCard style={{ marginBottom: theme.spacing.md, padding: theme.spacing.lg }}>
          <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.sm }]}>Developer Setup</Text>
          <Text style={[textStyles.titleLg, { marginBottom: theme.spacing.sm }]}>Supabase is not configured</Text>
          <Text style={[textStyles.bodyMd, { marginBottom: configError ? theme.spacing.sm : 0 }]}>Add the required EXPO_PUBLIC_SUPABASE_* values to your local .env file, then restart Expo.</Text>
          {configError ? <Text style={[textStyles.bodySm, { color: theme.colors.primary }]}>{configError}</Text> : null}
        </SurfaceCard>
      )}

      <OnboardingWelcomeModal
        visible={isTutorialVisible}
        onDismiss={() => setIsTutorialVisible(false)}
        onCreateFirstShelf={handleTutorialOpenBoard}
        onOpenTray={handleTutorialOpenTray}
        finalPrimaryLabel="Open Board"
        finalPrimaryIcon="map"
      />
    </Screen>
  );
}
