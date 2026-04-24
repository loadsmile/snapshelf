export const colors = {
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
  card: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  button: {
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 7,
  },
};
