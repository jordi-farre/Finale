import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

import RootLayout from '@/app/_layout';
import ShowScreen from '@/app/show/[id]';
import { fetchSnapshot } from '@/lib/tmdb';
import type { SeasonState } from '@/lib/types';
import { useAlertSettings } from '@/store/useAlertSettings';
import { useWatchlist } from '@/store/useWatchlist';
import { snapshot } from '@/test-utils/fixtures';
import { act, fireEvent, render, screen, waitFor } from '@/test-utils/render';

jest.mock('expo-router', () => ({
  DarkTheme: { colors: {} },
  DefaultTheme: { colors: {} },
  ThemeProvider: ({ children }: { children: unknown }) => children,
  Stack: Object.assign(() => null, { Screen: () => null }),
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ id: '1' }),
}));
jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(), hideAsync: jest.fn() }));
jest.mock('@/lib/backgroundRefresh', () => ({ registerBackgroundRefresh: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/tmdb', () => ({ ...jest.requireActual('@/lib/tmdb'), fetchSnapshot: jest.fn() }));

const fetchSnapshotMock = jest.mocked(fetchSnapshot);
const schedule = jest.mocked(Notifications.scheduleNotificationAsync);

const upcoming: SeasonState = { kind: 'upcoming', seasonNumber: 3, premiereDate: '2026-10-10' };
const airing: SeasonState = { kind: 'airing', seasonNumber: 3, airedCount: 1, episodeCount: 8, finaleDate: '2026-11-25' };
const complete: SeasonState = {
  kind: 'complete',
  seasonNumber: 3,
  episodeCount: 8,
  runtimeMinutes: 400,
  completedOn: '2026-11-25',
};

function tmdbReturns(latestSeason: SeasonState, status: 'returning' | 'cancelled' = 'returning') {
  fetchSnapshotMock.mockResolvedValue(snapshot({ latestSeason, status }));
}

async function followFromShowPage() {
  await render(<ShowScreen />);
  await fireEvent.press(await screen.findByText('Follow'));
}

async function refresh() {
  await act(async () => {
    await useWatchlist.getState().refreshAll();
  });
}

function notificationTitles() {
  return schedule.mock.calls.map(([request]) => request.content.title);
}

beforeEach(() => {
  schedule.mockClear();
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
    granted: true,
    canAskAgain: true,
  } as Notifications.NotificationPermissionsStatus);
  useAlertSettings.setState({ enabled: true, hydrated: true });
});

describe('getting season notifications', () => {
  it('announces when a followed season starts, then when it is complete, once each', async () => {
    tmdbReturns(upcoming);
    await followFromShowPage();

    tmdbReturns(airing);
    await refresh();
    await refresh();
    expect(notificationTitles()).toEqual(['Severance: Season 3 has started']);
    expect(schedule.mock.calls[0][0].content.body).toBe(
      "The finale airs Nov 25. You'll get another notification when the whole season is out.",
    );

    tmdbReturns(complete);
    await refresh();
    expect(notificationTitles()).toEqual(['Severance: Season 3 has started', 'Severance: Season 3 is complete']);
    expect(schedule.mock.calls[1][0].content).toMatchObject({
      body: 'All episodes are out (8 episodes, 6h 40m). Ready to binge.',
      data: { showId: 1 },
    });
  });

  it('sends a single notification when a whole season drops at once', async () => {
    tmdbReturns(upcoming);
    await followFromShowPage();

    tmdbReturns(complete);
    await refresh();
    expect(notificationTitles()).toEqual(['Severance: all of Season 3 is out']);
  });

  it('stays quiet about seasons that were already out when you followed', async () => {
    tmdbReturns(complete);
    await followFromShowPage();

    await refresh();
    expect(schedule).not.toHaveBeenCalled();
  });

  it('tells you when a followed show is cancelled', async () => {
    tmdbReturns(complete);
    await followFromShowPage();

    tmdbReturns(complete, 'cancelled');
    await refresh();
    expect(notificationTitles()).toEqual(['Severance was cancelled']);
  });

  it('stays silent when season notifications are turned off', async () => {
    tmdbReturns(upcoming);
    await followFromShowPage();
    await act(async () => {
      useAlertSettings.setState({ enabled: false, hydrated: true });
    });

    tmdbReturns(airing);
    await refresh();
    expect(schedule).not.toHaveBeenCalled();
  });

  it('opens the show when you tap a notification', async () => {
    tmdbReturns(complete);
    jest.mocked(Notifications.useLastNotificationResponse).mockReturnValue({
      notification: { request: { content: { data: { showId: 1 } } } },
    } as unknown as Notifications.NotificationResponse);

    await render(<RootLayout />);

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/show/1'));
  });
});
