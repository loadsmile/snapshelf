import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useAuth } from '@/features/auth/useAuth';
import { createSnap, saveSnapImageLocally } from '@/features/snaps/api';
import type { SnapSource } from '@/features/snaps/types';
import { parseSnapLabels } from '@/features/snaps/utils';
import { subscribeToShelves } from '@/features/shelves/api';
import type { Shelf } from '@/features/shelves/types';
import { FormField } from '@/shared/components/FormField';
import { PillButton } from '@/shared/components/PillButton';
import { Screen } from '@/shared/components/Screen';
import { SnapArtwork } from '@/shared/components/SnapArtwork';
import { SurfaceCard } from '@/shared/components/SurfaceCard';
import { useRetainedShareIntentContext } from '@/shared/providers/RetainedShareIntentProvider';
import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

function getInitialTitle(input: { metaTitle?: string | null; webUrl?: string | null; text?: string | null; fileName?: string | null }) {
  if (input.metaTitle) {
    return input.metaTitle;
  }

  if (input.fileName) {
    return input.fileName.replace(/\.[a-zA-Z0-9]+$/, '');
  }

  if (input.webUrl) {
    return input.webUrl;
  }

  if (input.text) {
    return input.text.slice(0, 80);
  }

  return '';
}

function getShareSource(input: { hasImage: boolean; text?: string | null; webUrl?: string | null }): SnapSource {
  if (input.webUrl) {
    return 'web-clip';
  }

  if (input.hasImage) {
    return 'camera-roll';
  }

  if (input.text) {
    return 'quick-snap';
  }

  return 'unknown';
}

function getShareCopy(input: { source: SnapSource; helperText: string }) {
  if (input.source === 'web-clip') {
    return {
      description: 'Review the web clip, add a quick thought or labels if helpful, then save it to The Tray or straight into a Shelf.',
      fallbackLabel: 'Web clip preview unavailable',
      thoughtPlaceholder: 'What page, product, or idea is this for?',
    };
  }

  if (input.source === 'camera-roll') {
    return {
      description: 'Review the shared image, add only the context you know now, then save it before it gets lost in your camera roll.',
      fallbackLabel: 'Shared image unavailable',
      thoughtPlaceholder: 'What should future you remember about this?',
    };
  }

  if (input.source === 'quick-snap') {
    return {
      description: 'Save this shared text as a Quick Snap. A title, thought, labels, and Shelf are optional but make it easier to find later.',
      fallbackLabel: 'Shared text',
      thoughtPlaceholder: 'Why did you save this?',
    };
  }

  return {
    description: input.helperText,
    fallbackLabel: 'Shared content unavailable',
    thoughtPlaceholder: 'What should this remind you of?',
  };
}

