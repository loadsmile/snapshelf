import { brandColor, colors } from './tokens';

export const fonts = {
  brand: 'CabinetGrotesk_800ExtraBold',
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extraBold: 'Manrope_800ExtraBold',
};

export const textStyles = {
  get displaySm() {
    return {
      fontFamily: fonts.extraBold,
      fontSize: 24,
      lineHeight: 32,
      letterSpacing: -1.25,
      color: colors.text,
    };
  },
  get titleLg() {
    return {
      fontFamily: fonts.bold,
      fontSize: 20,
      lineHeight: 28,
      letterSpacing: -0.5,
      color: colors.text,
    };
  },
  get titleMd() {
    return {
      fontFamily: fonts.semibold,
      fontSize: 17,
      lineHeight: 24,
      color: colors.text,
    };
  },
  get bodyMd() {
    return {
      fontFamily: fonts.regular,
      fontSize: 15,
      lineHeight: 23,
      color: colors.textMuted,
    };
  },
  get bodySm() {
    return {
      fontFamily: fonts.medium,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textMuted,
    };
  },
  get eyebrow() {
    return {
      fontFamily: fonts.semibold,
      fontSize: 11,
      lineHeight: 16,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.8,
      color: colors.primary,
    };
  },
  get brand() {
    return {
      fontFamily: fonts.brand,
      fontSize: 32,
      lineHeight: 38,
      letterSpacing: -1.35,
      color: brandColor,
    };
  },
  get button() {
    return {
      fontFamily: fonts.medium,
      fontSize: 15,
      lineHeight: 18,
      color: colors.text,
    };
  },
};
