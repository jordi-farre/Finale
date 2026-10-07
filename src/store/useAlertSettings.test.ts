import AsyncStorage from '@react-native-async-storage/async-storage';

import { ALERT_SETTINGS_STORAGE_KEY_FOR_TESTS, useAlertSettings } from '@/store/useAlertSettings';

describe('useAlertSettings', () => {
  it('restores a saved choice', async () => {
    await AsyncStorage.setItem(ALERT_SETTINGS_STORAGE_KEY_FOR_TESTS, 'false');
    await useAlertSettings.getState().hydrate();
    expect(useAlertSettings.getState().enabled).toBe(false);
  });

  it('defaults to on when nothing is saved', async () => {
    await useAlertSettings.getState().hydrate();
    expect(useAlertSettings.getState().enabled).toBe(true);
  });
});
