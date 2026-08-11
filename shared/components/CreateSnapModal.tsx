import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { importSnapImages, MAX_SNAP_IMPORT_COUNT, type SnapImportProgress } from '@/features/snaps/api';
import type { Snap, SnapSource } from '@/features/snaps/types';
import { parseSnapLabels } from '@/features/snaps/utils';
import type { Shelf } from '@/features/shelves/types';
import { FormField } from '@/shared/components/FormField';
import { PillButton } from '@/shared/components/PillButton';
import { SurfaceCard } from '@/shared/components/SurfaceCard';
import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

type CreateSnapModalProps = {
  visible: boolean;
  userId: string | null;
  shelves: Shelf[];
  defaultShelfId?: string | null;
  lockShelfSelection?: boolean;
  titleText?: string;
  submitLabel?: string;
  source?: SnapSource;
  onClose: () => void;
  onCreated?: (snap: Snap) => void;
  onSaved?: (snaps: Snap[]) => void;
};

type SelectedImage = {
  fileName: string | null;
  uri: string;
};

const sourceCopy: Record<SnapSource, { description: string; imagePrompt: string; thoughtPlaceholder: string; labelsPlaceholder: string }> = {
  'camera-roll': {
    description: 'Pick an image from your library. Title, thought, labels, and Shelf are optional context for finding it later.',
    imagePrompt: 'Choose image from library',
    thoughtPlaceholder: 'What should future you remember about this?',
    labelsPlaceholder: 'interiors, lighting, client idea',
  },
  instagram: {
    description: 'Save the image now, then add the few details that will make it easy to find later.',
    imagePrompt: 'Choose saved image',
    thoughtPlaceholder: 'What caught your eye?',
    labelsPlaceholder: 'style, color, wishlist',
  },
  manual: {
    description: 'Add a visual reference directly to this Shelf. A short thought or label can make it easier to retrieve later.',
    imagePrompt: 'Choose image for this Shelf',
    thoughtPlaceholder: 'Why does this belong here?',
    labelsPlaceholder: 'mood, material, layout',
  },
  'quick-snap': {
    description: 'Capture now and organize later. Add only the context you already know.',
    imagePrompt: 'Choose image for Quick Snap',
    thoughtPlaceholder: 'Why did you save this?',
    labelsPlaceholder: 'inspiration, kitchen, color',
  },
  'web-clip': {
    description: 'Save a visual reference from the web with just enough context to find it again.',
    imagePrompt: 'Choose image from the web clip',
    thoughtPlaceholder: 'What page, product, or idea is this for?',
    labelsPlaceholder: 'source, product, reference',
  },
  unknown: {
    description: 'Save the image now. Title, thought, labels, and Shelf can all stay optional.',
    imagePrompt: 'Choose image',
    thoughtPlaceholder: 'What should this remind you of?',
    labelsPlaceholder: 'inspiration, room, idea',
  },
};

function getImageErrorMessage(source: SnapSource) {
  return source === 'manual' ? 'Choose at least one image before adding Snaps to the Shelf.' : 'Choose at least one image before saving.';
}

function getImageTitle(fileName: string | null) {
  return fileName?.replace(/\.[a-zA-Z0-9]+$/, '').trim().slice(0, 200) || null;
}

