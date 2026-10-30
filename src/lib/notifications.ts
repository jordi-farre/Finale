import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { ShowAlert } from '@/lib/alerts';
import type { FollowedShow } from '@/lib/types';
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

async function canNotify(): Promise<boolean> {
  if (!useAlertSettings.getState().hydrated) await useAlertSettings.getState().hydrate();
  if (!useAlertSettings.getState().enabled) return false;
  return (await getNotificationPermissionStatus()) === 'granted';
}

export async function presentAlerts(alerts: ShowAlert[]): Promise<void> {
  if (alerts.length === 0) return;
  if (!(await canNotify())) return;
  await ensureChannel();
  for (const alert of alerts) {
    await Notifications.scheduleNotificationAsync({
      content: { title: alert.title, body: alert.body, data: { showId: alert.showId } },
      trigger: Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null,
    });
  }
}

async function scheduleAll(shows: FollowedShow[], now: Date): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!(await canNotify())) return;
  await ensureChannel();
  for (const alert of shows.flatMap((show) => show.planned ?? [])) {
    const fireAt = new Date(alert.fireAt);
    if (Number.isNaN(fireAt.getTime()) || fireAt <= now) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: `${alert.showId}:${alert.keys.join('+')}`,
      content: { title: alert.title, body: alert.body, data: { showId: alert.showId } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt, channelId: CHANNEL_ID },
    });
  }
}

let scheduling: Promise<void> = Promise.resolve();

export function syncScheduledAlerts(shows: FollowedShow[], now: Date = new Date()): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  scheduling = scheduling.then(() => scheduleAll(shows, now)).catch(() => {});
  return scheduling;
}

export function showIdFromResponse(response: Notifications.NotificationResponse | null | undefined): number | null {
  const showId = response?.notification.request.content.data?.showId;
  return typeof showId === 'number' ? showId : null;
}
