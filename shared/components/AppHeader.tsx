import { Feather } from '@expo/vector-icons';
import { Image, Pressable, Text, View } from 'react-native';

import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

type AppHeaderProps = {
  onPressSearch?: () => void;
  searchIconName?: keyof typeof Feather.glyphMap;
  searchButtonTestID?: string;
};

export function AppHeader({ onPressSearch, searchIconName = 'search', searchButtonTestID }: AppHeaderProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.xl,
        paddingHorizontal: 4,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 38, height: 32, overflow: 'hidden' }}>
          <Image
            source={require('../../assets/adaptive-icon.png')}
            style={{ position: 'absolute', width: 76, height: 64, left: -19, top: -16 }}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </View>
        <Text style={textStyles.brand}>SnapShelf</Text>
      </View>
      {onPressSearch ? (
        <Pressable onPress={onPressSearch} hitSlop={10} testID={searchButtonTestID} style={{ padding: 2 }}>
          <Feather name={searchIconName} size={28} color={theme.colors.primary} />
        </Pressable>
      ) : (
        <Feather name={searchIconName} size={28} color={theme.colors.primary} />
      )}
    </View>
  );
}
