import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { FormField } from '@/shared/components/FormField';
import { getOrganizationNameError, ORGANIZATION_NAME_MAX_LENGTH, validateOrganizationName } from '@/features/organizations/name';
import { PillButton } from '@/shared/components/PillButton';
import { SurfaceCard } from '@/shared/components/SurfaceCard';
import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

type CreateStackModalProps = {
  visible: boolean;
  isSubmitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (input: { name: string }) => Promise<void> | void;
};

export function CreateStackModal({ visible, isSubmitting = false, error, onClose, onSubmit }: CreateStackModalProps) {
  const [name, setName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName('');
      setLocalError(null);
    }
  }, [visible]);

  async function handleSubmit() {
    const validationError = getOrganizationNameError(name, 'Stack');

    if (validationError) {
      setLocalError(validationError);
      return;
    }

    setLocalError(null);
    await onSubmit({ name: validateOrganizationName(name, 'Stack') });
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
            <Text style={[textStyles.displaySm, { marginBottom: theme.spacing.xs }]}>New Stack</Text>
            <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>Create a visual group for related Shelves on your Board. Snaps still live inside Shelves.</Text>

            <FormField label="Stack Name" value={name} onChangeText={setName} error={localError} placeholder="Travel Ideas" autoCapitalize="words" maxLength={ORGANIZATION_NAME_MAX_LENGTH} />

            {error ? <Text style={[textStyles.bodySm, { color: theme.colors.primary, marginBottom: theme.spacing.md }]}>{error}</Text> : null}

            <PillButton label={isSubmitting ? 'Creating Stack...' : 'Create Stack'} icon="layers" fullWidth onPress={handleSubmit} disabled={isSubmitting} />

            <View style={{ marginTop: theme.spacing.sm }}>
              <PillButton label="Cancel" variant="secondary" fullWidth onPress={onClose} disabled={isSubmitting} />
            </View>
          </SurfaceCard>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
