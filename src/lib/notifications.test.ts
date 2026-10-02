import * as Notifications from 'expo-notifications';

import { presentAlerts, requestNotificationPermission, showIdFromResponse } from '@/lib/notifications';
import { useAlertSettings } from '@/store/useAlertSettings';

const permissions = jest.mocked(Notifications.getPermissionsAsync);
const schedule = jest.mocked(Notifications.scheduleNotificationAsync);

beforeEach(() => {
  schedule.mockClear();
});

const alert = { showId: 7, title: 'Firefly was cancelled', body: 'It ends after 1 season.' };

describe('presentAlerts', () => {
  it('shows each alert right away, carrying the show id', async () => {
    permissions.mockResolvedValue({ granted: true, canAskAgain: true } as Notifications.NotificationPermissionsStatus);
    await presentAlerts([alert]);
    expect(schedule).toHaveBeenCalledWith({
      content: { title: alert.title, body: alert.body, data: { showId: 7 } },
      trigger: null,
    });
  });

  it('stays silent when season notifications are turned off', async () => {
    permissions.mockResolvedValue({ granted: true, canAskAgain: true } as Notifications.NotificationPermissionsStatus);
    useAlertSettings.setState({ enabled: false, hydrated: true });
    await presentAlerts([alert]);
    expect(schedule).not.toHaveBeenCalled();
  });

  it('does nothing without permission', async () => {
    permissions.mockResolvedValue({ granted: false, canAskAgain: false } as Notifications.NotificationPermissionsStatus);
    await presentAlerts([alert]);
    expect(schedule).not.toHaveBeenCalled();
  });
});

describe('requestNotificationPermission', () => {
  it('reports a blocked permission without prompting', async () => {
    permissions.mockResolvedValue({ granted: false, canAskAgain: false } as Notifications.NotificationPermissionsStatus);
    expect(await requestNotificationPermission()).toBe('blocked');
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('prompts when it still can', async () => {
    permissions.mockResolvedValue({ granted: false, canAskAgain: true } as Notifications.NotificationPermissionsStatus);
    expect(await requestNotificationPermission()).toBe('granted');
  });
});

describe('showIdFromResponse', () => {
  it('reads the show id from a tapped notification', () => {
    const response = { notification: { request: { content: { data: { showId: 7 } } } } } as unknown as Notifications.NotificationResponse;
    expect(showIdFromResponse(response)).toBe(7);
    expect(showIdFromResponse(null)).toBeNull();
  });
});
