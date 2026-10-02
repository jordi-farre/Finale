import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { ShowAlert } from '@/lib/alerts';
import { useAlertSettings } from '@/store/useAlertSettings';

const CHANNEL_ID = 'seasons';

export type NotificationPermissionStatus = 'granted' | 'blocked' | 'undetermined';

export function configureNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Season updates',
    description: 'When a season you follow starts, finishes, or a show is cancelled',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  if (!current.canAskAgain) return 'blocked';
  return 'undetermined';
}

export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  if (!current.canAskAgain) return 'blocked';
  const requested = await Notifications.requestPermissionsAsync();
  if (requested.granted) return 'granted';
  return requested.canAskAgain ? 'undetermined' : 'blocked';
}

export async function presentAlerts(alerts: ShowAlert[]): Promise<void> {
  if (alerts.length === 0) return;
  if (!useAlertSettings.getState().hydrated) await useAlertSettings.getState().hydrate();
  if (!useAlertSettings.getState().enabled) return;
  if ((await getNotificationPermissionStatus()) !== 'granted') return;
  await ensureChannel();
  for (const alert of alerts) {
    await Notifications.scheduleNotificationAsync({
      content: { title: alert.title, body: alert.body, data: { showId: alert.showId } },
      trigger: Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null,
    });
  }
}

export function showIdFromResponse(response: Notifications.NotificationResponse | null | undefined): number | null {
  const showId = response?.notification.request.content.data?.showId;
  return typeof showId === 'number' ? showId : null;
}
