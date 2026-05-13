import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import type { Shelf } from '@/features/shelves/types';
import type { Stack } from '@/features/stacks/types';
import { PillButton } from '@/shared/components/PillButton';
import { SurfaceCard } from '@/shared/components/SurfaceCard';
import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

type EditThreadModalProps = {
  visible: boolean;
  shelves: Shelf[];
  stacks?: Stack[];
  currentStackId: string | null;
  legacyAnchorShelfName?: string | null;
  currentShelfId: string;
  isSubmitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (stackId: string | null) => Promise<void> | void;
};

export function EditThreadModal({
  visible,
  stacks = [],
  currentStackId,
  legacyAnchorShelfName,
  isSubmitting = false,
  error,
  onClose,
  onSubmit,
}: EditThreadModalProps) {
  const [selectedStackId, setSelectedStackId] = useState<string | null>(currentStackId);

  useEffect(() => {
    if (visible) {
      setSelectedStackId(currentStackId);
    }
  }, [currentStackId, visible]);

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
            <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>A Stack draws a visible thread on the Board, helping related Shelves stay grouped without becoming a Shelf itself.</Text>

            {legacyAnchorShelfName ? (
              <View style={{ marginBottom: theme.spacing.md, padding: theme.spacing.md, borderRadius: theme.radii.md, backgroundColor: theme.colors.background }}>
                <Text style={textStyles.bodySm}>This Shelf currently uses the legacy Shelf anchor “{legacyAnchorShelfName}”. Saving here will replace it with a Stack assignment.</Text>
              </View>
            ) : null}

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 260 }}>
              <PillButton
                label="No Stack Yet"
                variant={selectedStackId === null ? 'primary' : 'secondary'}
                fullWidth
                onPress={() => setSelectedStackId(null)}
                disabled={isSubmitting}
              />

              <View style={{ height: theme.spacing.sm }} />

              {stacks.map((stack) => (
                <View key={stack.id} style={{ marginBottom: theme.spacing.sm }}>
                  <PillButton
                    label={stack.name}
                    variant={selectedStackId === stack.id ? 'primary' : 'secondary'}
                    fullWidth
                    onPress={() => setSelectedStackId(stack.id)}
                    disabled={isSubmitting}
                  />
                </View>
              ))}

              {stacks.length === 0 ? (
                <View style={{ padding: theme.spacing.md, borderRadius: theme.radii.md, backgroundColor: theme.colors.background }}>
                  <Text style={textStyles.bodySm}>Create a Stack on the Board first, then assign this Shelf to it.</Text>
                </View>
              ) : null}
            </ScrollView>

            <Text style={[textStyles.bodySm, { marginTop: theme.spacing.sm }]}>{selectedStackId ? 'This Shelf will appear stacked under the selected Stack.' : 'This Shelf will stay independent on the Board.'}</Text>

            {error ? <Text style={[textStyles.bodySm, { color: theme.colors.primary, marginTop: theme.spacing.sm }]}>{error}</Text> : null}

            <View style={{ marginTop: theme.spacing.lg }}>
              <PillButton
                label={isSubmitting ? 'Saving Thread...' : 'Save Thread'}
                icon="link"
                fullWidth
                onPress={() => onSubmit(selectedStackId)}
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
