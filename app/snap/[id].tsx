import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';

import { useAuth } from '@/features/auth/useAuth';
import {
  deleteSnap,
  getSnap,
  removeSnapLocalImageReference,
  replaceSnapLocalImage,
  setSnapArchived,
  setSnapFavorite,
  updateSnapDetails,
} from '@/features/snaps/api';
import type { Snap, UpdateSnapInput } from '@/features/snaps/types';
import { subscribeToShelves } from '@/features/shelves/api';
import type { Shelf } from '@/features/shelves/types';
import { PillButton } from '@/shared/components/PillButton';
import { Screen } from '@/shared/components/Screen';
import { SnapDetailModal } from '@/shared/components/SnapDetailModal';
import { SurfaceCard } from '@/shared/components/SurfaceCard';
import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

type BusyAction = 'edit' | 'favorite' | 'archive' | 'delete' | 'image';

export default function SnapDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[]; returnTo?: string | string[] }>();
  const snapId = Array.isArray(params.id) ? params.id[0] : params.id;
  const requestedReturnTo = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  const router = useRouter();
  const { user } = useAuth();
  const [snap, setSnap] = useState<Snap | null>(null);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<BusyAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  function closeSnap() {
    if (requestedReturnTo === '/board' || requestedReturnTo === '/tray' || requestedReturnTo?.startsWith('/shelf/')) {
      router.replace(requestedReturnTo as Href);
      return;
    }

    router.back();
  }

  useEffect(() => {
    let isActive = true;

    async function loadSnap() {
      if (!user?.id || !snapId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const nextSnap = await getSnap(user.id, snapId);

        if (isActive) {
          setSnap(nextSnap);
          setError(null);
        }
      } catch (nextError) {
        if (isActive) {
          setError(nextError instanceof Error ? nextError.message : 'Unable to load this Snap.');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadSnap();

    return () => {
      isActive = false;
    };
  }, [snapId, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setShelves([]);
      return;
    }

    return subscribeToShelves(user.id, setShelves, (nextError) => setError(nextError.message));
  }, [user?.id]);

  async function runMutation(action: BusyAction, operation: () => Promise<Snap | null>, rethrow = false) {
    try {
      setBusyAction(action);
      setError(null);
      const nextSnap = await operation();
      setSnap(nextSnap);
      return nextSnap;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to update this Snap right now.');
      if (rethrow) {
        throw nextError;
      }
      return null;
    } finally {
      setBusyAction(null);
    }
  }

  async function reloadSnap() {
    if (!user?.id || !snapId) {
      return null;
    }

    return getSnap(user.id, snapId);
  }

  async function handleSave(currentSnap: Snap, input: UpdateSnapInput) {
    if (!user?.id) {
      return;
    }

    await runMutation('edit', async () => {
      await updateSnapDetails(user.id, currentSnap.id, input);
      return reloadSnap();
    });
  }

  async function handleToggleFavorite(currentSnap: Snap) {
    if (!user?.id) {
      return;
    }

    await runMutation('favorite', async () => {
      await setSnapFavorite(user.id, currentSnap.id, !currentSnap.isFavorite);
      return reloadSnap();
    });
  }

  async function handleToggleArchived(currentSnap: Snap) {
    if (!user?.id) {
      return;
    }

    await runMutation('archive', async () => {
      await setSnapArchived(user.id, currentSnap.id, !currentSnap.isArchived);
      return reloadSnap();
    });
  }

  async function handleReplaceImage(currentSnap: Snap, sourceUri: string) {
    if (!user?.id) {
      return;
    }

    await runMutation('image', () => replaceSnapLocalImage(user.id, currentSnap, sourceUri), true);
  }

  async function handleRemoveImageReference(currentSnap: Snap) {
    if (!user?.id) {
      return;
    }

    await runMutation('image', () => removeSnapLocalImageReference(user.id, currentSnap), true);
  }

  function handleConfirmDelete(currentSnap: Snap) {
    Alert.alert('Delete Snap?', 'This will remove the Snap and its saved image from SnapShelf.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (!user?.id) {
            return;
          }

          void runMutation('delete', async () => {
            await deleteSnap(user.id, currentSnap.id, currentSnap.localPath, currentSnap.shelfId);
            closeSnap();
            return null;
          });
        },
      },
    ]);
  }

  return (
    <Screen style={{ justifyContent: 'center' }}>
      {isLoading ? (
        <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={textStyles.bodyMd}>Loading this Snap...</Text>
        </View>
      ) : null}

      {!isLoading && !snap ? (
        <SurfaceCard style={{ padding: theme.spacing.lg }}>
          <Text style={[textStyles.titleMd, { marginBottom: theme.spacing.xs }]}>Snap unavailable</Text>
          <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>{error ?? 'This Snap may have been deleted or is no longer available.'}</Text>
          <PillButton label="Go Back" icon="arrow-left" onPress={closeSnap} />
        </SurfaceCard>
      ) : null}

      <SnapDetailModal
        visible={snap !== null}
        snap={snap}
        shelves={shelves}
        isSaving={busyAction === 'edit'}
        isFavoriteLoading={busyAction === 'favorite'}
        isArchiveLoading={busyAction === 'archive'}
        isDeleteLoading={busyAction === 'delete'}
        isImageLoading={busyAction === 'image'}
        error={error}
        onClose={closeSnap}
        onSave={handleSave}
        onToggleFavorite={handleToggleFavorite}
        onToggleArchived={handleToggleArchived}
        onReplaceImage={handleReplaceImage}
        onRemoveImageReference={handleRemoveImageReference}
        onDelete={handleConfirmDelete}
      />
    </Screen>
  );
}
