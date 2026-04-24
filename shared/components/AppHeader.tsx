import { Feather } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

type AppHeaderProps = {
  onPressSearch?: () => void;
  searchIconName?: keyof typeof Feather.glyphMap;
};

export function AppHeader({ onPressSearch, searchIconName = 'search' }: AppHeaderProps) {
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
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={textStyles.brand}>SnapShelf</Text>
      </View>
      {onPressSearch ? (
        <Pressable onPress={onPressSearch} hitSlop={10} style={{ padding: 2 }}>
          <Feather name={searchIconName} size={28} color={theme.colors.primary} />
        </Pressable>
      ) : (
        <Feather name={searchIconName} size={28} color={theme.colors.primary} />
      )}
    </View>
  );
}
