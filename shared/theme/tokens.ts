export type ThemeMode = 'light' | 'dark';

export const lightColors = {
  background: '#F7F1EB',
  surface: '#FFF9F3',
  surfaceSoft: '#F7E3BF',
  primary: '#C63A06',
  primaryDeep: '#A92E00',
  accentDeep: '#7D1F00',
  text: '#2E231A',
  textMuted: '#74675D',
  borderSoft: '#F0E3D7',
  shadow: '#6C3A1A',
  dot: '#EDC8B6',
  thread: '#EDC3B0',
  white: '#FFFFFF',
};

export const darkColors: typeof lightColors = {
  background: '#1C1510',
  surface: '#251A13',
  surfaceSoft: '#2E2118',
  primary: '#E8501A',
  primaryDeep: '#C63A06',
  accentDeep: '#A92E00',
  text: '#F2E8DF',
  textMuted: '#A8968A',
  borderSoft: '#3A2A20',
  shadow: '#000000',
  dot: '#3D2518',
  thread: '#3D2518',
  white: '#FFFFFF',
};

export const brandColor = lightColors.primary;

let activeThemeMode: ThemeMode = 'dark';

export function getThemeMode() {
  return activeThemeMode;
}

export function setThemeMode(mode: ThemeMode) {
  activeThemeMode = mode;
}

export function getColorPalette() {
  return activeThemeMode === 'dark' ? darkColors : lightColors;
}

export const colors = new Proxy(lightColors, {
  get(_target, property: keyof typeof lightColors) {
    return getColorPalette()[property];
  },
}) as typeof lightColors;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 36,
};

export const radii = {
  sm: 12,
  md: 18,
  lg: 28,
  xl: 36,
  pill: 999,
};

export const shadows = {
  get card() {
    return {
      shadowColor: colors.shadow,
      shadowOpacity: activeThemeMode === 'dark' ? 0.28 : 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6,
    };
  },
  get button() {
    return {
      shadowColor: colors.primaryDeep,
      shadowOpacity: activeThemeMode === 'dark' ? 0.24 : 0.18,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 12 },
      elevation: 7,
    };
  },
};
