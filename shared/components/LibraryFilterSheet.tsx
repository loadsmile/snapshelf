import { type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { SnapLibraryDateRange, SnapLibraryStatus } from '@/features/snaps/library';
import type { SnapSource } from '@/features/snaps/types';
import type { Shelf } from '@/features/shelves/types';
import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

type SourceOption = {
  label: string;
  value: SnapSource | 'all';
};

type DateOption = {
  label: string;
  value: SnapLibraryDateRange;
};

type StatusOption = {
  label: string;
  value: SnapLibraryStatus;
};

type LibraryFilterSheetProps = {
  visible: boolean;
  shelves: Shelf[];
  labelOptions: string[];
  sourceOptions: SourceOption[];
  dateOptions: DateOption[];
  statusOptions: StatusOption[];
  selectedStatus: SnapLibraryStatus;
  selectedShelfId: 'all' | 'tray' | string;
  selectedSource: SnapSource | 'all';
  selectedLabel: string | 'all';
  selectedDateRange: SnapLibraryDateRange;
  visibleSnapCount: number;
  onClose: () => void;
  onReset: () => void;
  onSelectStatus: (value: SnapLibraryStatus) => void;
  onSelectShelf: (value: 'all' | 'tray' | string) => void;
  onSelectSource: (value: SnapSource | 'all') => void;
  onSelectLabel: (value: string | 'all') => void;
  onSelectDateRange: (value: SnapLibraryDateRange) => void;
};

function SheetSection({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <View style={{ marginBottom: theme.spacing.md }}>
      <Text style={[textStyles.bodySm, { color: theme.colors.text, marginBottom: hint ? 2 : theme.spacing.sm }]}>{title}</Text>
      {hint ? <Text style={[textStyles.bodySm, { marginBottom: theme.spacing.sm }]}>{hint}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>{children}</View>
    </View>
  );
}

function SheetOptionPill({ label, isActive, onPress }: { label: string; isActive: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        {
          borderRadius: theme.radii.pill,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderWidth: 1,
        },
        isActive
          ? {
              backgroundColor: theme.colors.primary,
              borderColor: theme.colors.primary,
            }
          : {
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.borderSoft,
            },
      ]}
    >
      <Text style={[textStyles.bodySm, { color: isActive ? theme.colors.surface : theme.colors.text }]}>{label}</Text>
    </Pressable>
  );
}

export function LibraryFilterSheet({
  visible,
  shelves,
  labelOptions,
  sourceOptions,
  dateOptions,
  statusOptions,
  selectedStatus,
  selectedShelfId,
  selectedSource,
  selectedLabel,
  selectedDateRange,
  visibleSnapCount,
  onClose,
  onReset,
  onSelectStatus,
  onSelectShelf,
  onSelectSource,
  onSelectLabel,
  onSelectDateRange,
}: LibraryFilterSheetProps) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const hasAdvancedFilters =
    selectedStatus !== 'active' ||
    selectedShelfId !== 'all' ||
    selectedSource !== 'all' ||
    selectedLabel !== 'all' ||
    selectedDateRange !== 'any';
  const resolvedLabelOptions =
    selectedLabel !== 'all' && !labelOptions.includes(selectedLabel) ? [selectedLabel, ...labelOptions] : labelOptions;
  const sheetMaxHeight = Math.min(height * 0.82, 720);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(46, 35, 26, 0.24)',
          justifyContent: 'flex-end',
        }}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            maxHeight: sheetMaxHeight,
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: theme.radii.xl,
            borderTopRightRadius: theme.radii.xl,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.85)',
            paddingTop: theme.spacing.sm,
            ...theme.shadows.card,
          }}
        >
          <View style={{ alignItems: 'center', marginBottom: theme.spacing.sm }}>
            <View
              style={{
                width: 42,
                height: 4,
                borderRadius: theme.radii.pill,
                backgroundColor: theme.colors.borderSoft,
              }}
            />
          </View>

          <View style={{ paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md }}>
            <Text style={[textStyles.displaySm, { marginBottom: theme.spacing.xs }]}>Refine Library</Text>
            <Text style={textStyles.bodySm}>Pick a few quick signals. Your Library updates as you choose.</Text>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: theme.spacing.lg,
              paddingBottom: theme.spacing.md,
            }}
          >
            <SheetSection title="Show">
              {statusOptions.map((option) => (
                <SheetOptionPill key={option.value} label={option.label} isActive={selectedStatus === option.value} onPress={() => onSelectStatus(option.value)} />
              ))}
            </SheetSection>

            <SheetSection title="Where it lives">
              <SheetOptionPill label="All Shelves" isActive={selectedShelfId === 'all'} onPress={() => onSelectShelf('all')} />
              <SheetOptionPill label="The Tray" isActive={selectedShelfId === 'tray'} onPress={() => onSelectShelf('tray')} />
              {shelves.map((shelf) => (
                <SheetOptionPill key={shelf.id} label={shelf.name} isActive={selectedShelfId === shelf.id} onPress={() => onSelectShelf(shelf.id)} />
              ))}
            </SheetSection>

            <SheetSection title="Source">
              {sourceOptions.map((option) => (
                <SheetOptionPill key={option.value} label={option.label} isActive={selectedSource === option.value} onPress={() => onSelectSource(option.value)} />
              ))}
            </SheetSection>

            <SheetSection title="Label" hint={resolvedLabelOptions.length === 0 ? 'Labels will appear here after you add them to Snaps.' : undefined}>
              <SheetOptionPill label="All Labels" isActive={selectedLabel === 'all'} onPress={() => onSelectLabel('all')} />
              {resolvedLabelOptions.map((label) => (
                <SheetOptionPill key={label} label={label} isActive={selectedLabel === label} onPress={() => onSelectLabel(label)} />
              ))}
            </SheetSection>

            <SheetSection title="Saved date">
              {dateOptions.map((option) => (
                <SheetOptionPill
                  key={option.value}
                  label={option.label}
                  isActive={selectedDateRange === option.value}
                  onPress={() => onSelectDateRange(option.value)}
                />
              ))}
            </SheetSection>
          </ScrollView>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.md,
              borderTopWidth: 1,
              borderTopColor: theme.colors.borderSoft,
              paddingHorizontal: theme.spacing.lg,
              paddingTop: theme.spacing.md,
              paddingBottom: Math.max(insets.bottom, theme.spacing.md),
            }}
          >
            <Pressable
              onPress={hasAdvancedFilters ? onReset : undefined}
              disabled={!hasAdvancedFilters}
              style={{
                borderRadius: theme.radii.pill,
                borderWidth: 1,
                borderColor: theme.colors.borderSoft,
                backgroundColor: theme.colors.background,
                paddingHorizontal: 18,
                paddingVertical: 14,
                opacity: hasAdvancedFilters ? 1 : 0.58,
              }}
            >
              <Text style={[textStyles.button, { color: theme.colors.text }]}>Clear</Text>
            </Pressable>

            <Pressable
              onPress={onClose}
              style={[
                {
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: theme.radii.pill,
                  backgroundColor: theme.colors.primary,
                  paddingHorizontal: 18,
                  paddingVertical: 14,
                },
                theme.shadows.button,
              ]}
            >
              <Text style={[textStyles.button, { color: theme.colors.surface }]}>Show {visibleSnapCount} Snap{visibleSnapCount === 1 ? '' : 's'}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
