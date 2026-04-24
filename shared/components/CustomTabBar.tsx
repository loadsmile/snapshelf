import { Feather } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BoardIcon } from '@/shared/components/icons/BoardIcon';
import { DropIcon } from '@/shared/components/icons/DropIcon';
import { theme } from '@/shared/theme';

function renderIcon(routeName: string, color: string, focused: boolean) {
  if (routeName === 'board') {
    return <BoardIcon color={color} focused={focused} />;
  }

  if (routeName === 'library') {
    return <Feather name="book-open" size={24} color={color} />;
  }

  if (routeName === 'drop') {
    return <DropIcon color={color} focused={focused} />;
  }

  return <Feather name="settings" size={24} color={color} />;
}

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        position: 'absolute',
        left: 18,
        right: 18,
        bottom: Math.max(insets.bottom, 10) + 8,
        backgroundColor: theme.colors.surface,
        borderRadius: 34,
        padding: 10,
        flexDirection: 'row',
        shadowColor: theme.colors.shadow,
        shadowOpacity: 0.1,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 12 },
        elevation: 10,
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
            style={{ flex: 1, marginHorizontal: 6 }}
          >
            <View
              style={{
                borderRadius: 28,
                backgroundColor: focused ? theme.colors.primary : 'transparent',
                minHeight: 72,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 10,
                paddingVertical: 10,
                overflow: 'hidden',
              }}
            >
              {renderIcon(route.name, activeColor, focused)}
              <Text
                style={{
                  marginTop: 8,
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
