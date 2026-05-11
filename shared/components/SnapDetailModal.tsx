import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { formatCapturedAt, getSnapHeadline, getSnapPalette, getSnapSourceLabel } from '@/features/snaps/presentation';
import type { Snap, UpdateSnapInput } from '@/features/snaps/types';
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
  error?: string | null;
  onClose: () => void;
  onSave: (snap: Snap, input: UpdateSnapInput) => Promise<void> | void;
};

function parseLabels(value: string) {
  return value
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean);
}

export function SnapDetailModal({ visible, snap, shelves, isSaving = false, error, onClose, onSave }: SnapDetailModalProps) {
  const [title, setTitle] = useState('');
  const [thought, setThought] = useState('');
  const [labels, setLabels] = useState('');
  const [selectedShelfId, setSelectedShelfId] = useState<string | null>(null);

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
        onPress={isSaving ? undefined : onClose}
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
              <Pressable onPress={onClose} disabled={isSaving} accessibilityRole="button" accessibilityLabel="Close Snap detail" style={{ padding: 6, opacity: isSaving ? 0.58 : 1 }}>
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

              <FormField label="Title" value={title} onChangeText={setTitle} placeholder="Give this Snap a title" />
              <FormField label="Thought" value={thought} onChangeText={setThought} placeholder="Why did you save this?" multiline style={{ minHeight: 96, textAlignVertical: 'top' }} />
              <FormField label="Labels" value={labels} onChangeText={setLabels} placeholder="Interior Design, Wishlist" />

              <View style={{ marginBottom: theme.spacing.md }}>
                <Text style={[textStyles.eyebrow, { marginBottom: 8 }]}>Destination</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 16 }}>
                  <PillButton label="The Tray" variant={selectedShelfId === null ? 'primary' : 'secondary'} size="sm" onPress={() => setSelectedShelfId(null)} disabled={isSaving} />
                  {shelves.map((shelf) => (
                    <PillButton key={shelf.id} label={shelf.name} variant={selectedShelfId === shelf.id ? 'primary' : 'secondary'} size="sm" onPress={() => setSelectedShelfId(shelf.id)} disabled={isSaving} />
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
                  labels: parseLabels(labels),
                });
              }}
              disabled={isSaving}
            />

            <View style={{ marginTop: theme.spacing.sm }}>
              <PillButton label="Cancel" variant="secondary" fullWidth onPress={onClose} disabled={isSaving} />
            </View>
          </SurfaceCard>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
