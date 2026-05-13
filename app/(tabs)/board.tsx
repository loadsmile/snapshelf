import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/features/auth/useAuth';
import { subscribeToAllSnaps } from '@/features/snaps/api';
import { resolveLocalImageUri } from '@/features/images/resolve';
import { deleteImageLocally } from '@/features/images/local';
import { formatCapturedAt, getShelfCoverSnap, getShelfPalette, getSnapHeadline, getSnapPalette, getSnapSourceLabel } from '@/features/snaps/presentation';
import { searchSnaps } from '@/features/snaps/search';
import type { Snap } from '@/features/snaps/types';
import {
  bootstrapShelfPlacement,
  createShelf,
  getDefaultShelfPlacement,
  subscribeToShelves,
  updateShelfPosition,
} from '@/features/shelves/api';
import { searchShelves } from '@/features/shelves/search';
import type { Shelf, ShelfBoardVariant } from '@/features/shelves/types';
import { createStack, getDefaultStackPlacement, saveStackCoverImageLocally, subscribeToStacks, updateStackCover, updateStackPosition } from '@/features/stacks/api';
import type { Stack } from '@/features/stacks/types';
import { createShelfThread, subscribeToThreads } from '@/features/threads/api';
import type { ShelfThread } from '@/features/threads/types';
import { ActionSheetModal } from '@/shared/components/ActionSheetModal';
import { AppHeader } from '@/shared/components/AppHeader';
import { CreateShelfModal } from '@/shared/components/CreateShelfModal';
import { CreateStackModal } from '@/shared/components/CreateStackModal';
import { StackCoverModal } from '@/shared/components/StackCoverModal';
import { EmptyState } from '@/shared/components/EmptyState';
import { PillButton } from '@/shared/components/PillButton';
import { Screen } from '@/shared/components/Screen';
import { SectionLabel } from '@/shared/components/SectionLabel';
import { SnapArtwork } from '@/shared/components/SnapArtwork';
import { SurfaceCard } from '@/shared/components/SurfaceCard';
import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

const CANVAS_WIDTH = 980;
const CANVAS_HEIGHT = 1360;
const ABSOLUTE_MIN_SCALE = 0.45;
const MAX_SCALE = 1.9;
const BOARD_TOP_GUTTER = 28;
const BOARD_SIDE_GUTTER = 22;
const BOARD_BOTTOM_GUTTER = 32;
const STACK_WIDTH = 188;
const STACK_HEIGHT = 210;
const STACK_COVER_FRAME_SIZE = 178;
const STACK_COVER_SIZE = 152;
const SEARCH_FOCUS_SCALE = 1.25;

type Point = {
  x: number;
  y: number;
};

type BoardTransform = Point & {
  scale: number;
};

type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

type BoardViewMode = 'grid' | 'list';

function isBoardViewMode(value: string | null): value is BoardViewMode {
  return value === 'grid' || value === 'list';
}

function getBoardViewModeStorageKey(userId: string) {
  return `board-view-mode:${userId}`;
}

