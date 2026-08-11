import { Feather } from '@expo/vector-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';

import type { ArchiveRediscoveryItem } from '@/features/snaps/archive-rediscovery';
import { getSnapHeadline, getSnapPalette, getSnapSourceLabel } from '@/features/snaps/presentation';
import type { Snap } from '@/features/snaps/types';
import { SnapArtwork } from '@/shared/components/SnapArtwork';
import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

type FromYourArchiveRowProps = {
  items: readonly ArchiveRediscoveryItem[];
  onPressSnap: (snap: Snap) => void;
};

export function FromYourArchiveRow({ items, onPressSnap }: FromYourArchiveRowProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <View accessibilityLabel="From your archive" style={{ gap: theme.spacing.sm }}>
      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        <Text style={textStyles.titleLg}>From Your Archive</Text>
        <Text style={textStyles.bodySm}>A few older saves worth another look.</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.sm }}
      >
        {items.map((item) => {
          const headline = getSnapHeadline(item.snap);

          return (
            <Pressable
              key={item.snap.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${headline} from your archive`}
              accessibilityHint="Opens this Snap"
              onPress={() => onPressSnap(item.snap)}
              style={({ pressed }) => ({
                width: 144,
                borderRadius: theme.radii.lg,
                borderWidth: 1,
                borderColor: theme.colors.borderSoft,
                backgroundColor: theme.colors.surface,
                overflow: 'hidden',
                opacity: pressed ? 0.72 : 1,
                ...theme.shadows.card,
              })}
            >
              <SnapArtwork
                snap={item.snap}
                fallbackColors={getSnapPalette(item.snap)}
                fallbackLabel="Preview unavailable"
                style={{ height: 92, backgroundColor: theme.colors.background }}
              />

              <View style={{ gap: 3, padding: theme.spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Text numberOfLines={1} style={[textStyles.eyebrow, { flex: 1 }]}>
                    {getSnapSourceLabel(item.snap.source)}
                  </Text>
                  {item.snap.isFavorite ? <Feather name="heart" size={12} color={theme.colors.primary} /> : null}
                </View>
                <Text numberOfLines={2} style={[textStyles.bodySm, { color: theme.colors.text, minHeight: 36 }]}>
                  {headline}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
