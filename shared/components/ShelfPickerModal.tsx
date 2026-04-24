import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import type { Shelf } from '@/features/shelves/types';
import { PillButton } from '@/shared/components/PillButton';
import { SurfaceCard } from '@/shared/components/SurfaceCard';
import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

type ShelfPickerModalProps = {
  visible: boolean;
  shelves: Shelf[];
  snapTitle?: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onSelect: (shelf: Shelf) => void;
};

export function ShelfPickerModal({
  visible,
  shelves,
  snapTitle,
  isSubmitting = false,
  onClose,
  onSelect,
}: ShelfPickerModalProps) {
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
            <Text style={[textStyles.displaySm, { marginBottom: theme.spacing.xs }]}>Move to Shelf</Text>
            <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>
              {snapTitle ? `Choose where to place “${snapTitle}”.` : 'Choose a Shelf for this Snap.'}
            </Text>

            <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
              {shelves.map((shelf) => (
                <Pressable
                  key={shelf.id}
                  onPress={() => onSelect(shelf)}
                  disabled={isSubmitting}
                  style={{
                    backgroundColor: theme.colors.background,
                    borderRadius: 22,
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: 16,
                    marginBottom: theme.spacing.sm,
                    borderWidth: 1,
                    borderColor: theme.colors.borderSoft,
                    opacity: isSubmitting ? 0.6 : 1,
                  }}
                >
                  <Text style={textStyles.titleMd}>{shelf.name}</Text>
                </Pressable>
              ))}

              {shelves.length === 0 ? <Text style={textStyles.bodyMd}>Create a Shelf first to move Snaps out of the Drop.</Text> : null}
            </ScrollView>

            <View style={{ marginTop: theme.spacing.lg }}>
              <PillButton label="Cancel" variant="secondary" fullWidth onPress={onClose} disabled={isSubmitting} />
            </View>
          </SurfaceCard>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