function DottedCanvas() {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.85,
      }}
    >
      {Array.from({ length: 18 }).map((_, row) => (
        <View
          key={`row-${row}`}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: row === 0 ? 0 : 72,
            paddingHorizontal: 2,
          }}
        >
          {Array.from({ length: 10 }).map((__, column) => (
            <View
              key={`dot-${row}-${column}`}
              style={{
                width: 3,
                height: 3,
                borderRadius: 999,
                backgroundColor: theme.colors.dot,
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getFitScale(bounds: Bounds, viewport: Point) {
  if (viewport.x === 0 || viewport.y === 0) {
    return 1;
  }

  const availableWidth = Math.max(0, viewport.x - BOARD_SIDE_GUTTER * 2);
  const availableHeight = Math.max(0, viewport.y - BOARD_TOP_GUTTER - BOARD_BOTTOM_GUTTER);
  const contentWidth = Math.max(bounds.maxX - bounds.minX, 1);
  const contentHeight = Math.max(bounds.maxY - bounds.minY, 1);

  return clamp(Math.min(availableWidth / contentWidth, availableHeight / contentHeight, 1), ABSOLUTE_MIN_SCALE, 1);
}

function getContentBounds(shelves: Array<ReturnType<typeof getResolvedShelf>>, stacks: Array<ReturnType<typeof getResolvedStack>>): Bounds {
  if (shelves.length === 0 && stacks.length === 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: CANVAS_WIDTH,
      maxY: CANVAS_HEIGHT,
    };
  }

  const bounds = getBoardNodeBounds(shelves, stacks);

  return {
    minX: clamp(bounds.minX - 36, 0, CANVAS_WIDTH),
    minY: clamp(bounds.minY - 24, 0, CANVAS_HEIGHT),
    maxX: clamp(bounds.maxX + 36, 0, CANVAS_WIDTH),
    maxY: clamp(bounds.maxY + 60, 0, CANVAS_HEIGHT),
  };
}

function clampTransform(transform: BoardTransform, viewport: Point, bounds: Bounds): BoardTransform {
  const minScale = getFitScale(bounds, viewport);
  const contentWidth = (bounds.maxX - bounds.minX) * transform.scale;
  const contentHeight = (bounds.maxY - bounds.minY) * transform.scale;
  const availableWidth = Math.max(0, viewport.x - BOARD_SIDE_GUTTER * 2);
  const availableHeight = Math.max(0, viewport.y - BOARD_TOP_GUTTER - BOARD_BOTTOM_GUTTER);

  const centeredX = viewport.x / 2 - (bounds.minX + (bounds.maxX - bounds.minX) / 2) * transform.scale;
  const leftAlignedX = BOARD_SIDE_GUTTER - bounds.minX * transform.scale;
  const rightAlignedX = viewport.x - BOARD_SIDE_GUTTER - bounds.maxX * transform.scale;

  const x =
    contentWidth <= availableWidth
      ? centeredX
      : clamp(transform.x, Math.min(rightAlignedX, leftAlignedX), Math.max(rightAlignedX, leftAlignedX));

  const topAlignedY = BOARD_TOP_GUTTER - bounds.minY * transform.scale;
  const bottomAlignedY = viewport.y - BOARD_BOTTOM_GUTTER - bounds.maxY * transform.scale;

  const y =
    contentHeight <= availableHeight
      ? topAlignedY
      : clamp(transform.y, Math.min(bottomAlignedY, topAlignedY), Math.max(bottomAlignedY, topAlignedY));

  return {
    scale: clamp(transform.scale, minScale, MAX_SCALE),
    x,
    y,
  };
}

function getDistance(first: Point, second: Point) {
  const dx = first.x - second.x;
  const dy = first.y - second.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function getMidpoint(first: Point, second: Point): Point {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

function getNodeDimensions(variant: ShelfBoardVariant) {
  switch (variant) {
    case 'primary':
      return { width: 196, height: 196 };
    case 'arch':
      return { width: 116, height: 152 };
    case 'circle-large':
      return { width: 140, height: 140 };
    case 'circle-small':
      return { width: 92, height: 92 };
    case 'circle-medium':
      return { width: 154, height: 154 };
    case 'tall':
      return { width: 76, height: 152 };
  }
}

function getResolvedShelf(shelf: Shelf, index: number) {
  const fallback = getDefaultShelfPlacement(index);

  return {
    ...shelf,
    boardX: shelf.boardX ?? fallback.boardX,
    boardY: shelf.boardY ?? fallback.boardY,
    boardVariant: shelf.boardVariant ?? fallback.boardVariant,
  };
}

function getResolvedStack(stack: Stack, index: number) {
  const fallback = getDefaultStackPlacement(index);

  return {
    ...stack,
    boardX: stack.boardX ?? fallback.boardX,
    boardY: stack.boardY ?? fallback.boardY,
  };
}

function getNodeCenter(shelf: ReturnType<typeof getResolvedShelf>) {
  const dimensions = getNodeDimensions(shelf.boardVariant);

  return {
    x: shelf.boardX + dimensions.width / 2,
    y: shelf.boardY + dimensions.height / 2,
  };
}

function getShelfFocusTransform(shelf: ReturnType<typeof getResolvedShelf>, viewport: Point, fitScale: number): BoardTransform {
  const center = getNodeCenter(shelf);
  const targetScale = clamp(Math.max(fitScale, SEARCH_FOCUS_SCALE), fitScale, MAX_SCALE);

  return {
    scale: targetScale,
    x: viewport.x / 2 - center.x * targetScale,
    y: viewport.y / 2 - center.y * targetScale,
  };
}

function getShelfBounds(shelves: Array<ReturnType<typeof getResolvedShelf>>) {
  const bounds = shelves.reduce(
    (current, shelf) => {
      const dimensions = getNodeDimensions(shelf.boardVariant);

      return {
        minX: Math.min(current.minX, shelf.boardX),
        minY: Math.min(current.minY, shelf.boardY),
        maxX: Math.max(current.maxX, shelf.boardX + dimensions.width),
        maxY: Math.max(current.maxY, shelf.boardY + dimensions.height + 54),
      };
    },
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );

  return bounds;
}

function getBoardNodeBounds(shelves: Array<ReturnType<typeof getResolvedShelf>>, stacks: Array<ReturnType<typeof getResolvedStack>>) {
  const shelfBounds = shelves.map((shelf) => {
    const dimensions = getNodeDimensions(shelf.boardVariant);

    return {
      minX: shelf.boardX,
      minY: shelf.boardY,
      maxX: shelf.boardX + dimensions.width,
      maxY: shelf.boardY + dimensions.height + 54,
    };
  });
  const stackBounds = stacks.map((stack) => ({
    minX: stack.boardX,
    minY: stack.boardY,
    maxX: stack.boardX + STACK_WIDTH,
    maxY: stack.boardY + STACK_HEIGHT,
  }));
  const bounds = [...shelfBounds, ...stackBounds].reduce(
    (current, node) => ({
      minX: Math.min(current.minX, node.minX),
      minY: Math.min(current.minY, node.minY),
      maxX: Math.max(current.maxX, node.maxX),
      maxY: Math.max(current.maxY, node.maxY),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );

  return bounds;
}

function getStackCenter(stack: ReturnType<typeof getResolvedStack>) {
  return {
    x: stack.boardX + STACK_WIDTH / 2,
    y: stack.boardY + STACK_HEIGHT / 2,
  };
}

function renderThread(from: Point, to: Point, key: string) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  return (
    <View
      key={key}
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: from.x + dx / 2 - length / 2,
        top: from.y + dy / 2,
        width: length,
        borderStyle: 'dashed',
        borderWidth: 1.5,
        borderColor: theme.colors.thread,
        transform: [{ rotate: `${angle}deg` }],
      }}
    />
  );
}

function CircleVisual({ size, colors, snap, imageUri }: { size: number; colors: [string, string]; snap: Snap | null; imageUri: string | null }) {
  return (
    <SnapArtwork
      snap={snap}
      imageUri={imageUri}
      fallbackColors={colors}
      style={{
        width: size - 20,
        height: size - 20,
        borderRadius: (size - 20) / 2,
        justifyContent: 'space-between',
        padding: 14,
      }}
    >
      <View
        style={{
          alignSelf: 'flex-end',
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: 'rgba(255,255,255,0.22)',
        }}
      />
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
        <View
          style={{
            width: 26,
            height: 38,
            borderRadius: 14,
            backgroundColor: 'rgba(255,255,255,0.18)',
          }}
        />
        <View
          style={{
            flex: 1,
            height: 22,
            borderRadius: 999,
            backgroundColor: 'rgba(255,255,255,0.2)',
          }}
        />
      </View>
    </SnapArtwork>
  );
}

function ArchVisual({ width, height, colors, snap, imageUri }: { width: number; height: number; colors: [string, string]; snap: Snap | null; imageUri: string | null }) {
  return (
    <SnapArtwork
      snap={snap}
      imageUri={imageUri}
      fallbackColors={colors}
      style={{
        width: width - 20,
        height: height - 20,
        borderTopLeftRadius: 42,
        borderTopRightRadius: 42,
        borderBottomLeftRadius: 26,
        borderBottomRightRadius: 12,
        justifyContent: 'flex-end',
      }}
    >
      <View
        style={{
          height: '42%',
          backgroundColor: 'rgba(255,255,255,0.12)',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
      />
    </SnapArtwork>
  );
}

function TallVisual({ width, height, colors, snap, imageUri }: { width: number; height: number; colors: [string, string]; snap: Snap | null; imageUri: string | null }) {
  return (
    <SnapArtwork
      snap={snap}
      imageUri={imageUri}
      fallbackColors={colors}
      style={{
        width: width - 20,
        height: height - 20,
        borderRadius: 30,
        justifyContent: 'space-between',
        padding: 12,
      }}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: 'rgba(255,255,255,0.18)',
        }}
      />
      <View
        style={{
          height: 26,
          borderRadius: 999,
          backgroundColor: 'rgba(255,255,255,0.18)',
        }}
      />
    </SnapArtwork>
  );
}

function PrimaryVisual({ size, colors, snap, imageUri }: { size: number; colors: [string, string]; snap: Snap | null; imageUri: string | null }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        padding: 16,
        backgroundColor: theme.colors.surface,
        borderRadius: 54,
        shadowColor: theme.colors.shadow,
        shadowOpacity: 0.08,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 12 },
      }}
    >
      <SnapArtwork
        snap={snap}
        imageUri={imageUri}
        fallbackColors={colors}
        style={{
          flex: 1,
          borderRadius: 42,
          justifyContent: 'space-between',
          padding: 18,
        }}
      >
        <View style={{ alignItems: 'flex-end' }}>
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: 'rgba(255,255,255,0.18)',
            }}
          />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
            <View
              style={{
                width: 14,
                height: 48,
                borderRadius: 8,
                backgroundColor: 'rgba(255,255,255,0.2)',
              }}
            />
            <View
              style={{
                width: 72,
                height: 36,
                borderRadius: 16,
                backgroundColor: 'rgba(255,255,255,0.18)',
              }}
            />
          </View>
          <View
            style={{
              width: 26,
              height: 56,
              borderRadius: 14,
              backgroundColor: 'rgba(223, 240, 196, 0.65)',
            }}
          />
        </View>
      </SnapArtwork>
    </View>
  );
}

function ShelfLabel({ name, primary }: { name: string; primary: boolean }) {
  return (
    <View
      style={{
        marginTop: primary ? -18 : -10,
        backgroundColor: primary ? theme.colors.primary : theme.colors.surface,
        borderRadius: theme.radii.pill,
        paddingHorizontal: primary ? 18 : 12,
        paddingVertical: primary ? 10 : 7,
        borderWidth: primary ? 0 : 1,
        borderColor: primary ? 'transparent' : theme.colors.borderSoft,
        shadowColor: primary ? theme.colors.primaryDeep : theme.colors.shadow,
        shadowOpacity: primary ? 0.16 : 0,
        shadowRadius: primary ? 14 : 0,
        shadowOffset: { width: 0, height: 10 },
        alignSelf: 'center',
        maxWidth: primary ? 190 : 180,
      }}
    >
      <Text
        numberOfLines={1}
        style={[
          textStyles.button,
          {
            color: primary ? theme.colors.surface : theme.colors.text,
            textTransform: 'uppercase',
          },
        ]}
      >
        {name}
      </Text>
    </View>
  );
}

