import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { useAuth } from '@/features/auth/useAuth';
import { deleteImageLocally } from '@/features/images/local';
import { resolveLocalImageUri } from '@/features/images/resolve';
import { formatCapturedAt, getShelfCoverSnap, getShelfPalette, getSnapHeadline, getSnapPalette, getSnapSourceLabel } from '@/features/snaps/presentation';
import { deleteSnap, moveSnapToShelf, setSnapArchived, setSnapFavorite, updateSnapDetails } from '@/features/snaps/api';
import type { Snap, UpdateSnapInput } from '@/features/snaps/types';
import { deleteShelf, getShelf, saveShelfCoverImageLocally, subscribeToShelves, updateShelfCover } from '@/features/shelves/api';
import type { Shelf } from '@/features/shelves/types';
import { subscribeToStacks } from '@/features/stacks/api';
import type { Stack } from '@/features/stacks/types';
import { setShelfStack, subscribeToThreads } from '@/features/threads/api';
import type { ShelfThread } from '@/features/threads/types';
import { ActionSheetModal } from '@/shared/components/ActionSheetModal';
import { CreateSnapModal } from '@/shared/components/CreateSnapModal';
import { EditThreadModal } from '@/shared/components/EditThreadModal';
import { EmptyState } from '@/shared/components/EmptyState';
import { PillButton } from '@/shared/components/PillButton';
import { Screen } from '@/shared/components/Screen';
import { SectionLabel } from '@/shared/components/SectionLabel';
import { SnapDetailModal } from '@/shared/components/SnapDetailModal';
import { SnapArtwork } from '@/shared/components/SnapArtwork';
import { SurfaceCard } from '@/shared/components/SurfaceCard';
import { ShelfCoverModal } from '@/shared/components/ShelfCoverModal';
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

function ShelfSummaryMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 118,
        borderRadius: theme.radii.lg,
        borderWidth: 1,
        borderColor: theme.colors.borderSoft,
        backgroundColor: theme.colors.background,
        padding: theme.spacing.md,
      }}
    >
      <Text style={[textStyles.titleMd, { marginBottom: 2 }]}>{value}</Text>
      <Text style={textStyles.bodySm}>{label}</Text>
    </View>
  );
}

function getLatestSnap(snaps: Snap[]) {
  return snaps.reduce<Snap | null>((latest, snap) => {
    if (!latest) {
      return snap;
    }

    const snapTime = (snap.capturedAt ?? snap.createdAt)?.getTime() ?? 0;
    const latestTime = (latest.capturedAt ?? latest.createdAt)?.getTime() ?? 0;

    return snapTime > latestTime ? snap : latest;
  }, null);
}

function getShelfHighlights(snaps: Snap[]) {
  const labels = new Set<string>();
  const sources = new Set<string>();

  snaps.forEach((snap) => {
    snap.labels.forEach((label) => labels.add(label));
    sources.add(getSnapSourceLabel(snap.source));
  });

  return [...labels, ...sources].slice(0, 5);
}

