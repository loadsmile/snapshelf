import { Text, TextInput, TextInputProps, View } from 'react-native';

import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

type FormFieldProps = TextInputProps & {
  label: string;
  error?: string | null;
};

export function FormField({ label, error, style, ...inputProps }: FormFieldProps) {
  return (
    <View style={{ marginBottom: theme.spacing.md }}>
      <Text style={[textStyles.eyebrow, { marginBottom: 8 }]}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.colors.textMuted}
        style={[
          {
            backgroundColor: theme.colors.background,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: error ? theme.colors.primary : theme.colors.borderSoft,
            color: theme.colors.text,
            fontFamily: theme.typography.fonts.medium,
            fontSize: 15,
            paddingHorizontal: 16,
            paddingVertical: 16,
          },
          style,
        ]}
        {...inputProps}
      />
      {error ? <Text style={[textStyles.bodySm, { color: theme.colors.primary, marginTop: 6 }]}>{error}</Text> : null}
    </View>
  );
}
