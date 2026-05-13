import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { formatCapturedAt, getSnapHeadline, getSnapPalette, getSnapSourceLabel } from '@/features/snaps/presentation';
import type { Snap, UpdateSnapInput } from '@/features/snaps/types';
import { parseSnapLabels } from '@/features/snaps/utils';
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
  error?: string | null;
  onClose: () => void;
  onSave: (snap: Snap, input: UpdateSnapInput) => Promise<void> | void;
  onToggleFavorite?: (snap: Snap) => Promise<void> | void;
  onToggleArchived?: (snap: Snap) => Promise<void> | void;
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
  error,
  onClose,
  onSave,
  onToggleFavorite,
  onToggleArchived,
  onDelete,
}: SnapDetailModalProps) {
  const [title, setTitle] = useState('');
  const [thought, setThought] = useState('');
  const [labels, setLabels] = useState('');
  const [selectedShelfId, setSelectedShelfId] = useState<string | null>(null);
  const isActionBusy = isFavoriteLoading || isArchiveLoading || isDeleteLoading;
  const isBusy = isSaving || isActionBusy;

  useEffect(() => {
    if (!snap || !visible) {
      return;
    }

    setTitle(snap.title ?? '');
    setThought(snap.thought ?? '');
    setLabels(snap.labels.join(', '));
    setSelectedShelfId(snap.shelfId);
  }, [snap, visible]);

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

              <FormField label="Title" value={title} onChangeText={setTitle} placeholder="Give this Snap a title" />
              <FormField label="Thought" value={thought} onChangeText={setThought} placeholder="Why did you save this?" multiline style={{ minHeight: 96, textAlignVertical: 'top' }} />
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
