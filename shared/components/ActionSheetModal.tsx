import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';

import { PillButton } from '@/shared/components/PillButton';
import { SurfaceCard } from '@/shared/components/SurfaceCard';
import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

type ActionSheetItem = {
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  tone?: 'default' | 'destructive';
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
};

type ActionSheetModalProps = {
  visible: boolean;
  title: string;
  description?: string;
  actions: ActionSheetItem[];
  onClose: () => void;
};

export function ActionSheetModal({ visible, title, description, actions, onClose }: ActionSheetModalProps) {
  const isBusy = actions.some((action) => action.loading);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable
        onPress={isBusy ? undefined : onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(46, 35, 26, 0.24)',
          justifyContent: 'flex-end',
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.xl,
        }}
      >
        <Pressable onPress={(event) => event.stopPropagation()}>
          <SurfaceCard style={{ padding: theme.spacing.lg }}>
            <Text style={[textStyles.displaySm, { marginBottom: description ? theme.spacing.xs : theme.spacing.md }]}>{title}</Text>
            {description ? <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>{description}</Text> : null}

            <View style={{ gap: theme.spacing.sm }}>
              {actions.map((action) => {
                const isDestructive = action.tone === 'destructive';
                const iconColor = isDestructive ? theme.colors.primary : theme.colors.text;
                const textColor = isDestructive ? theme.colors.primary : theme.colors.text;

                return (
                  <Pressable
                    key={action.label}
                    onPress={action.onPress}
                    disabled={action.disabled || action.loading || isBusy}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: theme.spacing.md,
                      paddingVertical: 16,
                      borderRadius: 22,
                      backgroundColor: theme.colors.background,
                      borderWidth: 1,
                      borderColor: isDestructive ? theme.colors.primary : theme.colors.borderSoft,
                      opacity: action.disabled ? 0.58 : 1,
                    }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                        {action.icon ? <Feather name={action.icon} size={16} color={iconColor} /> : null}
                        <Text style={[textStyles.button, { color: textColor }]}>{action.label}</Text>
                      </View>

                    {action.loading ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Feather name="chevron-right" size={18} color={textColor} />}
                  </Pressable>
                );
              })}
            </View>

            <View style={{ marginTop: theme.spacing.lg }}>
              <PillButton label="Cancel" variant="secondary" fullWidth onPress={onClose} disabled={isBusy} />
            </View>
          </SurfaceCard>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
