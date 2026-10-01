import '@/theme/cssInterop';
import '@/global.css';

import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTappedShowId } from '@/hooks/use-tapped-show-id';
import { registerBackgroundRefresh } from '@/lib/backgroundRefresh';
import { configureNotifications } from '@/lib/notifications';
import { hasTmdbToken } from '@/lib/tmdb';
import { useWatchlist } from '@/store/useWatchlist';
import { paperDarkTheme, paperLightTheme } from '@/theme/paper';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();
configureNotifications();

const FOREGROUND_REFRESH_AFTER_MS = 30 * 60 * 1000;

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

  const tappedShowId = useTappedShowId();

  useEffect(() => {
    if (!hydrated) return;
    SplashScreen.hideAsync();
    void registerBackgroundRefresh().catch(() => {});
    if (!hasTmdbToken()) return;
    let lastRefresh = Date.now();
    void useWatchlist.getState().refreshAll();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || Date.now() - lastRefresh < FOREGROUND_REFRESH_AFTER_MS) return;
      lastRefresh = Date.now();
      void useWatchlist.getState().refreshAll();
    });
    return () => subscription.remove();
  }, [hydrated]);

  useEffect(() => {
    if (hydrated && tappedShowId !== null) router.push(`/show/${tappedShowId}`);
  }, [hydrated, tappedShowId]);

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
