import { Feather } from '@expo/vector-icons';
import { Pressable, Text } from 'react-native';

import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

type PillButtonProps = {
  label: string;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md';
  icon?: keyof typeof Feather.glyphMap;
  fullWidth?: boolean;
  onPress?: () => void;
  disabled?: boolean;
};

export function PillButton({
  label,
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth = false,
  onPress,
  disabled = false,
}: PillButtonProps) {
  const isPrimary = variant === 'primary';
  const verticalPadding = size === 'sm' ? 9 : 15;
  const horizontalPadding = size === 'sm' ? 16 : 18;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        {
          backgroundColor: isPrimary ? theme.colors.primary : theme.colors.surfaceSoft,
          borderRadius: theme.radii.pill,
          paddingVertical: verticalPadding,
          paddingHorizontal: horizontalPadding,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: disabled ? 0.58 : 1,
        },
        isPrimary && !disabled ? theme.shadows.button : null,
      ]}
    >
      {icon ? <Feather name={icon} size={16} color={isPrimary ? theme.colors.surface : theme.colors.text} /> : null}
      <Text
        style={[
          textStyles.button,
          { color: isPrimary ? theme.colors.surface : theme.colors.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