export default function ShareIntentScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { error: shareIntentError, hasShareIntent, isReady, resetShareIntent, shareIntent } = useRetainedShareIntentContext();
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [selectedShelfId, setSelectedShelfId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [labels, setLabels] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sharedFile = shareIntent.files?.[0] ?? null;
  const imagePath = sharedFile?.path ?? null;

  useEffect(() => {
    if (isReady && !hasShareIntent) {
      router.replace('/board');
    }
  }, [hasShareIntent, isReady, router]);

  useEffect(() => {
    if (__DEV__) {
      console.debug('[share-intent]', {
        isReady,
        hasShareIntent,
        type: shareIntent.type,
        files: shareIntent.files?.length ?? 0,
        webUrl: shareIntent.webUrl,
        error: shareIntentError,
      });
    }
  }, [hasShareIntent, isReady, shareIntent.files, shareIntent.type, shareIntent.webUrl, shareIntentError]);

  useEffect(() => {
    setTitle(
      getInitialTitle({
        metaTitle: shareIntent.meta?.title ?? null,
        webUrl: shareIntent.webUrl,
        text: shareIntent.text,
        fileName: sharedFile?.fileName ?? null,
      }),
    );
    setNote('');
    setLabels('');
    setSelectedShelfId(null);
    setError(null);
  }, [shareIntent.meta?.title, shareIntent.text, shareIntent.webUrl, sharedFile?.fileName]);

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

  const helperText = useMemo(() => {
    if (shareIntent.webUrl) {
      return shareIntent.webUrl;
    }

    if (shareIntent.text) {
      return shareIntent.text;
    }

    return sharedFile?.fileName ?? 'Shared content is ready to save.';
  }, [shareIntent.text, shareIntent.webUrl, sharedFile?.fileName]);

  const source = useMemo(
    () =>
      getShareSource({
        hasImage: Boolean(imagePath),
        text: shareIntent.text,
        webUrl: shareIntent.webUrl,
      }),
    [imagePath, shareIntent.text, shareIntent.webUrl],
  );

  const copy = useMemo(() => getShareCopy({ source, helperText }), [helperText, source]);

  const destinationLabel = useMemo(() => {
    if (!selectedShelfId) {
      return 'The Tray';
    }

    return shelves.find((shelf) => shelf.id === selectedShelfId)?.name ?? 'Selected Shelf';
  }, [selectedShelfId, shelves]);

  async function handleSave() {
    if (!user?.id) {
      setError('You need to be signed in to save a Quick Snap.');
      return;
    }

    if (!imagePath && !shareIntent.text && !shareIntent.webUrl) {
      setError('SnapShelf did not receive an image, link, or text to save. Try sharing it again.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      let localPath: string | null = null;
      if (imagePath) {
        localPath = await saveSnapImageLocally(imagePath);
      }

      const noteParts = [note.trim()];

      if (shareIntent.webUrl) {
        noteParts.push(shareIntent.webUrl);
      } else if (shareIntent.text && !imagePath) {
        noteParts.push(shareIntent.text);
      }

      await createSnap(user.id, {
        shelfId: selectedShelfId,
        title: title.trim() || null,
        thought: noteParts.filter(Boolean).join('\n\n') || null,
        labels: parseSnapLabels(labels),
        source,
        capturedAt: new Date(),
        imageUrl: null,
        localPath,
      });

      resetShareIntent();
      if (selectedShelfId) {
        router.replace(`/shelf/${selectedShelfId}`);
      } else {
        router.replace('/tray');
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to save this Quick Snap right now.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancel() {
    resetShareIntent();
    router.replace('/board');
  }

  if (!isReady) {
    return (
      <Screen style={{ justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', paddingHorizontal: theme.spacing.xl }}>
          <Text style={[textStyles.brand, { marginBottom: theme.spacing.sm }]}>SnapShelf</Text>
          <Text style={textStyles.bodyMd}>Receiving your Quick Snap...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable contentContainerStyle={{ flexGrow: 1, paddingBottom: 90 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: theme.spacing.xl,
        }}
      >
        <Pressable onPress={handleCancel} style={{ padding: 4 }}>
          <Feather name="x" size={24} color={theme.colors.primary} />
        </Pressable>
        <Text style={textStyles.brand}>SnapShelf</Text>
        <View style={{ width: 28 }} />
      </View>

      <SurfaceCard style={{ padding: theme.spacing.lg }}>
        <Text style={[textStyles.displaySm, { marginBottom: theme.spacing.xs }]}>Quick Snap</Text>
        <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>{copy.description}</Text>

        <SnapArtwork
          imageUri={imagePath}
          fallbackColors={['#EFE9DD', '#DDE4D5']}
          fallbackLabel={copy.fallbackLabel}
          showChildrenOnFallback
          style={{
            height: 240,
            borderRadius: theme.radii.lg,
            marginBottom: theme.spacing.md,
            justifyContent: 'flex-end',
            padding: theme.spacing.md,
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.borderSoft,
              borderRadius: 18,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            <Text numberOfLines={2} style={textStyles.bodySm}>{helperText}</Text>
          </View>
        </SnapArtwork>

        <FormField label="Title" value={title} onChangeText={setTitle} testID="share-title-input" placeholder="Give this Snap a title" />
        <FormField label="Quick Thought" value={note} onChangeText={setNote} testID="share-thought-input" placeholder={copy.thoughtPlaceholder} multiline style={{ minHeight: 96, textAlignVertical: 'top' }} />
        <FormField label="Labels" value={labels} onChangeText={setLabels} testID="share-labels-input" placeholder="interiors, wishlist, source" autoCapitalize="none" />
        <Text style={[textStyles.bodySm, { color: theme.colors.textMuted, marginTop: -theme.spacing.sm, marginBottom: theme.spacing.md }]}>Separate labels with commas. Leave blank if you just want to save fast.</Text>

        <View style={{ marginBottom: theme.spacing.md }}>
          <Text style={[textStyles.eyebrow, { marginBottom: 8 }]}>Save To</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 16 }}>
            <PillButton label="The Tray" variant={selectedShelfId === null ? 'primary' : 'secondary'} size="sm" onPress={() => setSelectedShelfId(null)} disabled={isSubmitting} testID="share-destination-tray" />
            {shelves.map((shelf) => (
              <PillButton
                key={shelf.id}
                label={shelf.name}
                variant={selectedShelfId === shelf.id ? 'primary' : 'secondary'}
                size="sm"
                onPress={() => setSelectedShelfId(shelf.id)}
                disabled={isSubmitting}
                testID={`share-destination-shelf-${shelf.id}`}
              />
            ))}
          </ScrollView>
          <Text style={[textStyles.bodySm, { marginTop: 8 }]}>Saving to {destinationLabel}. {selectedShelfId ? 'This Snap will skip The Tray.' : 'You can file it into a Shelf later.'}</Text>
        </View>

        {shareIntentError || error ? <Text style={[textStyles.bodySm, { color: theme.colors.primary, marginBottom: theme.spacing.md }]}>{error ?? shareIntentError}</Text> : null}

        <PillButton label={isSubmitting ? 'Saving Snapshot...' : 'Save Snapshot'} icon="image" fullWidth onPress={handleSave} disabled={isSubmitting} testID="share-save-button" />

        <View style={{ marginTop: theme.spacing.sm }}>
          <PillButton label="Cancel" variant="secondary" fullWidth onPress={handleCancel} disabled={isSubmitting} />
        </View>
      </SurfaceCard>
    </Screen>
  );
}
