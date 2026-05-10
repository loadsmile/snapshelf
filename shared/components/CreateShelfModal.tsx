import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import type { Shelf } from '@/features/shelves/types';
import { FormField } from '@/shared/components/FormField';
import { PillButton } from '@/shared/components/PillButton';
import { SurfaceCard } from '@/shared/components/SurfaceCard';
import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

type CreateShelfModalProps = {
  visible: boolean;
  shelves: Shelf[];
  isSubmitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (input: { name: string; anchorShelfId: string | null }) => Promise<void> | void;
};

export function CreateShelfModal({ visible, shelves = [], isSubmitting = false, error, onClose, onSubmit }: CreateShelfModalProps) {
  const [name, setName] = useState('');
  const [anchorShelfId, setAnchorShelfId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const anchorLabel = useMemo(() => {
    if (!anchorShelfId) {
      return 'No Thread Yet';
    }

    return shelves.find((shelf) => shelf.id === anchorShelfId)?.name ?? 'Anchor Shelf';
  }, [anchorShelfId, shelves]);

  useEffect(() => {
    if (visible) {
      setName('');
      setAnchorShelfId(null);
      setLocalError(null);
    }
  }, [visible]);

  async function handleSubmit() {
    const trimmed = name.trim();

    if (!trimmed) {
      setLocalError('Shelf name is required.');
      return;
    }

    setLocalError(null);
    await onSubmit({ name: trimmed, anchorShelfId });
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
            <Text style={[textStyles.displaySm, { marginBottom: theme.spacing.xs }]}>New Shelf</Text>
            <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>Give this collection a name, then decide whether it should start from another Shelf on the Board.</Text>

            <FormField label="Shelf Name" value={name} onChangeText={setName} placeholder="Weekend Stays" autoCapitalize="words" />

            <View style={{ marginBottom: theme.spacing.md }}>
              <Text style={[textStyles.eyebrow, { marginBottom: 8 }]}>Anchor Shelf</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 16 }}>
                <PillButton
                  label="No Thread Yet"
                  variant={anchorShelfId === null ? 'primary' : 'secondary'}
                  size="sm"
                  onPress={() => setAnchorShelfId(null)}
                  disabled={isSubmitting}
                />
                {shelves.map((shelf) => (
                  <PillButton
                    key={shelf.id}
                    label={shelf.name}
                    variant={anchorShelfId === shelf.id ? 'primary' : 'secondary'}
                    size="sm"
                    onPress={() => setAnchorShelfId(shelf.id)}
                    disabled={isSubmitting}
                  />
                ))}
              </ScrollView>
              <Text style={[textStyles.bodySm, { marginTop: 8 }]}>{anchorShelfId ? `Thread this Shelf from ${anchorLabel}.` : 'Keep this Shelf independent for now.'}</Text>
            </View>

            {localError || error ? <Text style={[textStyles.bodySm, { color: theme.colors.primary, marginBottom: theme.spacing.md }]}>{localError ?? error}</Text> : null}

            <PillButton
              label={isSubmitting ? 'Creating Shelf...' : 'Create Shelf'}
              icon="plus"
              fullWidth
              onPress={handleSubmit}
              disabled={isSubmitting}
            />

            <View style={{ marginTop: theme.spacing.sm }}>
              <PillButton label="Cancel" variant="secondary" fullWidth onPress={onClose} disabled={isSubmitting} />
            </View>
          </SurfaceCard>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
