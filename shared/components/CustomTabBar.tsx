import { Feather } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, Text, View } from 'react-native';

import { BoardIcon } from '@/shared/components/icons/BoardIcon';
import { BOTTOM_TAB_CONTENT_HEIGHT, useBottomTabGeometry } from '@/shared/hooks/useBottomTabGeometry';
import { theme, useThemeMode } from '@/shared/theme';

function renderIcon(routeName: string, color: string, focused: boolean) {
  if (routeName === 'board') {
    return <BoardIcon color={color} focused={focused} />;
  }

  if (routeName === 'library') {
    return <Feather name="book-open" size={24} color={color} />;
  }

  if (routeName === 'tray') {
    return <Feather name="inbox" size={24} color={color} />;
  }

  return <Feather name="settings" size={24} color={color} />;
}

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { bottomInset, barHeight } = useBottomTabGeometry();
  useThemeMode();

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: barHeight,
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.borderSoft,
        paddingBottom: bottomInset,
        flexDirection: 'row',
        shadowColor: theme.colors.shadow,
        shadowOpacity: 0.1,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -4 },
        elevation: 12,
        zIndex: 100,
      }}
    >
      {state.routes.map((route, index) => {
        const descriptor = descriptors[route.key];
        const label =
          typeof descriptor.options.tabBarLabel === 'string'
            ? descriptor.options.tabBarLabel
            : typeof descriptor.options.title === 'string'
              ? descriptor.options.title
              : route.name;
        const focused = state.index === index;
        const activeColor = focused ? theme.colors.surface : theme.colors.textMuted;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            testID={`tab-${route.name}`}
            style={{ flex: 1, minHeight: 44 }}
          >
            <View
              style={{
                borderRadius: 0,
                backgroundColor: focused ? theme.colors.primary : 'transparent',
                height: BOTTOM_TAB_CONTENT_HEIGHT,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 10,
                paddingVertical: 4,
                overflow: 'hidden',
              }}
            >
              {renderIcon(route.name, activeColor, focused)}
              <Text
                style={{
                  marginTop: 2,
                  fontFamily: theme.typography.fonts.medium,
                  fontSize: 11,
                  textTransform: 'uppercase',
                  color: activeColor,
                }}
              >
                {label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
