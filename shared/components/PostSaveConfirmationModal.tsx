import { Modal, Pressable, Text, View } from 'react-native';

import type { Snap } from '@/features/snaps/types';
import { PillButton } from '@/shared/components/PillButton';
import { SurfaceCard } from '@/shared/components/SurfaceCard';
import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

type PostSaveConfirmationModalProps = {
  snap: Snap | null;
  destinationLabel: string;
  canFileNow: boolean;
  isBusy?: boolean;
  error?: string | null;
  onView: () => void;
  onFileNow: () => void;
  onUndo: () => void;
  onDismiss: () => void;
};

export function PostSaveConfirmationModal({
  snap,
  destinationLabel,
  canFileNow,
  isBusy = false,
  error,
  onView,
  onFileNow,
  onUndo,
  onDismiss,
}: PostSaveConfirmationModalProps) {
  return (
    <Modal visible={snap !== null} animationType="fade" transparent onRequestClose={isBusy ? undefined : onDismiss}>
      <Pressable
        onPress={isBusy ? undefined : onDismiss}
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(46, 35, 26, 0.28)',
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.xl,
        }}
      >
        <Pressable onPress={(event) => event.stopPropagation()}>
          <SurfaceCard style={{ padding: theme.spacing.lg, borderRadius: theme.radii.xl }} testID="post-save-confirmation">
            <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.sm }]}>Saved</Text>
            <Text style={[textStyles.displaySm, { marginBottom: theme.spacing.xs }]}>Saved to {destinationLabel}</Text>
            <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>Your Snap is ready. View it now, keep moving, or undo this save.</Text>

            <View style={{ gap: theme.spacing.sm }}>
              <PillButton label="View Snap" icon="arrow-up-right" fullWidth onPress={onView} disabled={isBusy} testID="post-save-view" />
              {canFileNow ? <PillButton label="File Now" icon="folder" variant="secondary" fullWidth onPress={onFileNow} disabled={isBusy} testID="post-save-file" /> : null}
              <PillButton label={isBusy ? 'Undoing Save...' : 'Undo Save'} icon="rotate-ccw" variant="secondary" fullWidth onPress={onUndo} disabled={isBusy} testID="post-save-undo" />
              <PillButton label="Continue" variant="secondary" fullWidth onPress={onDismiss} disabled={isBusy} />
            </View>

            {error ? <Text style={[textStyles.bodySm, { color: theme.colors.primary, marginTop: theme.spacing.md }]}>{error}</Text> : null}
          </SurfaceCard>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