function ViewModeToggle({ viewMode, onChange }: { viewMode: BoardViewMode; onChange: (mode: BoardViewMode) => void }) {
  const options: Array<{ mode: BoardViewMode; icon: keyof typeof Feather.glyphMap; label: string }> = [
    { mode: 'grid', icon: 'grid', label: 'Grid' },
    { mode: 'list', icon: 'list', label: 'List' },
  ];

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        gap: 4,
        marginBottom: theme.spacing.lg,
        padding: 4,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radii.pill,
        ...theme.shadows.card,
      }}
    >
      {options.map((option) => {
        const isActive = option.mode === viewMode;

        return (
          <Pressable
            key={option.mode}
            onPress={() => onChange(option.mode)}
            testID={`board-view-${option.mode}-toggle`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: theme.radii.pill,
              backgroundColor: isActive ? theme.colors.primary : 'transparent',
            }}
          >
            <Feather name={option.icon} size={16} color={isActive ? theme.colors.surface : theme.colors.primary} />
            <Text
              style={[
                textStyles.button,
                {
                  color: isActive ? theme.colors.surface : theme.colors.text,
                },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SummaryPill({ label, value }: { label: string; value: string | number }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: theme.radii.pill,
        borderWidth: 1,
        borderColor: theme.colors.borderSoft,
        backgroundColor: theme.colors.background,
        paddingHorizontal: 10,
        paddingVertical: 7,
      }}
    >
      <Text style={[textStyles.bodySm, { color: theme.colors.text }]}>{value}</Text>
      <Text style={textStyles.bodySm}>{label}</Text>
    </View>
  );
}

function BoardOrientationCard({
  shelfCount,
  stackCount,
  organizedSnapCount,
  traySnapCount,
  threadCount,
  onDismiss,
}: {
  shelfCount: number;
  stackCount: number;
  organizedSnapCount: number;
  traySnapCount: number;
  threadCount: number;
  onDismiss: () => void;
}) {
  return (
    <SurfaceCard style={{ marginBottom: theme.spacing.md, padding: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: theme.spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text style={[textStyles.eyebrow, { marginBottom: 4 }]}>Organization Map</Text>
          <Text style={[textStyles.bodySm, { marginBottom: theme.spacing.sm }]}>Shelves live here. The Tray stays unfiled, and Library finds everything.</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <SummaryPill label="Shelves" value={shelfCount} />
            <SummaryPill label="Stacks" value={stackCount} />
            <SummaryPill label="Filed" value={organizedSnapCount} />
            <SummaryPill label="Tray" value={traySnapCount} />
            <SummaryPill label="Threads" value={threadCount} />
          </View>
        </View>
        <Pressable onPress={onDismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel="Hide organization map">
          <Feather name="x" size={18} color={theme.colors.textMuted} />
        </Pressable>
      </View>
    </SurfaceCard>
  );
}

function ShelfListItem({
  shelf,
  coverSnap,
  coverImageUri,
  snapCount,
  latestSnap,
  anchorShelfName,
  onPress,
}: {
  shelf: ReturnType<typeof getResolvedShelf>;
  coverSnap: Snap | null;
  coverImageUri: string | null;
  snapCount: number;
  latestSnap: Snap | null;
  anchorShelfName: string | null;
  onPress: () => void;
}) {
  const colors = getShelfPalette(shelf.name);
  const countCopy = snapCount === 0 ? 'Ready to curate' : `${snapCount} Snap${snapCount === 1 ? '' : 's'}`;
  const detailCopy = latestSnap
    ? `${formatCapturedAt(latestSnap.capturedAt ?? latestSnap.createdAt)} - ${getSnapHeadline(latestSnap)}`
    : 'Empty Shelf. Move a Snap here from The Tray or Library.';

  return (
    <Pressable onPress={onPress}>
      <SurfaceCard style={{ padding: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <SnapArtwork
            snap={coverSnap}
            imageUri={coverImageUri}
            fallbackColors={colors}
            style={{
              width: 88,
              height: 88,
              borderRadius: 24,
              padding: 12,
              justifyContent: 'space-between',
            }}
          >
            <View style={{ alignItems: 'flex-end' }}>
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                }}
              />
            </View>
            <View
              style={{
                width: 42,
                height: 12,
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.18)',
              }}
            />
          </SnapArtwork>

          <View style={{ flex: 1 }}>
            <Text style={[textStyles.eyebrow, { marginBottom: 4 }]}>Shelf</Text>
            <Text style={[textStyles.titleLg, { marginBottom: 4 }]} numberOfLines={1}>
              {shelf.name}
            </Text>
            <Text style={[textStyles.bodySm, { marginBottom: theme.spacing.xs, color: theme.colors.text }]}>{countCopy}</Text>
            <Text style={[textStyles.bodySm, { marginBottom: anchorShelfName ? theme.spacing.sm : 0 }]} numberOfLines={2}>{detailCopy}</Text>

            {anchorShelfName ? (
              <View
                style={{
                  alignSelf: 'flex-start',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: theme.radii.pill,
                  backgroundColor: theme.colors.surfaceSoft,
                }}
              >
                <Feather name="layers" size={13} color={theme.colors.primaryDeep} />
                <Text style={[textStyles.bodySm, { color: theme.colors.accentDeep }]}>Stacked under {anchorShelfName}</Text>
              </View>
            ) : null}
          </View>

          <Feather name="chevron-right" size={18} color={theme.colors.primary} />
        </View>
      </SurfaceCard>
    </Pressable>
  );
}

function SnapSearchResult({
  snap,
  shelfName,
  onPress,
}: {
  snap: Snap;
  shelfName: string;
  onPress: () => void;
}) {
  const colors = getSnapPalette(snap);

  return (
    <Pressable onPress={onPress}>
      <SurfaceCard style={{ padding: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <SnapArtwork
            snap={snap}
            fallbackColors={colors}
            style={{
              width: 88,
              height: 88,
              borderRadius: 24,
              padding: 12,
              justifyContent: 'space-between',
            }}
          >
            <View style={{ alignItems: 'flex-end' }}>
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                }}
              />
            </View>
            <View
              style={{
                width: 42,
                height: 12,
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.18)',
              }}
            />
          </SnapArtwork>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm, marginBottom: 4 }}>
              <Text style={textStyles.eyebrow}>{shelfName}</Text>
              <Text style={textStyles.bodySm}>{formatCapturedAt(snap.capturedAt ?? snap.createdAt)}</Text>
            </View>

            <Text style={[textStyles.titleMd, { marginBottom: 4 }]} numberOfLines={2}>
              {getSnapHeadline(snap)}
            </Text>

            {snap.thought ? (
              <Text style={[textStyles.bodySm, { marginBottom: snap.labels.length > 0 ? theme.spacing.sm : 0 }]} numberOfLines={2}>
                {snap.thought}
              </Text>
            ) : null}

            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <SectionLabel label={getSnapSourceLabel(snap.source)} />
              {snap.labels.slice(0, 2).map((label) => (
                <SectionLabel key={label} label={label} />
              ))}
            </View>
          </View>

          <Feather name="chevron-right" size={18} color={theme.colors.primary} />
        </View>
      </SurfaceCard>
    </Pressable>
  );
}

function DraggableShelfNode({
  shelf,
  scale,
  isHighlighted,
  coverSnap,
  coverImageUri,
  onPress,
  onDrag,
  onDragEnd,
}: {
  shelf: ReturnType<typeof getResolvedShelf>;
  scale: number;
  isHighlighted?: boolean;
  coverSnap: Snap | null;
  coverImageUri: string | null;
  onPress: () => void;
  onDrag: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
}) {
  const startRef = useRef({ x: shelf.boardX, y: shelf.boardY });
  const movedRef = useRef(false);
  const colors = getShelfPalette(shelf.name);
  const dimensions = getNodeDimensions(shelf.boardVariant);
  const isPrimary = shelf.boardVariant === 'primary';

  useEffect(() => {
    startRef.current = { x: shelf.boardX, y: shelf.boardY };
  }, [shelf.boardX, shelf.boardY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2,
        onPanResponderGrant: () => {
          startRef.current = { x: shelf.boardX, y: shelf.boardY };
          movedRef.current = false;
        },
        onPanResponderMove: (_, gestureState) => {
          movedRef.current = true;
          onDrag(startRef.current.x + gestureState.dx / scale, startRef.current.y + gestureState.dy / scale);
        },
        onPanResponderRelease: (_, gestureState) => {
          const nextX = startRef.current.x + gestureState.dx / scale;
          const nextY = startRef.current.y + gestureState.dy / scale;

          if (!movedRef.current) {
            onPress();
            return;
          }

          onDragEnd(nextX, nextY);
        },
        onPanResponderTerminate: (_, gestureState) => {
          onDragEnd(startRef.current.x + gestureState.dx / scale, startRef.current.y + gestureState.dy / scale);
        },
      }),
    [onDrag, onDragEnd, onPress, scale, shelf.boardX, shelf.boardY],
  );

  return (
    <View
      {...panResponder.panHandlers}
      style={{
        position: 'absolute',
        left: shelf.boardX,
        top: shelf.boardY,
      }}
    >
      {isHighlighted ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: -14,
            top: -14,
            width: dimensions.width + 28,
            height: dimensions.height + 82,
            borderRadius: isPrimary ? 62 : dimensions.width / 2 + 18,
            borderWidth: 2,
            borderColor: theme.colors.primary,
            backgroundColor: 'rgba(198, 58, 6, 0.08)',
          }}
        />
      ) : null}
      <Pressable onPress={onPress} style={{ alignItems: 'center' }} hitSlop={18}>
        {isPrimary ? <PrimaryVisual size={dimensions.width} colors={colors} snap={coverSnap} imageUri={coverImageUri} /> : null}

        {!isPrimary ? (
          <View
            style={{
              padding: 10,
              backgroundColor: theme.colors.surfaceSoft,
              shadowColor: theme.colors.shadow,
              shadowOpacity: 0.08,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 10 },
              borderRadius: shelf.boardVariant === 'arch' ? undefined : dimensions.width / 2,
              borderTopLeftRadius: shelf.boardVariant === 'arch' ? 44 : undefined,
              borderTopRightRadius: shelf.boardVariant === 'arch' ? 44 : undefined,
              borderBottomLeftRadius: shelf.boardVariant === 'arch' ? 34 : undefined,
              borderBottomRightRadius: shelf.boardVariant === 'arch' ? 18 : undefined,
            }}
          >
            {shelf.boardVariant === 'arch' ? <ArchVisual width={dimensions.width} height={dimensions.height} colors={colors} snap={coverSnap} imageUri={coverImageUri} /> : null}
            {shelf.boardVariant === 'circle-large' || shelf.boardVariant === 'circle-small' || shelf.boardVariant === 'circle-medium' ? (
              <CircleVisual size={dimensions.width} colors={colors} snap={coverSnap} imageUri={coverImageUri} />
            ) : null}
            {shelf.boardVariant === 'tall' ? <TallVisual width={dimensions.width} height={dimensions.height} colors={colors} snap={coverSnap} imageUri={coverImageUri} /> : null}
          </View>
        ) : null}

        <ShelfLabel name={shelf.name} primary={isPrimary} />
      </Pressable>
    </View>
  );
}

