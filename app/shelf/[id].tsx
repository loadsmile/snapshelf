import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { useAuth } from '@/features/auth/useAuth';
import { formatCapturedAt, getSnapHeadline, getSnapPalette, getSnapSourceLabel } from '@/features/snaps/presentation';
import { deleteSnap, moveSnapToShelf } from '@/features/snaps/api';
import type { Snap } from '@/features/snaps/types';
import { deleteShelf, getShelf, subscribeToShelves } from '@/features/shelves/api';
import type { Shelf } from '@/features/shelves/types';
import { setShelfAnchor, subscribeToThreads } from '@/features/threads/api';
import type { ShelfThread } from '@/features/threads/types';
import { ActionSheetModal } from '@/shared/components/ActionSheetModal';
import { CreateSnapModal } from '@/shared/components/CreateSnapModal';
import { EditThreadModal } from '@/shared/components/EditThreadModal';
import { EmptyState } from '@/shared/components/EmptyState';
import { PillButton } from '@/shared/components/PillButton';
import { Screen } from '@/shared/components/Screen';
import { SectionLabel } from '@/shared/components/SectionLabel';
import { SnapArtwork } from '@/shared/components/SnapArtwork';
import { SurfaceCard } from '@/shared/components/SurfaceCard';
import { usePaginatedSnaps } from '@/shared/hooks/usePaginatedSnaps';
import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

function SnapPreview({ colors, snap }: { colors: [string, string]; snap: Snap }) {
  return (
    <SnapArtwork
      snap={snap}
      fallbackColors={colors}
      style={{
        height: 220,
        borderRadius: theme.radii.lg,
        marginBottom: theme.spacing.md,
        padding: theme.spacing.lg,
        justifyContent: 'space-between',
      }}
    >
      <View
        style={{
          width: 68,
          height: 118,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.18)',
          backgroundColor: 'rgba(255,255,255,0.1)',
        }}
      />
      <View style={{ alignItems: 'flex-end' }}>
        <View
          style={{
            width: 112,
            height: 20,
            borderRadius: 999,
            backgroundColor: 'rgba(255,255,255,0.2)',
          }}
        />
      </View>
    </SnapArtwork>
  );
}

