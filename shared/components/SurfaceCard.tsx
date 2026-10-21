import { ReactNode } from 'react';
import { type LayoutChangeEvent, StyleProp, View, ViewStyle } from 'react-native';

import { theme } from '@/shared/theme';

type SurfaceCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  modal?: boolean;
  testID?: string;
  onLayout?: (event: LayoutChangeEvent) => void;
};

export function SurfaceCard({ children, style, modal = false, testID, onLayout }: SurfaceCardProps) {
  return (
    <View
      testID={testID}
      onLayout={onLayout}
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radii.xl,
          borderColor: modal ? theme.colors.primary : theme.colors.borderSoft,
          borderWidth: modal ? 0.5 : 1,
          ...theme.shadows.card,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
