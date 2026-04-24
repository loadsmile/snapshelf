import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { useAuth } from '@/features/auth/useAuth';
import { formatCapturedAt, getSnapHeadline, getSnapPalette, getSnapSourceLabel } from '@/features/snaps/presentation';
import { deleteSnap, moveSnapToShelf } from '@/features/snaps/api';
import type { Snap } from '@/features/snaps/types';
import { subscribeToShelves } from '@/features/shelves/api';
import type { Shelf } from '@/features/shelves/types';
import { ActionSheetModal } from '@/shared/components/ActionSheetModal';
import { AppHeader } from '@/shared/components/AppHeader';
import { CreateSnapModal } from '@/shared/components/CreateSnapModal';
import { EmptyState } from '@/shared/components/EmptyState';
import { PillButton } from '@/shared/components/PillButton';
import { Screen } from '@/shared/components/Screen';
import { SectionLabel } from '@/shared/components/SectionLabel';
import { SnapArtwork } from '@/shared/components/SnapArtwork';
import { ShelfPickerModal } from '@/shared/components/ShelfPickerModal';
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
        height: 280,
        borderRadius: theme.radii.lg,
        marginBottom: theme.spacing.md,
        padding: theme.spacing.lg,
        justifyContent: 'space-between',
      }}
    >
      <View
        style={{
          width: 92,
          height: 166,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.18)',
          backgroundColor: 'rgba(255,255,255,0.1)',
        }}
      />
      <View style={{ alignItems: 'flex-end' }}>
        <View
          style={{
            width: 124,
            height: 22,
            borderRadius: 999,
            backgroundColor: 'rgba(255,255,255,0.2)',
            marginBottom: 8,
          }}
        />
        {snap.thought ? (
          <View
            style={{
              maxWidth: 170,
              backgroundColor: 'rgba(255,255,255,0.28)',
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 18,
            }}
          >
            <Text numberOfLines={2} style={[textStyles.bodySm, { color: theme.colors.surface }]}>
              {snap.thought}
            </Text>
          </View>
        ) : null}
      </View>
    </SnapArtwork>
  );
}

export default function DropScreen() {
  const { isConfigured, user } = useAuth();
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [isLoadingShelves, setIsLoadingShelves] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSnap, setSelectedSnap] = useState<Snap | null>(null);
  const [actionSnap, setActionSnap] = useState<Snap | null>(null);
  const [isMovingSnap, setIsMovingSnap] = useState(false);
  const [deletingSnapId, setDeletingSnapId] = useState<string | null>(null);
  const [isCreateSnapVisible, setIsCreateSnapVisible] = useState(false);
  const { error: snapsError, loadMore, loading: isLoadingSnaps, loadingMore, snaps: dropSnaps } = usePaginatedSnaps(user?.id, null);

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

  const canMoveSnaps = shelves.length > 0 && !isLoadingShelves;
  const selectedTitle = useMemo(() => (selectedSnap ? getSnapHeadline(selectedSnap) : undefined), [selectedSnap]);
  const activeError = error ?? snapsError;

  async function handleSelectShelf(shelf: Shelf | null) {
    if (!selectedSnap || !user?.id || !shelf) {
      return;
    }

    try {
      setIsMovingSnap(true);
      await moveSnapToShelf(user.id, selectedSnap.id, shelf.id);
      setSelectedSnap(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to move this Snap right now.');
    } finally {
      setIsMovingSnap(false);
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

      if (selectedSnap?.id === snap.id) {
        setSelectedSnap(null);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to delete this Snap right now.');
    } finally {
      setDeletingSnapId(null);
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

      <View style={{ marginBottom: theme.spacing.xl }}>
        <Text style={[textStyles.displaySm, { marginBottom: theme.spacing.xs }]}>Unsorted Drop</Text>
        <Text style={textStyles.bodyMd}>
          Clear out your visual bookmarks and organize them into Shelves while the context is still fresh.
        </Text>
      </View>

      {!isConfigured ? (
        <EmptyState
          title="Firebase setup still needs one restart"
          description="If you just added your .env values, restart Expo so the live Drop can connect to Firestore."
        />
      ) : null}

      {activeError ? (
        <SurfaceCard style={{ marginBottom: theme.spacing.lg, padding: theme.spacing.lg }}>
          <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.sm }]}>Drop Error</Text>
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

      {!isLoadingSnaps && dropSnaps.length === 0 ? (
        <EmptyState
          title="Your Drop is clear"
          description={__DEV__ ? 'Seed sample data from Settings to test moving live Snaps into Shelves.' : 'New Snaps shared into SnapShelf will appear here until they are filed away.'}
        />
      ) : null}

      {dropSnaps.map((snap) => {
        const colors = getSnapPalette(snap);
        const isDeletingSnap = deletingSnapId === snap.id;

        return (
          <SurfaceCard key={snap.id} style={{ marginBottom: theme.spacing.lg, padding: theme.spacing.md }}>
            <SnapPreview colors={colors} snap={snap} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm }}>
              <SectionLabel label={getSnapSourceLabel(snap.source)} />
              {isDeletingSnap ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Pressable
                  onPress={() => setActionSnap(snap)}
                  disabled={isMovingSnap || deletingSnapId !== null}
                  hitSlop={10}
                >
                  <Feather name="more-vertical" size={18} color={theme.colors.textMuted} />
                </Pressable>
              )}
            </View>
            <Text style={[textStyles.titleMd, { marginBottom: theme.spacing.xs }]}>{getSnapHeadline(snap)}</Text>

            {snap.thought ? <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.sm }]}>{snap.thought}</Text> : null}

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginBottom: theme.spacing.md,
              }}
            >
              <Feather name="clock" size={13} color={theme.colors.textMuted} />
              <Text style={textStyles.bodySm}>{formatCapturedAt(snap.capturedAt ?? snap.createdAt)}</Text>
            </View>

            <PillButton
              label={canMoveSnaps ? 'Move to Shelf' : 'No Shelves Yet'}
              icon="folder"
              fullWidth
              onPress={() => setSelectedSnap(snap)}
              disabled={!canMoveSnaps || isMovingSnap || deletingSnapId !== null}
            />
          </SurfaceCard>
        );
      })}

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
        isSubmitting={isMovingSnap}
        onClose={() => setSelectedSnap(null)}
        onSelect={handleSelectShelf}
      />

      <ActionSheetModal
        visible={actionSnap !== null}
        title="Snap Actions"
        description={actionSnap ? `Choose what to do with "${getSnapHeadline(actionSnap)}".` : undefined}
        actions={
          actionSnap
            ? [
                {
                  label: 'Move to Shelf',
                  icon: 'folder',
                  disabled: !canMoveSnaps || isMovingSnap || deletingSnapId !== null,
                  onPress: () => {
                    setActionSnap(null);
                    setSelectedSnap(actionSnap);
                  },
                },
                {
                  label: 'Delete Snap',
                  icon: 'trash-2',
                  tone: 'destructive' as const,
                  disabled: deletingSnapId !== null,
                  onPress: () => handleConfirmDeleteSnap(actionSnap),
                },
              ]
            : []
        }
        onClose={() => setActionSnap(null)}
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
    </Screen>
  );
}
