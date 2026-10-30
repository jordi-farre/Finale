import * as Notifications from 'expo-notifications';

import {
  presentAlerts,
  requestNotificationPermission,
  showIdFromResponse,
  syncScheduledAlerts,
} from '@/lib/notifications';
import { followed } from '@/test-utils/fixtures';
import { useAlertSettings } from '@/store/useAlertSettings';

const permissions = jest.mocked(Notifications.getPermissionsAsync);
const schedule = jest.mocked(Notifications.scheduleNotificationAsync);

const cancelAll = jest.mocked(Notifications.cancelAllScheduledNotificationsAsync);

beforeEach(() => {
  schedule.mockClear();
  cancelAll.mockClear();
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

describe('syncScheduledAlerts', () => {
  const now = new Date(2026, 8, 30, 12);
  const premiere = {
    keys: ['premiere:3'],
    showId: 1,
    title: 'Severance: Season 3 has started',
    body: 'The finale airs Nov 25.',
    fireAt: new Date(2026, 9, 11, 10).toISOString(),
  };
  const alreadyDue = { ...premiere, keys: ['premiere:2'], fireAt: new Date(2026, 8, 1, 10).toISOString() };
  const shows = [followed({ id: 1 }, { planned: [premiere, alreadyDue] })];

  it('replaces what was scheduled with the planned notifications still to come', async () => {
    permissions.mockResolvedValue({ granted: true, canAskAgain: true } as Notifications.NotificationPermissionsStatus);
    await syncScheduledAlerts(shows, now);
    expect(cancelAll).toHaveBeenCalled();
    expect(schedule).toHaveBeenCalledTimes(1);
    expect(schedule).toHaveBeenCalledWith({
      identifier: '1:premiere:3',
      content: { title: premiere.title, body: premiere.body, data: { showId: 1 } },
      trigger: { type: 'date', date: new Date(premiere.fireAt), channelId: 'seasons' },
    });
  });

  it('only cancels when season notifications are turned off', async () => {
    permissions.mockResolvedValue({ granted: true, canAskAgain: true } as Notifications.NotificationPermissionsStatus);
    useAlertSettings.setState({ enabled: false, hydrated: true });
    await syncScheduledAlerts(shows, now);
    expect(cancelAll).toHaveBeenCalled();
    expect(schedule).not.toHaveBeenCalled();
  });

  it('only cancels without permission', async () => {
    permissions.mockResolvedValue({ granted: false, canAskAgain: false } as Notifications.NotificationPermissionsStatus);
    await syncScheduledAlerts(shows, now);
    expect(cancelAll).toHaveBeenCalled();
    expect(schedule).not.toHaveBeenCalled();
  });
});
