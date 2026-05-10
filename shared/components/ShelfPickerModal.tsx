import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import type { Shelf } from '@/features/shelves/types';
import { SurfaceCard } from '@/shared/components/SurfaceCard';
import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

type ShelfPickerModalProps = {
  visible: boolean;
  shelves: Shelf[];
  snapTitle?: string;
  title?: string;
  description?: string;
  includeTrayOption?: boolean;
  trayLabel?: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onSelect: (shelf: Shelf | null) => void;
};

function ShelfOptionCard({
  label,
  icon,
  disabled,
  isSubmitting,
  onPress,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  disabled: boolean;
  isSubmitting: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={(event) => {
        event.stopPropagation();
        onPress();
      }}
      disabled={disabled}
      style={{
        width: '31%',
        minHeight: 92,
        justifyContent: 'space-between',
        gap: theme.spacing.sm,
        backgroundColor: theme.colors.background,
        borderRadius: theme.radii.md,
        padding: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.borderSoft,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <View style={{ gap: theme.spacing.sm }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.surfaceSoft,
          }}
        >
          <Feather name={icon} size={16} color={theme.colors.primary} />
        </View>
        <Text numberOfLines={2} style={[textStyles.bodySm, { color: theme.colors.text }]}>{label}</Text>
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        {isSubmitting ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.surfaceSoft,
            }}
          >
            <Feather name="arrow-up-right" size={14} color={theme.colors.primary} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

export function ShelfPickerModal({
  visible,
  shelves,
  snapTitle,
  title = 'Move to Shelf',
  description,
  includeTrayOption = false,
  trayLabel = 'The Tray',
  isSubmitting = false,
  onClose,
  onSelect,
}: ShelfPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const resolvedDescription = description ?? (snapTitle ? `Choose where to place "${snapTitle}".` : 'Choose a Shelf for this Snap.');
  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();
  const filteredShelves = normalizedSearchQuery ? shelves.filter((shelf) => shelf.name.toLocaleLowerCase().includes(normalizedSearchQuery)) : shelves;
  const showTrayOption = includeTrayOption && (!normalizedSearchQuery || trayLabel.toLocaleLowerCase().includes(normalizedSearchQuery));

  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable
        onPress={isSubmitting ? undefined : onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(46, 35, 26, 0.24)',
          justifyContent: 'flex-end',
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.xl,
        }}
      >
        <Pressable onPress={(event) => event.stopPropagation()}>
          <SurfaceCard style={{ padding: theme.spacing.md, borderRadius: theme.radii.xl }}>
            <View style={{ alignItems: 'center', marginBottom: theme.spacing.md }}>
              <View style={{ width: 44, height: 4, borderRadius: 2, backgroundColor: theme.colors.borderSoft }} />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[textStyles.titleMd, { marginBottom: 2 }]}>{title}</Text>
                <Text numberOfLines={2} style={textStyles.bodySm}>{resolvedDescription}</Text>
              </View>
              <Pressable
                onPress={(event) => {
                  event.stopPropagation();
                  onClose();
                }}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Close shelf picker"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.colors.background,
                  opacity: isSubmitting ? 0.6 : 1,
                }}
              >
                <Feather name="x" size={17} color={theme.colors.text} />
              </Pressable>
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.sm,
                backgroundColor: theme.colors.background,
                borderRadius: theme.radii.pill,
                borderWidth: 1,
                borderColor: theme.colors.borderSoft,
                paddingHorizontal: 16,
                marginBottom: theme.spacing.md,
              }}
            >
              <Feather name="search" size={18} color={theme.colors.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search shelves"
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                editable={!isSubmitting}
                style={{
                  flex: 1,
                  minHeight: 48,
                  color: theme.colors.text,
                  fontFamily: theme.typography.fonts.medium,
                  fontSize: 15,
                }}
              />
              {searchQuery ? (
                <Pressable onPress={() => setSearchQuery('')} disabled={isSubmitting} hitSlop={10}>
                  <Feather name="x-circle" size={18} color={theme.colors.textMuted} />
                </Pressable>
              ) : null}
            </View>

            <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {showTrayOption ? (
                <ShelfOptionCard
                  label={trayLabel}
                  icon="inbox"
                  onPress={() => onSelect(null)}
                  disabled={isSubmitting}
                  isSubmitting={isSubmitting}
                />
              ) : null}

              {filteredShelves.map((shelf) => (
                <ShelfOptionCard
                  key={shelf.id}
                  label={shelf.name}
                  icon="archive"
                  onPress={() => onSelect(shelf)}
                  disabled={isSubmitting}
                  isSubmitting={isSubmitting}
                />
              ))}

              {filteredShelves.length === 0 && !showTrayOption ? (
                <View style={{ width: '100%', padding: theme.spacing.md, borderRadius: theme.radii.md, backgroundColor: theme.colors.background }}>
                  <Text style={textStyles.bodySm}>{normalizedSearchQuery ? 'No shelves match your search.' : 'Create a Shelf first to move Snaps out of The Tray.'}</Text>
                </View>
              ) : null}
            </ScrollView>
          </SurfaceCard>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
