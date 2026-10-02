import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';

import { colors, radii } from '@/theme/tokens';

const FONT_SCALE = 1.1;

function scaleFonts(fonts: MD3Theme['fonts']): MD3Theme['fonts'] {
  return Object.fromEntries(
    Object.entries(fonts).map(([variant, style]) => [
      variant,
      'fontSize' in style
        ? { ...style, fontSize: Math.round(style.fontSize * FONT_SCALE), lineHeight: Math.round(style.lineHeight * FONT_SCALE) }
        : style,
    ]),
  ) as MD3Theme['fonts'];
}

export const paperLightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: { ...MD3LightTheme.colors, ...colors.light },
  fonts: scaleFonts(MD3LightTheme.fonts),
  roundness: radii.md / 4,
};

export const paperDarkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: { ...MD3DarkTheme.colors, ...colors.dark },
  fonts: scaleFonts(MD3DarkTheme.fonts),
  roundness: radii.md / 4,
};
