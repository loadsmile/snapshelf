import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { useAuth } from '@/features/auth/useAuth';
import { snapDateOptions, snapSortOptions, snapSourceOptions, snapStatusOptions } from '@/features/snaps/filter-options';
import { collectSnapLabels, filterLibrarySnaps, type SnapLibraryDateRange, type SnapLibrarySort, type SnapLibraryStatus } from '@/features/snaps/library';
import { formatCapturedAt, getSnapHeadline, getSnapPalette, getSnapSourceLabel } from '@/features/snaps/presentation';
import {
  bulkDeleteSnaps,
  bulkFavoriteSnaps,
  bulkMoveSnaps,
  bulkSetSnapsArchived,
  deleteSnap,
  moveSnapToShelf,
  removeSnapLocalImageReference,
  replaceSnapLocalImage,
  setSnapArchived,
  setSnapFavorite,
  updateSnapDetails,
} from '@/features/snaps/api';
import type { Snap, SnapSource, UpdateSnapInput } from '@/features/snaps/types';
import { createShelf, getDefaultShelfPlacement, subscribeToShelves } from '@/features/shelves/api';
import type { Shelf } from '@/features/shelves/types';
import { AppHeader } from '@/shared/components/AppHeader';
import { ActionSheetModal } from '@/shared/components/ActionSheetModal';
import { CompactControlPill } from '@/shared/components/CompactControlPill';
import { CreateShelfModal } from '@/shared/components/CreateShelfModal';
import { CreateSnapModal } from '@/shared/components/CreateSnapModal';
import { EmptyState } from '@/shared/components/EmptyState';
import { LibraryFilterSheet } from '@/shared/components/LibraryFilterSheet';
import { PillButton } from '@/shared/components/PillButton';
import { PostSaveConfirmationModal } from '@/shared/components/PostSaveConfirmationModal';
import { Screen } from '@/shared/components/Screen';
import { ScreenTitle } from '@/shared/components/ScreenTitle';
import { SectionLabel } from '@/shared/components/SectionLabel';
import { SnapArtwork } from '@/shared/components/SnapArtwork';
import { ShelfPickerModal } from '@/shared/components/ShelfPickerModal';
import { SnapBulkActionBar } from '@/shared/components/SnapBulkActionBar';
import { SnapDetailModal } from '@/shared/components/SnapDetailModal';
import { SurfaceCard } from '@/shared/components/SurfaceCard';
import { usePaginatedSnaps } from '@/shared/hooks/usePaginatedSnaps';
import { useBottomTabGeometry } from '@/shared/hooks/useBottomTabGeometry';
import { useSnapSelection } from '@/shared/hooks/useSnapSelection';
import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

type BusyAction = 'move' | 'favorite' | 'archive' | 'delete' | 'edit' | 'image';

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
  onToggleArchived,
  onDelete,
  isSelectionMode,
  isSelected,
  onToggleSelected,
  selectionDisabled,
}: {
  snap: Snap;
  canMoveSnaps: boolean;
  busyAction: BusyAction | null;
  isBusy: boolean;
  onMove: () => void;
  onOpen: () => void;
  onToggleFavorite: () => void;
  onToggleArchived: () => void;
  onDelete: () => void;
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelected: () => void;
  selectionDisabled: boolean;
}) {
  const colors = getSnapPalette(snap);
  const capturedAt = formatCapturedAt(snap.capturedAt ?? snap.createdAt);

  return (
    <Pressable
      onPress={isSelectionMode ? onToggleSelected : onOpen}
      disabled={isSelectionMode && selectionDisabled}
      accessibilityRole={isSelectionMode ? 'checkbox' : 'button'}
      accessibilityState={isSelectionMode ? { checked: isSelected } : undefined}
      accessibilityLabel={isSelectionMode ? `${isSelected ? 'Deselect' : 'Select'} ${getSnapHeadline(snap)}` : `Open ${getSnapHeadline(snap)}`}
    >
      <SurfaceCard style={{ marginBottom: theme.spacing.md, padding: theme.spacing.sm, borderRadius: theme.radii.lg, borderWidth: isSelected ? 2 : 1, borderColor: isSelected ? theme.colors.primary : theme.colors.borderSoft }}>
        {isSelectionMode ? (
          <View style={{ position: 'absolute', right: theme.spacing.sm, top: theme.spacing.sm, zIndex: 2, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface }}>
            <Feather name={isSelected ? 'check' : 'circle'} size={17} color={isSelected ? theme.colors.surface : theme.colors.textMuted} />
          </View>
        ) : null}
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

        {!isSelectionMode ? <View style={{ flexDirection: 'row', gap: 7, marginTop: theme.spacing.sm }}>
          <TriageActionButton
            label="Move"
            icon="folder"
            tone="primary"
            disabled={!canMoveSnaps || isBusy}
            loading={isBusy && busyAction === 'move'}
            onPress={onMove}
          />
          <TriageActionButton
            label={snap.isFavorite ? 'Remove' : 'Favorite'}
            icon={snap.isFavorite ? 'heart' : 'star'}
            disabled={isBusy}
            loading={isBusy && busyAction === 'favorite'}
            onPress={onToggleFavorite}
          />
          <TriageActionButton
            label={snap.isArchived ? 'Restore' : 'Archive'}
            icon={snap.isArchived ? 'rotate-ccw' : 'archive'}
            disabled={isBusy}
            loading={isBusy && busyAction === 'archive'}
            onPress={onToggleArchived}
          />
          <TriageActionButton
            label="Delete"
            icon="trash-2"
            tone="destructive"
            disabled={isBusy}
            loading={isBusy && busyAction === 'delete'}
            onPress={onDelete}
          />
        </View> : null}
      </SurfaceCard>
    </Pressable>
  );
}

