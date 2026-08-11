import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { SurfaceCard } from '@/shared/components/SurfaceCard';
import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

type BulkAction = {
  affectedCount?: number;
  disabled?: boolean;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  tone?: 'default' | 'destructive';
};

export function SnapBulkActionBar({ actions, isBusy, selectedCount }: { actions: BulkAction[]; isBusy: boolean; selectedCount: number }) {
  return (
    <SurfaceCard style={{ position: 'absolute', left: theme.spacing.lg, right: theme.spacing.lg, bottom: 112, zIndex: 20, padding: theme.spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm, marginBottom: theme.spacing.xs }}>
        <Text accessibilityLiveRegion="polite" style={textStyles.titleMd}>{selectedCount} selected</Text>
        {isBusy ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing.xs }}>
        {actions.map((action) => (
          <Pressable
            key={action.label}
            onPress={action.onPress}
            disabled={isBusy || action.disabled}
            accessibilityRole="button"
            accessibilityLabel={`${action.label} ${action.affectedCount ?? selectedCount} selected Snaps`}
            accessibilityState={{ disabled: isBusy || action.disabled, busy: isBusy }}
            style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: theme.radii.pill, backgroundColor: theme.colors.surfaceSoft, opacity: isBusy || action.disabled ? 0.5 : 1 }}
          >
            <Feather name={action.icon} size={15} color={action.tone === 'destructive' ? theme.colors.primary : theme.colors.text} />
            <Text style={[textStyles.bodySm, action.tone === 'destructive' ? { color: theme.colors.primary } : null]}>{action.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SurfaceCard>
  );
}
