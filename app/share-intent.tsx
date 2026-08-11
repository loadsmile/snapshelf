import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ShareIntentFile } from 'expo-share-intent';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';

import { useAuth } from '@/features/auth/useAuth';
import { createSnap, deleteSnap, importSnapImages, MAX_SNAP_IMPORT_COUNT, moveSnapToShelf, type SnapImportProgress } from '@/features/snaps/api';
import { normalizeSourceUrl } from '@/features/snaps/source-url';
import type { Snap, SnapSource } from '@/features/snaps/types';
import { parseSnapLabels } from '@/features/snaps/utils';
import { subscribeToShelves } from '@/features/shelves/api';
import type { Shelf } from '@/features/shelves/types';
import { FormField } from '@/shared/components/FormField';
import { PillButton } from '@/shared/components/PillButton';
import { PostSaveConfirmationModal } from '@/shared/components/PostSaveConfirmationModal';
import { Screen } from '@/shared/components/Screen';
import { SnapArtwork } from '@/shared/components/SnapArtwork';
import { ShelfPickerModal } from '@/shared/components/ShelfPickerModal';
import { SurfaceCard } from '@/shared/components/SurfaceCard';
import { useRetainedShareIntentContext } from '@/shared/providers/RetainedShareIntentProvider';
import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

function getInitialTitle(input: { metaTitle?: string | null; webUrl?: string | null; text?: string | null; fileName?: string | null }) {
  if (input.metaTitle) {
    return input.metaTitle.slice(0, 200);
  }

  if (input.fileName) {
    return input.fileName.replace(/\.[a-zA-Z0-9]+$/, '').slice(0, 200);
  }

  if (input.webUrl) {
    return input.webUrl.slice(0, 200);
  }

  if (input.text) {
    return input.text.slice(0, 80);
  }

  return '';
}

