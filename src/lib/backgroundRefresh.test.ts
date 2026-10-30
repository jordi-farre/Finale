import * as TaskManager from 'expo-task-manager';

import {
  BACKGROUND_REFRESH_TASK,
  lastCheckText,
  readLastBackgroundRefresh,
  registerBackgroundRefresh,
  runBackgroundRefresh,
} from '@/lib/backgroundRefresh';
import { useWatchlist } from '@/store/useWatchlist';

jest.mock('expo-background-task', () => ({
  getStatusAsync: jest.fn().mockResolvedValue(2),
  registerTaskAsync: jest.fn().mockResolvedValue(undefined),
  BackgroundTaskStatus: { Restricted: 1, Available: 2 },
  BackgroundTaskResult: { Success: 1, Failed: 2 },
}));
jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn().mockResolvedValue(false),
}));

describe('background refresh', () => {
  it('defines the task when the module loads', () => {
    expect(TaskManager.defineTask).toHaveBeenCalledWith(BACKGROUND_REFRESH_TASK, runBackgroundRefresh);
  });

  it('hydrates the watchlist before refreshing it', async () => {
    const refreshAll = jest.fn().mockResolvedValue([]);
    useWatchlist.setState({ refreshAll });
    expect(await runBackgroundRefresh()).toBe(1);
    expect(useWatchlist.getState().hydrated).toBe(true);
    expect(refreshAll).toHaveBeenCalled();
  });

  it('remembers when it last ran', async () => {
    expect(await readLastBackgroundRefresh()).toBeNull();
    useWatchlist.setState({ hydrated: true, refreshAll: jest.fn().mockResolvedValue([]) });
    const before = Date.now();
    await runBackgroundRefresh();
    expect((await readLastBackgroundRefresh())?.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('reports failure instead of throwing, without counting it as a check', async () => {
    useWatchlist.setState({ hydrated: true, refreshAll: jest.fn().mockRejectedValue(new Error('offline')) });
    expect(await runBackgroundRefresh()).toBe(2);
    expect(await readLastBackgroundRefresh()).toBeNull();
  });

  it('describes the last check for Settings', () => {
    const now = new Date(2026, 9, 30, 12);
    expect(lastCheckText(new Date(2026, 9, 30, 9), now)).toBe('Last background check: about 3 hours ago.');
    expect(lastCheckText(null, now)).toBe("Background check hasn't run yet.");
  });

  it('registers the task every six hours', async () => {
    const BackgroundTask = jest.requireMock('expo-background-task');
    await registerBackgroundRefresh();
    expect(BackgroundTask.registerTaskAsync).toHaveBeenCalledWith(BACKGROUND_REFRESH_TASK, { minimumInterval: 360 });
  });
});
