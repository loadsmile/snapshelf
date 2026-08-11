import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { formatCapturedAt, getSnapHeadline, getSnapPalette, getSnapSourceLabel } from '@/features/snaps/presentation';
import { normalizeSourceUrl } from '@/features/snaps/source-url';
import type { Snap, UpdateSnapInput } from '@/features/snaps/types';
import { parseSnapLabels } from '@/features/snaps/utils';
import { getLocalImageAvailability, type LocalImageAvailability } from '@/features/images/local';
import type { Shelf } from '@/features/shelves/types';
import { FormField } from '@/shared/components/FormField';
import { PillButton } from '@/shared/components/PillButton';
import { SectionLabel } from '@/shared/components/SectionLabel';
import { SnapArtwork } from '@/shared/components/SnapArtwork';
import { SurfaceCard } from '@/shared/components/SurfaceCard';
import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

type SnapDetailModalProps = {
  visible: boolean;
  snap: Snap | null;
  shelves: Shelf[];
  isSaving?: boolean;
  isFavoriteLoading?: boolean;
  isArchiveLoading?: boolean;
  isDeleteLoading?: boolean;
  isImageLoading?: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: (snap: Snap, input: UpdateSnapInput) => Promise<void> | void;
  onToggleFavorite?: (snap: Snap) => Promise<void> | void;
  onToggleArchived?: (snap: Snap) => Promise<void> | void;
  onReplaceImage?: (snap: Snap, sourceUri: string) => Promise<void> | void;
  onRemoveImageReference?: (snap: Snap) => Promise<void> | void;
  onDelete?: (snap: Snap) => void;
};

function DetailActionButton({
  label,
  icon,
  tone = 'default',
  disabled,
  loading,
  onPress,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  tone?: 'default' | 'destructive';
  disabled: boolean;
  loading: boolean;
  onPress: () => void;
}) {
  const isDestructive = tone === 'destructive';
  const foregroundColor = isDestructive ? theme.colors.primary : theme.colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        flex: 1,
        minHeight: 72,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderRadius: theme.radii.lg,
        borderWidth: 1,
        borderColor: isDestructive ? 'rgba(198, 58, 6, 0.32)' : theme.colors.borderSoft,
        backgroundColor: theme.colors.background,
        opacity: disabled ? 0.58 : 1,
        paddingHorizontal: 8,
        paddingVertical: 10,
      }}
    >
      {loading ? <ActivityIndicator size="small" color={foregroundColor} /> : <Feather name={icon} size={16} color={foregroundColor} />}
      <Text numberOfLines={1} style={[textStyles.bodySm, { color: foregroundColor, fontSize: 12, lineHeight: 15 }]}>{label}</Text>
    </Pressable>
  );
}

