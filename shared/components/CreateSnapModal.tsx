import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { createSnap, saveSnapImageLocally } from '@/features/snaps/api';
import type { SnapSource } from '@/features/snaps/types';
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
  onCreated?: () => void;
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
  return source === 'manual' ? 'Choose an image before adding this Snap to the Shelf.' : 'Choose an image before saving this Snap.';
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
}: CreateSnapModalProps) {
  const [title, setTitle] = useState('');
  const [thought, setThought] = useState('');
  const [labels, setLabels] = useState('');
  const [selectedShelfId, setSelectedShelfId] = useState<string | null>(defaultShelfId);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setTitle('');
      setThought('');
      setLabels('');
      setSelectedShelfId(defaultShelfId);
      setImageUri(null);
      setError(null);
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
        allowsEditing: true,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setImageUri(result.assets[0].uri);
      } else if (!result.canceled) {
        setError('SnapShelf could not read that image. Try choosing it again.');
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

    if (!imageUri) {
      setError(getImageErrorMessage(source));
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const localPath = await saveSnapImageLocally(imageUri);
      await createSnap(userId, {
        shelfId: selectedShelfId,
        title: title.trim() || null,
        thought: thought.trim() || null,
        labels: parseSnapLabels(labels),
        source,
        capturedAt: new Date(),
        imageUrl: null,
        localPath,
      });

      onCreated?.();
      onClose();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to save this Snap right now.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!visible) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
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
                height: 180,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: theme.spacing.md,
                overflow: 'hidden',
              }}
            >
              {imageUri ? (
                <Image
                  source={{ uri: imageUri }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                  onError={() => setError('SnapShelf cannot preview that image. Try choosing it again.')}
                />
              ) : (
                <Text style={textStyles.bodyMd}>{isPicking ? 'Opening library...' : copy.imagePrompt}</Text>
              )}
            </Pressable>

            <FormField label="Title" value={title} onChangeText={setTitle} testID="create-snap-title-input" placeholder="Scandinavian living room inspiration" returnKeyType="next" />
            <FormField label="Thought" value={thought} onChangeText={setThought} testID="create-snap-thought-input" placeholder={copy.thoughtPlaceholder} multiline style={{ minHeight: 96, textAlignVertical: 'top' }} />
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

            {error ? <Text style={[textStyles.bodySm, { color: theme.colors.primary, marginBottom: theme.spacing.md }]}>{error}</Text> : null}

            <PillButton label={isSubmitting ? 'Saving Snap...' : submitLabel} icon="image" fullWidth onPress={handleSubmit} disabled={isSubmitting || isPicking} testID="create-snap-save-button" />

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
