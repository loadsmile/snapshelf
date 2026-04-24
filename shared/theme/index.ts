import { colors, radii, shadows, spacing } from './tokens';
import { fonts } from './typography';

export const theme = {
  colors,
  spacing,
  radii,
  shadows,
  typography: {
    fonts,
  },
};

export type AppTheme = typeof theme;

export * from './tokens';
export * from './typography';
