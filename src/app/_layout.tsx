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
import { useAlertSettings } from '@/store/useAlertSettings';
import { useThemePreference } from '@/store/useThemePreference';
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
  const systemScheme = useColorScheme();
  const themePreference = useThemePreference((state) => state.preference);
  const isDark = themePreference === 'system' ? systemScheme === 'dark' : themePreference === 'dark';
  const watchlistHydrated = useWatchlist((state) => state.hydrated);
  const themeHydrated = useThemePreference((state) => state.hydrated);
  const alertsHydrated = useAlertSettings((state) => state.hydrated);
  const hydrated = watchlistHydrated && themeHydrated && alertsHydrated;

  useEffect(() => {
    void useWatchlist.getState().hydrate();
    void useThemePreference.getState().hydrate();
    void useAlertSettings.getState().hydrate();
  }, []);

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
            <Stack.Screen name="settings" />
            <Stack.Screen name="finished" />
            <Stack.Screen name="show/[id]" />
          </Stack>
        </ThemeProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
