import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import {
  getOrganizationNameError,
  ORGANIZATION_NAME_MAX_LENGTH,
  validateOrganizationName,
  type OrganizationType,
} from '@/features/organizations/name';
import { FormField } from '@/shared/components/FormField';
import { PillButton } from '@/shared/components/PillButton';
import { SurfaceCard } from '@/shared/components/SurfaceCard';
import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

type RenameOrganizationModalProps = {
  visible: boolean;
  type: OrganizationType;
  currentName: string;
  isSubmitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void> | void;
};

export function RenameOrganizationModal({
  visible,
  type,
  currentName,
  isSubmitting = false,
  error,
  onClose,
  onSubmit,
}: RenameOrganizationModalProps) {
  const [name, setName] = useState(currentName);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(currentName);
      setLocalError(null);
    }
  }, [currentName, visible]);

  async function handleSubmit() {
    const nextError = getOrganizationNameError(name, type);

    if (nextError) {
      setLocalError(nextError);
      return;
    }

    setLocalError(null);
    await onSubmit(validateOrganizationName(name, type));
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable
        onPress={isSubmitting ? undefined : onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(46, 35, 26, 0.24)',
          justifyContent: 'center',
          paddingHorizontal: theme.spacing.lg,
        }}
      >
        <Pressable onPress={(event) => event.stopPropagation()}>
          <SurfaceCard style={{ padding: theme.spacing.lg }}>
            <Text style={[textStyles.displaySm, { marginBottom: theme.spacing.xs }]}>{`Rename ${type}`}</Text>
            <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>{`Choose a clear name that makes this ${type} easy to find.`}</Text>

            <FormField
              label={`${type} Name`}
              value={name}
              onChangeText={setName}
              error={localError}
              autoCapitalize="words"
              autoFocus
              maxLength={ORGANIZATION_NAME_MAX_LENGTH}
              returnKeyType="done"
              onSubmitEditing={() => void handleSubmit()}
            />

            {error ? <Text style={[textStyles.bodySm, { color: theme.colors.primary, marginBottom: theme.spacing.md }]}>{error}</Text> : null}

            <PillButton label={isSubmitting ? `Renaming ${type}...` : `Rename ${type}`} icon="edit-3" fullWidth onPress={handleSubmit} disabled={isSubmitting} />
            <View style={{ marginTop: theme.spacing.sm }}>
              <PillButton label="Cancel" variant="secondary" fullWidth onPress={onClose} disabled={isSubmitting} />
            </View>
          </SurfaceCard>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