export default function ShelfViewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [shelf, setShelf] = useState<Shelf | null>(null);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [threads, setThreads] = useState<ShelfThread[]>([]);
  const [isLoadingShelf, setIsLoadingShelf] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateSnapVisible, setIsCreateSnapVisible] = useState(false);
  const [isEditThreadVisible, setIsEditThreadVisible] = useState(false);
  const [isSavingThread, setIsSavingThread] = useState(false);
  const [actionSnap, setActionSnap] = useState<Snap | null>(null);
  const [isShelfMenuVisible, setIsShelfMenuVisible] = useState(false);
  const [movingSnapId, setMovingSnapId] = useState<string | null>(null);
  const [deletingSnapId, setDeletingSnapId] = useState<string | null>(null);
  const [isDeletingShelf, setIsDeletingShelf] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const { error: snapsError, loadMore, loading: isLoadingSnaps, loadingMore, snaps } = usePaginatedSnaps(user?.id, id ?? null);

  useEffect(() => {
    let isActive = true;

    async function loadShelf() {
      if (!user?.id || !id) {
        setShelf(null);
        setIsLoadingShelf(false);
        return;
      }

      try {
        setIsLoadingShelf(true);
        const nextShelf = await getShelf(user.id, id);
        if (isActive) {
          setShelf(nextShelf);
          setError(null);
        }
      } catch (nextError) {
        if (isActive) {
          setError(nextError instanceof Error ? nextError.message : 'Unable to load this Shelf.');
        }
      } finally {
        if (isActive) {
          setIsLoadingShelf(false);
        }
      }
    }

    loadShelf();

    return () => {
      isActive = false;
    };
  }, [id, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setShelves([]);
      return;
    }

    const unsubscribe = subscribeToShelves(
      user.id,
      (nextShelves) => {
        setShelves(nextShelves);
      },
      (nextError) => {
        setError(nextError.message);
      },
    );

    return unsubscribe;
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setThreads([]);
      return;
    }

    const unsubscribe = subscribeToThreads(
      user.id,
      (nextThreads) => {
        setThreads(nextThreads);
      },
      (nextError) => {
        setError(nextError.message);
      },
    );

    return unsubscribe;
  }, [user?.id]);

  const title = useMemo(() => shelf?.name ?? 'Shelf View', [shelf?.name]);
  const currentThread = useMemo(() => threads.find((thread) => thread.toShelfId === id) ?? null, [id, threads]);
  const anchorShelf = useMemo(
    () => shelves.find((entry) => entry.id === currentThread?.fromShelfId) ?? null,
    [currentThread?.fromShelfId, shelves],
  );
  const activeError = error ?? snapsError;

  async function handleSaveThread(anchorShelfId: string | null) {
    if (!user?.id || !id) {
      return;
    }

    try {
      setIsSavingThread(true);
      setThreadError(null);
      await setShelfAnchor(user.id, id, anchorShelfId);
      setIsEditThreadVisible(false);
    } catch (nextError) {
      setThreadError(nextError instanceof Error ? nextError.message : 'Unable to update this thread right now.');
    } finally {
      setIsSavingThread(false);
    }
  }

  async function handleDeleteSnap(snap: Snap) {
    if (!user?.id) {
      return;
    }

    try {
      setDeletingSnapId(snap.id);
      setError(null);
      await deleteSnap(user.id, snap.id, snap.localPath, snap.shelfId);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to delete this Snap right now.');
    } finally {
      setDeletingSnapId(null);
    }
  }

  async function handleMoveSnapToDrop(snap: Snap) {
    if (!user?.id) {
      return;
    }

    try {
      setActionSnap(null);
      setMovingSnapId(snap.id);
      setError(null);
      await moveSnapToShelf(user.id, snap.id, null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to move this Snap to the Drop right now.');
    } finally {
      setMovingSnapId(null);
    }
  }

  function handleConfirmDeleteSnap(snap: Snap) {
    setActionSnap(null);

    setTimeout(() => {
      Alert.alert('Delete Snap?', 'This will remove the Snap and its saved image from SnapShelf.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void handleDeleteSnap(snap);
          },
        },
      ]);
    }, 0);
  }

  async function handleDeleteShelf() {
    if (!user?.id || !id) {
      return;
    }

    try {
      setIsDeletingShelf(true);
      setError(null);
      await deleteShelf(user.id, id);
      router.replace('/board');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to delete this Shelf right now.');
      setIsDeletingShelf(false);
    }
  }

  function handleConfirmDeleteShelf() {
    const description = shelf?.name
      ? `Delete "${shelf.name}"? Its Snaps will move back to the Drop.`
      : 'Delete this Shelf? Its Snaps will move back to the Drop.';

    setIsShelfMenuVisible(false);

    setTimeout(() => {
      Alert.alert('Delete Shelf?', description, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Shelf',
          style: 'destructive',
          onPress: () => {
            void handleDeleteShelf();
          },
        },
      ]);
    }, 0);
  }

  return (
    <Screen
      scrollable
      contentContainerStyle={{ paddingBottom: 90 }}
      scrollViewProps={{
        onScroll: (event) => {
          const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
          const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;

          if (distanceFromBottom <= 300) {
            void loadMore();
          }
        },
        scrollEventThrottle: 16,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: theme.spacing.xl,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <Feather name="arrow-left" size={24} color={theme.colors.primary} />
        </Pressable>
        <Text style={textStyles.brand}>SnapShelf</Text>
        {isDeletingShelf ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <Pressable onPress={() => setIsShelfMenuVisible(true)} disabled={!shelf} hitSlop={10} style={{ padding: 4 }}>
            <Feather name="more-vertical" size={20} color={shelf ? theme.colors.textMuted : theme.colors.borderSoft} />
          </Pressable>
        )}
      </View>

      <SurfaceCard style={{ marginBottom: theme.spacing.lg, padding: theme.spacing.lg }}>
        <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.sm }]}>Shelf View</Text>
        <Text style={[textStyles.displaySm, { marginBottom: theme.spacing.xs }]}>{title}</Text>
        <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>
          {isLoadingSnaps ? 'Loading snaps for this shelf...' : `${snaps.length} snap${snaps.length === 1 ? '' : 's'} currently live here.`}
        </Text>
        <PillButton label="+ Snap It" icon="plus" onPress={() => setIsCreateSnapVisible(true)} fullWidth disabled={isDeletingShelf} />
      </SurfaceCard>

      <SurfaceCard style={{ marginBottom: theme.spacing.lg, padding: theme.spacing.lg }}>
        <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.sm }]}>Anchor Shelf</Text>
        <Text style={[textStyles.titleMd, { marginBottom: theme.spacing.xs }]}>{anchorShelf?.name ?? 'No Thread Yet'}</Text>
        <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>Threads are now explicit. This shelf only connects when you choose an Anchor Shelf.</Text>
        <PillButton label="Edit Thread" icon="link" onPress={() => setIsEditThreadVisible(true)} fullWidth disabled={isDeletingShelf} />
      </SurfaceCard>

      {activeError ? (
        <SurfaceCard style={{ marginBottom: theme.spacing.lg, padding: theme.spacing.lg }}>
          <Text style={textStyles.bodyMd}>{activeError}</Text>
        </SurfaceCard>
      ) : null}

      {isLoadingShelf || isLoadingSnaps ? (
        <SurfaceCard style={{ padding: theme.spacing.lg }}>
          <Text style={textStyles.bodyMd}>Loading this Shelf...</Text>
        </SurfaceCard>
      ) : null}

      {!isLoadingSnaps && snaps.length === 0 ? (
        <EmptyState
          title="This Shelf is still empty"
          description="Move a Snap here from the Drop to start filling out the collection."
        />
      ) : null}

      <View style={{ gap: theme.spacing.lg }}>
        {snaps.map((snap) => {
          const colors = getSnapPalette(snap);
          const isDeletingSnap = deletingSnapId === snap.id;
          const isMovingSnap = movingSnapId === snap.id;

          return (
            <SurfaceCard key={snap.id} style={{ padding: theme.spacing.md }}>
              <SnapPreview colors={colors} snap={snap} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm }}>
                <SectionLabel label={getSnapSourceLabel(snap.source)} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                  <Text style={textStyles.bodySm}>{formatCapturedAt(snap.capturedAt ?? snap.createdAt)}</Text>
                  {isDeletingSnap || isMovingSnap ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : (
                    <Pressable
                      onPress={() => setActionSnap(snap)}
                      disabled={isDeletingShelf || deletingSnapId !== null || movingSnapId !== null}
                      hitSlop={10}
                    >
                      <Feather name="more-vertical" size={18} color={theme.colors.textMuted} />
                    </Pressable>
                  )}
                </View>
              </View>

              <Text style={[textStyles.titleMd, { marginBottom: theme.spacing.xs }]}>{getSnapHeadline(snap)}</Text>

              {snap.thought ? <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.sm }]}>{snap.thought}</Text> : null}

              {snap.labels.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                  {snap.labels.map((label) => (
                    <SectionLabel key={label} label={label} />
                  ))}
                </View>
              ) : null}
            </SurfaceCard>
          );
        })}
      </View>

      {loadingMore ? (
        <View style={{ alignItems: 'center', paddingVertical: theme.spacing.md }}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      ) : null}

      <CreateSnapModal
        visible={isCreateSnapVisible}
        userId={user?.id ?? null}
        shelves={shelf ? [shelf] : []}
        defaultShelfId={shelf?.id ?? null}
        lockShelfSelection
        titleText="Add to Shelf"
        submitLabel="Save to Shelf"
        source="manual"
        onClose={() => setIsCreateSnapVisible(false)}
      />

      <ActionSheetModal
        visible={actionSnap !== null}
        title="Snap Actions"
        description={actionSnap ? `Choose what to do with "${getSnapHeadline(actionSnap)}".` : undefined}
        actions={
          actionSnap
            ? [
                {
                  label: 'Move to Drop',
                  icon: 'arrow-down',
                  disabled: isDeletingShelf || deletingSnapId !== null || movingSnapId !== null,
                  loading: movingSnapId === actionSnap.id,
                  onPress: () => {
                    void handleMoveSnapToDrop(actionSnap);
                  },
                },
                {
                  label: 'Delete Snap',
                  icon: 'trash-2',
                  tone: 'destructive' as const,
                  disabled: isDeletingShelf || deletingSnapId !== null || movingSnapId !== null,
                  onPress: () => handleConfirmDeleteSnap(actionSnap),
                },
              ]
            : []
        }
        onClose={() => setActionSnap(null)}
      />

      <ActionSheetModal
        visible={isShelfMenuVisible}
        title="Shelf Actions"
        description={shelf ? `Manage "${shelf.name}".` : undefined}
        actions={
          shelf
            ? [
                {
                  label: 'Edit Thread',
                  icon: 'link',
                  disabled: isDeletingShelf,
                  onPress: () => {
                    setIsShelfMenuVisible(false);
                    setIsEditThreadVisible(true);
                  },
                },
                {
                  label: 'Delete Shelf',
                  icon: 'trash-2',
                  tone: 'destructive' as const,
                  disabled: isDeletingShelf,
                  onPress: handleConfirmDeleteShelf,
                },
              ]
            : []
        }
        onClose={() => setIsShelfMenuVisible(false)}
      />

      <EditThreadModal
        visible={isEditThreadVisible}
        shelves={shelves}
        currentAnchorShelfId={anchorShelf?.id ?? null}
        currentShelfId={id}
        isSubmitting={isSavingThread}
        error={threadError}
        onClose={() => {
          setIsEditThreadVisible(false);
          setThreadError(null);
        }}
        onSubmit={handleSaveThread}
      />
    </Screen>
  );
}
