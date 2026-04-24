import { Text, View } from 'react-native';

import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

type SectionLabelProps = {
  label: string;
};

export function SectionLabel({ label }: SectionLabelProps) {
  return (
    <View
      style={{
        backgroundColor: theme.colors.surfaceSoft,
        borderRadius: theme.radii.pill,
        paddingHorizontal: 11,
        paddingVertical: 6,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={textStyles.eyebrow}>{label}</Text>
    </View>
  );
}
