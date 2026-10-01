import * as TaskManager from 'expo-task-manager';

import { BACKGROUND_REFRESH_TASK, registerBackgroundRefresh, runBackgroundRefresh } from '@/lib/backgroundRefresh';
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

  it('reports failure instead of throwing', async () => {
    useWatchlist.setState({ hydrated: true, refreshAll: jest.fn().mockRejectedValue(new Error('offline')) });
    expect(await runBackgroundRefresh()).toBe(2);
  });

  it('registers the task every six hours', async () => {
    const BackgroundTask = jest.requireMock('expo-background-task');
    await registerBackgroundRefresh();
    expect(BackgroundTask.registerTaskAsync).toHaveBeenCalledWith(BACKGROUND_REFRESH_TASK, { minimumInterval: 360 });
  });
});
