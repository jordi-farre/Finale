import * as Notifications from 'expo-notifications';

import ShowScreen from '@/app/show/[id]';
import { fetchSnapshot } from '@/lib/tmdb';
import { useAlertSettings } from '@/store/useAlertSettings';
import { useWatchlist } from '@/store/useWatchlist';
import { followed, season, snapshot } from '@/test-utils/fixtures';
import { fireEvent, render, screen, waitFor } from '@/test-utils/render';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ id: '1' }),
}));
jest.mock('@/lib/tmdb', () => ({ ...jest.requireActual('@/lib/tmdb'), fetchSnapshot: jest.fn() }));

const fetchSnapshotMock = jest.mocked(fetchSnapshot);
const permissions = jest.mocked(Notifications.getPermissionsAsync);

beforeEach(() => {
  permissions.mockResolvedValue({ granted: false, canAskAgain: true } as Notifications.NotificationPermissionsStatus);
  jest.mocked(Notifications.requestPermissionsAsync).mockClear();
});

describe('following a show', () => {
  it('explains what following will notify you about', async () => {
    fetchSnapshotMock.mockResolvedValue(
      snapshot({
        latestSeason: { kind: 'airing', seasonNumber: 2, airedCount: 3, episodeCount: 8, finaleDate: null },
        seasons: [season(1), season(2, { state: 'airing' })],
      }),
    );
    await render(<ShowScreen />);
    expect(await screen.findByText('Follow to get a notification when Season 2 is complete.')).toBeOnTheScreen();
  });

  it('follows, asks for notification permission, and unfollows', async () => {
    fetchSnapshotMock.mockResolvedValue(snapshot());
    await render(<ShowScreen />);
    await fireEvent.press(await screen.findByText('Follow'));
    expect(useWatchlist.getState().shows.map((show) => show.id)).toEqual([1]);
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    expect(
      screen.getByText("You'll get a notification when a new season starts, and another when it's complete."),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Following'));
    expect(useWatchlist.getState().shows).toEqual([]);
  });

  it('offers a watchlist instead of following for a finished show', async () => {
    fetchSnapshotMock.mockResolvedValue(snapshot({ status: 'ended' }));
    await render(<ShowScreen />);
    await fireEvent.press(await screen.findByText('Add to watchlist'));
    expect(useWatchlist.getState().shows.map((show) => show.id)).toEqual([1]);
    expect(screen.getByText('In watchlist')).toBeOnTheScreen();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('still asks for notifications when adding a cancelled show, in case it comes back', async () => {
    fetchSnapshotMock.mockResolvedValue(snapshot({ status: 'cancelled' }));
    await render(<ShowScreen />);
    await fireEvent.press(await screen.findByText('Add to watchlist'));
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
  });

  it('warns when notifications are blocked for a followed show', async () => {
    permissions.mockResolvedValue({ granted: false, canAskAgain: false } as Notifications.NotificationPermissionsStatus);
    useWatchlist.setState({ hydrated: true, shows: [followed()] });
    fetchSnapshotMock.mockResolvedValue(snapshot());
    await render(<ShowScreen />);
    await waitFor(() => expect(screen.getByText(/Notifications are off for Finale/)).toBeOnTheScreen());
  });

  it('says notifications are off instead of promising them', async () => {
    useAlertSettings.setState({ enabled: false, hydrated: true });
    useWatchlist.setState({ hydrated: true, shows: [followed()] });
    fetchSnapshotMock.mockResolvedValue(snapshot());
    await render(<ShowScreen />);
    expect(await screen.findByText('Season notifications are turned off.')).toBeOnTheScreen();
    expect(screen.queryByText(/You'll get a notification/)).toBeNull();
  });

  it('does not ask for notification permission when notifications are off', async () => {
    useAlertSettings.setState({ enabled: false, hydrated: true });
    fetchSnapshotMock.mockResolvedValue(snapshot());
    await render(<ShowScreen />);
    await fireEvent.press(await screen.findByText('Follow'));
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });
});
