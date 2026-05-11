import { Feather } from '@expo/vector-icons';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { useAuth } from '@/features/auth/useAuth';
import {
  deleteSnap,
  moveSnapToShelf,
  setSnapArchived,
  setSnapFavorite,
  subscribeToAllSnaps,
  updateSnapDetails,
} from '@/features/snaps/api';
import { collectSnapLabels, filterLibrarySnaps, type SnapLibraryDateRange, type SnapLibrarySort, type SnapLibraryStatus } from '@/features/snaps/library';
import { formatCapturedAt, getSnapHeadline, getSnapPalette, getSnapSourceLabel } from '@/features/snaps/presentation';
import type { Snap, SnapSource, UpdateSnapInput } from '@/features/snaps/types';
import { subscribeToShelves } from '@/features/shelves/api';
import type { Shelf } from '@/features/shelves/types';
import { ActionSheetModal } from '@/shared/components/ActionSheetModal';
import { AppHeader } from '@/shared/components/AppHeader';
import { EmptyState } from '@/shared/components/EmptyState';
import { LibraryFilterSheet } from '@/shared/components/LibraryFilterSheet';
import { Screen } from '@/shared/components/Screen';
import { SectionLabel } from '@/shared/components/SectionLabel';
import { ShelfPickerModal } from '@/shared/components/ShelfPickerModal';
import { SnapDetailModal } from '@/shared/components/SnapDetailModal';
import { SnapArtwork } from '@/shared/components/SnapArtwork';
import { SurfaceCard } from '@/shared/components/SurfaceCard';
import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

const sourceOptions: Array<{ label: string; value: SnapSource | 'all' }> = [
  { label: 'All Sources', value: 'all' },
  { label: 'Camera Roll', value: 'camera-roll' },
  { label: 'Web Clip', value: 'web-clip' },
  { label: 'Instagram', value: 'instagram' },
  { label: 'Quick Snap', value: 'quick-snap' },
  { label: 'Manual', value: 'manual' },
];

const dateOptions: Array<{ label: string; value: SnapLibraryDateRange }> = [
  { label: 'Any Time', value: 'any' },
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
  { label: 'This Year', value: 'year' },
];

const sortOptions: Array<{ label: string; value: SnapLibrarySort }> = [
  { label: 'Newest', value: 'newest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'Updated', value: 'updated' },
  { label: 'Favorites First', value: 'favorites' },
];

const statusOptions: Array<{ label: string; value: SnapLibraryStatus }> = [
  { label: 'Active', value: 'active' },
  { label: 'Archived', value: 'archived' },
  { label: 'All', value: 'all' },
];

function CompactControlPill({
  label,
  detail,
  icon,
  badgeCount,
  iconOnly,
  fullWidth,
  isActive,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  detail?: string;
  icon: keyof typeof Feather.glyphMap;
  badgeCount?: number;
  iconOnly?: boolean;
  fullWidth?: boolean;
  isActive: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const textColor = isActive ? theme.colors.surface : theme.colors.text;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          borderRadius: theme.radii.pill,
          borderWidth: 1,
          minHeight: 44,
          paddingHorizontal: iconOnly ? 12 : 14,
          paddingVertical: 10,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        isActive
          ? {
              backgroundColor: theme.colors.primary,
              borderColor: theme.colors.primary,
            }
          : {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderSoft,
            },
        isActive ? theme.shadows.button : null,
      ]}
    >
      <Feather name={icon} size={15} color={textColor} />
      {!iconOnly ? <Text style={[textStyles.bodySm, { color: textColor }]}>{detail ? `${label}: ${detail}` : label}</Text> : null}
      {badgeCount && badgeCount > 0 ? (
        <View
          style={{
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            paddingHorizontal: 5,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isActive ? 'rgba(255,255,255,0.18)' : theme.colors.primary,
          }}
        >
          <Text style={[textStyles.bodySm, { color: theme.colors.surface, fontSize: 11, lineHeight: 13 }]}>{badgeCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function AppliedFilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <Pressable
      onPress={onClear}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: theme.radii.pill,
        borderWidth: 1,
        borderColor: theme.colors.borderSoft,
        backgroundColor: theme.colors.surface,
        paddingHorizontal: 12,
        paddingVertical: 9,
        maxWidth: '100%',
      }}
    >
      <Text style={[textStyles.bodySm, { color: theme.colors.text }]} numberOfLines={1}>{label}</Text>
      <Feather name="x" size={14} color={theme.colors.textMuted} />
    </Pressable>
  );
}

