import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { useAuth } from '@/features/auth/useAuth';
import { formatCapturedAt, getSnapHeadline, getSnapPalette, getSnapSourceLabel } from '@/features/snaps/presentation';
import { deleteSnap, moveSnapToShelf, setSnapArchived, setSnapFavorite, updateSnapDetails } from '@/features/snaps/api';
import type { Snap, UpdateSnapInput } from '@/features/snaps/types';
import { createShelf, getDefaultShelfPlacement, subscribeToShelves } from '@/features/shelves/api';
import type { Shelf } from '@/features/shelves/types';
import { AppHeader } from '@/shared/components/AppHeader';
import { CreateShelfModal } from '@/shared/components/CreateShelfModal';
import { CreateSnapModal } from '@/shared/components/CreateSnapModal';
import { EmptyState } from '@/shared/components/EmptyState';
import { PillButton } from '@/shared/components/PillButton';
import { Screen } from '@/shared/components/Screen';
import { SectionLabel } from '@/shared/components/SectionLabel';
import { SnapArtwork } from '@/shared/components/SnapArtwork';
import { ShelfPickerModal } from '@/shared/components/ShelfPickerModal';
import { SnapDetailModal } from '@/shared/components/SnapDetailModal';
import { SurfaceCard } from '@/shared/components/SurfaceCard';
import { usePaginatedSnaps } from '@/shared/hooks/usePaginatedSnaps';
import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

type BusyAction = 'move' | 'favorite' | 'archive' | 'delete' | 'edit';

function TriageActionButton({
  label,
  icon,
  tone = 'default',
  disabled = false,
  loading = false,
  onPress,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  tone?: 'default' | 'primary' | 'destructive';
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  const isPrimary = tone === 'primary';
  const isDestructive = tone === 'destructive';
  const foregroundColor = isPrimary ? theme.colors.surface : isDestructive ? theme.colors.primary : theme.colors.text;

  return (
    <Pressable
      onPress={(event) => {
        event.stopPropagation();
        onPress();
      }}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        minHeight: 44,
        minWidth: 66,
        flex: 1,
        borderRadius: theme.radii.pill,
        borderWidth: 1,
        borderColor: isPrimary ? theme.colors.primary : isDestructive ? 'rgba(198, 58, 6, 0.32)' : theme.colors.borderSoft,
        backgroundColor: isPrimary ? theme.colors.primary : theme.colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 8,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {loading ? <ActivityIndicator size="small" color={foregroundColor} /> : <Feather name={icon} size={16} color={foregroundColor} />}
      <Text numberOfLines={1} style={[textStyles.bodySm, { color: foregroundColor, fontSize: 12, lineHeight: 15 }]}>{label}</Text>
    </Pressable>
  );
}

function TraySnapRow({
  snap,
  canMoveSnaps,
  busyAction,
  isBusy,
  onMove,
  onOpen,
  onToggleFavorite,
  onArchive,
  onDelete,
}: {
  snap: Snap;
  canMoveSnaps: boolean;
  busyAction: BusyAction | null;
  isBusy: boolean;
  onMove: () => void;
  onOpen: () => void;
  onToggleFavorite: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const colors = getSnapPalette(snap);
  const capturedAt = formatCapturedAt(snap.capturedAt ?? snap.createdAt);

  return (
    <Pressable onPress={onOpen}>
      <SurfaceCard style={{ marginBottom: theme.spacing.md, padding: theme.spacing.sm, borderRadius: theme.radii.lg }}>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <SnapArtwork
            snap={snap}
            fallbackColors={colors}
            style={{
              width: 82,
              height: 104,
              borderRadius: theme.radii.md,
              backgroundColor: theme.colors.background,
            }}
          />

          <View style={{ flex: 1, minWidth: 0, paddingVertical: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: 7 }}>
              <SectionLabel label={getSnapSourceLabel(snap.source)} />
              {snap.isFavorite ? <Feather name="heart" size={14} color={theme.colors.primary} /> : null}
            </View>

            <Text numberOfLines={1} style={[textStyles.titleMd, { marginBottom: 2 }]}>{getSnapHeadline(snap)}</Text>
            {snap.thought ? (
              <Text numberOfLines={2} style={[textStyles.bodySm, { marginBottom: theme.spacing.xs }]}>{snap.thought}</Text>
            ) : null}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="clock" size={13} color={theme.colors.textMuted} />
              <Text numberOfLines={1} style={textStyles.bodySm}>{capturedAt}</Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 7, marginTop: theme.spacing.sm }}>
          <TriageActionButton
            label="Move"
            icon="folder"
            tone="primary"
            disabled={!canMoveSnaps || isBusy}
            loading={isBusy && busyAction === 'move'}
            onPress={onMove}
          />
          <TriageActionButton
            label={snap.isFavorite ? 'Saved' : 'Fav'}
            icon={snap.isFavorite ? 'heart' : 'star'}
            disabled={isBusy}
            loading={isBusy && busyAction === 'favorite'}
            onPress={onToggleFavorite}
          />
          <TriageActionButton
            label="Archive"
            icon="archive"
            disabled={isBusy}
            loading={isBusy && busyAction === 'archive'}
            onPress={onArchive}
          />
          <TriageActionButton
            label="Delete"
            icon="trash-2"
            tone="destructive"
            disabled={isBusy}
            loading={isBusy && busyAction === 'delete'}
            onPress={onDelete}
          />
        </View>
      </SurfaceCard>
    </Pressable>
  );
}