export function CreateSnapModal({
  visible,
  userId,
  shelves,
  defaultShelfId = null,
  lockShelfSelection = false,
  titleText = 'Quick Snap',
  submitLabel = 'Save Snap',
  source = 'camera-roll',
  onClose,
  onCreated,
  onSaved,
}: CreateSnapModalProps) {
  const [title, setTitle] = useState('');
  const [thought, setThought] = useState('');
  const [labels, setLabels] = useState('');
  const [selectedShelfId, setSelectedShelfId] = useState<string | null>(defaultShelfId);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<SnapImportProgress | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    if (visible) {
      setTitle('');
      setThought('');
      setLabels('');
      setSelectedShelfId(defaultShelfId);
      setSelectedImages([]);
      setError(null);
      setProgress(null);
      setSavedCount(0);
      setIsSubmitting(false);
      setIsPicking(false);
    }
  }, [defaultShelfId, visible]);

  const destinationLabel = useMemo(() => {
    if (!selectedShelfId) {
      return 'The Tray';
    }

    return shelves.find((shelf) => shelf.id === selectedShelfId)?.name ?? 'Selected Shelf';
  }, [selectedShelfId, shelves]);

  const copy = sourceCopy[source];

  async function handlePickImage() {
    try {
      setIsPicking(true);
      setError(null);

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError('Photo library permission is required to add a Snap.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
        allowsMultipleSelection: true,
        orderedSelection: true,
        selectionLimit: MAX_SNAP_IMPORT_COUNT,
      });

      if (!result.canceled && result.assets.length > 0) {
        if (result.assets.length > MAX_SNAP_IMPORT_COUNT) {
          setSelectedImages([]);
          setError(`Choose no more than ${MAX_SNAP_IMPORT_COUNT} photos at a time.`);
          return;
        }

        setSelectedImages(
          result.assets.map((asset) => ({
            fileName: asset.fileName ?? null,
            uri: asset.uri,
          })),
        );
      } else if (!result.canceled) {
        setError('SnapShelf could not read those images. Try choosing them again.');
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to open the photo library.');
    } finally {
      setIsPicking(false);
    }
  }

  async function handleSubmit() {
    if (!userId) {
      setError('You need to be signed in to save a Snap.');
      return;
    }

    if (selectedImages.length === 0) {
      setError(getImageErrorMessage(source));
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setProgress({ completed: 0, phase: 'copying', total: selectedImages.length });

      const createdSnaps = await importSnapImages(userId, selectedImages.map((image) => ({
        title: selectedImages.length === 1 ? title.trim() || getImageTitle(image.fileName) : getImageTitle(image.fileName),
        uri: image.uri,
      })), {
        shelfId: selectedShelfId,
        thought: thought.trim() || null,
        labels: parseSnapLabels(labels),
        source,
        capturedAt: new Date(),
      }, setProgress);

      onSaved?.(createdSnaps);
      if (createdSnaps.length === 1) {
        onCreated?.(createdSnaps[0]);
        onClose();
      } else {
        setSavedCount(createdSnaps.length);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to save these Snaps right now.');
    } finally {
      setIsSubmitting(false);
      setProgress(null);
    }
  }

  if (!visible) {
    return null;
  }

  if (savedCount > 1) {
    return (
      <Modal visible animationType="fade" transparent onRequestClose={onClose}>
        <View style={{ flex: 1, backgroundColor: 'rgba(46, 35, 26, 0.24)', justifyContent: 'center', paddingHorizontal: theme.spacing.lg }}>
          <SurfaceCard style={{ padding: theme.spacing.lg }}>
            <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.sm }]}>Import Complete</Text>
            <Text style={[textStyles.displaySm, { marginBottom: theme.spacing.sm }]}>{savedCount} Snaps saved</Text>
            <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>Your photos are stored on this device and their shared context is ready in {destinationLabel}.</Text>
            <PillButton label="Continue" icon="arrow-right" fullWidth onPress={onClose} testID="create-snap-batch-continue-button" />
          </SurfaceCard>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={isSubmitting || isPicking ? () => undefined : onClose}>
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
          <SurfaceCard style={{ maxHeight: '92%', padding: theme.spacing.lg }}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[textStyles.displaySm, { marginBottom: theme.spacing.xs }]}>{titleText}</Text>
            <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>{copy.description}</Text>

            <Pressable
              onPress={handlePickImage}
              testID="create-snap-image-picker"
              style={{
                backgroundColor: theme.colors.background,
                borderRadius: theme.radii.lg,
                borderWidth: 1,
                borderColor: theme.colors.borderSoft,
                minHeight: selectedImages.length > 0 ? 52 : 180,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: theme.spacing.md,
                overflow: 'hidden',
              }}
            >
              <Text style={textStyles.bodyMd}>{isPicking ? 'Opening library...' : selectedImages.length > 0 ? 'Choose Different Photos' : `${copy.imagePrompt} (up to ${MAX_SNAP_IMPORT_COUNT})`}</Text>
            </Pressable>

            {selectedImages.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing.sm, paddingRight: theme.spacing.md, marginBottom: theme.spacing.md }}>
                {selectedImages.map((image, index) => (
                  <View key={`${image.uri}-${index}`} style={{ width: 104 }}>
                    <Image source={{ uri: image.uri }} style={{ width: 104, height: 104, borderRadius: theme.radii.md }} resizeMode="cover" onError={() => setError('SnapShelf cannot preview one of these images. Remove it and choose it again.')} />
                    <Pressable
                      onPress={() => setSelectedImages((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove photo ${index + 1}`}
                      disabled={isSubmitting}
                      style={{ position: 'absolute', right: 6, top: 6, width: 28, height: 28, borderRadius: 14, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={[textStyles.titleMd, { color: theme.colors.primary }]}>X</Text>
                    </Pressable>
                    <Text numberOfLines={1} style={[textStyles.bodySm, { marginTop: 4, textAlign: 'center' }]}>{index + 1} of {selectedImages.length}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : null}

            {selectedImages.length <= 1 ? (
              <FormField label="Title" value={title} onChangeText={setTitle} testID="create-snap-title-input" placeholder="Scandinavian living room inspiration" returnKeyType="next" maxLength={200} />
            ) : (
              <Text style={[textStyles.bodySm, { color: theme.colors.textMuted, marginBottom: theme.spacing.md }]}>Each Snap will use its photo filename as its title. Thought, labels, and destination apply to all {selectedImages.length} Snaps.</Text>
            )}
            <FormField label="Thought" value={thought} onChangeText={setThought} testID="create-snap-thought-input" placeholder={copy.thoughtPlaceholder} multiline maxLength={10000} style={{ minHeight: 96, textAlignVertical: 'top' }} />
            <FormField label="Labels" value={labels} onChangeText={setLabels} testID="create-snap-labels-input" placeholder={copy.labelsPlaceholder} autoCapitalize="none" />
            <Text style={[textStyles.bodySm, { color: theme.colors.textMuted, marginTop: -theme.spacing.sm, marginBottom: theme.spacing.md }]}>Separate labels with commas. A few plain words work best.</Text>

            {!lockShelfSelection ? (
              <View style={{ marginBottom: theme.spacing.md }}>
                <Text style={[textStyles.eyebrow, { marginBottom: 8 }]}>Destination</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 16 }}>
                  <PillButton
                    label="The Tray"
                    variant={selectedShelfId === null ? 'primary' : 'secondary'}
                    size="sm"
                    onPress={() => setSelectedShelfId(null)}
                    disabled={isSubmitting}
                    testID="create-snap-destination-tray"
                  />
                  {shelves.map((shelf) => (
                    <PillButton
                      key={shelf.id}
                      label={shelf.name}
                      variant={selectedShelfId === shelf.id ? 'primary' : 'secondary'}
                      size="sm"
                      onPress={() => setSelectedShelfId(shelf.id)}
                      disabled={isSubmitting}
                      testID={`create-snap-destination-shelf-${shelf.id}`}
                    />
                  ))}
                </ScrollView>
                <Text style={[textStyles.bodySm, { marginTop: 8 }]}>Saving to {destinationLabel}. {selectedShelfId ? 'This Snap will skip The Tray.' : 'You can sort it later.'}</Text>
              </View>
            ) : (
              <View style={{ marginBottom: theme.spacing.md }}>
                <Text style={[textStyles.eyebrow, { marginBottom: 8 }]}>Destination</Text>
                <Text style={textStyles.bodyMd}>Saving to {destinationLabel}.</Text>
              </View>
            )}

            {progress ? <Text accessibilityLiveRegion="polite" style={[textStyles.bodySm, { marginBottom: theme.spacing.md }]}>{progress.phase === 'copying' ? `Preparing photo ${progress.completed} of ${progress.total}...` : `Saving ${progress.total} Snaps together...`}</Text> : null}
            {error ? <Text accessibilityLiveRegion="assertive" style={[textStyles.bodySm, { color: theme.colors.primary, marginBottom: theme.spacing.md }]}>{error}</Text> : null}

            <PillButton label={isSubmitting ? 'Saving Snaps...' : selectedImages.length > 1 ? `Save ${selectedImages.length} Snaps` : submitLabel} icon="image" fullWidth onPress={handleSubmit} disabled={isSubmitting || isPicking} testID="create-snap-save-button" />

            <View style={{ marginTop: theme.spacing.sm }}>
              <PillButton label="Cancel" variant="secondary" fullWidth onPress={onClose} disabled={isSubmitting} />
            </View>
            </ScrollView>
          </SurfaceCard>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
