import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';

import { colors, radii } from '@/theme/tokens';

export const paperLightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: { ...MD3LightTheme.colors, ...colors.light },
  roundness: radii.md / 4,
};

export const paperDarkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: { ...MD3DarkTheme.colors, ...colors.dark },
  roundness: radii.md / 4,
};