export default function TrayScreen() {
  const { isConfigured, user } = useAuth();
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [isLoadingShelves, setIsLoadingShelves] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSnap, setSelectedSnap] = useState<Snap | null>(null);
  const [detailSnap, setDetailSnap] = useState<Snap | null>(null);
  const [busySnapId, setBusySnapId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<BusyAction | null>(null);
  const [isCreateSnapVisible, setIsCreateSnapVisible] = useState(false);
  const [isCreateShelfVisible, setIsCreateShelfVisible] = useState(false);
  const [isCreatingShelf, setIsCreatingShelf] = useState(false);
  const [createShelfError, setCreateShelfError] = useState<string | null>(null);
  const [movedSnapIds, setMovedSnapIds] = useState<Set<string>>(() => new Set());
  const { error: snapsError, hasMore, loadMore, loading: isLoadingSnaps, loadingMore, snaps: traySnaps } = usePaginatedSnaps(user?.id, null);

  useEffect(() => {
    if (!user?.id) {
      setShelves([]);
      setIsLoadingShelves(false);
      return;
    }

    setIsLoadingShelves(true);
    const unsubscribe = subscribeToShelves(
      user.id,
      (nextShelves) => {
        setShelves(nextShelves);
        setIsLoadingShelves(false);
      },
      (nextError) => {
        setError(nextError.message);
        setIsLoadingShelves(false);
      },
    );

    return unsubscribe;
  }, [user?.id]);

  useEffect(() => {
    if (!isLoadingSnaps && !loadingMore && hasMore && traySnaps.length > 0 && traySnaps.every((snap) => snap.isArchived)) {
      void loadMore();
    }
  }, [hasMore, isLoadingSnaps, loadMore, loadingMore, traySnaps]);

  useEffect(() => {
    setMovedSnapIds(new Set());
  }, [user?.id]);

  useEffect(() => {
    setMovedSnapIds((current) => {
      if (current.size === 0) {
        return current;
      }

      const traySnapIds = new Set(traySnaps.map((snap) => snap.id));
      const nextMovedSnapIds = new Set([...current].filter((snapId) => traySnapIds.has(snapId)));

      return nextMovedSnapIds.size === current.size ? current : nextMovedSnapIds;
    });
  }, [traySnaps]);

  const canMoveSnaps = shelves.length > 0 && !isLoadingShelves;
  const visibleTraySnaps = useMemo(() => traySnaps.filter((snap) => !snap.isArchived && !movedSnapIds.has(snap.id)), [movedSnapIds, traySnaps]);
  const selectedTitle = useMemo(() => (selectedSnap ? getSnapHeadline(selectedSnap) : undefined), [selectedSnap]);
  const activeError = error ?? snapsError;

  async function runSnapMutation(snap: Snap, mutation: BusyAction, action: () => Promise<void>) {
    try {
      setBusySnapId(snap.id);
      setBusyAction(mutation);
      setError(null);
      await action();

      if (selectedSnap?.id === snap.id) {
        setSelectedSnap(null);
      }

      if (mutation === 'edit' && detailSnap?.id === snap.id) {
        setDetailSnap(null);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to update this Snap right now.');
    } finally {
      setBusySnapId(null);
      setBusyAction(null);
    }
  }

  async function handleSelectShelf(shelf: Shelf | null) {
    const snap = selectedSnap;

    if (!snap || !user?.id || !shelf) {
      return;
    }

    await runSnapMutation(snap, 'move', async () => {
      await moveSnapToShelf(user.id, snap.id, shelf.id);
      setMovedSnapIds((current) => new Set(current).add(snap.id));
      setSelectedSnap(null);
    });
  }

  async function handleCreateShelf(input: { name: string; stackId: string | null }) {
    if (!user?.id) {
      return;
    }

    try {
      setIsCreatingShelf(true);
      setCreateShelfError(null);
      await createShelf(user.id, {
        name: input.name,
        ...getDefaultShelfPlacement(shelves.length),
      });
      setIsCreateShelfVisible(false);
    } catch (nextError) {
      setCreateShelfError(nextError instanceof Error ? nextError.message : 'Unable to create a Shelf right now.');
    } finally {
      setIsCreatingShelf(false);
    }
  }

  async function handleToggleFavorite(snap: Snap) {
    if (!user?.id) {
      return;
    }

    await runSnapMutation(snap, 'favorite', async () => {
      await setSnapFavorite(user.id, snap.id, !snap.isFavorite);
    });
  }

  async function handleSaveSnapDetails(snap: Snap, input: UpdateSnapInput) {
    if (!user?.id) {
      return;
    }

    await runSnapMutation(snap, 'edit', async () => {
      await updateSnapDetails(user.id, snap.id, input);
    });
  }

  async function handleArchiveSnap(snap: Snap) {
    if (!user?.id) {
      return;
    }

    await runSnapMutation(snap, 'archive', async () => {
      await setSnapArchived(user.id, snap.id, true);
    });
  }

  async function handleDeleteSnap(snap: Snap) {
    if (!user?.id) {
      return;
    }

    await runSnapMutation(snap, 'delete', async () => {
      await deleteSnap(user.id, snap.id, snap.localPath, snap.shelfId);
    });
  }

  function handleConfirmDeleteSnap(snap: Snap) {
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

  return (
    <Screen
      scrollable
      contentContainerStyle={{ paddingBottom: 150 }}
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
      <AppHeader />

      <View style={{ marginBottom: theme.spacing.lg }}>
        <Text style={[textStyles.displaySm, { marginBottom: theme.spacing.xs }]}>The Tray</Text>
        <Text style={[textStyles.bodySm, { maxWidth: '92%' }]}>The Tray is your inbox for unorganized Snaps. Move keepers into Shelves, star what matters, archive the rest.</Text>
      </View>

      {!isConfigured ? (
        <EmptyState
          title="Firebase setup still needs one restart"
          description="If you just added your .env values, restart Expo so The Tray can connect to Firestore."
        />
      ) : null}

      {activeError ? (
        <SurfaceCard style={{ marginBottom: theme.spacing.lg, padding: theme.spacing.lg }}>
          <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.sm }]}>Tray Error</Text>
          <Text style={textStyles.bodyMd}>{activeError}</Text>
        </SurfaceCard>
      ) : null}

      {isLoadingSnaps ? (
        <SurfaceCard style={{ padding: theme.spacing.lg, marginBottom: theme.spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={textStyles.bodyMd}>Loading your unsorted Snaps...</Text>
          </View>
        </SurfaceCard>
      ) : null}

      {!isLoadingSnaps && !loadingMore && visibleTraySnaps.length === 0 ? (
        <View>
          <EmptyState
            title="Your Tray is clear"
            description={__DEV__ ? 'Seed sample data from Settings or add a Quick Snap to test moving live Snaps into Shelves.' : 'New Snaps shared into SnapShelf land here first, then leave once you file them into Shelves.'}
          />
          {!isLoadingShelves && shelves.length === 0 ? (
            <SurfaceCard style={{ marginTop: theme.spacing.lg, padding: theme.spacing.lg }}>
              <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.sm }]}>First Shelf</Text>
              <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>Create a Shelf now so your first Snap has somewhere to go when you triage The Tray.</Text>
              <PillButton label="Create First Shelf" icon="plus" fullWidth onPress={() => setIsCreateShelfVisible(true)} disabled={!user?.id || isCreatingShelf} />
            </SurfaceCard>
          ) : null}
        </View>
      ) : null}

      {!isLoadingShelves && shelves.length === 0 && visibleTraySnaps.length > 0 ? (
        <SurfaceCard style={{ marginBottom: theme.spacing.lg, padding: theme.spacing.lg }}>
          <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.sm }]}>Create a Shelf to file Snaps</Text>
          <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>Move unlocks after you have at least one Shelf. Create one here, then keep triaging without leaving The Tray.</Text>
          <PillButton label="Create First Shelf" icon="plus" fullWidth onPress={() => setIsCreateShelfVisible(true)} disabled={!user?.id || isCreatingShelf} />
        </SurfaceCard>
      ) : null}

      {visibleTraySnaps.map((snap) => (
        <TraySnapRow
          key={snap.id}
          snap={snap}
          canMoveSnaps={canMoveSnaps}
          busyAction={busySnapId === snap.id ? busyAction : null}
          isBusy={busySnapId !== null}
          onOpen={() => setDetailSnap(snap)}
          onMove={() => setSelectedSnap(snap)}
          onToggleFavorite={() => {
            void handleToggleFavorite(snap);
          }}
          onArchive={() => {
            void handleArchiveSnap(snap);
          }}
          onDelete={() => handleConfirmDeleteSnap(snap)}
        />
      ))}

      {loadingMore ? (
        <View style={{ alignItems: 'center', paddingVertical: theme.spacing.md }}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      ) : null}

      <Pressable
        onPress={() => setIsCreateSnapVisible(true)}
        style={{
          position: 'absolute',
          right: theme.spacing.xl,
          bottom: 118,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: theme.colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: theme.colors.primaryDeep,
          shadowOpacity: 0.28,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 10 },
        }}
      >
        <Feather name="camera" size={20} color={theme.colors.surface} />
      </Pressable>

      <ShelfPickerModal
        visible={selectedSnap !== null}
        shelves={shelves}
        snapTitle={selectedTitle}
        title="File Snap"
        description={selectedTitle ? `Pick a Shelf for "${selectedTitle}" and it leaves The Tray.` : 'Pick a Shelf and this Snap leaves The Tray.'}
        isSubmitting={busySnapId === selectedSnap?.id && busyAction === 'move'}
        onClose={() => setSelectedSnap(null)}
        onSelect={handleSelectShelf}
      />

      <CreateSnapModal
        visible={isCreateSnapVisible}
        userId={user?.id ?? null}
        shelves={shelves}
        titleText="Quick Snap"
        submitLabel="Save Snapshot"
        source="quick-snap"
        onClose={() => setIsCreateSnapVisible(false)}
      />

      <CreateShelfModal
        visible={isCreateShelfVisible}
        shelves={shelves}
        isSubmitting={isCreatingShelf}
        error={createShelfError}
        onClose={() => {
          setIsCreateShelfVisible(false);
          setCreateShelfError(null);
        }}
        onSubmit={handleCreateShelf}
      />

      <SnapDetailModal
        visible={detailSnap !== null}
        snap={detailSnap}
        shelves={shelves}
        isSaving={busySnapId === detailSnap?.id && busyAction === 'edit'}
        error={activeError}
        onClose={() => setDetailSnap(null)}
        onSave={handleSaveSnapDetails}
      />
    </Screen>
  );
}
