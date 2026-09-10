export const Colors = {
  // Brand
  brand: '#E8445A',
  brandDark: '#C93351',
  brandLight: '#FFDDE5',
  brandMuted: '#FFE8EC',
  brandBorder: '#F5C9D0',

  // Text — warm near-black scale
  text: '#1C1B1F',
  textSecondary: '#72697A',
  textTertiary: '#B0AAB8',
  textInverse: '#FFFFFF',

  // Surfaces — warm off-white base so white cards pop
  background: '#FFF0F2',
  surface: '#FFFFFF',
  surfaceMuted: '#FFE4E8',

  // Borders
  border: '#EDE9F0',
  borderLight: '#F5F2F7',

  // Semantic
  success: '#22C55E',
  successLight: '#F0FDF4',
  successBorder: '#BBF7D0',
  successText: '#166534',
  error: '#EF4444',
  errorLight: '#FEF2F2',
  errorBorder: '#FECACA',

  // Base
  white: '#FFFFFF',
  black: '#000000',

  // Legacy aliases — kept so every existing screen still compiles
  primary: '#1C1B1F',
  secondary: '#E8445A',
  accent: '#0F3460',
} as const;

export type ColorKey = keyof typeof Colors;

export const Shadows = {
  xs: {
    shadowColor: '#1C1B1F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  sm: {
    shadowColor: '#1C1B1F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#1C1B1F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },
  lg: {
    shadowColor: '#1C1B1F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 24,
    elevation: 5,
  },
  brand: {
    shadowColor: '#E8445A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },
} as const;

export const Radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  '2xl': 36,
  full: 9999,
} as const;

export const Spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  '2xl': 28,
  '3xl': 34,
} as const;
