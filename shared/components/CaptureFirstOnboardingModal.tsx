import { Feather } from '@expo/vector-icons';
import { Modal, Pressable, Text, View } from 'react-native';

import { PillButton } from '@/shared/components/PillButton';
import { SurfaceCard } from '@/shared/components/SurfaceCard';
import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

type CaptureFirstOnboardingModalProps = {
  onChoosePhotos: () => void;
  onSkip: () => void;
  visible: boolean;
};

export function CaptureFirstOnboardingModal({ onChoosePhotos, onSkip, visible }: CaptureFirstOnboardingModalProps) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onSkip}>
      <View style={{ flex: 1, backgroundColor: 'rgba(46, 35, 26, 0.32)', justifyContent: 'center', paddingHorizontal: theme.spacing.lg }}>
        <SurfaceCard style={{ padding: theme.spacing.lg }} testID="capture-first-onboarding-modal">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.lg }}>
            <Text style={textStyles.brand}>SnapShelf</Text>
            <Pressable onPress={onSkip} hitSlop={10} accessibilityRole="button" accessibilityLabel="Skip choosing first photos">
              <Feather name="x" size={22} color={theme.colors.textMuted} />
            </Pressable>
          </View>

          <View style={{ width: 66, height: 66, borderRadius: 28, backgroundColor: theme.colors.surfaceSoft, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.lg }}>
            <Feather name="image" size={26} color={theme.colors.primary} />
          </View>

          <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.xs }]}>Start With What You Saved</Text>
          <Text style={[textStyles.displaySm, { marginBottom: theme.spacing.sm }]}>Choose your first photos</Text>
          <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.md }]}>Import up to 20 images now. You can send them to The Tray or file them together in a Shelf.</Text>

          <View style={{ backgroundColor: theme.colors.surfaceSoft, borderRadius: theme.radii.lg, padding: theme.spacing.md, marginBottom: theme.spacing.lg }}>
            <Text style={[textStyles.titleMd, { marginBottom: theme.spacing.xs }]}>Images stay on this device</Text>
            <Text style={textStyles.bodySm}>SnapShelf syncs organization and notes to your account, but selected photo files remain in this device's protected app storage.</Text>
          </View>

          <PillButton label="Choose First Photos" icon="image" fullWidth onPress={onChoosePhotos} testID="capture-first-choose-photos-button" />
          <View style={{ marginTop: theme.spacing.sm }}>
            <PillButton label="Skip for Now" variant="secondary" fullWidth onPress={onSkip} testID="capture-first-skip-button" />
          </View>
        </SurfaceCard>
      </View>
    </Modal>
  );
}