export default function ShelfViewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [shelf, setShelf] = useState<Shelf | null>(null);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [stacks, setStacks] = useState<Stack[]>([]);
  const [threads, setThreads] = useState<ShelfThread[]>([]);
  const [isLoadingShelf, setIsLoadingShelf] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateSnapVisible, setIsCreateSnapVisible] = useState(false);
  const [isEditThreadVisible, setIsEditThreadVisible] = useState(false);
  const [isSavingThread, setIsSavingThread] = useState(false);
  const [actionSnap, setActionSnap] = useState<Snap | null>(null);
  const [detailSnap, setDetailSnap] = useState<Snap | null>(null);
  const [isShelfMenuVisible, setIsShelfMenuVisible] = useState(false);
  const [isShelfCoverVisible, setIsShelfCoverVisible] = useState(false);
  const [isSavingShelfCover, setIsSavingShelfCover] = useState(false);
  const [shelfCoverError, setShelfCoverError] = useState<string | null>(null);
  const [movingSnapId, setMovingSnapId] = useState<string | null>(null);
  const [deletingSnapId, setDeletingSnapId] = useState<string | null>(null);
  const [savingSnapId, setSavingSnapId] = useState<string | null>(null);
  const [favoriteSnapId, setFavoriteSnapId] = useState<string | null>(null);
  const [archivingSnapId, setArchivingSnapId] = useState<string | null>(null);
  const [isDeletingShelf, setIsDeletingShelf] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const { error: snapsError, hasMore, loadMore, loading: isLoadingSnaps, loadingMore, snaps } = usePaginatedSnaps(user?.id, id ?? null);

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
      setStacks([]);
      return;
    }

    const unsubscribe = subscribeToStacks(
      user.id,
      (nextStacks) => {
        setStacks(nextStacks);
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

  useEffect(() => {
    if (!id) {
      return;
    }

    const nextShelf = shelves.find((entry) => entry.id === id);
    if (nextShelf) {
      setShelf(nextShelf);
    }
  }, [id, shelves]);

  const title = useMemo(() => shelf?.name ?? 'Shelf View', [shelf?.name]);
  const currentThread = useMemo(() => threads.find((thread) => thread.toShelfId === id) ?? null, [id, threads]);
  const anchorShelf = useMemo(
    () => (currentThread?.fromType === 'shelf' ? shelves.find((entry) => entry.id === currentThread.fromId) ?? null : null),
    [currentThread, shelves],
  );
  const stack = useMemo(
    () => (currentThread?.fromType === 'stack' ? stacks.find((entry) => entry.id === currentThread.fromId) ?? null : null),
    [currentThread, stacks],
  );
  const latestSnap = useMemo(() => getLatestSnap(snaps), [snaps]);
  const coverSnap = useMemo(() => (shelf ? getShelfCoverSnap(shelf, snaps) : null), [shelf, snaps]);
  const coverImageUri = useMemo(() => resolveLocalImageUri(shelf?.coverLocalPath ?? null), [shelf?.coverLocalPath]);
  const favoriteCount = useMemo(() => snaps.filter((snap) => snap.isFavorite).length, [snaps]);
  const shelfHighlights = useMemo(() => getShelfHighlights(snaps), [snaps]);
  const activeError = error ?? snapsError;

  async function handleSaveThread(stackId: string | null) {
    if (!user?.id || !id) {
      return;
    }

    try {
      setIsSavingThread(true);
      setThreadError(null);
      await setShelfStack(user.id, id, stackId);
      setIsEditThreadVisible(false);
    } catch (nextError) {
      setThreadError(nextError instanceof Error ? nextError.message : 'Unable to update this thread right now.');
    } finally {
      setIsSavingThread(false);
    }
  }

  async function handleSelectManualShelfCover(uri: string) {
    if (!user?.id || !id) {
      return;
    }

    try {
      setIsSavingShelfCover(true);
      setShelfCoverError(null);
      const coverLocalPath = await saveShelfCoverImageLocally(uri);
      try {
        await updateShelfCover(user.id, id, { coverSnapId: null, coverLocalPath });
      } catch (nextError) {
        await deleteImageLocally(coverLocalPath);
        throw nextError;
      }
      setShelf((current) => (current ? { ...current, coverSnapId: null, coverLocalPath } : current));
      setIsShelfCoverVisible(false);
    } catch (nextError) {
      setShelfCoverError(nextError instanceof Error ? nextError.message : 'Unable to save this Shelf cover right now.');
    } finally {
      setIsSavingShelfCover(false);
    }
  }

  async function handleSelectSnapShelfCover(snap: Snap) {
    if (!user?.id || !id) {
      return;
    }

    try {
      setIsSavingShelfCover(true);
      setShelfCoverError(null);
      await updateShelfCover(user.id, id, { coverSnapId: snap.id, coverLocalPath: null });
      setShelf((current) => (current ? { ...current, coverSnapId: snap.id, coverLocalPath: null } : current));
      setIsShelfCoverVisible(false);
    } catch (nextError) {
      setShelfCoverError(nextError instanceof Error ? nextError.message : 'Unable to save this Shelf cover right now.');
    } finally {
      setIsSavingShelfCover(false);
    }
  }

  async function handleClearShelfCover() {
    if (!user?.id || !id) {
      return;
    }

    try {
      setIsSavingShelfCover(true);
      setShelfCoverError(null);
      await updateShelfCover(user.id, id, { coverSnapId: null, coverLocalPath: null });
      setShelf((current) => (current ? { ...current, coverSnapId: null, coverLocalPath: null } : current));
      setIsShelfCoverVisible(false);
    } catch (nextError) {
      setShelfCoverError(nextError instanceof Error ? nextError.message : 'Unable to clear this Shelf cover right now.');
    } finally {
      setIsSavingShelfCover(false);
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

  async function handleMoveSnapToTray(snap: Snap) {
    if (!user?.id) {
      return;
    }

    try {
      setActionSnap(null);
      setMovingSnapId(snap.id);
      setError(null);
      await moveSnapToShelf(user.id, snap.id, null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to move this Snap to The Tray right now.');
    } finally {
      setMovingSnapId(null);
    }
  }

  async function handleSaveSnapDetails(snap: Snap, input: UpdateSnapInput) {
    if (!user?.id) {
      return;
    }

    try {
      setSavingSnapId(snap.id);
      setError(null);
      await updateSnapDetails(user.id, snap.id, input);
      setDetailSnap(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to save this Snap right now.');
    } finally {
      setSavingSnapId(null);
    }
  }

  async function handleToggleFavorite(snap: Snap) {
    if (!user?.id) {
      return;
    }

    try {
      setFavoriteSnapId(snap.id);
      setError(null);
      await setSnapFavorite(user.id, snap.id, !snap.isFavorite);
      setActionSnap(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to update this Snap right now.');
    } finally {
      setFavoriteSnapId(null);
    }
  }

  async function handleToggleArchived(snap: Snap) {
    if (!user?.id) {
      return;
    }

    try {
      setArchivingSnapId(snap.id);
      setError(null);
      await setSnapArchived(user.id, snap.id, !snap.isArchived);
      setActionSnap(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to update this Snap right now.');
    } finally {
      setArchivingSnapId(null);
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
      ? `Delete "${shelf.name}"? Its Snaps will move back to The Tray.`
      : 'Delete this Shelf? Its Snaps will move back to The Tray.';

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
        <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.sm }]}>Shelf Summary</Text>
        <Text style={[textStyles.displaySm, { marginBottom: theme.spacing.xs }]}>{title}</Text>
        <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>A Shelf is a curated collection. Revisit it to refine the Snaps, labels, and thread that make this idea easy to find later.</Text>
        <SnapArtwork
          snap={coverSnap}
          imageUri={coverImageUri}
          fallbackColors={shelf ? getShelfPalette(shelf.name) : ['#EFE9DD', '#DDE4D5']}
          showChildrenOnFallback
          style={{
            height: 170,
            borderRadius: theme.radii.lg,
            marginBottom: theme.spacing.lg,
            padding: theme.spacing.lg,
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              alignSelf: 'flex-start',
              borderRadius: theme.radii.pill,
              backgroundColor: theme.colors.surfaceSoft,
              borderWidth: 1,
              borderColor: theme.colors.borderSoft,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text style={[textStyles.bodySm, { color: theme.colors.text }]}>{coverImageUri ? 'Manual cover' : coverSnap ? 'Snap cover' : 'No cover set'}</Text>
          </View>
        </SnapArtwork>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.lg }}>
          <ShelfSummaryMetric label="Snaps" value={isLoadingSnaps ? '...' : snaps.length} />
          <ShelfSummaryMetric label="Favorites" value={favoriteCount} />
          <ShelfSummaryMetric label="Latest" value={latestSnap ? formatCapturedAt(latestSnap.capturedAt ?? latestSnap.createdAt).replace('Captured ', '') : 'Empty'} />
        </View>
        {shelfHighlights.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.lg }}>
            {shelfHighlights.map((highlight) => (
              <SectionLabel key={highlight} label={highlight} />
            ))}
          </View>
        ) : null}
        <View style={{ gap: theme.spacing.sm }}>
          <PillButton label="Change Cover" icon="image" variant="secondary" onPress={() => setIsShelfCoverVisible(true)} fullWidth disabled={isDeletingShelf || !shelf} />
          <PillButton label="+ Snap It" icon="plus" onPress={() => setIsCreateSnapVisible(true)} fullWidth disabled={isDeletingShelf} />
        </View>
      </SurfaceCard>

      <SurfaceCard style={{ marginBottom: theme.spacing.lg, padding: theme.spacing.lg }}>
        <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.sm }]}>Stack</Text>
        <Text style={[textStyles.titleMd, { marginBottom: theme.spacing.xs }]}>{stack ? `Stacked under ${stack.name}` : anchorShelf ? `Legacy thread from ${anchorShelf.name}` : 'Independent Shelf'}</Text>
        <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>{stack ? 'This Shelf is grouped under a visual Stack on the Board.' : 'Leave this Shelf independent, or choose a Stack to group it visually on the Board.'}</Text>
        <PillButton label="Edit Stack" icon="layers" onPress={() => setIsEditThreadVisible(true)} fullWidth disabled={isDeletingShelf} />
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
        <>
          <EmptyState
            title="This Shelf is ready to curate"
            description="Empty Shelves are useful containers. File Snaps here from The Tray, move existing finds from Library, or add a fresh Snap directly."
          />
          <SurfaceCard style={{ marginTop: theme.spacing.lg, marginBottom: theme.spacing.lg, padding: theme.spacing.lg }}>
            <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.xs }]}>Where to add from</Text>
            <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.md }]}>Use The Tray for unorganized new Snaps. Use Library when you remember what you saved but not where it belongs.</Text>
            <View style={{ gap: theme.spacing.sm }}>
              <PillButton label="Open The Tray" icon="inbox" variant="secondary" fullWidth onPress={() => router.push('/tray')} disabled={isDeletingShelf} />
              <PillButton label="Search Library" icon="book-open" variant="secondary" fullWidth onPress={() => router.push('/library')} disabled={isDeletingShelf} />
            </View>
          </SurfaceCard>
        </>
      ) : null}

      <View style={{ gap: theme.spacing.lg }}>
        {snaps.map((snap) => {
          const colors = getSnapPalette(snap);
          const isDeletingSnap = deletingSnapId === snap.id;
          const isMovingSnap = movingSnapId === snap.id;

          return (
            <Pressable key={snap.id} onPress={() => setDetailSnap(snap)}>
              <SurfaceCard style={{ padding: theme.spacing.md }}>
              <SnapPreview colors={colors} snap={snap} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm }}>
                <SectionLabel label={getSnapSourceLabel(snap.source)} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                  <Text style={textStyles.bodySm}>{formatCapturedAt(snap.capturedAt ?? snap.createdAt)}</Text>
                  {isDeletingSnap || isMovingSnap ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : (
                    <Pressable
                      onPress={(event) => {
                        event.stopPropagation();
                        setActionSnap(snap);
                      }}
                      disabled={isDeletingShelf || deletingSnapId !== null || movingSnapId !== null || savingSnapId !== null || favoriteSnapId !== null || archivingSnapId !== null}
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
            </Pressable>
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
                  label: 'Edit Details',
                  icon: 'edit-3',
                  disabled: isDeletingShelf || deletingSnapId !== null || movingSnapId !== null || savingSnapId !== null,
                  loading: savingSnapId === actionSnap.id,
                  onPress: () => {
                    setDetailSnap(actionSnap);
                    setActionSnap(null);
                  },
                },
                {
                  label: actionSnap.isFavorite ? 'Remove Favorite' : 'Favorite Snap',
                  icon: actionSnap.isFavorite ? 'heart' : 'star',
                  disabled: isDeletingShelf || deletingSnapId !== null || movingSnapId !== null || favoriteSnapId !== null,
                  loading: favoriteSnapId === actionSnap.id,
                  onPress: () => {
                    void handleToggleFavorite(actionSnap);
                  },
                },
                {
                  label: actionSnap.isArchived ? 'Restore to Active' : 'Archive Snap',
                  icon: actionSnap.isArchived ? 'rotate-ccw' : 'archive',
                  disabled: isDeletingShelf || deletingSnapId !== null || movingSnapId !== null || archivingSnapId !== null,
                  loading: archivingSnapId === actionSnap.id,
                  onPress: () => {
                    void handleToggleArchived(actionSnap);
                  },
                },
                {
                  label: 'Move to The Tray',
                  icon: 'arrow-down',
                  disabled: isDeletingShelf || deletingSnapId !== null || movingSnapId !== null,
                  loading: movingSnapId === actionSnap.id,
                  onPress: () => {
                    void handleMoveSnapToTray(actionSnap);
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
                  label: 'Change Cover',
                  icon: 'image',
                  disabled: isDeletingShelf || isSavingShelfCover,
                  loading: isSavingShelfCover,
                  onPress: () => {
                    setIsShelfMenuVisible(false);
                    setIsShelfCoverVisible(true);
                  },
                },
                {
                  label: 'Edit Stack',
                  icon: 'layers',
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

      <SnapDetailModal
        visible={detailSnap !== null}
        snap={detailSnap}
        shelves={shelves}
        isSaving={savingSnapId === detailSnap?.id}
        error={activeError}
        onClose={() => setDetailSnap(null)}
        onSave={handleSaveSnapDetails}
      />

      <ShelfCoverModal
        visible={isShelfCoverVisible}
        shelf={shelf}
        snaps={snaps}
        isSubmitting={isSavingShelfCover}
        hasMoreSnaps={hasMore}
        isLoadingMoreSnaps={loadingMore}
        error={shelfCoverError}
        onClose={() => {
          setIsShelfCoverVisible(false);
          setShelfCoverError(null);
        }}
        onSelectManualImage={(uri) => {
          void handleSelectManualShelfCover(uri);
        }}
        onSelectSnap={(snap) => {
          void handleSelectSnapShelfCover(snap);
        }}
        onClearCover={() => {
          void handleClearShelfCover();
        }}
        onLoadMoreSnaps={() => {
          void loadMore();
        }}
      />

      <EditThreadModal
        visible={isEditThreadVisible}
        shelves={shelves}
        stacks={stacks}
        currentStackId={stack?.id ?? null}
        legacyAnchorShelfName={anchorShelf?.name ?? null}
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