function DraggableStackNode({
  stack,
  scale,
  shelfCount,
  coverImageUri,
  onPress,
  onDrag,
  onDragEnd,
}: {
  stack: ReturnType<typeof getResolvedStack>;
  scale: number;
  shelfCount: number;
  coverImageUri: string | null;
  onPress: () => void;
  onDrag: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
}) {
  const startRef = useRef({ x: stack.boardX, y: stack.boardY });
  const movedRef = useRef(false);

  useEffect(() => {
    startRef.current = { x: stack.boardX, y: stack.boardY };
  }, [stack.boardX, stack.boardY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2,
        onPanResponderGrant: () => {
          startRef.current = { x: stack.boardX, y: stack.boardY };
          movedRef.current = false;
        },
        onPanResponderMove: (_, gestureState) => {
          movedRef.current = true;
          onDrag(startRef.current.x + gestureState.dx / scale, startRef.current.y + gestureState.dy / scale);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (!movedRef.current) {
            onPress();
            return;
          }

          onDragEnd(startRef.current.x + gestureState.dx / scale, startRef.current.y + gestureState.dy / scale);
        },
        onPanResponderTerminate: (_, gestureState) => {
          onDragEnd(startRef.current.x + gestureState.dx / scale, startRef.current.y + gestureState.dy / scale);
        },
      }),
    [onDrag, onDragEnd, onPress, scale, stack.boardX, stack.boardY],
  );

  return (
    <View
      {...panResponder.panHandlers}
      style={{
        position: 'absolute',
        left: stack.boardX,
        top: stack.boardY,
        width: STACK_WIDTH,
        alignItems: 'center',
      }}
    >
      <Pressable onPress={onPress} style={{ alignItems: 'center' }} hitSlop={18}>
        <View
          style={{
            width: STACK_COVER_FRAME_SIZE,
            height: STACK_COVER_FRAME_SIZE,
            borderRadius: 46,
            backgroundColor: theme.colors.primary,
            padding: 12,
            ...theme.shadows.card,
          }}
        >
          {coverImageUri ? (
            <SnapArtwork
              imageUri={coverImageUri}
              fallbackColors={['#F5D6B7', '#DDE4D5']}
              style={{
                width: STACK_COVER_SIZE,
                height: STACK_COVER_SIZE,
                borderRadius: 34,
                padding: theme.spacing.md,
                justifyContent: 'space-between',
                overflow: 'hidden',
              }}
            >
              <StackCoverContent shelfCount={shelfCount} hasCover />
            </SnapArtwork>
          ) : (
            <View
              style={{
                width: STACK_COVER_SIZE,
                height: STACK_COVER_SIZE,
                borderRadius: 34,
                padding: theme.spacing.md,
                justifyContent: 'space-between',
                overflow: 'hidden',
                backgroundColor: theme.colors.background,
              }}
            >
              <StackCoverContent shelfCount={shelfCount} hasCover={false} />
            </View>
          )}
        </View>

        <View
          style={{
            marginTop: -24,
            borderRadius: theme.radii.pill,
            backgroundColor: theme.colors.primary,
            paddingHorizontal: 22,
            paddingVertical: 12,
            maxWidth: STACK_WIDTH,
            ...theme.shadows.button,
          }}
        >
          <Text numberOfLines={1} style={[textStyles.button, { color: theme.colors.surface, textTransform: 'uppercase' }]}>{stack.name}</Text>
        </View>
      </Pressable>
    </View>
  );
}

function StackCoverContent({ shelfCount, hasCover }: { shelfCount: number; hasCover: boolean }) {
  const countLabel = `${shelfCount} Shelf${shelfCount === 1 ? '' : 'ves'}`;

  if (!hasCover) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            borderRadius: theme.radii.pill,
            paddingHorizontal: 10,
            paddingVertical: 6,
            backgroundColor: theme.colors.surface,
          }}
        >
          <Text style={[textStyles.bodySm, { color: theme.colors.primary }]}>{countLabel}</Text>
        </View>
        <View
          style={{
            width: 58,
            height: 58,
            borderRadius: 29,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.borderSoft,
          }}
        >
          <Feather name="layers" size={24} color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: theme.spacing.sm }}>
        <View />
        <View
          style={{
            borderRadius: theme.radii.pill,
            paddingHorizontal: 10,
            paddingVertical: 6,
            backgroundColor: 'rgba(255,255,255,0.82)',
          }}
        >
          <Text style={[textStyles.bodySm, { color: theme.colors.primary }]}>{countLabel}</Text>
        </View>
      </View>
    </>
  );
}

