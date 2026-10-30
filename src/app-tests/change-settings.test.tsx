import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import SettingsScreen from '@/app/settings';
import { ALERT_SETTINGS_STORAGE_KEY_FOR_TESTS, useAlertSettings } from '@/store/useAlertSettings';
import { useWatchlist } from '@/store/useWatchlist';
import { followed } from '@/test-utils/fixtures';
import { THEME_STORAGE_KEY_FOR_TESTS, useThemePreference } from '@/store/useThemePreference';
import { fireEvent, render, screen, waitFor } from '@/test-utils/render';

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));
jest.mock('expo-constants', () => ({
  expoConfig: { version: '1.2.0', extra: { buildProfile: 'production' } },
}));

const permissions = jest.mocked(Notifications.getPermissionsAsync);

beforeEach(() => {
  permissions.mockResolvedValue({ granted: true, canAskAgain: true } as Notifications.NotificationPermissionsStatus);
  useAlertSettings.setState({ enabled: true, hydrated: true });
  useThemePreference.setState({ preference: 'system', hydrated: true });
});

describe('changing settings', () => {
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

  it('shows the next scheduled notification and when the background check last ran', async () => {
    const fireAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    fireAt.setHours(10, 0, 0, 0);
    useWatchlist.setState({
      shows: [
        followed(
          { id: 1 },
          {
            planned: [
              { keys: ['premiere:3'], showId: 1, title: 'Severance: Season 3 has started', body: '', fireAt: fireAt.toISOString() },
            ],
          },
        ),
      ],
    });
    await AsyncStorage.setItem('finale:last-background-refresh', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());
    await render(<SettingsScreen />);
    expect(screen.getByText(/^Next: Severance: Season 3 has started, .+ at 10:00\.$/)).toBeOnTheScreen();
    expect(await screen.findByText('Last background check: about 2 hours ago.')).toBeOnTheScreen();
  });

  it('cancels scheduled notifications when you turn them off', async () => {
    const cancelAll = jest.mocked(Notifications.cancelAllScheduledNotificationsAsync);
    cancelAll.mockClear();
    await render(<SettingsScreen />);
    expect(screen.getByText('No notifications scheduled yet.')).toBeOnTheScreen();
    await fireEvent(screen.getByLabelText('Season notifications'), 'valueChange', false);
    await waitFor(() => expect(cancelAll).toHaveBeenCalled());
    expect(jest.mocked(Notifications.scheduleNotificationAsync)).not.toHaveBeenCalled();
    expect(screen.queryByText('No notifications scheduled yet.')).toBeNull();
  });

  it('shows the app version', async () => {
    await render(<SettingsScreen />);
    expect(screen.getByText('Finale 1.2.0')).toBeOnTheScreen();
  });
});
