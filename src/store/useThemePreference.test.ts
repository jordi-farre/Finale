import AsyncStorage from '@react-native-async-storage/async-storage';

import { THEME_STORAGE_KEY_FOR_TESTS, useThemePreference } from '@/store/useThemePreference';

describe('useThemePreference', () => {
  it('restores a saved preference', async () => {
    await AsyncStorage.setItem(THEME_STORAGE_KEY_FOR_TESTS, 'light');
    await useThemePreference.getState().hydrate();
    expect(useThemePreference.getState().preference).toBe('light');
  });

  it('falls back to the system theme for an unknown value', async () => {
    await AsyncStorage.setItem(THEME_STORAGE_KEY_FOR_TESTS, 'purple');
    await useThemePreference.getState().hydrate();
    expect(useThemePreference.getState().preference).toBe('system');
  });
});