export default function BoardScreen() {
  const { isConfigured, user } = useAuth();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<BoardViewMode>('grid');
  const [hasLoadedViewModePreference, setHasLoadedViewModePreference] = useState(false);
  const [allSnaps, setAllSnaps] = useState<Snap[]>([]);
  const [isSnapCapReached, setIsSnapCapReached] = useState(false);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [stacks, setStacks] = useState<Stack[]>([]);
  const [threads, setThreads] = useState<ShelfThread[]>([]);
  const [isLoadingShelves, setIsLoadingShelves] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewport, setViewport] = useState<Point>({ x: 0, y: 0 });
  const [boardTransform, setBoardTransform] = useState<BoardTransform>({ x: 0, y: 0, scale: 1 });
  const [shouldCenterOnOpen, setShouldCenterOnOpen] = useState(true);
  const [isCreateShelfVisible, setIsCreateShelfVisible] = useState(false);
  const [isCreatingShelf, setIsCreatingShelf] = useState(false);
  const [createShelfError, setCreateShelfError] = useState<string | null>(null);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOrganizationMapVisible, setIsOrganizationMapVisible] = useState(true);
  const [isCreateActionVisible, setIsCreateActionVisible] = useState(false);
  const [isCreateStackVisible, setIsCreateStackVisible] = useState(false);
  const [isCreatingStack, setIsCreatingStack] = useState(false);
  const [createStackError, setCreateStackError] = useState<string | null>(null);
  const [actionStack, setActionStack] = useState<Stack | null>(null);
  const [coverStack, setCoverStack] = useState<Stack | null>(null);
  const [isSavingStackCover, setIsSavingStackCover] = useState(false);
  const [stackCoverError, setStackCoverError] = useState<string | null>(null);

  const bootstrappingIds = useRef(new Set<string>());
  const transformRef = useRef(boardTransform);
  const lastSearchFocusKeyRef = useRef<string | null>(null);
  const pinchGestureRef = useRef<
    | {
        startTransform: BoardTransform;
        startDistance: number;
        focalCanvas: Point;
      }
    | null
  >(null);

  useEffect(() => {
    transformRef.current = boardTransform;
  }, [boardTransform]);

  useFocusEffect(
    useCallback(() => {
      setShouldCenterOnOpen(true);
    }, []),
  );

  useEffect(() => {
    let isActive = true;

    async function loadViewModePreference() {
      if (!user?.id) {
        if (isActive) {
          setViewMode('grid');
          setHasLoadedViewModePreference(true);
        }
        return;
      }

      setHasLoadedViewModePreference(false);

      try {
        const storedViewMode = await AsyncStorage.getItem(getBoardViewModeStorageKey(user.id));

        if (!isActive) {
          return;
        }

        setViewMode(isBoardViewMode(storedViewMode) ? storedViewMode : 'grid');
      } catch {
        if (isActive) {
          setViewMode('grid');
        }
      } finally {
        if (isActive) {
          setHasLoadedViewModePreference(true);
        }
      }
    }

    loadViewModePreference();

    return () => {
      isActive = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !hasLoadedViewModePreference) {
      return;
    }

    AsyncStorage.setItem(getBoardViewModeStorageKey(user.id), viewMode).catch(() => {
      // Preference persistence should not interrupt the board experience.
    });
  }, [hasLoadedViewModePreference, user?.id, viewMode]);

  useEffect(() => {
    if (!user?.id) {
      setShelves([]);
      setIsLoadingShelves(false);
      return;
    }

    setIsLoadingShelves(true);
    const unsubscribe = subscribeToShelves(
      user.id,
      (nextShelves) => {
        setShelves(nextShelves);
        setError(null);
        setIsLoadingShelves(false);
      },
      (nextError) => {
        setError(nextError.message);
        setIsLoadingShelves(false);
      },
    );

    return unsubscribe;
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setStacks([]);
      return;
    }

    const unsubscribe = subscribeToStacks(
      user.id,
      (nextStacks) => {
        setStacks(nextStacks);
      },
      (nextError) => {
        setError(nextError.message);
      },
    );

    return unsubscribe;
  }, [user?.id]);

  const resolvedShelves = useMemo(() => shelves.map((shelf, index) => getResolvedShelf(shelf, index)), [shelves]);
  const resolvedStacks = useMemo(() => stacks.map((stack, index) => getResolvedStack(stack, index)), [stacks]);
  const contentBounds = useMemo(() => getContentBounds(resolvedShelves, resolvedStacks), [resolvedShelves, resolvedStacks]);
  const fitScale = useMemo(() => getFitScale(contentBounds, viewport), [contentBounds, viewport]);
  const shelvesById = useMemo(() => new Map(resolvedShelves.map((shelf) => [shelf.id, shelf])), [resolvedShelves]);
  const stacksById = useMemo(() => new Map(resolvedStacks.map((stack) => [stack.id, stack])), [resolvedStacks]);
  const stackCoverImageUris = useMemo(
    () => new Map(resolvedStacks.map((stack) => [stack.id, resolveLocalImageUri(stack.coverLocalPath)] as const)),
    [resolvedStacks],
  );
  const shelfCoverSnaps = useMemo(
    () =>
      new Map(
        resolvedShelves.map((shelf) => {
          const coverSnap = getShelfCoverSnap(shelf, allSnaps);
          return [shelf.id, coverSnap ?? null] as const;
        }),
      ),
    [allSnaps, resolvedShelves],
  );
  const shelfCoverImageUris = useMemo(
    () => new Map(resolvedShelves.map((shelf) => [shelf.id, resolveLocalImageUri(shelf.coverLocalPath)] as const)),
    [resolvedShelves],
  );
  const snapCountsByShelfId = useMemo(() => {
    const counts = new Map<string, number>();

    allSnaps.forEach((snap) => {
      if (!snap.shelfId) {
        return;
      }

      counts.set(snap.shelfId, (counts.get(snap.shelfId) ?? 0) + 1);
    });

    return counts;
  }, [allSnaps]);
  const latestSnapsByShelfId = useMemo(() => {
    const latestSnaps = new Map<string, Snap>();

    allSnaps.forEach((snap) => {
      if (!snap.shelfId) {
        return;
      }

      const current = latestSnaps.get(snap.shelfId);
      const snapTime = (snap.capturedAt ?? snap.createdAt)?.getTime() ?? 0;
      const currentTime = (current?.capturedAt ?? current?.createdAt)?.getTime() ?? 0;

      if (!current || snapTime > currentTime) {
        latestSnaps.set(snap.shelfId, snap);
      }
    });

    return latestSnaps;
  }, [allSnaps]);
  const organizedSnapCount = useMemo(() => allSnaps.filter((snap) => snap.shelfId !== null).length, [allSnaps]);
  const traySnapCount = useMemo(() => allSnaps.filter((snap) => snap.shelfId === null && !snap.isArchived).length, [allSnaps]);
  const renderableThreads = useMemo(
    () => threads.filter((thread) => (thread.fromType === 'stack' ? stacksById.has(thread.fromId) : shelvesById.has(thread.fromId)) && shelvesById.has(thread.toShelfId)),
    [shelvesById, stacksById, threads],
  );
  const anchorShelfNamesByShelfId = useMemo(
    () =>
      new Map(
        renderableThreads.flatMap((thread) => {
          const anchorShelf = thread.fromType === 'shelf' ? shelvesById.get(thread.fromId) : null;

          return anchorShelf ? [[thread.toShelfId, anchorShelf.name] as const] : [];
        }),
      ),
    [renderableThreads, shelvesById],
  );
  const stackNamesByShelfId = useMemo(
    () =>
      new Map(
        renderableThreads.flatMap((thread) => {
          const stack = thread.fromType === 'stack' ? stacksById.get(thread.fromId) : null;

          return stack ? [[thread.toShelfId, stack.name] as const] : [];
        }),
      ),
    [renderableThreads, stacksById],
  );
  const shelfCountsByStackId = useMemo(() => {
    const counts = new Map<string, number>();

    renderableThreads.forEach((thread) => {
      if (thread.fromType !== 'stack') {
        return;
      }

      counts.set(thread.fromId, (counts.get(thread.fromId) ?? 0) + 1);
    });

    return counts;
  }, [renderableThreads]);
  const shelfNamesById = useMemo(() => new Map(shelves.map((shelf) => [shelf.id, shelf.name])), [shelves]);
  const trimmedSearchQuery = useMemo(() => searchQuery.trim(), [searchQuery]);
  const matchingShelves = useMemo(() => searchShelves(resolvedShelves, trimmedSearchQuery), [resolvedShelves, trimmedSearchQuery]);
  const matchingSnaps = useMemo(
    () => searchSnaps(allSnaps, trimmedSearchQuery, (snap) => (snap.shelfId ? shelfNamesById.get(snap.shelfId) ?? null : null)),
    [allSnaps, shelfNamesById, trimmedSearchQuery],
  );
  const matchingShelfIds = useMemo(() => {
    const ids = new Set(matchingShelves.map((shelf) => shelf.id));

    matchingSnaps.forEach((snap) => {
      if (snap.shelfId) {
        ids.add(snap.shelfId);
      }
    });

    return ids;
  }, [matchingShelves, matchingSnaps]);
  const gridSearchFocusShelf = useMemo(() => {
    if (!trimmedSearchQuery) {
      return null;
    }

    if (matchingShelves[0]) {
      return matchingShelves[0];
    }

    const firstShelfSnap = matchingSnaps.find((snap) => snap.shelfId);
    return firstShelfSnap?.shelfId ? shelvesById.get(firstShelfSnap.shelfId) ?? null : null;
  }, [matchingShelves, matchingSnaps, shelvesById, trimmedSearchQuery]);
  const trayOnlySearchResultCount = useMemo(() => matchingSnaps.filter((snap) => !snap.shelfId).length, [matchingSnaps]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    shelves.forEach((shelf, index) => {
      if (shelf.boardX !== null && shelf.boardY !== null && shelf.boardVariant !== null) {
        return;
      }

      if (bootstrappingIds.current.has(shelf.id)) {
        return;
      }

      bootstrappingIds.current.add(shelf.id);
      bootstrapShelfPlacement(user.id, shelf.id, index).finally(() => {
        bootstrappingIds.current.delete(shelf.id);
      });
    });
  }, [shelves, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setThreads([]);
      return;
    }

    const unsubscribe = subscribeToThreads(
      user.id,
      (nextThreads) => {
        setThreads(nextThreads);
      },
      (nextError) => {
        setError(nextError.message);
      },
    );

    return unsubscribe;
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setAllSnaps([]);
      setIsSnapCapReached(false);
      return;
    }

    const unsubscribe = subscribeToAllSnaps(
      user.id,
      (nextSnaps) => {
        setAllSnaps(nextSnaps);
        setIsSnapCapReached(nextSnaps.length === 200);
      },
      (nextError) => {
        setError(nextError.message);
      },
      200,
    );

    return unsubscribe;
  }, [user?.id]);

  function applyTransform(nextTransform: BoardTransform) {
    setBoardTransform(clampTransform(nextTransform, viewport, contentBounds));
  }

  useEffect(() => {
    if (viewMode !== 'grid' || !trimmedSearchQuery || !gridSearchFocusShelf || viewport.x === 0 || viewport.y === 0) {
      lastSearchFocusKeyRef.current = null;
      return;
    }

    const focusKey = `${trimmedSearchQuery}:${gridSearchFocusShelf.id}`;
    if (lastSearchFocusKeyRef.current === focusKey) {
      return;
    }

    lastSearchFocusKeyRef.current = focusKey;
    applyTransform(getShelfFocusTransform(gridSearchFocusShelf, viewport, fitScale));
  }, [fitScale, gridSearchFocusShelf, trimmedSearchQuery, viewMode, viewport]);

  function zoomToFit() {
    if (viewport.x === 0 || viewport.y === 0 || (resolvedShelves.length === 0 && resolvedStacks.length === 0)) {
      return;
    }

    const bounds = contentBounds;
    const contentWidth = bounds.maxX - bounds.minX;
    const targetScale = fitScale;

    applyTransform({
      scale: targetScale,
      x: viewport.x / 2 - (bounds.minX + contentWidth / 2) * targetScale,
      y: BOARD_TOP_GUTTER - bounds.minY * targetScale,
    });
  }

  useEffect(() => {
    if (!shouldCenterOnOpen || viewport.x === 0 || viewport.y === 0 || (resolvedShelves.length === 0 && resolvedStacks.length === 0)) {
      return;
    }

    const bounds = contentBounds;
    const contentWidth = bounds.maxX - bounds.minX;
    const targetScale = fitScale;

    applyTransform({
      scale: targetScale,
      x: viewport.x / 2 - (bounds.minX + contentWidth / 2) * targetScale,
      y: BOARD_TOP_GUTTER - bounds.minY * targetScale,
    });

    setShouldCenterOnOpen(false);
  }, [contentBounds, fitScale, resolvedShelves.length, resolvedStacks.length, shouldCenterOnOpen, viewport]);

  const backgroundPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3,
        onPanResponderGrant: () => {
          transformRef.current = boardTransform;
        },
        onPanResponderMove: (_, gestureState) => {
          applyTransform({
            ...transformRef.current,
            x: transformRef.current.x + gestureState.dx,
            y: transformRef.current.y + gestureState.dy,
          });
        },
      }),
    [boardTransform, viewport],
  );

  function zoomTo(nextScale: number, focalPoint?: Point) {
    const current = transformRef.current;
    const clampedScale = clamp(nextScale, fitScale, MAX_SCALE);
    const targetPoint = focalPoint ?? { x: viewport.x / 2, y: viewport.y / 2 };
    const focalCanvas = {
      x: (targetPoint.x - current.x) / current.scale,
      y: (targetPoint.y - current.y) / current.scale,
    };

    applyTransform({
      scale: clampedScale,
      x: targetPoint.x - focalCanvas.x * clampedScale,
      y: targetPoint.y - focalCanvas.y * clampedScale,
    });
  }

  function handlePinchStart(touches: readonly { locationX: number; locationY: number }[]) {
    const current = transformRef.current;
    const first = { x: touches[0].locationX, y: touches[0].locationY };
    const second = { x: touches[1].locationX, y: touches[1].locationY };
    const midpoint = getMidpoint(first, second);

    pinchGestureRef.current = {
      startTransform: current,
      startDistance: getDistance(first, second),
      focalCanvas: {
        x: (midpoint.x - current.x) / current.scale,
        y: (midpoint.y - current.y) / current.scale,
      },
    };
  }

  function handlePinchMove(touches: readonly { locationX: number; locationY: number }[]) {
    const gesture = pinchGestureRef.current;
    if (!gesture) {
      return;
    }

    const first = { x: touches[0].locationX, y: touches[0].locationY };
    const second = { x: touches[1].locationX, y: touches[1].locationY };
    const midpoint = getMidpoint(first, second);
    const nextScale = clamp(
      gesture.startTransform.scale * (getDistance(first, second) / Math.max(gesture.startDistance, 1)),
      fitScale,
      MAX_SCALE,
    );

    applyTransform({
      scale: nextScale,
      x: midpoint.x - gesture.focalCanvas.x * nextScale,
      y: midpoint.y - gesture.focalCanvas.y * nextScale,
    });
  }

  function handleShelfDrag(shelfId: string, x: number, y: number) {
    setShelves((current) =>
      current.map((shelf, index) => {
        if (shelf.id !== shelfId) {
          return shelf;
        }

        const resolved = getResolvedShelf(shelf, index);
        const dimensions = getNodeDimensions(resolved.boardVariant);

        return {
          ...shelf,
          boardX: clamp(x, 0, CANVAS_WIDTH - dimensions.width),
          boardY: clamp(y, 0, CANVAS_HEIGHT - dimensions.height - 54),
        };
      }),
    );
  }

  async function handleShelfDragEnd(shelfId: string, x: number, y: number) {
    if (!user?.id) {
      return;
    }

    handleShelfDrag(shelfId, x, y);

    const shelf = resolvedShelves.find((entry) => entry.id === shelfId);
    const dimensions = getNodeDimensions(shelf?.boardVariant ?? 'circle-medium');
    const nextX = clamp(x, 0, CANVAS_WIDTH - dimensions.width);
    const nextY = clamp(y, 0, CANVAS_HEIGHT - dimensions.height - 54);

    try {
      await updateShelfPosition(user.id, shelfId, nextX, nextY);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to save the Shelf position.');
    }
  }

  function handleStackDrag(stackId: string, x: number, y: number) {
    setStacks((current) =>
      current.map((stack) => {
        if (stack.id !== stackId) {
          return stack;
        }

        return {
          ...stack,
          boardX: clamp(x, 0, CANVAS_WIDTH - STACK_WIDTH),
          boardY: clamp(y, 0, CANVAS_HEIGHT - STACK_HEIGHT),
        };
      }),
    );
  }

  async function handleStackDragEnd(stackId: string, x: number, y: number) {
    if (!user?.id) {
      return;
    }

    handleStackDrag(stackId, x, y);

    const nextX = clamp(x, 0, CANVAS_WIDTH - STACK_WIDTH);
    const nextY = clamp(y, 0, CANVAS_HEIGHT - STACK_HEIGHT);

    try {
      await updateStackPosition(user.id, stackId, nextX, nextY);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to save the Stack position.');
    }
  }

  async function handleCreateShelf(input: { name: string; stackId: string | null }) {
    if (!user?.id) {
      return;
    }

    try {
      setIsCreatingShelf(true);
      setCreateShelfError(null);
      const createdShelf = await createShelf(user.id, {
        name: input.name,
        ...getDefaultShelfPlacement(shelves.length),
      });

      if (input.stackId) {
        await createShelfThread(user.id, {
          fromStackId: input.stackId,
          toShelfId: createdShelf.id,
        });
      }

      setIsCreateShelfVisible(false);
      setShouldCenterOnOpen(true);
    } catch (nextError) {
      setCreateShelfError(nextError instanceof Error ? nextError.message : 'Unable to create a Shelf right now.');
    } finally {
      setIsCreatingShelf(false);
    }
  }

  async function handleCreateStack(input: { name: string }) {
    if (!user?.id) {
      return;
    }

    try {
      setIsCreatingStack(true);
      setCreateStackError(null);
      await createStack(user.id, {
        name: input.name,
        ...getDefaultStackPlacement(stacks.length),
      });
      setIsCreateStackVisible(false);
      setShouldCenterOnOpen(true);
    } catch (nextError) {
      setCreateStackError(nextError instanceof Error ? nextError.message : 'Unable to create a Stack right now.');
    } finally {
      setIsCreatingStack(false);
    }
  }

  async function handleSelectManualStackCover(uri: string) {
    if (!user?.id || !coverStack) {
      return;
    }

    try {
      setIsSavingStackCover(true);
      setStackCoverError(null);
      const coverLocalPath = await saveStackCoverImageLocally(uri);
      try {
        await updateStackCover(user.id, coverStack.id, { coverLocalPath });
      } catch (nextError) {
        await deleteImageLocally(coverLocalPath);
        throw nextError;
      }
      setStacks((current) => current.map((stack) => (stack.id === coverStack.id ? { ...stack, coverLocalPath } : stack)));
      setCoverStack(null);
    } catch (nextError) {
      setStackCoverError(nextError instanceof Error ? nextError.message : 'Unable to save this Stack cover right now.');
    } finally {
      setIsSavingStackCover(false);
    }
  }

  async function handleClearStackCover() {
    if (!user?.id || !coverStack) {
      return;
    }

    try {
      setIsSavingStackCover(true);
      setStackCoverError(null);
      await updateStackCover(user.id, coverStack.id, { coverLocalPath: null });
      setStacks((current) => current.map((stack) => (stack.id === coverStack.id ? { ...stack, coverLocalPath: null } : stack)));
      setCoverStack(null);
    } catch (nextError) {
      setStackCoverError(nextError instanceof Error ? nextError.message : 'Unable to clear this Stack cover right now.');
    } finally {
      setIsSavingStackCover(false);
    }
  }

  function handleToggleSearch() {
    if (isSearchVisible) {
      setIsSearchVisible(false);
      setSearchQuery('');
      return;
    }

    setIsSearchVisible(true);
  }

  return (
    <Screen style={{ paddingBottom: 118 }}>
      <AppHeader onPressSearch={handleToggleSearch} searchIconName={isSearchVisible ? 'x' : 'search'} searchButtonTestID="board-search-open-button" />

      {isSearchVisible ? (
        <SurfaceCard style={{ marginBottom: theme.spacing.lg, padding: theme.spacing.md }}>
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
            }}
          >
            <Feather name="search" size={18} color={theme.colors.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              testID="board-search-input"
              placeholder="Search shelf names, titles, thoughts, or labels"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              style={{
                flex: 1,
                minHeight: 52,
                color: theme.colors.text,
                fontFamily: theme.typography.fonts.medium,
                fontSize: 15,
              }}
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={10}>
                <Feather name="x-circle" size={18} color={theme.colors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          <Text style={[textStyles.bodySm, { marginTop: theme.spacing.sm }]}>Search shelves by name and search every Snap by title, thought, label, or linked shelf name.</Text>
        </SurfaceCard>
      ) : null}

      {!isConfigured ? (
        <EmptyState
          title="Restart Expo to activate Firebase"
          description="The Board will switch to live Shelves after Expo reloads with your Firebase config values."
        />
      ) : null}

      {isLoadingShelves ? (
        <SurfaceCard style={{ marginBottom: theme.spacing.lg, padding: theme.spacing.lg }}>
          <Text style={textStyles.bodyMd}>Loading your live Shelves...</Text>
        </SurfaceCard>
      ) : null}

      {error ? (
        <SurfaceCard style={{ marginBottom: theme.spacing.lg, padding: theme.spacing.lg }}>
          <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.sm }]}>Board Error</Text>
          <Text style={textStyles.bodyMd}>{error}</Text>
        </SurfaceCard>
      ) : null}

      {isSnapCapReached ? (
        <SurfaceCard style={{ marginBottom: theme.spacing.lg, padding: theme.spacing.md }}>
          <Text style={textStyles.bodySm}>Showing your 200 most recent Snaps here. Open Library for full-account search and filters.</Text>
        </SurfaceCard>
      ) : null}

      {!trimmedSearchQuery && !isLoadingShelves && shelves.length === 0 && stacks.length === 0 ? (
        <View>
          <EmptyState
            title="Your Board is waiting for its first Shelf"
            description={__DEV__ ? 'Create a Shelf here or use sample data in Settings, then arrange your system on the Board.' : 'Create a Shelf, then capture into The Tray and move keepers into your collections.'}
          />
          <View style={{ marginTop: theme.spacing.md }}>
            <PillButton label="Create First Shelf" icon="plus" fullWidth onPress={() => setIsCreateShelfVisible(true)} disabled={!user?.id || isCreatingShelf} />
          </View>
        </View>
      ) : null}

      {trimmedSearchQuery && viewMode === 'list' ? (
        <View style={{ flex: 1 }}>
          <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
          <SurfaceCard style={{ marginBottom: theme.spacing.lg, padding: theme.spacing.lg }} testID="board-search-summary">
            <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.xs }]}>Board Search</Text>
            <Text style={[textStyles.titleMd, { marginBottom: 4 }]}>{`"${trimmedSearchQuery}"`}</Text>
            <Text style={textStyles.bodySm}>
              {matchingShelves.length} shelf match{matchingShelves.length === 1 ? '' : 'es'} and {matchingSnaps.length} snap result{matchingSnaps.length === 1 ? '' : 's'}
            </Text>
          </SurfaceCard>

          {matchingShelves.length === 0 && matchingSnaps.length === 0 ? (
            <EmptyState title="No matching results" description="Try a shelf name, a title word, a phrase from your thought, or one of your labels." />
          ) : (
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 124, gap: theme.spacing.md }}>
              {matchingShelves.length > 0 ? <Text style={textStyles.eyebrow}>Shelves</Text> : null}
              {matchingShelves.map((shelf) => (
                <ShelfListItem
                  key={shelf.id}
                  shelf={shelf}
                  coverSnap={shelfCoverSnaps.get(shelf.id) ?? null}
                  coverImageUri={shelfCoverImageUris.get(shelf.id) ?? null}
                  snapCount={snapCountsByShelfId.get(shelf.id) ?? 0}
                  latestSnap={latestSnapsByShelfId.get(shelf.id) ?? null}
                  anchorShelfName={anchorShelfNamesByShelfId.get(shelf.id) ?? null}
                  onPress={() => router.push(`/shelf/${shelf.id}`)}
                />
              ))}

              {matchingShelves.length > 0 && matchingSnaps.length > 0 ? <Text style={[textStyles.eyebrow, { marginTop: theme.spacing.sm }]}>Snaps</Text> : null}
              {matchingShelves.length === 0 && matchingSnaps.length > 0 ? <Text style={textStyles.eyebrow}>Snaps</Text> : null}
              {matchingSnaps.map((snap) => (
                <SnapSearchResult
                  key={snap.id}
                  snap={snap}
                  shelfName={snap.shelfId ? shelfNamesById.get(snap.shelfId) ?? 'Shelf' : 'The Tray'}
                  onPress={() => {
                    if (snap.shelfId) {
                      router.push(`/shelf/${snap.shelfId}`);
                      return;
                    }

                    router.push('/tray');
                  }}
                />
              ))}
            </ScrollView>
          )}
        </View>
      ) : null}

      {(!trimmedSearchQuery || viewMode === 'grid') && (resolvedShelves.length > 0 || resolvedStacks.length > 0) ? (
        <View style={{ flex: 1 }}>
          {!trimmedSearchQuery && isOrganizationMapVisible ? (
            <BoardOrientationCard
              shelfCount={resolvedShelves.length}
              stackCount={resolvedStacks.length}
              organizedSnapCount={organizedSnapCount}
              traySnapCount={traySnapCount}
              threadCount={renderableThreads.length}
              onDismiss={() => setIsOrganizationMapVisible(false)}
            />
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md }}>
            <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
            {!trimmedSearchQuery && !isOrganizationMapVisible ? (
              <Pressable
                onPress={() => setIsOrganizationMapVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Show how to use the Board"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: theme.colors.borderSoft,
                  backgroundColor: theme.colors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: theme.spacing.lg,
                  ...theme.shadows.card,
                }}
              >
                <Feather name="help-circle" size={20} color={theme.colors.primary} />
              </Pressable>
            ) : null}
          </View>

          {viewMode === 'grid' ? (
            <>
              {trimmedSearchQuery ? (
                <SurfaceCard style={{ marginBottom: theme.spacing.md, padding: theme.spacing.md }} testID="board-search-summary">
                  <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.xs }]}>Board Search</Text>
                  <Text style={[textStyles.titleMd, { marginBottom: 4 }]} numberOfLines={1}>{`"${trimmedSearchQuery}"`}</Text>
                  <Text style={textStyles.bodySm}>
                    {matchingShelves.length} shelf match{matchingShelves.length === 1 ? '' : 'es'} and {matchingSnaps.length} snap result{matchingSnaps.length === 1 ? '' : 's'}.
                    {gridSearchFocusShelf ? ` Zoomed to ${gridSearchFocusShelf.name}.` : ' No Shelf on the Board to zoom to.'}
                  </Text>
                  {trayOnlySearchResultCount > 0 ? (
                    <Text style={[textStyles.bodySm, { marginTop: theme.spacing.xs }]}>{trayOnlySearchResultCount} result{trayOnlySearchResultCount === 1 ? '' : 's'} live in The Tray.</Text>
                  ) : null}
                </SurfaceCard>
              ) : null}
              <View
                style={{ marginBottom: theme.spacing.md }}
              >
                <Text style={[textStyles.bodySm, { maxWidth: '92%' }]}>{trimmedSearchQuery ? 'Matching Shelves are highlighted. Clear search to return to arranging the full Board.' : 'Pinch or use controls to zoom. Drag Shelves to arrange the system.'}</Text>
              </View>
              <View
                onLayout={(event) => {
                  const { width, height } = event.nativeEvent.layout;
                  setViewport({ x: width, y: height });
                }}
                style={{ flex: 1, overflow: 'hidden' }}
                onStartShouldSetResponderCapture={(event) => event.nativeEvent.touches.length >= 2}
                onMoveShouldSetResponderCapture={(event) => event.nativeEvent.touches.length >= 2}
                onResponderGrant={(event) => {
                  if (event.nativeEvent.touches.length >= 2) {
                    handlePinchStart(event.nativeEvent.touches);
                  }
                }}
                onResponderMove={(event) => {
                  if (event.nativeEvent.touches.length >= 2) {
                    handlePinchMove(event.nativeEvent.touches);
                  }
                }}
                onResponderRelease={() => {
                  pinchGestureRef.current = null;
                }}
                onResponderTerminate={() => {
                  pinchGestureRef.current = null;
                }}
              >
                <View
                  {...backgroundPanResponder.panHandlers}
                  style={{
                    position: 'absolute',
                    inset: 0,
                  }}
                />

                <View
                  pointerEvents="box-none"
                  style={{
                    position: 'absolute',
                    left: boardTransform.x,
                    top: boardTransform.y,
                    width: CANVAS_WIDTH,
                    height: CANVAS_HEIGHT,
                  }}
                >
                  <View
                    pointerEvents="box-none"
                    style={{
                      position: 'absolute',
                      left: (CANVAS_WIDTH * (boardTransform.scale - 1)) / 2,
                      top: (CANVAS_HEIGHT * (boardTransform.scale - 1)) / 2,
                      width: CANVAS_WIDTH,
                      height: CANVAS_HEIGHT,
                      transform: [{ scale: boardTransform.scale }],
                    }}
                  >
                    <DottedCanvas />

                    {renderableThreads.map((thread) => {
                      const fromShelf = thread.fromType === 'shelf' ? shelvesById.get(thread.fromId) : null;
                      const fromStack = thread.fromType === 'stack' ? stacksById.get(thread.fromId) : null;
                      const toShelf = shelvesById.get(thread.toShelfId);

                      if ((!fromShelf && !fromStack) || !toShelf) {
                        return null;
                      }

                      return renderThread(fromStack ? getStackCenter(fromStack) : getNodeCenter(fromShelf!), getNodeCenter(toShelf), `thread-${thread.id}`);
                    })}

                    {resolvedStacks.map((stack) => (
                      <DraggableStackNode
                        key={stack.id}
                        stack={stack}
                        scale={boardTransform.scale}
                        shelfCount={shelfCountsByStackId.get(stack.id) ?? 0}
                        coverImageUri={stackCoverImageUris.get(stack.id) ?? null}
                        onPress={() => setActionStack(stack)}
                        onDrag={(x, y) => {
                          handleStackDrag(stack.id, x, y);
                        }}
                        onDragEnd={(x, y) => {
                          handleStackDragEnd(stack.id, x, y);
                        }}
                      />
                    ))}

                    {resolvedShelves.map((shelf) => (
                      <DraggableShelfNode
                        key={shelf.id}
                        shelf={shelf}
                        scale={boardTransform.scale}
                        isHighlighted={trimmedSearchQuery ? matchingShelfIds.has(shelf.id) : false}
                        coverSnap={shelfCoverSnaps.get(shelf.id) ?? null}
                        coverImageUri={shelfCoverImageUris.get(shelf.id) ?? null}
                        onPress={() => router.push(`/shelf/${shelf.id}`)}
                        onDrag={(x, y) => {
                          handleShelfDrag(shelf.id, x, y);
                        }}
                        onDragEnd={(x, y) => {
                          handleShelfDragEnd(shelf.id, x, y);
                        }}
                      />
                    ))}
                  </View>
                </View>

                <View
                  style={{
                    position: 'absolute',
                    right: 10,
                    bottom: 114,
                    width: 58,
                    backgroundColor: theme.colors.surface,
                    borderRadius: 30,
                    paddingVertical: 14,
                    alignItems: 'center',
                    gap: 16,
                    shadowColor: theme.colors.shadow,
                    shadowOpacity: 0.08,
                    shadowRadius: 18,
                    shadowOffset: { width: 0, height: 10 },
                  }}
                >
                  <Pressable onPress={() => zoomTo(boardTransform.scale + 0.12)} hitSlop={10}>
                    <Feather name="plus" size={24} color={theme.colors.primary} />
                  </Pressable>
                  <View style={{ width: 28, height: 1, backgroundColor: theme.colors.borderSoft }} />
                  <Pressable
                    onPress={() => {
                      if (boardTransform.scale - 0.12 <= fitScale + 0.01) {
                        zoomToFit();
                        return;
                      }

                      zoomTo(boardTransform.scale - 0.12);
                    }}
                    hitSlop={10}
                  >
                    <Feather name="minus" size={24} color={theme.colors.primary} />
                  </Pressable>
                </View>
              </View>
            </>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 124 }}
            >
              <SurfaceCard style={{ marginBottom: theme.spacing.md, padding: theme.spacing.md }}>
                <Text style={textStyles.bodySm}>Use List as a readable map of every Shelf, including empty containers and threaded relationships.</Text>
              </SurfaceCard>
              {resolvedShelves.map((shelf, index) => (
                <View key={shelf.id} style={{ marginBottom: index === resolvedShelves.length - 1 ? 0 : theme.spacing.md }}>
                  <ShelfListItem
                    shelf={shelf}
                    coverSnap={shelfCoverSnaps.get(shelf.id) ?? null}
                    coverImageUri={shelfCoverImageUris.get(shelf.id) ?? null}
                    snapCount={snapCountsByShelfId.get(shelf.id) ?? 0}
                    latestSnap={latestSnapsByShelfId.get(shelf.id) ?? null}
                    anchorShelfName={stackNamesByShelfId.get(shelf.id) ?? anchorShelfNamesByShelfId.get(shelf.id) ?? null}
                    onPress={() => router.push(`/shelf/${shelf.id}`)}
                  />
                </View>
              ))}
            </ScrollView>
          )}

          <Pressable
            onPress={() => setIsCreateActionVisible(true)}
            testID="board-add-button"
            style={{
              position: 'absolute',
              right: 0,
              bottom: 20,
              width: 78,
              height: 78,
              borderRadius: 39,
              backgroundColor: theme.colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              ...theme.shadows.button,
            }}
          >
            <Feather name="plus" size={28} color={theme.colors.surface} />
          </Pressable>
        </View>
      ) : null}

      <CreateShelfModal
        visible={isCreateShelfVisible}
        shelves={resolvedShelves}
        stacks={resolvedStacks}
        isSubmitting={isCreatingShelf}
        error={createShelfError}
        onClose={() => {
          setIsCreateShelfVisible(false);
          setCreateShelfError(null);
        }}
        onSubmit={handleCreateShelf}
      />
      <CreateStackModal
        visible={isCreateStackVisible}
        isSubmitting={isCreatingStack}
        error={createStackError}
        onClose={() => {
          setIsCreateStackVisible(false);
          setCreateStackError(null);
        }}
        onSubmit={handleCreateStack}
      />
      <ActionSheetModal
        visible={isCreateActionVisible}
        title="Add to Board"
        description="Create a Shelf for Snaps or a Stack to visually group related Shelves."
        actions={[
          {
            label: 'New Shelf',
            icon: 'archive',
            onPress: () => {
              setIsCreateActionVisible(false);
              setIsCreateShelfVisible(true);
            },
          },
          {
            label: 'New Stack',
            icon: 'layers',
            onPress: () => {
              setIsCreateActionVisible(false);
              setIsCreateStackVisible(true);
            },
          },
        ]}
        onClose={() => setIsCreateActionVisible(false)}
      />
      <ActionSheetModal
        visible={actionStack !== null}
        title="Stack Actions"
        description={actionStack ? `Update the visual cover for "${actionStack.name}".` : undefined}
        actions={[
          {
            label: 'Change Cover',
            icon: 'image',
            onPress: () => {
              setCoverStack(actionStack);
              setActionStack(null);
            },
          },
        ]}
        onClose={() => setActionStack(null)}
      />
      <StackCoverModal
        visible={coverStack !== null}
        stack={coverStack}
        isSubmitting={isSavingStackCover}
        error={stackCoverError}
        onClose={() => {
          setCoverStack(null);
          setStackCoverError(null);
        }}
        onSelectManualImage={(uri) => {
          void handleSelectManualStackCover(uri);
        }}
        onClearCover={() => {
          void handleClearStackCover();
        }}
      />
    </Screen>
  );
}
