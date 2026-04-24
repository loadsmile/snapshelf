import { Text, View } from 'react-native';

import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <View
      style={{
        marginTop: theme.spacing.lg,
        padding: theme.spacing.lg,
        borderRadius: theme.radii.lg,
        borderWidth: 1,
        borderColor: theme.colors.borderSoft,
        backgroundColor: 'rgba(255, 249, 243, 0.76)',
      }}
    >
      <Text style={[textStyles.titleMd, { marginBottom: theme.spacing.xs }]}>{title}</Text>
      <Text style={textStyles.bodyMd}>{description}</Text>
    </View>
  );
}