export function SnapDetailModal({
  visible,
  snap,
  shelves,
  isSaving = false,
  isFavoriteLoading = false,
  isArchiveLoading = false,
  isDeleteLoading = false,
  isImageLoading = false,
  error,
  onClose,
  onSave,
  onToggleFavorite,
  onToggleArchived,
  onReplaceImage,
  onRemoveImageReference,
  onDelete,
}: SnapDetailModalProps) {
  const [title, setTitle] = useState('');
  const [thought, setThought] = useState('');
  const [labels, setLabels] = useState('');
  const [selectedShelfId, setSelectedShelfId] = useState<string | null>(null);
  const [sourceActionMessage, setSourceActionMessage] = useState<string | null>(null);
  const [imageAvailability, setImageAvailability] = useState<LocalImageAvailability>('not-needed');
  const [hasImageRenderError, setHasImageRenderError] = useState(false);
  const [imageActionError, setImageActionError] = useState<string | null>(null);
  const isActionBusy = isFavoriteLoading || isArchiveLoading || isDeleteLoading;
  const isBusy = isSaving || isActionBusy || isImageLoading;

  useEffect(() => {
    if (!snap || !visible) {
      return;
    }

    setTitle(snap.title ?? '');
    setThought(snap.thought ?? '');
    setLabels(snap.labels.join(', '));
    setSelectedShelfId(snap.shelfId);
    setSourceActionMessage(null);
    setHasImageRenderError(false);
    setImageActionError(null);
  }, [snap, visible]);

  useEffect(() => {
    let isActive = true;

    if (!snap || !visible) {
      setImageAvailability('not-needed');
      return () => {
        isActive = false;
      };
    }

    void getLocalImageAvailability(snap.localPath).then((availability) => {
      if (isActive) {
        setImageAvailability(availability);
      }
    });

    return () => {
      isActive = false;
    };
  }, [snap, visible]);

  const sourceUrl = useMemo(() => {
    if (!snap?.sourceUrl) {
      return null;
    }

    const normalizedSourceUrl = normalizeSourceUrl(snap.sourceUrl);
    return normalizedSourceUrl ? new URL(normalizedSourceUrl) : null;
  }, [snap?.sourceUrl]);

  const destinationLabel = useMemo(() => {
    if (!selectedShelfId) {
      return 'The Tray';
    }

    return shelves.find((shelf) => shelf.id === selectedShelfId)?.name ?? 'Selected Shelf';
  }, [selectedShelfId, shelves]);

  if (!snap) {
    return null;
  }

  const colors = getSnapPalette(snap);
  const capturedAt = formatCapturedAt(snap.capturedAt ?? snap.createdAt);
  const isImageMissing = imageAvailability === 'missing' || hasImageRenderError;
  const canRemoveImageReference = (imageAvailability === 'missing' || hasImageRenderError) && Boolean(snap.localPath);
  const imageFallbackLabel = imageAvailability === 'unavailable'
    ? 'Local images are unavailable right now'
    : isImageMissing
      ? 'Image missing from this device'
      : 'No image saved';

  async function handlePickReplacementImage() {
    if (!onReplaceImage || !snap) {
      return;
    }

    const currentSnap = snap;

    try {
      setImageActionError(null);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setImageActionError('Photo library permission is required to replace this image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        await onReplaceImage(currentSnap, result.assets[0].uri);
        setImageAvailability('available');
        setHasImageRenderError(false);
      } else if (!result.canceled) {
        setImageActionError('SnapShelf could not read that image. Try choosing it again.');
      }
    } catch (nextError) {
      setImageActionError(nextError instanceof Error ? nextError.message : 'Unable to replace this image right now.');
    }
  }

  async function handleRemoveImageReference() {
    if (!onRemoveImageReference || !snap) {
      return;
    }

    try {
      setImageActionError(null);
      await onRemoveImageReference(snap);
      setImageAvailability('not-needed');
      setHasImageRenderError(false);
    } catch (nextError) {
      setImageActionError(nextError instanceof Error ? nextError.message : 'Unable to remove this image reference right now.');
    }
  }

  function handleRequestRemoveImageReference() {
    if (hasImageRenderError && imageAvailability === 'available') {
      Alert.alert(
        'Remove unusable image?',
        'This file exists but cannot be displayed. Removing the reference also deletes this installation\'s local file.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: () => void handleRemoveImageReference() },
        ],
      );
      return;
    }

    void handleRemoveImageReference();
  }

  async function handleOpenSource() {
    if (!sourceUrl) {
      return;
    }

    try {
      const canOpen = await Linking.canOpenURL(sourceUrl.href);

      if (!canOpen) {
        setSourceActionMessage('This link cannot be opened on this device.');
        return;
      }

      await Linking.openURL(sourceUrl.href);
      setSourceActionMessage(null);
    } catch {
      setSourceActionMessage('This link could not be opened. Try copying it instead.');
    }
  }

  async function handleCopySource() {
    if (!sourceUrl) {
      return;
    }

    try {
      await Clipboard.setStringAsync(sourceUrl.href);
      setSourceActionMessage('Link copied.');
    } catch {
      setSourceActionMessage('This link could not be copied.');
    }
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable
        onPress={isBusy ? undefined : onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(46, 35, 26, 0.24)',
          justifyContent: 'flex-end',
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.xl,
        }}
      >
        <Pressable onPress={(event) => event.stopPropagation()}>
          <SurfaceCard style={{ maxHeight: '92%', padding: theme.spacing.md, borderRadius: theme.radii.xl }}>
            <View style={{ alignItems: 'center', marginBottom: theme.spacing.md }}>
              <View style={{ width: 44, height: 4, borderRadius: 2, backgroundColor: theme.colors.borderSoft }} />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[textStyles.titleMd, { marginBottom: 2 }]}>{getSnapHeadline(snap)}</Text>
                <Text style={textStyles.bodySm}>Review and refine this Snap so it stays findable later.</Text>
              </View>
              <Pressable onPress={onClose} disabled={isBusy} accessibilityRole="button" accessibilityLabel="Close Snap detail" style={{ padding: 6, opacity: isBusy ? 0.58 : 1 }}>
                <Feather name="x" size={20} color={theme.colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: theme.spacing.md }}>
              <SnapArtwork
                snap={snap}
                fallbackColors={colors}
                fallbackLabel={imageFallbackLabel}
                showChildrenOnFallback
                onImageError={() => setHasImageRenderError(true)}
                style={{
                  height: 220,
                  borderRadius: theme.radii.lg,
                  marginBottom: theme.spacing.md,
                  padding: theme.spacing.md,
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                  <SectionLabel label={destinationLabel} />
                  <SectionLabel label={getSnapSourceLabel(snap.source)} />
                  {snap.isFavorite ? <SectionLabel label="Favorite" /> : null}
                  {snap.isArchived ? <SectionLabel label="Archived" /> : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: theme.radii.pill, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.18)' }}>
                    <Feather name="clock" size={14} color={theme.colors.surface} />
                    <Text style={[textStyles.bodySm, { color: theme.colors.surface }]}>{capturedAt}</Text>
                  </View>
                </View>
              </SnapArtwork>

              {onReplaceImage ? (
                <View style={{ marginBottom: theme.spacing.md }}>
                  <Text style={[textStyles.eyebrow, { marginBottom: 8 }]}>Image On This Device</Text>
                  <SurfaceCard style={{ padding: theme.spacing.md, backgroundColor: theme.colors.background }}>
                    <Text style={[textStyles.bodySm, { marginBottom: theme.spacing.sm }]}>
                      {imageAvailability === 'unavailable'
                        ? 'Local storage cannot be checked right now. Your saved reference has not been changed.'
                        : isImageMissing
                          ? 'The metadata is safe, but this installation can no longer find its image.'
                          : 'Changing this image affects only this installation.'}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                      <PillButton
                        label={isImageLoading ? 'Saving Image...' : isImageMissing ? 'Replace Image' : 'Change Image'}
                        icon="image"
                        size="sm"
                        onPress={() => void handlePickReplacementImage()}
                        disabled={isBusy}
                      />
                      {canRemoveImageReference && onRemoveImageReference ? (
                        <PillButton
                          label="Remove Reference"
                          icon="x-circle"
                          variant="secondary"
                          size="sm"
                          onPress={handleRequestRemoveImageReference}
                          disabled={isBusy}
                        />
                      ) : null}
                    </View>
                    {imageActionError ? <Text style={[textStyles.bodySm, { color: theme.colors.primary, marginTop: theme.spacing.sm }]}>{imageActionError}</Text> : null}
                  </SurfaceCard>
                </View>
              ) : null}

              {sourceUrl ? (
                <View style={{ marginBottom: theme.spacing.md }}>
                  <Text style={[textStyles.eyebrow, { marginBottom: 8 }]}>Original Source</Text>
                  <SurfaceCard style={{ padding: theme.spacing.md, backgroundColor: theme.colors.background }}>
                    <Text numberOfLines={1} style={[textStyles.bodySm, { color: theme.colors.text, marginBottom: theme.spacing.sm }]}>
                      {sourceUrl.hostname.replace(/^www\./, '')}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                      <PillButton label="Open Original" icon="external-link" size="sm" onPress={() => void handleOpenSource()} disabled={isBusy} />
                      <PillButton label="Copy Link" icon="copy" variant="secondary" size="sm" onPress={() => void handleCopySource()} disabled={isBusy} />
                    </View>
                    {sourceActionMessage ? <Text style={[textStyles.bodySm, { marginTop: theme.spacing.sm }]}>{sourceActionMessage}</Text> : null}
                  </SurfaceCard>
                </View>
              ) : null}

              <View style={{ marginBottom: theme.spacing.md }}>
                <Text style={[textStyles.eyebrow, { marginBottom: 8 }]}>Curation</Text>
                <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                  {onToggleFavorite ? (
                    <DetailActionButton
                      label={snap.isFavorite ? 'Remove Favorite' : 'Favorite Snap'}
                      icon={snap.isFavorite ? 'heart' : 'star'}
                      disabled={isBusy}
                      loading={isFavoriteLoading}
                      onPress={() => {
                        void onToggleFavorite(snap);
                      }}
                    />
                  ) : null}
                  {onToggleArchived ? (
                    <DetailActionButton
                      label={snap.isArchived ? 'Restore Snap' : 'Archive Snap'}
                      icon={snap.isArchived ? 'rotate-ccw' : 'archive'}
                      disabled={isBusy}
                      loading={isArchiveLoading}
                      onPress={() => {
                        void onToggleArchived(snap);
                      }}
                    />
                  ) : null}
                  {onDelete ? (
                    <DetailActionButton
                      label="Delete Snap"
                      icon="trash-2"
                      tone="destructive"
                      disabled={isBusy}
                      loading={isDeleteLoading}
                      onPress={() => onDelete(snap)}
                    />
                  ) : null}
                </View>
              </View>

              <FormField label="Title" value={title} onChangeText={setTitle} placeholder="Give this Snap a title" maxLength={200} />
              <FormField label="Thought" value={thought} onChangeText={setThought} placeholder="Why did you save this?" multiline maxLength={10000} style={{ minHeight: 96, textAlignVertical: 'top' }} />
              <FormField label="Labels" value={labels} onChangeText={setLabels} placeholder="Interior Design, Wishlist" />
              <Text style={[textStyles.bodySm, { color: theme.colors.textMuted, marginTop: -theme.spacing.sm, marginBottom: theme.spacing.md }]}>Separate labels with commas. A few plain words work best.</Text>

              <View style={{ marginBottom: theme.spacing.md }}>
                <Text style={[textStyles.eyebrow, { marginBottom: 8 }]}>Destination</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 16 }}>
                  <PillButton label="The Tray" variant={selectedShelfId === null ? 'primary' : 'secondary'} size="sm" onPress={() => setSelectedShelfId(null)} disabled={isBusy} />
                  {shelves.map((shelf) => (
                    <PillButton key={shelf.id} label={shelf.name} variant={selectedShelfId === shelf.id ? 'primary' : 'secondary'} size="sm" onPress={() => setSelectedShelfId(shelf.id)} disabled={isBusy} />
                  ))}
                </ScrollView>
                <Text style={[textStyles.bodySm, { marginTop: 8 }]}>Saving to {destinationLabel}.</Text>
              </View>

              {error ? <Text style={[textStyles.bodySm, { color: theme.colors.primary, marginBottom: theme.spacing.md }]}>{error}</Text> : null}
            </ScrollView>

            <PillButton
              label={isSaving ? 'Saving Snap...' : 'Save Snap'}
              icon={isSaving ? undefined : 'check'}
              fullWidth
              onPress={() => {
                void onSave(snap, {
                  shelfId: selectedShelfId,
                  title: title.trim() || null,
                  thought: thought.trim() || null,
                  labels: parseSnapLabels(labels),
                });
              }}
              disabled={isBusy}
            />

            <View style={{ marginTop: theme.spacing.sm }}>
              <PillButton label="Cancel" variant="secondary" fullWidth onPress={onClose} disabled={isBusy} />
            </View>
          </SurfaceCard>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
