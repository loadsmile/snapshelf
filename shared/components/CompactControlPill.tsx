import { Feather } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

export function CompactControlPill({
  label,
  detail,
  icon,
  badgeCount,
  iconOnly,
  fullWidth,
  isActive,
  onPress,
  accessibilityLabel,
  disabled = false,
}: {
  label: string;
  detail?: string;
  icon: keyof typeof Feather.glyphMap;
  badgeCount?: number;
  iconOnly?: boolean;
  fullWidth?: boolean;
  isActive: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
}) {
  const textColor = isActive ? theme.colors.surface : theme.colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled, selected: isActive }}
      style={[
        {
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
          borderRadius: theme.radii.pill, borderWidth: 1, minHeight: 44,
          paddingHorizontal: iconOnly ? 12 : 14, paddingVertical: 10,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        isActive
          ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
          : { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderSoft },
        isActive ? theme.shadows.button : null,
        disabled ? { opacity: 0.5 } : null,
      ]}
    >
      <Feather name={icon} size={15} color={textColor} />
      {!iconOnly ? <Text style={[textStyles.bodySm, { color: textColor }]}>{detail ? `${label}: ${detail}` : label}</Text> : null}
      {badgeCount && badgeCount > 0 ? (
        <View style={{ minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: isActive ? 'rgba(255,255,255,0.18)' : theme.colors.primary }}>
          <Text style={[textStyles.bodySm, { color: theme.colors.surface, fontSize: 11, lineHeight: 13 }]}>{badgeCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
