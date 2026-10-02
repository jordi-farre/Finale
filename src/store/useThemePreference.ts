import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'finale:theme';

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

type ThemePreferenceState = {
  preference: ThemePreference;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setPreference: (preference: ThemePreference) => void;
};

export const useThemePreference = create<ThemePreferenceState>((set) => ({
  preference: 'system',
  hydrated: false,

  hydrate: async () => {
    let preference: ThemePreference = 'system';
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (isThemePreference(raw)) preference = raw;
    } catch {
      preference = 'system';
    }
    set({ preference, hydrated: true });
  },

  setPreference: (preference) => {
    set({ preference });
    void AsyncStorage.setItem(STORAGE_KEY, preference);
  },
}));

export const THEME_STORAGE_KEY_FOR_TESTS = STORAGE_KEY;
