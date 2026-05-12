import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useAuth } from '@/features/auth/useAuth';
import { createSnap, saveSnapImageLocally } from '@/features/snaps/api';
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

export default function ShareIntentScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { error: shareIntentError, hasShareIntent, isReady, resetShareIntent, shareIntent } = useRetainedShareIntentContext();
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [selectedShelfId, setSelectedShelfId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
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

  async function handleSave() {
    if (!user?.id) {
      setError('You need to be signed in to save a Quick Snap.');
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
        source: 'quick-snap',
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
        <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>Review what was shared, add a note if you want, then save it to The Tray or straight into a Shelf.</Text>

        <SnapArtwork
          imageUri={imagePath}
          fallbackColors={['#EFE9DD', '#DDE4D5']}
          fallbackLabel={imagePath ? 'Shared image unavailable' : 'No image preview'}
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

        <FormField label="Title" value={title} onChangeText={setTitle} placeholder="Give this Snap a title" />
        <FormField label="Quick Thought" value={note} onChangeText={setNote} placeholder="Why did you save this?" multiline style={{ minHeight: 96, textAlignVertical: 'top' }} />

        <View style={{ marginBottom: theme.spacing.md }}>
          <Text style={[textStyles.eyebrow, { marginBottom: 8 }]}>Save To</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 16 }}>
            <PillButton label="The Tray" variant={selectedShelfId === null ? 'primary' : 'secondary'} size="sm" onPress={() => setSelectedShelfId(null)} disabled={isSubmitting} />
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
        </View>

        {error ? <Text style={[textStyles.bodySm, { color: theme.colors.primary, marginBottom: theme.spacing.md }]}>{error}</Text> : null}

        <PillButton label={isSubmitting ? 'Saving Snapshot...' : 'Save Snapshot'} icon="image" fullWidth onPress={handleSave} disabled={isSubmitting} />

        <View style={{ marginTop: theme.spacing.sm }}>
          <PillButton label="Cancel" variant="secondary" fullWidth onPress={handleCancel} disabled={isSubmitting} />
        </View>
      </SurfaceCard>
    </Screen>
  );
}
