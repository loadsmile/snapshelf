import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import type { Shelf } from '@/features/shelves/types';
import { PillButton } from '@/shared/components/PillButton';
import { SurfaceCard } from '@/shared/components/SurfaceCard';
import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

type EditThreadModalProps = {
  visible: boolean;
  shelves: Shelf[];
  currentAnchorShelfId: string | null;
  currentShelfId: string;
  isSubmitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (anchorShelfId: string | null) => Promise<void> | void;
};

export function EditThreadModal({
  visible,
  shelves,
  currentAnchorShelfId,
  currentShelfId,
  isSubmitting = false,
  error,
  onClose,
  onSubmit,
}: EditThreadModalProps) {
  const [selectedAnchorShelfId, setSelectedAnchorShelfId] = useState<string | null>(currentAnchorShelfId);

  const selectableShelves = useMemo(
    () => shelves.filter((shelf) => shelf.id !== currentShelfId),
    [currentShelfId, shelves],
  );

  useEffect(() => {
    if (visible) {
      setSelectedAnchorShelfId(currentAnchorShelfId);
    }
  }, [currentAnchorShelfId, visible]);

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
            <Text style={[textStyles.displaySm, { marginBottom: theme.spacing.xs }]}>Edit Thread</Text>
            <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>Pick an Anchor Shelf for this Shelf, or leave it independent.</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 260 }}>
              <PillButton
                label="No Thread Yet"
                variant={selectedAnchorShelfId === null ? 'primary' : 'secondary'}
                fullWidth
                onPress={() => setSelectedAnchorShelfId(null)}
                disabled={isSubmitting}
              />

              <View style={{ height: theme.spacing.sm }} />

              {selectableShelves.map((shelf) => (
                <View key={shelf.id} style={{ marginBottom: theme.spacing.sm }}>
                  <PillButton
                    label={shelf.name}
                    variant={selectedAnchorShelfId === shelf.id ? 'primary' : 'secondary'}
                    fullWidth
                    onPress={() => setSelectedAnchorShelfId(shelf.id)}
                    disabled={isSubmitting}
                  />
                </View>
              ))}
            </ScrollView>

            {error ? <Text style={[textStyles.bodySm, { color: theme.colors.primary, marginTop: theme.spacing.sm }]}>{error}</Text> : null}

            <View style={{ marginTop: theme.spacing.lg }}>
              <PillButton
                label={isSubmitting ? 'Saving Thread...' : 'Save Thread'}
                icon="link"
                fullWidth
                onPress={() => onSubmit(selectedAnchorShelfId)}
                disabled={isSubmitting}
              />
            </View>

            <View style={{ marginTop: theme.spacing.sm }}>
              <PillButton label="Cancel" variant="secondary" fullWidth onPress={onClose} disabled={isSubmitting} />
            </View>
          </SurfaceCard>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
