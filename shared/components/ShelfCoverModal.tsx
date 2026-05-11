import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { getSnapHeadline, getSnapPalette } from '@/features/snaps/presentation';
import type { Snap } from '@/features/snaps/types';
import type { Shelf } from '@/features/shelves/types';
import { PillButton } from '@/shared/components/PillButton';
import { SnapArtwork } from '@/shared/components/SnapArtwork';
import { SurfaceCard } from '@/shared/components/SurfaceCard';
import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

type ShelfCoverModalProps = {
  visible: boolean;
  shelf: Shelf | null;
  snaps: Snap[];
  isSubmitting: boolean;
  hasMoreSnaps?: boolean;
  isLoadingMoreSnaps?: boolean;
  error: string | null;
  onClose: () => void;
  onSelectManualImage: (uri: string) => void;
  onSelectSnap: (snap: Snap) => void;
  onClearCover: () => void;
  onLoadMoreSnaps?: () => void;
};

export function ShelfCoverModal({
  visible,
  shelf,
  snaps,
  isSubmitting,
  hasMoreSnaps = false,
  isLoadingMoreSnaps = false,
  error,
  onClose,
  onSelectManualImage,
  onSelectSnap,
  onClearCover,
  onLoadMoreSnaps,
}: ShelfCoverModalProps) {
  const [isPicking, setIsPicking] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const canClearCover = Boolean(shelf?.coverSnapId || shelf?.coverLocalPath);

  useEffect(() => {
    if (visible) {
      setPickError(null);
      setIsPicking(false);
    }
  }, [visible]);

  async function handlePickImage() {
    try {
      setIsPicking(true);
      setPickError(null);

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setPickError('Photo library permission is required to choose a Shelf cover.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        onSelectManualImage(result.assets[0].uri);
      }
    } catch (nextError) {
      setPickError(nextError instanceof Error ? nextError.message : 'Unable to open the photo library.');
    } finally {
      setIsPicking(false);
    }
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable
        onPress={isSubmitting || isPicking ? undefined : onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(46, 35, 26, 0.24)',
          justifyContent: 'center',
          paddingHorizontal: theme.spacing.lg,
        }}
      >
        <Pressable onPress={(event) => event.stopPropagation()}>
          <SurfaceCard style={{ maxHeight: '88%', padding: theme.spacing.lg }}>
            <Text style={[textStyles.displaySm, { marginBottom: theme.spacing.xs }]}>Shelf Cover</Text>
            <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>Choose a dedicated cover photo or use one of this Shelf's Snaps.</Text>

            <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.lg }}>
              <PillButton label={isPicking ? 'Opening Library...' : 'Choose Photo'} icon="image" fullWidth onPress={handlePickImage} disabled={isSubmitting || isPicking} />
              {canClearCover ? (
                <PillButton label="Clear Cover" icon="x" variant="secondary" fullWidth onPress={onClearCover} disabled={isSubmitting || isPicking} />
              ) : null}
            </View>

            <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.sm }]}>Snaps in this Shelf</Text>
            {snaps.length === 0 ? (
              <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>Add a Snap to this Shelf before using one as the cover.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing.sm, paddingBottom: theme.spacing.sm }}>
                {snaps.map((snap) => {
                  const isSelected = shelf?.coverSnapId === snap.id && !shelf.coverLocalPath;

                  return (
                    <Pressable
                      key={snap.id}
                      onPress={() => onSelectSnap(snap)}
                      disabled={isSubmitting || isPicking}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: theme.spacing.md,
                        borderRadius: theme.radii.lg,
                        borderWidth: 1,
                        borderColor: isSelected ? theme.colors.primary : theme.colors.borderSoft,
                        backgroundColor: theme.colors.background,
                        padding: theme.spacing.sm,
                      }}
                    >
                      <SnapArtwork
                        snap={snap}
                        fallbackColors={getSnapPalette(snap)}
                        style={{
                          width: 72,
                          height: 72,
                          borderRadius: 18,
                        }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[textStyles.titleMd, { marginBottom: 2 }]} numberOfLines={1}>{getSnapHeadline(snap)}</Text>
                        <Text style={textStyles.bodySm}>{isSelected ? 'Current cover' : 'Use as cover'}</Text>
                      </View>
                    </Pressable>
                  );
                })}
                {hasMoreSnaps && onLoadMoreSnaps ? (
                  <PillButton
                    label={isLoadingMoreSnaps ? 'Loading Snaps...' : 'Load More Snaps'}
                    icon="more-horizontal"
                    variant="secondary"
                    fullWidth
                    onPress={onLoadMoreSnaps}
                    disabled={isSubmitting || isPicking || isLoadingMoreSnaps}
                  />
                ) : null}
              </ScrollView>
            )}

            {isSubmitting ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={textStyles.bodySm}>Saving cover...</Text>
              </View>
            ) : null}

            {pickError || error ? <Text style={[textStyles.bodySm, { color: theme.colors.primary, marginTop: theme.spacing.md }]}>{pickError ?? error}</Text> : null}

            <View style={{ marginTop: theme.spacing.lg }}>
              <PillButton label="Cancel" variant="secondary" fullWidth onPress={onClose} disabled={isSubmitting || isPicking} />
            </View>
          </SurfaceCard>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
