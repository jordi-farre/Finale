import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatDistance } from 'date-fns';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { isTmdbConfigured } from '@/lib/tmdb';
import { useWatchlist } from '@/store/useWatchlist';

export const BACKGROUND_REFRESH_TASK = 'finale-refresh-shows';
const INTERVAL_MINUTES = 6 * 60;
const LAST_RUN_KEY = 'finale:last-background-refresh';

export async function runBackgroundRefresh(): Promise<BackgroundTask.BackgroundTaskResult> {
  try {
    const store = useWatchlist.getState();
    if (!store.hydrated) await store.hydrate();
    if (isTmdbConfigured()) await useWatchlist.getState().refreshAll();
    await AsyncStorage.setItem(LAST_RUN_KEY, new Date().toISOString());
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
}

if (Platform.OS !== 'web') {
  TaskManager.defineTask(BACKGROUND_REFRESH_TASK, runBackgroundRefresh);
}

export async function registerBackgroundRefresh(): Promise<void> {
  if (Platform.OS === 'web') return;
  const status = await BackgroundTask.getStatusAsync();
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
  if (await TaskManager.isTaskRegisteredAsync(BACKGROUND_REFRESH_TASK)) return;
  await BackgroundTask.registerTaskAsync(BACKGROUND_REFRESH_TASK, { minimumInterval: INTERVAL_MINUTES });
}

export async function readLastBackgroundRefresh(): Promise<Date | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_RUN_KEY);
    const date = raw ? new Date(raw) : null;
    return date && !Number.isNaN(date.getTime()) ? date : null;
  } catch {
    return null;
  }
}

export function lastCheckText(lastRun: Date | null, now: Date = new Date()): string {
  if (!lastRun) return "Background check hasn't run yet.";
  return `Last background check: ${formatDistance(lastRun, now, { addSuffix: true })}.`;
}
