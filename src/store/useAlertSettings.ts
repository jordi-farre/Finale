import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_KEY = 'finale:alerts';

type AlertSettingsState = {
  enabled: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setEnabled: (enabled: boolean) => void;
};

export const useAlertSettings = create<AlertSettingsState>((set) => ({
  enabled: true,
  hydrated: false,

  hydrate: async () => {
    let enabled = true;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw === 'true' || raw === 'false') enabled = raw === 'true';
    } catch {
      enabled = true;
    }
    set({ enabled, hydrated: true });
  },

  setEnabled: (enabled) => {
    set({ enabled });
    void AsyncStorage.setItem(STORAGE_KEY, String(enabled));
  },
}));

export const ALERT_SETTINGS_STORAGE_KEY_FOR_TESTS = STORAGE_KEY;