function formatSnapCount(count: number) {
  return `${count} Snap${count === 1 ? '' : 's'}`;
}

function formatSnapMatchCopy(count: number, context: string) {
  return `${formatSnapCount(count)} ${count === 1 ? 'matches' : 'match'} ${context}`;
}

function getLibraryResultCopy({
  visibleCount,
  totalCount,
  hasSearch,
  activeFilterCount,
}: {
  visibleCount: number;
  totalCount: number;
  hasSearch: boolean;
  activeFilterCount: number;
}) {
  if (totalCount === 0) {
    return 'No Snaps yet';
  }

  if (hasSearch && activeFilterCount > 0) {
    return formatSnapMatchCopy(visibleCount, 'your search and filters');
  }

  if (hasSearch) {
    return formatSnapMatchCopy(visibleCount, 'your search');
  }

  if (activeFilterCount > 0) {
    return formatSnapMatchCopy(visibleCount, 'your filters');
  }

  return `${formatSnapCount(totalCount)} in your Library`;
}

function getNoResultsCopy(hasSearch: boolean, activeFilterCount: number) {
  if (hasSearch && activeFilterCount > 0) {
    return {
      title: 'No Snaps match this search',
      description: 'Try a broader search, clear a filter, or switch status to All.',
    };
  }

  if (hasSearch) {
    return {
      title: 'No Snaps found',
      description: 'Try a different title, thought, shelf, label, or source.',
    };
  }

  return {
    title: 'No Snaps match these filters',
    description: 'Clear a filter, choose another shelf, or switch status to All.',
  };
}

function LibrarySnapCard({
  snap,
  shelfLabel,
  isBusy,
  onOpenContext,
  onOpenActions,
}: {
  snap: Snap;
  shelfLabel: string;
  isBusy: boolean;
  onOpenContext: () => void;
  onOpenActions: () => void;
}) {
  const colors = getSnapPalette(snap);

  return (
    <Pressable onPress={onOpenContext}>
      <SurfaceCard style={{ marginBottom: theme.spacing.lg, padding: theme.spacing.md }}>
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, maxWidth: '86%' }}>
              <SectionLabel label={shelfLabel} />
              <SectionLabel label={getSnapSourceLabel(snap.source)} />
              {snap.isFavorite ? <SectionLabel label="Favorite" /> : null}
              {snap.isArchived ? <SectionLabel label="Archived" /> : null}
            </View>
            {isBusy ? (
              <ActivityIndicator size="small" color={theme.colors.surface} />
            ) : (
              <Pressable
                onPress={(event) => {
                  event.stopPropagation();
                  onOpenActions();
                }}
                hitSlop={10}
                style={{ padding: 4 }}
              >
                <Feather name="more-vertical" size={18} color={theme.colors.surface} />
              </Pressable>
            )}
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                borderRadius: theme.radii.pill,
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: 'rgba(255,255,255,0.18)',
              }}
            >
              <Feather name={snap.isFavorite ? 'heart' : 'clock'} size={14} color={theme.colors.surface} />
              <Text style={[textStyles.bodySm, { color: theme.colors.surface }]}>{formatCapturedAt(snap.capturedAt ?? snap.createdAt)}</Text>
            </View>
          </View>
        </SnapArtwork>

        <Text style={[textStyles.titleMd, { marginBottom: theme.spacing.xs }]}>{getSnapHeadline(snap)}</Text>
        {snap.thought ? (
          <Text style={[textStyles.bodyMd, { marginBottom: snap.labels.length > 0 ? theme.spacing.sm : 0 }]} numberOfLines={3}>
            {snap.thought}
          </Text>
        ) : null}

        {snap.labels.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {snap.labels.slice(0, 4).map((label) => (
              <SectionLabel key={label} label={label} />
            ))}
          </View>
        ) : null}
      </SurfaceCard>
    </Pressable>
  );
}