export default function TrayScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { occupiedHeight, overlayClearance } = useBottomTabGeometry();
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
  const [createdSnap, setCreatedSnap] = useState<Snap | null>(null);
  const [isUndoingCreatedSnap, setIsUndoingCreatedSnap] = useState(false);
  const [confirmationError, setConfirmationError] = useState<string | null>(null);
  const [movedSnapIds, setMovedSnapIds] = useState<Set<string>>(() => new Set());
  const [isBulkBusy, setIsBulkBusy] = useState(false);
  const [isBulkMoveVisible, setIsBulkMoveVisible] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [bulkBarHeight, setBulkBarHeight] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState<SnapLibraryStatus>('active');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedSource, setSelectedSource] = useState<SnapSource | 'all'>('all');
  const [selectedLabel, setSelectedLabel] = useState<string | 'all'>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<SnapLibraryDateRange>('any');
  const [sort, setSort] = useState<SnapLibrarySort>('newest');
  const [isFilterSheetVisible, setIsFilterSheetVisible] = useState(false);
  const [isSortSheetVisible, setIsSortSheetVisible] = useState(false);
  const { connectionError, error: snapsError, hasMore, loadMore, loading: isLoadingSnaps, loadingMore, snaps: traySnaps } = usePaginatedSnaps(user?.id, null);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const isCompactWidth = width < 390;
  const hasSearch = deferredSearchQuery.trim().length > 0;

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

  const hasActiveRefinement = hasSearch || status !== 'active' || favoritesOnly || selectedSource !== 'all' || selectedLabel !== 'all' || selectedDateRange !== 'any' || sort !== 'newest';

  useEffect(() => {
    if (!isLoadingSnaps && !loadingMore && hasMore && (hasActiveRefinement || (traySnaps.length > 0 && traySnaps.every((snap) => snap.isArchived)))) {
      void loadMore();
    }
  }, [hasActiveRefinement, hasMore, isLoadingSnaps, loadMore, loadingMore, traySnaps]);

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
  const availableTraySnaps = useMemo(() => traySnaps.filter((snap) => !movedSnapIds.has(snap.id)), [movedSnapIds, traySnaps]);
  const labelOptions = useMemo(() => collectSnapLabels(availableTraySnaps), [availableTraySnaps]);
  const visibleTraySnaps = useMemo(() => filterLibrarySnaps(availableTraySnaps, {
    query: deferredSearchQuery,
    shelfId: 'tray',
    source: selectedSource,
    label: selectedLabel,
    dateRange: selectedDateRange,
    status,
    favoritesOnly,
    sort,
  }, new Map()), [availableTraySnaps, deferredSearchQuery, favoritesOnly, selectedDateRange, selectedLabel, selectedSource, sort, status]);
  const advancedFilterCount = Number(status !== 'active') + Number(selectedSource !== 'all') + Number(selectedLabel !== 'all') + Number(selectedDateRange !== 'any');
  const activeFilterCount = advancedFilterCount + Number(favoritesOnly) + Number(sort !== 'newest');
  const sortLabel = snapSortOptions.find((option) => option.value === sort)?.label ?? 'Newest';
  const visibleTraySnapIds = useMemo(() => visibleTraySnaps.map((snap) => snap.id), [visibleTraySnaps]);
  const selectionScopeKey = `${user?.id ?? 'signed-out'}:${deferredSearchQuery}:${status}:${favoritesOnly}:${selectedSource}:${selectedLabel}:${selectedDateRange}`;
  const selection = useSnapSelection(visibleTraySnapIds, selectionScopeKey);
  const selectedTraySnaps = useMemo(() => traySnaps.filter((snap) => selection.selectedIds.has(snap.id)), [selection.selectedIds, traySnaps]);
  const selectedActiveSnaps = useMemo(() => selectedTraySnaps.filter((snap) => !snap.isArchived), [selectedTraySnaps]);
  const selectedArchivedSnaps = useMemo(() => selectedTraySnaps.filter((snap) => snap.isArchived), [selectedTraySnaps]);
  const selectedTitle = useMemo(() => (selectedSnap ? getSnapHeadline(selectedSnap) : undefined), [selectedSnap]);
  const activeError = error ?? snapsError;
  const createdSnapDestinationLabel = createdSnap?.shelfId
    ? shelves.find((shelf) => shelf.id === createdSnap.shelfId)?.name ?? 'Selected Shelf'
    : 'The Tray';

  function resetSheetFilters() {
    setStatus('active');
    setSelectedSource('all');
    setSelectedLabel('all');
    setSelectedDateRange('any');
  }

  function clearAllAppliedFilters() {
    resetSheetFilters();
    setFavoritesOnly(false);
    setSort('newest');
  }

  const handleEndReached = useCallback(() => {
    if (!isLoadingSnaps && !loadingMore && hasMore) {
      void loadMore();
    }
  }, [hasMore, isLoadingSnaps, loadMore, loadingMore]);

  async function runSnapMutation(snap: Snap, mutation: BusyAction, action: () => Promise<void>) {
    try {
      setBusySnapId(snap.id);
      setBusyAction(mutation);
      setError(null);
      await action();

      if (selectedSnap?.id === snap.id) {
        setSelectedSnap(null);
      }

      if ((mutation === 'edit' || mutation === 'archive' || mutation === 'delete') && detailSnap?.id === snap.id) {
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
      setDetailSnap((current) => (current?.id === snap.id ? { ...current, isFavorite: !snap.isFavorite } : current));
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

  async function handleToggleArchived(snap: Snap) {
    if (!user?.id) {
      return;
    }

    await runSnapMutation(snap, 'archive', async () => {
      await setSnapArchived(user.id, snap.id, !snap.isArchived);
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

  async function handleReplaceSnapImage(snap: Snap, sourceUri: string) {
    if (!user?.id) {
      return;
    }

    try {
      setBusySnapId(snap.id);
      setBusyAction('image');
      setError(null);
      const updatedSnap = await replaceSnapLocalImage(user.id, snap, sourceUri);
      setDetailSnap(updatedSnap);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to replace this image right now.');
      throw nextError;
    } finally {
      setBusySnapId(null);
      setBusyAction(null);
    }
  }

  async function handleRemoveSnapImageReference(snap: Snap) {
    if (!user?.id) {
      return;
    }

    try {
      setBusySnapId(snap.id);
      setBusyAction('image');
      setError(null);
      const updatedSnap = await removeSnapLocalImageReference(user.id, snap);
      setDetailSnap(updatedSnap);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to remove this image reference right now.');
      throw nextError;
    } finally {
      setBusySnapId(null);
      setBusyAction(null);
    }
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

  async function handleUndoCreatedSnap() {
    if (!createdSnap || !user?.id) {
      return;
    }

    try {
      setIsUndoingCreatedSnap(true);
      setConfirmationError(null);
      await deleteSnap(user.id, createdSnap.id, createdSnap.localPath, createdSnap.shelfId);
      setCreatedSnap(null);
    } catch (nextError) {
      setConfirmationError(nextError instanceof Error ? nextError.message : 'Unable to undo this save right now.');
    } finally {
      setIsUndoingCreatedSnap(false);
    }
  }

  async function runBulkAction(action: () => ReturnType<typeof bulkFavoriteSnaps>, successVerb: string) {
    try {
      setIsBulkBusy(true);
      setBulkMessage(null);
      const result = await action();
      selection.applyResult(result);
      setBulkMessage(result.failures.length > 0
        ? `${result.succeededIds.length} ${successVerb}; ${result.failures.length} could not be confirmed and remain selected.`
        : `${result.succeededIds.length} ${successVerb}.`);
      return result;
    } catch (nextError) {
      setBulkMessage(nextError instanceof Error ? nextError.message : 'Unable to update the selected Snaps.');
      return null;
    } finally {
      setIsBulkBusy(false);
    }
  }

  async function handleBulkMove(destination: Shelf | null) {
    if (!user?.id || !destination) {
      return;
    }

    const result = await runBulkAction(() => bulkMoveSnaps(user.id, [...selection.selectedIds], destination.id), 'moved');
    if (result) {
      setMovedSnapIds((current) => new Set([...current, ...result.succeededIds]));
      setIsBulkMoveVisible(false);
    }
  }

  function handleBulkDeleteConfirmation() {
    Alert.alert('Delete selected Snaps?', `This removes ${selection.selectedIds.size} selected Snaps and their current-device images.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void runBulkAction(() => bulkDeleteSnaps(user?.id ?? '', selectedTraySnaps), 'deleted') },
    ]);
  }

  return (
    <Screen>
      <FlatList
        data={visibleTraySnaps}
        keyExtractor={(snap) => snap.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: occupiedHeight + theme.spacing.md + (selection.isSelectionMode ? bulkBarHeight + theme.spacing.md : 0) }}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.35}
        ListHeaderComponent={(
          <>
            <AppHeader searchIconName="inbox" />

            <ScreenTitle
              title="The Tray"
              description="The Tray is your inbox for unorganized Snaps. Move keepers into Shelves, star what matters, archive the rest."
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, backgroundColor: theme.colors.surface, borderRadius: theme.radii.pill, borderWidth: 1, borderColor: theme.colors.borderSoft, paddingHorizontal: 16, marginBottom: theme.spacing.md }}>
              <Feather name="search" size={18} color={theme.colors.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search titles, thoughts, labels, or sources"
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                style={{ flex: 1, minHeight: 52, color: theme.colors.text, fontFamily: theme.typography.fonts.medium, fontSize: 15 }}
              />
              {searchQuery ? <Pressable onPress={() => setSearchQuery('')} hitSlop={10}><Feather name="x-circle" size={18} color={theme.colors.textMuted} /></Pressable> : null}
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
              <View style={{ flexGrow: 1, minWidth: isCompactWidth ? '47%' : 110 }}>
                <CompactControlPill label="Filters" icon="sliders" badgeCount={advancedFilterCount} fullWidth isActive={advancedFilterCount > 0} onPress={() => setIsFilterSheetVisible(true)} />
              </View>
              <View style={{ flexGrow: 1, minWidth: isCompactWidth ? '47%' : 110 }}>
                <CompactControlPill label="Sort" detail={isCompactWidth ? undefined : sortLabel} icon="arrow-down" fullWidth isActive={sort !== 'newest'} onPress={() => setIsSortSheetVisible(true)} />
              </View>
              <View style={{ flexGrow: 1, minWidth: isCompactWidth ? '47%' : 44 }}>
                <CompactControlPill label="Favorites" icon="heart" iconOnly={!isCompactWidth} fullWidth isActive={favoritesOnly} onPress={() => setFavoritesOnly((current) => !current)} accessibilityLabel={favoritesOnly ? 'Disable favorites filter' : 'Enable favorites filter'} />
              </View>
              <View style={{ flexGrow: 1, minWidth: isCompactWidth ? '47%' : 100 }}>
                <CompactControlPill label={selection.isSelectionMode ? 'Clear' : 'Select'} icon={selection.isSelectionMode ? 'x' : 'check-square'} fullWidth isActive={selection.isSelectionMode} onPress={selection.isSelectionMode ? selection.clear : selection.enter} disabled={isBulkBusy || visibleTraySnaps.length === 0} />
              </View>
            </View>

            {activeFilterCount > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.md }}>
                <Text style={textStyles.bodySm}>{visibleTraySnaps.length} matching loaded Snap{visibleTraySnaps.length === 1 ? '' : 's'}{hasMore ? '...' : ''}</Text>
                <Pressable onPress={clearAllAppliedFilters} hitSlop={10}><Text style={[textStyles.bodySm, { color: theme.colors.primary }]}>Clear filters</Text></Pressable>
              </View>
            ) : null}

            {selection.isSelectionMode ? (
              <Pressable
                onPress={selection.toggleAll}
                disabled={isBulkBusy}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selection.selectAllState }}
                accessibilityLabel={`${selection.selectAllState === true ? 'Deselect' : 'Select'} all ${visibleTraySnaps.length} visible loaded Snaps`}
                style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.md }}
              >
                <Feather name={selection.selectAllState === true ? 'check-square' : selection.selectAllState === 'mixed' ? 'minus-square' : 'square'} size={20} color={theme.colors.primary} />
                <Text style={textStyles.bodySm}>Select all {visibleTraySnaps.length} visible loaded Snaps{hasMore ? ' (more can be loaded)' : ''}</Text>
              </Pressable>
            ) : null}

            {bulkMessage ? <Text accessibilityLiveRegion="polite" style={[textStyles.bodySm, { color: theme.colors.primary, marginBottom: theme.spacing.md }]}>{bulkMessage}</Text> : null}

            {!isConfigured ? (
              <EmptyState
                title="Supabase setup still needs one restart"
                description="If you just added your .env values, restart Expo so The Tray can connect to Supabase."
              />
            ) : null}

            {activeError ? (
              <SurfaceCard style={{ marginBottom: theme.spacing.lg, padding: theme.spacing.lg }}>
                <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.sm }]}>Tray Error</Text>
                <Text style={textStyles.bodyMd}>{activeError}</Text>
              </SurfaceCard>
            ) : null}

            {connectionError && traySnaps.length > 0 ? (
              <Text accessibilityLiveRegion="polite" style={[textStyles.bodySm, { color: theme.colors.textMuted, marginBottom: theme.spacing.md }]}>Connection interrupted. Showing loaded Snaps while SnapShelf reconnects.</Text>
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
                  title={hasSearch || activeFilterCount > 0 ? 'No Snaps match' : 'Your Tray is clear'}
                  description={hasSearch || activeFilterCount > 0 ? 'Try a broader search or clear a filter.' : (__DEV__ ? 'Seed sample data from Settings or add a Quick Snap to test moving live Snaps into Shelves.' : 'New Snaps shared into SnapShelf land here first, then leave once you file them into Shelves.')}
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
          </>
        )}
        ListFooterComponent={loadingMore ? (
          <View style={{ alignItems: 'center', paddingVertical: theme.spacing.md }}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : null}
        renderItem={({ item: snap }) => (
          <TraySnapRow
            snap={snap}
            canMoveSnaps={canMoveSnaps}
            busyAction={busySnapId === snap.id ? busyAction : null}
            isBusy={busySnapId !== null}
            onOpen={() => setDetailSnap(snap)}
            onMove={() => setSelectedSnap(snap)}
            onToggleFavorite={() => {
              void handleToggleFavorite(snap);
            }}
            onToggleArchived={() => {
              void handleToggleArchived(snap);
            }}
            onDelete={() => handleConfirmDeleteSnap(snap)}
            isSelectionMode={selection.isSelectionMode}
            isSelected={selection.selectedIds.has(snap.id)}
            onToggleSelected={() => selection.toggle(snap.id)}
            selectionDisabled={isBulkBusy}
          />
        )}
      />

      {!selection.isSelectionMode ? <Pressable
        onPress={() => setIsCreateSnapVisible(true)}
        testID="create-snap-open-button"
        accessibilityRole="button"
        accessibilityLabel="Create Quick Snap"
        style={{
          position: 'absolute',
          right: theme.spacing.xl,
          bottom: overlayClearance,
          zIndex: 10,
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
          elevation: 12,
        }}
      >
        <Feather name="camera" size={20} color={theme.colors.surface} />
      </Pressable> : null}

      {selection.isSelectionMode ? (
        <SnapBulkActionBar
          selectedCount={selection.selectedIds.size}
          isBusy={isBulkBusy}
          onHeightChange={setBulkBarHeight}
          actions={[
            { label: 'Move', icon: 'folder', disabled: selection.selectedIds.size === 0 || !canMoveSnaps, onPress: () => setIsBulkMoveVisible(true) },
            { label: 'Favorite', icon: 'star', disabled: selection.selectedIds.size === 0, onPress: () => void runBulkAction(() => bulkFavoriteSnaps(user?.id ?? '', [...selection.selectedIds]), 'favorited') },
            ...(selectedActiveSnaps.length > 0 ? [{ label: 'Archive', icon: 'archive' as const, affectedCount: selectedActiveSnaps.length, onPress: () => void runBulkAction(() => bulkSetSnapsArchived(user?.id ?? '', selectedActiveSnaps.map((snap) => snap.id), true), 'archived') }] : []),
            ...(selectedArchivedSnaps.length > 0 ? [{ label: 'Restore', icon: 'rotate-ccw' as const, affectedCount: selectedArchivedSnaps.length, onPress: () => void runBulkAction(() => bulkSetSnapsArchived(user?.id ?? '', selectedArchivedSnaps.map((snap) => snap.id), false), 'restored') }] : []),
            { label: 'Delete', icon: 'trash-2', tone: 'destructive', disabled: selection.selectedIds.size === 0, onPress: handleBulkDeleteConfirmation },
            { label: 'Clear', icon: 'x', onPress: selection.clear },
          ]}
        />
      ) : null}

      <LibraryFilterSheet
        visible={isFilterSheetVisible}
        title="Refine The Tray"
        description="Filter Snaps that are currently in The Tray. Location stays fixed here."
        showLocationFilter={false}
        labelOptions={labelOptions}
        sourceOptions={snapSourceOptions}
        dateOptions={snapDateOptions}
        statusOptions={snapStatusOptions}
        selectedStatus={status}
        selectedSource={selectedSource}
        selectedLabel={selectedLabel}
        selectedDateRange={selectedDateRange}
        visibleSnapCount={visibleTraySnaps.length}
        onClose={() => setIsFilterSheetVisible(false)}
        onReset={resetSheetFilters}
        onSelectStatus={setStatus}
        onSelectSource={setSelectedSource}
        onSelectLabel={setSelectedLabel}
        onSelectDateRange={setSelectedDateRange}
      />

      <ActionSheetModal
        visible={isSortSheetVisible}
        title="Sort The Tray"
        description="Choose how the current Tray results should be ordered."
        actions={snapSortOptions.map((option) => ({ label: option.label, icon: option.value === sort ? 'check' : undefined, onPress: () => { setSort(option.value); setIsSortSheetVisible(false); } }))}
        onClose={() => setIsSortSheetVisible(false)}
      />

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

      <ShelfPickerModal
        visible={isBulkMoveVisible}
        shelves={shelves}
        title="Move Selected Snaps"
        description={`Choose a Shelf for ${selection.selectedIds.size} selected Snaps.`}
        isSubmitting={isBulkBusy}
        onClose={() => setIsBulkMoveVisible(false)}
        onSelect={handleBulkMove}
      />

      <CreateSnapModal
        visible={isCreateSnapVisible}
        userId={user?.id ?? null}
        shelves={shelves}
        titleText="Quick Snap"
        submitLabel="Save Snapshot"
        source="quick-snap"
        onClose={() => setIsCreateSnapVisible(false)}
        onCreated={(snap) => {
          setConfirmationError(null);
          setCreatedSnap(snap);
        }}
      />

      <PostSaveConfirmationModal
        snap={createdSnap}
        destinationLabel={createdSnapDestinationLabel}
        canFileNow={createdSnap?.shelfId === null && shelves.length > 0}
        isBusy={isUndoingCreatedSnap}
        error={confirmationError}
        onView={() => {
          if (createdSnap) {
            const snapId = createdSnap.id;
            setCreatedSnap(null);
            router.push(`/snap/${snapId}`);
          }
        }}
        onFileNow={() => {
          if (createdSnap) {
            setSelectedSnap(createdSnap);
            setCreatedSnap(null);
          }
        }}
        onUndo={() => void handleUndoCreatedSnap()}
        onDismiss={() => {
          const destinationShelfId = createdSnap?.shelfId;
          setCreatedSnap(null);
          if (destinationShelfId) {
            router.push(`/shelf/${destinationShelfId}`);
          }
        }}
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
        isFavoriteLoading={busySnapId === detailSnap?.id && busyAction === 'favorite'}
        isArchiveLoading={busySnapId === detailSnap?.id && busyAction === 'archive'}
        isDeleteLoading={busySnapId === detailSnap?.id && busyAction === 'delete'}
        isImageLoading={busySnapId === detailSnap?.id && busyAction === 'image'}
        error={activeError}
        onClose={() => setDetailSnap(null)}
        onSave={handleSaveSnapDetails}
        onToggleFavorite={handleToggleFavorite}
        onToggleArchived={handleToggleArchived}
        onReplaceImage={handleReplaceSnapImage}
        onRemoveImageReference={handleRemoveSnapImageReference}
        onDelete={handleConfirmDeleteSnap}
      />
    </Screen>
  );
}
