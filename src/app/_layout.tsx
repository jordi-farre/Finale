import '@/theme/cssInterop';
import '@/global.css';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { hasTmdbToken } from '@/lib/tmdb';
import { useWatchlist } from '@/store/useWatchlist';
import { paperDarkTheme, paperLightTheme } from '@/theme/paper';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

const navigationLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.light.primary,
    background: colors.light.background,
    card: colors.light.surface,
    text: colors.light.onSurface,
    border: colors.light.outlineVariant,
  },
};

const navigationDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.dark.primary,
    background: colors.dark.background,
    card: colors.dark.surface,
    text: colors.dark.onSurface,
    border: colors.dark.outlineVariant,
  },
};

export default function RootLayout() {
  const isDark = useColorScheme() === 'dark';
  const hydrate = useWatchlist((state) => state.hydrate);
  const hydrated = useWatchlist((state) => state.hydrated);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    SplashScreen.hideAsync();
    if (hasTmdbToken()) void useWatchlist.getState().refreshAll();
  }, [hydrated]);

  if (!hydrated) return null;

  return (
    <SafeAreaProvider>
      <PaperProvider theme={isDark ? paperDarkTheme : paperLightTheme}>
        <ThemeProvider value={isDark ? navigationDarkTheme : navigationLightTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="search" />
            <Stack.Screen name="show/[id]" />
          </Stack>
        </ThemeProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
