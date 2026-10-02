import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import SettingsScreen from '@/app/settings';
import { ALERT_SETTINGS_STORAGE_KEY_FOR_TESTS, useAlertSettings } from '@/store/useAlertSettings';
import { THEME_STORAGE_KEY_FOR_TESTS, useThemePreference } from '@/store/useThemePreference';
import { fireEvent, render, screen, waitFor } from '@/test-utils/render';

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

const permissions = jest.mocked(Notifications.getPermissionsAsync);

beforeEach(() => {
  permissions.mockResolvedValue({ granted: true, canAskAgain: true } as Notifications.NotificationPermissionsStatus);
  useAlertSettings.setState({ enabled: true, hydrated: true });
  useThemePreference.setState({ preference: 'system', hydrated: true });
});

describe('settings', () => {
  it('switches the theme and remembers it', async () => {
    await render(<SettingsScreen />);
    await fireEvent.press(screen.getByText('Dark'));
    expect(useThemePreference.getState().preference).toBe('dark');
    expect(await AsyncStorage.getItem(THEME_STORAGE_KEY_FOR_TESTS)).toBe('dark');
  });

  it('turns season notifications off and back on, asking for permission', async () => {
    await render(<SettingsScreen />);
    await fireEvent(screen.getByLabelText('Season notifications'), 'valueChange', false);
    expect(useAlertSettings.getState().enabled).toBe(false);
    expect(await AsyncStorage.getItem(ALERT_SETTINGS_STORAGE_KEY_FOR_TESTS)).toBe('false');
    await fireEvent(screen.getByLabelText('Season notifications'), 'valueChange', true);
    expect(useAlertSettings.getState().enabled).toBe(true);
    await waitFor(() => expect(Notifications.getPermissionsAsync).toHaveBeenCalled());
  });

  it('points to system settings when notifications are blocked', async () => {
    permissions.mockResolvedValue({ granted: false, canAskAgain: false } as Notifications.NotificationPermissionsStatus);
    await render(<SettingsScreen />);
    expect(await screen.findByText('Blocked in system settings')).toBeOnTheScreen();
  });

  it('shows the app version', async () => {
    await render(<SettingsScreen />);
    expect(screen.getByText(/^Finale /)).toBeOnTheScreen();
  });
});

describe('settings stores', () => {
  it('restore saved preferences', async () => {
    await AsyncStorage.setItem(THEME_STORAGE_KEY_FOR_TESTS, 'light');
    await AsyncStorage.setItem(ALERT_SETTINGS_STORAGE_KEY_FOR_TESTS, 'false');
    await useThemePreference.getState().hydrate();
    await useAlertSettings.getState().hydrate();
    expect(useThemePreference.getState().preference).toBe('light');
    expect(useAlertSettings.getState().enabled).toBe(false);
  });

  it('fall back to defaults for unknown values', async () => {
    await AsyncStorage.setItem(THEME_STORAGE_KEY_FOR_TESTS, 'purple');
    await useThemePreference.getState().hydrate();
    await useAlertSettings.getState().hydrate();
    expect(useThemePreference.getState().preference).toBe('system');
    expect(useAlertSettings.getState().enabled).toBe(true);
  });
});