export default function LibraryScreen() {
  const { width } = useWindowDimensions();
  const { isConfigured, user } = useAuth();
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [isLoadingSnaps, setIsLoadingSnaps] = useState(true);
  const [isLoadingShelves, setIsLoadingShelves] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState<SnapLibraryStatus>('active');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedShelfId, setSelectedShelfId] = useState<'all' | 'tray' | string>('all');
  const [selectedSource, setSelectedSource] = useState<SnapSource | 'all'>('all');
  const [selectedLabel, setSelectedLabel] = useState<string | 'all'>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<SnapLibraryDateRange>('any');
  const [sort, setSort] = useState<SnapLibrarySort>('newest');
  const [actionSnap, setActionSnap] = useState<Snap | null>(null);
  const [detailSnap, setDetailSnap] = useState<Snap | null>(null);
  const [moveSnap, setMoveSnap] = useState<Snap | null>(null);
  const [isFilterSheetVisible, setIsFilterSheetVisible] = useState(false);
  const [isSortSheetVisible, setIsSortSheetVisible] = useState(false);
  const [busySnapId, setBusySnapId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'move' | 'favorite' | 'archive' | 'delete' | 'edit' | null>(null);

  const deferredSearchQuery = useDeferredValue(searchQuery);
  const isCompactWidth = width < 390;
  const hasSearch = deferredSearchQuery.trim().length > 0;

  useEffect(() => {
    if (!user?.id) {
      setSnaps([]);
      setIsLoadingSnaps(false);
      return;
    }

    setIsLoadingSnaps(true);
    const unsubscribe = subscribeToAllSnaps(
      user.id,
      (nextSnaps) => {
        setSnaps(nextSnaps);
        setError(null);
        setIsLoadingSnaps(false);
      },
      (nextError) => {
        setError(nextError.message);
        setIsLoadingSnaps(false);
      },
    );

    return unsubscribe;
  }, [user?.id]);

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
        setError(null);
        setIsLoadingShelves(false);
      },
      (nextError) => {
        setError(nextError.message);
        setIsLoadingShelves(false);
      },
    );

    return unsubscribe;
  }, [user?.id]);

  const shelfNamesById = useMemo(() => new Map(shelves.map((shelf) => [shelf.id, shelf.name])), [shelves]);
  const labelOptions = useMemo(() => collectSnapLabels(snaps), [snaps]);
  const visibleSnaps = useMemo(
    () =>
      filterLibrarySnaps(
        snaps,
        {
          query: deferredSearchQuery,
          shelfId: selectedShelfId,
          source: selectedSource,
          label: selectedLabel,
          dateRange: selectedDateRange,
          status,
          favoritesOnly,
          sort,
        },
        shelfNamesById,
      ),
    [deferredSearchQuery, favoritesOnly, selectedDateRange, selectedLabel, selectedShelfId, selectedSource, shelfNamesById, snaps, sort, status],
  );
  const sortLabel = useMemo(() => sortOptions.find((option) => option.value === sort)?.label ?? 'Newest', [sort]);
  const sourceLabel = useMemo(() => sourceOptions.find((option) => option.value === selectedSource)?.label ?? 'Source', [selectedSource]);
  const dateRangeLabel = useMemo(() => dateOptions.find((option) => option.value === selectedDateRange)?.label ?? 'Date', [selectedDateRange]);
  const advancedFilterCount = useMemo(() => {
    let count = 0;

    if (status !== 'active') {
      count += 1;
    }

    if (selectedShelfId !== 'all') {
      count += 1;
    }

    if (selectedSource !== 'all') {
      count += 1;
    }

    if (selectedLabel !== 'all') {
      count += 1;
    }

    if (selectedDateRange !== 'any') {
      count += 1;
    }

    return count;
  }, [selectedDateRange, selectedLabel, selectedShelfId, selectedSource, status]);
  const appliedFilters = useMemo(() => {
    const filters: Array<{ key: string; label: string; onClear: () => void }> = [];

    if (selectedShelfId !== 'all') {
      filters.push({
        key: 'shelf',
        label: selectedShelfId === 'tray' ? 'Shelf: The Tray' : `Shelf: ${shelfNamesById.get(selectedShelfId) ?? 'Shelf'}`,
        onClear: () => setSelectedShelfId('all'),
      });
    }

    if (selectedSource !== 'all') {
      filters.push({
        key: 'source',
        label: `Source: ${sourceLabel}`,
        onClear: () => setSelectedSource('all'),
      });
    }

    if (selectedLabel !== 'all') {
      filters.push({
        key: 'label',
        label: `Label: ${selectedLabel}`,
        onClear: () => setSelectedLabel('all'),
      });
    }

    if (selectedDateRange !== 'any') {
      filters.push({
        key: 'date',
        label: `Date: ${dateRangeLabel}`,
        onClear: () => setSelectedDateRange('any'),
      });
    }

    if (favoritesOnly) {
      filters.push({
        key: 'favorites',
        label: 'Favorites only',
        onClear: () => setFavoritesOnly(false),
      });
    }

    if (status !== 'active') {
      filters.push({
        key: 'status',
        label: status === 'archived' ? 'Status: Archived' : 'Status: All',
        onClear: () => setStatus('active'),
      });
    }

    if (sort !== 'newest') {
      filters.push({
        key: 'sort',
        label: `Sort: ${sortLabel}`,
        onClear: () => setSort('newest'),
      });
    }

    return filters;
  }, [dateRangeLabel, favoritesOnly, selectedDateRange, selectedLabel, selectedShelfId, selectedSource, shelfNamesById, sort, sortLabel, sourceLabel, status]);
  const activeFilterCount = appliedFilters.length;
  const resultCopy = getLibraryResultCopy({
    visibleCount: visibleSnaps.length,
    totalCount: snaps.length,
    hasSearch,
    activeFilterCount,
  });
  const noResultsCopy = getNoResultsCopy(hasSearch, activeFilterCount);

  function resetSheetFilters() {
    setStatus('active');
    setSelectedShelfId('all');
    setSelectedSource('all');
    setSelectedLabel('all');
    setSelectedDateRange('any');
  }

  function clearAllAppliedFilters() {
    setStatus('active');
    setFavoritesOnly(false);
    resetSheetFilters();
    setSort('newest');
  }

  async function runSnapMutation(snap: Snap, mutation: 'move' | 'favorite' | 'archive' | 'delete' | 'edit', action: () => Promise<void>) {
    try {
      setBusySnapId(snap.id);
      setBusyAction(mutation);
      setError(null);
      await action();
      setActionSnap(null);
      setMoveSnap(null);
      if (mutation === 'edit') {
        setDetailSnap(null);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to update this Snap right now.');
    } finally {
      setBusySnapId(null);
      setBusyAction(null);
    }
  }

  async function handleMoveSnap(destination: Shelf | null) {
    if (!moveSnap || !user?.id) {
      return;
    }

    if (moveSnap.shelfId === (destination?.id ?? null)) {
      setMoveSnap(null);
      return;
    }

    await runSnapMutation(moveSnap, 'move', async () => {
      await moveSnapToShelf(user.id, moveSnap.id, destination?.id ?? null);
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

  async function handleToggleFavorite(snap: Snap) {
    if (!user?.id) {
      return;
    }

    await runSnapMutation(snap, 'favorite', async () => {
      await setSnapFavorite(user.id, snap.id, !snap.isFavorite);
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

  function handleConfirmDelete(snap: Snap) {
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

  return (
    <Screen style={{ paddingBottom: 118 }}>
      <AppHeader searchIconName="book-open" />

      <View style={{ marginBottom: theme.spacing.lg }}>
        <Text style={[textStyles.displaySm, { marginBottom: theme.spacing.xs }]}>Library</Text>
        <Text style={[textStyles.bodySm, { maxWidth: '92%' }]}>Find any Snap fast, whether it is still in The Tray, filed into a Shelf, or archived for later.</Text>
      </View>

      {!isConfigured ? (
        <EmptyState
          title="Restart Expo to activate Firebase"
          description="The Library will switch to live Snaps after Expo reloads with your Firebase config values."
        />
      ) : null}

      {error ? (
        <SurfaceCard style={{ marginBottom: theme.spacing.lg, padding: theme.spacing.lg }}>
          <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.sm }]}>Library Error</Text>
          <Text style={textStyles.bodyMd}>{error}</Text>
        </SurfaceCard>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radii.pill,
          borderWidth: 1,
          borderColor: theme.colors.borderSoft,
          paddingHorizontal: 16,
          marginBottom: theme.spacing.md,
        }}
      >
        <Feather name="search" size={18} color={theme.colors.textMuted} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search titles, thoughts, labels, shelves, or sources"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={{
            flex: 1,
            minHeight: 52,
            color: theme.colors.text,
            fontFamily: theme.typography.fonts.medium,
            fontSize: 15,
          }}
        />
        {searchQuery ? (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={10}>
            <Feather name="x-circle" size={18} color={theme.colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <View
        style={{
          flexDirection: isCompactWidth ? 'column' : 'row',
          alignItems: 'stretch',
          gap: theme.spacing.sm,
          marginBottom: activeFilterCount > 0 ? theme.spacing.sm : theme.spacing.md,
        }}
      >
        <View style={{ flex: 1 }}>
          <CompactControlPill
            label="Filters"
            icon="sliders"
            badgeCount={advancedFilterCount}
            fullWidth
            isActive={advancedFilterCount > 0}
            onPress={() => setIsFilterSheetVisible(true)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <CompactControlPill
            label="Sort"
            detail={isCompactWidth ? undefined : sortLabel}
            icon="arrow-down"
            fullWidth
            isActive={sort !== 'newest'}
            onPress={() => setIsSortSheetVisible(true)}
          />
        </View>
        <View style={isCompactWidth ? { alignSelf: 'stretch' } : undefined}>
          <CompactControlPill
            label="Favorites"
            icon="heart"
            iconOnly={!isCompactWidth}
            fullWidth={isCompactWidth}
            isActive={favoritesOnly}
            onPress={() => setFavoritesOnly((current) => !current)}
            accessibilityLabel={favoritesOnly ? 'Disable favorites filter' : 'Enable favorites filter'}
          />
        </View>
      </View>

      {activeFilterCount > 0 ? (
        <View style={{ marginBottom: theme.spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.sm, gap: theme.spacing.md }}>
            <Text style={[textStyles.bodySm, { color: theme.colors.textMuted }]}>Applied filters</Text>
            <Pressable onPress={clearAllAppliedFilters} hitSlop={10}>
              <Text style={[textStyles.bodySm, { color: theme.colors.primary }]}>Clear all</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {appliedFilters.map((filter) => (
              <AppliedFilterChip key={filter.key} label={filter.label} onClear={filter.onClear} />
            ))}
          </View>
        </View>
      ) : null}

      <View style={{ marginBottom: theme.spacing.md }}>
        <Text style={[textStyles.bodySm, { color: theme.colors.text }]}>{resultCopy}</Text>
        {activeFilterCount > 0 ? (
          <Text style={textStyles.bodySm}>{activeFilterCount} active refinement{activeFilterCount === 1 ? '' : 's'}</Text>
        ) : null}
      </View>

      {isLoadingSnaps || isLoadingShelves ? (
        <SurfaceCard style={{ padding: theme.spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={textStyles.bodyMd}>Loading your Library...</Text>
          </View>
        </SurfaceCard>
      ) : null}

      {!isLoadingSnaps && snaps.length === 0 ? (
        <EmptyState
          title="Your Library is still empty"
          description={__DEV__ ? 'Seed sample data from Settings to test full-account search and filtering.' : 'New Snaps from The Tray and your Shelves will appear here automatically.'}
        />
      ) : null}

      {!isLoadingSnaps && snaps.length > 0 && visibleSnaps.length === 0 ? (
        <EmptyState
          title={noResultsCopy.title}
          description={noResultsCopy.description}
        />
      ) : null}

      {!isLoadingSnaps && snaps.length > 0 && visibleSnaps.length > 0 ? (
        <FlatList
          style={{ flex: 1 }}
          data={visibleSnaps}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <LibrarySnapCard
              snap={item}
              shelfLabel={item.shelfId ? shelfNamesById.get(item.shelfId) ?? 'Shelf' : 'The Tray'}
              isBusy={busySnapId === item.id}
              onOpenContext={() => setDetailSnap(item)}
              onOpenActions={() => setActionSnap(item)}
            />
          )}
          contentContainerStyle={{ paddingTop: theme.spacing.sm, paddingBottom: 150 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      ) : null}

      <LibraryFilterSheet
        visible={isFilterSheetVisible}
        shelves={shelves}
        labelOptions={labelOptions}
        sourceOptions={sourceOptions}
        dateOptions={dateOptions}
        statusOptions={statusOptions}
        selectedStatus={status}
        selectedShelfId={selectedShelfId}
        selectedSource={selectedSource}
        selectedLabel={selectedLabel}
        selectedDateRange={selectedDateRange}
        visibleSnapCount={visibleSnaps.length}
        onClose={() => setIsFilterSheetVisible(false)}
        onReset={resetSheetFilters}
        onSelectStatus={setStatus}
        onSelectShelf={setSelectedShelfId}
        onSelectSource={setSelectedSource}
        onSelectLabel={setSelectedLabel}
        onSelectDateRange={setSelectedDateRange}
      />

      <ActionSheetModal
        visible={isSortSheetVisible}
        title="Sort Library"
        description="Choose how the current results should be ordered."
        actions={sortOptions.map((option) => ({
          label: option.label,
          icon: option.value === sort ? 'check' : undefined,
          onPress: () => {
            setSort(option.value);
            setIsSortSheetVisible(false);
          },
        }))}
        onClose={() => setIsSortSheetVisible(false)}
      />

      <ShelfPickerModal
        visible={moveSnap !== null}
        shelves={shelves}
        snapTitle={moveSnap ? getSnapHeadline(moveSnap) : undefined}
        title="Move Snap"
        description={moveSnap ? `Choose a new destination for "${getSnapHeadline(moveSnap)}".` : undefined}
        includeTrayOption
        trayLabel="The Tray"
        isSubmitting={busySnapId === moveSnap?.id && busyAction === 'move'}
        onClose={() => setMoveSnap(null)}
        onSelect={(destination) => {
          void handleMoveSnap(destination);
        }}
      />

      <ActionSheetModal
        visible={actionSnap !== null}
        title="Snap Actions"
        description={actionSnap ? `Update "${getSnapHeadline(actionSnap)}" without leaving the Library.` : undefined}
        actions={
          actionSnap
            ? [
                {
                  label: 'Edit Details',
                  icon: 'edit-3',
                  disabled: busySnapId !== null,
                  loading: busySnapId === actionSnap.id && busyAction === 'edit',
                  onPress: () => {
                    setDetailSnap(actionSnap);
                    setActionSnap(null);
                  },
                },
                {
                  label: 'Move Snap',
                  icon: 'folder',
                  disabled: busySnapId !== null,
                  onPress: () => {
                    setActionSnap(null);
                    setMoveSnap(actionSnap);
                  },
                },
                {
                  label: actionSnap.isFavorite ? 'Remove Favorite' : 'Favorite Snap',
                  icon: actionSnap.isFavorite ? 'heart' : 'star',
                  disabled: busySnapId !== null,
                  loading: busySnapId === actionSnap.id && busyAction === 'favorite',
                  onPress: () => {
                    void handleToggleFavorite(actionSnap);
                  },
                },
                {
                  label: actionSnap.isArchived ? 'Restore to Active' : 'Archive Snap',
                  icon: actionSnap.isArchived ? 'rotate-ccw' : 'archive',
                  disabled: busySnapId !== null,
                  loading: busySnapId === actionSnap.id && busyAction === 'archive',
                  onPress: () => {
                    void handleToggleArchived(actionSnap);
                  },
                },
                {
                  label: 'Delete Snap',
                  icon: 'trash-2',
                  tone: 'destructive' as const,
                  disabled: busySnapId !== null,
                  onPress: () => handleConfirmDelete(actionSnap),
                },
              ]
            : []
        }
        onClose={() => setActionSnap(null)}
      />

      <SnapDetailModal
        visible={detailSnap !== null}
        snap={detailSnap}
        shelves={shelves}
        isSaving={busySnapId === detailSnap?.id && busyAction === 'edit'}
        error={error}
        onClose={() => setDetailSnap(null)}
        onSave={handleSaveSnapDetails}
      />
    </Screen>
  );
}
