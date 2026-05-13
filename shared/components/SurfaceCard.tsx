import { ReactNode } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

import { theme } from '@/shared/theme';

type SurfaceCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function SurfaceCard({ children, style, testID }: SurfaceCardProps) {
  return (
    <View
      testID={testID}
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radii.xl,
          borderWidth: 1,
          borderColor: theme.colors.borderSoft,
          ...theme.shadows.card,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
