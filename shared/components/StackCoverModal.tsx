import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';

import type { Stack } from '@/features/stacks/types';
import { PillButton } from '@/shared/components/PillButton';
import { SurfaceCard } from '@/shared/components/SurfaceCard';
import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

type StackCoverModalProps = {
  visible: boolean;
  stack: Stack | null;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onSelectManualImage: (uri: string) => void;
  onClearCover: () => void;
};

export function StackCoverModal({ visible, stack, isSubmitting, error, onClose, onSelectManualImage, onClearCover }: StackCoverModalProps) {
  const [isPicking, setIsPicking] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const canClearCover = Boolean(stack?.coverLocalPath);

  useEffect(() => {
    if (visible) {
      setPickError(null);
      setIsPicking(false);
    }
  }, [visible]);

  async function handlePickImage() {
    try {
      setIsPicking(true);
      setPickError(null);

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setPickError('Photo library permission is required to choose a Stack cover.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        onSelectManualImage(result.assets[0].uri);
      }
    } catch (nextError) {
      setPickError(nextError instanceof Error ? nextError.message : 'Unable to open the photo library.');
    } finally {
      setIsPicking(false);
    }
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable
        onPress={isSubmitting || isPicking ? undefined : onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(46, 35, 26, 0.24)',
          justifyContent: 'center',
          paddingHorizontal: theme.spacing.lg,
        }}
      >
        <Pressable onPress={(event) => event.stopPropagation()}>
          <SurfaceCard style={{ padding: theme.spacing.lg }}>
            <Text style={[textStyles.displaySm, { marginBottom: theme.spacing.xs }]}>Stack Cover</Text>
            <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>Choose a visual cover for this Stack. Snaps still live inside Shelves.</Text>

            <View style={{ gap: theme.spacing.sm }}>
              <PillButton label={isPicking ? 'Opening Library...' : 'Choose Photo'} icon="image" fullWidth onPress={handlePickImage} disabled={isSubmitting || isPicking} />
              {canClearCover ? <PillButton label="Clear Cover" icon="x" variant="secondary" fullWidth onPress={onClearCover} disabled={isSubmitting || isPicking} /> : null}
            </View>

            {isSubmitting ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={textStyles.bodySm}>Saving cover...</Text>
              </View>
            ) : null}

            {pickError || error ? <Text style={[textStyles.bodySm, { color: theme.colors.primary, marginTop: theme.spacing.md }]}>{pickError ?? error}</Text> : null}

            <View style={{ marginTop: theme.spacing.lg }}>
              <PillButton label="Cancel" variant="secondary" fullWidth onPress={onClose} disabled={isSubmitting || isPicking} />
            </View>
          </SurfaceCard>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
