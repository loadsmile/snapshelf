import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { resolveSnapImageUri } from '@/features/snaps/utils';
import type { Snap } from '@/features/snaps/types';
import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

type SnapArtworkProps = {
  snap?: Snap | null;
  imageUri?: string | null;
  fallbackColors: [string, string];
  style: StyleProp<ViewStyle>;
  children?: ReactNode;
  showChildrenOnFallback?: boolean;
  fallbackLabel?: string;
};

export function SnapArtwork({ snap = null, imageUri = null, fallbackColors, style, children, showChildrenOnFallback = false, fallbackLabel = 'Image unavailable' }: SnapArtworkProps) {
  const resolvedImageUri = useMemo(() => imageUri ?? (snap ? resolveSnapImageUri(snap) : null), [imageUri, snap]);
  const [isBroken, setIsBroken] = useState(false);
  const shouldShowFallback = !resolvedImageUri || isBroken;

  useEffect(() => {
    setIsBroken(false);
  }, [resolvedImageUri]);

  return (
    <View style={[style, { overflow: 'hidden' }]}>
      {shouldShowFallback ? (
        <View style={[StyleSheet.absoluteFillObject, styles.placeholder]}>
          <LinearGradient colors={[theme.colors.surfaceSoft, theme.colors.surface]} style={StyleSheet.absoluteFillObject} />
          <View style={[styles.placeholderBadge, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderSoft }]}>
            <Feather name="camera" size={16} color={theme.colors.textMuted} />
          </View>
          <Text style={[textStyles.bodySm, styles.placeholderLabel]}>{fallbackLabel}</Text>
        </View>
      ) : (
        <>
          <Image source={{ uri: resolvedImageUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" onError={() => setIsBroken(true)} />
          <LinearGradient colors={fallbackColors} style={[StyleSheet.absoluteFillObject, styles.overlay]} />
        </>
      )}
      {!shouldShowFallback || showChildrenOnFallback ? children : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    opacity: 0.12,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  placeholderBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  placeholderLabel: {
    color: theme.colors.textMuted,
  },
});
