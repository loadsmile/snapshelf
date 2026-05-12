import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { createSnap, saveSnapImageLocally } from '@/features/snaps/api';
import type { SnapSource } from '@/features/snaps/types';
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

function parseLabels(value: string) {
  return value
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean);
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
      return 'Saving to The Tray';
    }

    return shelves.find((shelf) => shelf.id === selectedShelfId)?.name ?? 'Selected Shelf';
  }, [selectedShelfId, shelves]);

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
      setError('Choose an image first.');
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
        labels: parseLabels(labels),
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
          <SurfaceCard style={{ padding: theme.spacing.lg }}>
            <Text style={[textStyles.displaySm, { marginBottom: theme.spacing.xs }]}>{titleText}</Text>
            <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>Choose an image, add a little context, and save it to The Tray or directly into a Shelf.</Text>

            <Pressable
              onPress={handlePickImage}
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
                <Text style={textStyles.bodyMd}>{isPicking ? 'Opening library...' : 'Choose image from library'}</Text>
              )}
            </Pressable>

            <FormField label="Title" value={title} onChangeText={setTitle} placeholder="Scandinavian living room inspiration" />
            <FormField label="Thought" value={thought} onChangeText={setThought} placeholder="A quick note about why this matters" multiline style={{ minHeight: 96, textAlignVertical: 'top' }} />
            <FormField label="Labels" value={labels} onChangeText={setLabels} placeholder="Interior Design, Mood Board" />

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
                  />
                  {shelves.map((shelf) => (
                    <PillButton
                      key={shelf.id}
                      label={shelf.name}
                      variant={selectedShelfId === shelf.id ? 'primary' : 'secondary'}
                      size="sm"
                      onPress={() => setSelectedShelfId(shelf.id)}
                      disabled={isSubmitting}
                    />
                  ))}
                </ScrollView>
                <Text style={[textStyles.bodySm, { marginTop: 8 }]}>{destinationLabel}</Text>
              </View>
            ) : (
              <View style={{ marginBottom: theme.spacing.md }}>
                <Text style={[textStyles.eyebrow, { marginBottom: 8 }]}>Destination</Text>
                <Text style={textStyles.bodyMd}>{destinationLabel}</Text>
              </View>
            )}

            {error ? <Text style={[textStyles.bodySm, { color: theme.colors.primary, marginBottom: theme.spacing.md }]}>{error}</Text> : null}

            <PillButton label={isSubmitting ? 'Saving Snap...' : submitLabel} icon="image" fullWidth onPress={handleSubmit} disabled={isSubmitting || isPicking} />

            <View style={{ marginTop: theme.spacing.sm }}>
              <PillButton label="Cancel" variant="secondary" fullWidth onPress={onClose} disabled={isSubmitting} />
            </View>
          </SurfaceCard>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
