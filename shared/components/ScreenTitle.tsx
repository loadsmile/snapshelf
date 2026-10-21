import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

type ScreenTitleProps = {
  title: string;
  description?: string;
  marginBottom?: number;
};

export function ScreenTitle({ title, description, marginBottom = theme.spacing.lg }: ScreenTitleProps) {
  const [isDescriptionVisible, setIsDescriptionVisible] = useState(false);

  return (
    <View style={{ marginBottom }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md }}>
        <Text style={textStyles.displaySm}>{title}</Text>
        {description ? (
          <Pressable
            onPress={() => setIsDescriptionVisible((current) => !current)}
            accessibilityRole="button"
            accessibilityLabel={`${isDescriptionVisible ? 'Hide' : 'Show'} information about ${title}`}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: theme.colors.borderSoft,
              backgroundColor: theme.colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              ...theme.shadows.card,
            }}
          >
            <Feather name="info" size={19} color={theme.colors.primary} />
          </Pressable>
        ) : null}
      </View>
      {description && isDescriptionVisible ? (
        <Text style={[textStyles.bodySm, { maxWidth: '92%', marginTop: theme.spacing.sm }]}>{description}</Text>
      ) : null}
    </View>
  );
}
