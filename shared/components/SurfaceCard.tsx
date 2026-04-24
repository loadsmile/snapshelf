import { ReactNode } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

import { theme } from '@/shared/theme';

type SurfaceCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function SurfaceCard({ children, style }: SurfaceCardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radii.xl,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.85)',
          ...theme.shadows.card,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
