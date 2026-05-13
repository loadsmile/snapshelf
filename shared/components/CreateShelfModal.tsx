import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import type { Shelf } from '@/features/shelves/types';
import type { Stack } from '@/features/stacks/types';
import { FormField } from '@/shared/components/FormField';
import { PillButton } from '@/shared/components/PillButton';
import { SurfaceCard } from '@/shared/components/SurfaceCard';
import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

type CreateShelfModalProps = {
  visible: boolean;
  shelves: Shelf[];
  stacks?: Stack[];
  isSubmitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (input: { name: string; stackId: string | null }) => Promise<void> | void;
};

export function CreateShelfModal({ visible, stacks = [], isSubmitting = false, error, onClose, onSubmit }: CreateShelfModalProps) {
  const [name, setName] = useState('');
  const [stackId, setStackId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const stackLabel = useMemo(() => {
    if (!stackId) {
      return 'No Stack Yet';
    }

    return stacks.find((stack) => stack.id === stackId)?.name ?? 'Stack';
  }, [stackId, stacks]);

  useEffect(() => {
    if (visible) {
      setName('');
      setStackId(null);
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
    await onSubmit({ name: trimmed, stackId });
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
            <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>Give this collection a name, then decide whether it belongs in a Stack on the Board.</Text>

            <FormField label="Shelf Name" value={name} onChangeText={setName} placeholder="Weekend Stays" autoCapitalize="words" />

            <View style={{ marginBottom: theme.spacing.md }}>
              <Text style={[textStyles.eyebrow, { marginBottom: 8 }]}>Stack</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 16 }}>
                <PillButton
                  label="No Stack Yet"
                  variant={stackId === null ? 'primary' : 'secondary'}
                  size="sm"
                  onPress={() => setStackId(null)}
                  disabled={isSubmitting}
                />
                {stacks.map((stack) => (
                  <PillButton
                    key={stack.id}
                    label={stack.name}
                    variant={stackId === stack.id ? 'primary' : 'secondary'}
                    size="sm"
                    onPress={() => setStackId(stack.id)}
                    disabled={isSubmitting}
                  />
                ))}
              </ScrollView>
              <Text style={[textStyles.bodySm, { marginTop: 8 }]}>{stackId ? `Stack this Shelf under ${stackLabel}.` : 'Keep this Shelf independent for now.'}</Text>
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
