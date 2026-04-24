import { ReactNode } from 'react';
import { ScrollView, ScrollViewProps, StyleProp, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/shared/theme';

type ScreenProps = {
  children: ReactNode;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  scrollViewProps?: Omit<ScrollViewProps, 'contentContainerStyle' | 'showsVerticalScrollIndicator' | 'style'>;
};

export function Screen({ children, scrollable = false, style, contentContainerStyle, scrollViewProps }: ScreenProps) {
  const baseStyle: StyleProp<ViewStyle> = [
    {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingHorizontal: 22,
    },
    style,
  ];

  if (scrollable) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
        <ScrollView
          {...scrollViewProps}
          style={baseStyle}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            {
              paddingTop: theme.spacing.md,
              paddingBottom: theme.spacing.xxl,
            },
            contentContainerStyle,
          ]}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <View style={[baseStyle, { paddingTop: theme.spacing.md }]}>{children}</View>
    </SafeAreaView>
  );
}