function getFileTitle(fileName: string | null | undefined) {
  return fileName?.replace(/\.[a-zA-Z0-9]+$/, '').trim().slice(0, 200) || null;
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
  const [createdSnap, setCreatedSnap] = useState<Snap | null>(null);
  const [isConfirmationBusy, setIsConfirmationBusy] = useState(false);
  const [confirmationError, setConfirmationError] = useState<string | null>(null);
  const [isFilePickerVisible, setIsFilePickerVisible] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<ShareIntentFile[]>([]);
  const [progress, setProgress] = useState<SnapImportProgress | null>(null);
  const [batchSavedCount, setBatchSavedCount] = useState(0);
  const isCompletingShareRef = useRef(false);

  const incomingImageFiles = useMemo(
    () => (shareIntent.files ?? []).filter((file) => file.mimeType.startsWith('image/') && Boolean(file.path)),
    [shareIntent.files],
  );
  const hasTooManySharedImages = incomingImageFiles.length > MAX_SNAP_IMPORT_COUNT;
  const sharedFile = selectedFiles[0] ?? null;
  const imagePath = sharedFile?.path ?? null;
  const imageFilesKey = incomingImageFiles.map((file) => file.path).join('|');

  useEffect(() => {
    if (isReady && !hasShareIntent && !isCompletingShareRef.current) {
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
        fileName: incomingImageFiles[0]?.fileName ?? null,
      }),
    );
    setNote('');
    setLabels('');
    setSelectedShelfId(null);
    setError(hasTooManySharedImages ? `SnapShelf can import up to ${MAX_SNAP_IMPORT_COUNT} shared photos at a time. Select fewer photos and share again.` : null);
    setCreatedSnap(null);
    setConfirmationError(null);
    setIsFilePickerVisible(false);
    setSelectedFiles(incomingImageFiles.slice(0, MAX_SNAP_IMPORT_COUNT));
    setProgress(null);
    setBatchSavedCount(0);
  }, [imageFilesKey, shareIntent.meta?.title, shareIntent.text, shareIntent.webUrl]);

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

    if (selectedFiles.length > 1) {
      return `${selectedFiles.length} shared photos`;
    }

    return sharedFile?.fileName ?? 'Shared content is ready to save.';
  }, [selectedFiles.length, shareIntent.text, shareIntent.webUrl, sharedFile?.fileName]);

  const source = useMemo(
    () =>
      getShareSource({
        hasImage: selectedFiles.length > 0,
        text: shareIntent.text,
        webUrl: shareIntent.webUrl,
      }),
    [selectedFiles.length, shareIntent.text, shareIntent.webUrl],
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

    if (selectedFiles.length === 0 && !shareIntent.text && !shareIntent.webUrl) {
      setError('SnapShelf did not receive an image, link, or text to save. Try sharing it again.');
      return;
    }

    if (hasTooManySharedImages) {
      setError(`SnapShelf can import up to ${MAX_SNAP_IMPORT_COUNT} shared photos at a time. Select fewer photos and share again.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const noteParts = [note.trim()];
      const sourceUrl = normalizeSourceUrl(shareIntent.webUrl);

      const sharedText = shareIntent.text?.trim();
      if (sharedText && sharedText !== shareIntent.webUrl?.trim()) {
        noteParts.push(sharedText);
      }

      const sharedUrl = shareIntent.webUrl?.trim();
      if (sharedUrl && !sourceUrl) {
        noteParts.push(sharedUrl);
      }

      const sharedInput = {
        shelfId: selectedShelfId,
        thought: noteParts.filter(Boolean).join('\n\n') || null,
        labels: parseSnapLabels(labels),
        source,
        capturedAt: new Date(),
        sourceUrl,
      };

      if (selectedFiles.length > 0) {
        setProgress({ completed: 0, phase: 'copying', total: selectedFiles.length });
        const savedSnaps = await importSnapImages(
          user.id,
          selectedFiles.map((file) => ({
            title: selectedFiles.length === 1 ? title.trim() || getFileTitle(file.fileName) : getFileTitle(file.fileName),
            uri: file.path,
          })),
          sharedInput,
          setProgress,
        );

        if (savedSnaps.length === 1) {
          setCreatedSnap(savedSnaps[0]);
        } else {
          setBatchSavedCount(savedSnaps.length);
        }
      } else {
        const savedSnap = await createSnap(user.id, {
          ...sharedInput,
          title: title.trim() || null,
          imageUrl: null,
          localPath: null,
        });
        setCreatedSnap(savedSnap);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to save this Quick Snap right now.');
    } finally {
      setIsSubmitting(false);
      setProgress(null);
    }
  }

  function handleCancel() {
    if (isSubmitting) {
      return;
    }

    isCompletingShareRef.current = true;
    resetShareIntent();
    router.replace('/board');
  }

  function finishShare(path: '/board' | '/tray' | `/shelf/${string}` | `/snap/${string}`) {
    isCompletingShareRef.current = true;
    resetShareIntent();
    router.replace(path);
  }

  function finishShareToSnap(snap: Snap) {
    isCompletingShareRef.current = true;
    resetShareIntent();
    router.replace({
      pathname: '/snap/[id]',
      params: {
        id: snap.id,
        returnTo: snap.shelfId ? `/shelf/${snap.shelfId}` : '/tray',
      },
    });
  }

  async function handleUndoCreatedSnap() {
    if (!createdSnap || !user?.id) {
      return;
    }

    try {
      setIsConfirmationBusy(true);
      setConfirmationError(null);
      await deleteSnap(user.id, createdSnap.id, createdSnap.localPath, createdSnap.shelfId);
      setCreatedSnap(null);
      finishShare('/board');
    } catch (nextError) {
      setConfirmationError(nextError instanceof Error ? nextError.message : 'Unable to undo this save right now.');
    } finally {
      setIsConfirmationBusy(false);
    }
  }

  async function handleFileCreatedSnap(destination: Shelf | null) {
    if (!createdSnap || !user?.id || !destination) {
      return;
    }

    try {
      setIsConfirmationBusy(true);
      setConfirmationError(null);
      await moveSnapToShelf(user.id, createdSnap.id, destination.id);
      setCreatedSnap(null);
      setIsFilePickerVisible(false);
      finishShare(`/shelf/${destination.id}`);
    } catch (nextError) {
      setConfirmationError(nextError instanceof Error ? nextError.message : 'Unable to file this Snap right now.');
      setIsFilePickerVisible(false);
    } finally {
      setIsConfirmationBusy(false);
    }
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

  if (batchSavedCount > 1) {
    return (
      <Screen style={{ justifyContent: 'center' }}>
        <SurfaceCard style={{ padding: theme.spacing.lg }}>
          <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.sm }]}>Import Complete</Text>
          <Text style={[textStyles.displaySm, { marginBottom: theme.spacing.sm }]}>{batchSavedCount} Snaps saved</Text>
          <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>The shared photos were saved together in {destinationLabel}.</Text>
          <PillButton label="Continue" icon="arrow-right" fullWidth onPress={() => finishShare(selectedShelfId ? `/shelf/${selectedShelfId}` : '/tray')} testID="share-batch-continue-button" />
        </SurfaceCard>
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
        <Pressable onPress={handleCancel} disabled={isSubmitting} style={{ padding: 4, opacity: isSubmitting ? 0.58 : 1 }}>
          <Feather name="x" size={24} color={theme.colors.primary} />
        </Pressable>
        <Text style={textStyles.brand}>SnapShelf</Text>
        <View style={{ width: 28 }} />
      </View>

      <SurfaceCard style={{ padding: theme.spacing.lg }}>
        <Text style={[textStyles.displaySm, { marginBottom: theme.spacing.xs }]}>Quick Snap</Text>
        <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>{copy.description}</Text>

        {selectedFiles.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing.sm, paddingRight: theme.spacing.md, marginBottom: theme.spacing.md }}>
            {selectedFiles.map((file, index) => (
              <View key={`${file.path}-${index}`} style={{ width: 112 }}>
                <Image source={{ uri: file.path }} style={{ width: 112, height: 112, borderRadius: theme.radii.md }} resizeMode="cover" />
                <Pressable
                  onPress={() => setSelectedFiles((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove shared photo ${index + 1}`}
                  disabled={isSubmitting}
                  style={{ position: 'absolute', right: 6, top: 6, width: 28, height: 28, borderRadius: 14, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Feather name="x" size={16} color={theme.colors.primary} />
                </Pressable>
                <Text numberOfLines={1} style={[textStyles.bodySm, { marginTop: 4, textAlign: 'center' }]}>{index + 1} of {selectedFiles.length}</Text>
              </View>
            ))}
          </ScrollView>
        ) : (
          <SnapArtwork
            imageUri={imagePath}
            fallbackColors={['#EFE9DD', '#DDE4D5']}
            fallbackLabel={copy.fallbackLabel}
            showChildrenOnFallback
            style={{ height: 240, borderRadius: theme.radii.lg, marginBottom: theme.spacing.md, justifyContent: 'flex-end', padding: theme.spacing.md }}
          >
            <View style={{ backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderSoft, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 10 }}>
              <Text numberOfLines={2} style={textStyles.bodySm}>{helperText}</Text>
            </View>
          </SnapArtwork>
        )}

        {selectedFiles.length <= 1 ? (
          <FormField label="Title" value={title} onChangeText={setTitle} testID="share-title-input" placeholder="Give this Snap a title" maxLength={200} />
        ) : (
          <Text style={[textStyles.bodySm, { color: theme.colors.textMuted, marginBottom: theme.spacing.md }]}>Each Snap will use its photo filename as its title. Thought, labels, and destination apply to all {selectedFiles.length} Snaps.</Text>
        )}
        <FormField label="Quick Thought" value={note} onChangeText={setNote} testID="share-thought-input" placeholder={copy.thoughtPlaceholder} multiline maxLength={10000} style={{ minHeight: 96, textAlignVertical: 'top' }} />
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

        {progress ? <Text accessibilityLiveRegion="polite" style={[textStyles.bodySm, { marginBottom: theme.spacing.md }]}>{progress.phase === 'copying' ? `Preparing photo ${progress.completed} of ${progress.total}...` : `Saving ${progress.total} Snaps together...`}</Text> : null}
        {shareIntentError || error ? <Text accessibilityLiveRegion="assertive" style={[textStyles.bodySm, { color: theme.colors.primary, marginBottom: theme.spacing.md }]}>{error ?? shareIntentError}</Text> : null}

        <PillButton label={isSubmitting ? 'Saving Snaps...' : selectedFiles.length > 1 ? `Save ${selectedFiles.length} Snaps` : 'Save Snapshot'} icon="image" fullWidth onPress={handleSave} disabled={isSubmitting} testID="share-save-button" />

        <View style={{ marginTop: theme.spacing.sm }}>
          <PillButton label="Cancel" variant="secondary" fullWidth onPress={handleCancel} disabled={isSubmitting} />
        </View>
      </SurfaceCard>

      <PostSaveConfirmationModal
        snap={isFilePickerVisible ? null : createdSnap}
        destinationLabel={createdSnap?.shelfId ? shelves.find((shelf) => shelf.id === createdSnap.shelfId)?.name ?? 'Selected Shelf' : 'The Tray'}
        canFileNow={createdSnap?.shelfId === null && shelves.length > 0}
        isBusy={isConfirmationBusy}
        error={confirmationError}
        onView={() => {
          if (createdSnap) {
            finishShareToSnap(createdSnap);
          }
        }}
        onFileNow={() => setIsFilePickerVisible(true)}
        onUndo={() => void handleUndoCreatedSnap()}
        onDismiss={() => {
          if (createdSnap?.shelfId) {
            finishShare(`/shelf/${createdSnap.shelfId}`);
          } else {
            finishShare('/tray');
          }
        }}
      />

      <ShelfPickerModal
        visible={isFilePickerVisible}
        shelves={shelves}
        snapTitle={createdSnap?.title ?? undefined}
        title="File Saved Snap"
        description="Choose a Shelf for this Snap."
        isSubmitting={isConfirmationBusy}
        onClose={() => setIsFilePickerVisible(false)}
        onSelect={(destination) => void handleFileCreatedSnap(destination)}
      />
    </Screen>
  );
}
