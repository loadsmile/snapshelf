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
};

export function SnapArtwork({ snap = null, imageUri = null, fallbackColors, style, children, showChildrenOnFallback = false }: SnapArtworkProps) {
  const resolvedImageUri = useMemo(() => (snap ? resolveSnapImageUri(snap) : imageUri), [imageUri, snap]);
  const [isBroken, setIsBroken] = useState(false);
  const shouldShowFallback = !resolvedImageUri || isBroken;

  useEffect(() => {
    setIsBroken(false);
  }, [resolvedImageUri]);

  return (
    <View style={[style, { overflow: 'hidden' }]}>
      {shouldShowFallback ? (
        <View style={[StyleSheet.absoluteFillObject, styles.placeholder]}>
          <LinearGradient colors={['#F4EFE8', '#E8E1D7']} style={StyleSheet.absoluteFillObject} />
          <View style={styles.placeholderBadge}>
            <Feather name="camera" size={16} color={theme.colors.textMuted} />
          </View>
          <Text style={[textStyles.bodySm, styles.placeholderLabel]}>Not available</Text>
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
    backgroundColor: 'rgba(255, 249, 243, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(132, 111, 92, 0.12)',
  },
  placeholderLabel: {
    color: theme.colors.textMuted,
  },
});
