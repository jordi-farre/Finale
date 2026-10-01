import * as Notifications from 'expo-notifications';

import ShowScreen from '@/app/show/[id]';
import { fetchSnapshot } from '@/lib/tmdb';
import { useWatchlist } from '@/store/useWatchlist';
import { followed, season, snapshot } from '@/test-utils/fixtures';
import { fireEvent, render, screen, waitFor } from '@/test-utils/render';

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: () => ({ id: '1' }),
}));
jest.mock('@/lib/tmdb', () => ({ ...jest.requireActual('@/lib/tmdb'), fetchSnapshot: jest.fn() }));

const fetchSnapshotMock = jest.mocked(fetchSnapshot);
const permissions = jest.mocked(Notifications.getPermissionsAsync);

beforeEach(() => {
  permissions.mockResolvedValue({ granted: false, canAskAgain: true } as Notifications.NotificationPermissionsStatus);
  jest.mocked(Notifications.requestPermissionsAsync).mockClear();
});

describe('show detail', () => {
  it('warns that a cancelled show may not have an ending', async () => {
    fetchSnapshotMock.mockResolvedValue(snapshot({ status: 'cancelled', seasonCount: 2 }));
    await render(<ShowScreen />);
    expect(await screen.findByText('Cancelled after 2 seasons. The story may not get an ending.')).toBeOnTheScreen();
  });

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

  it('lists every season with its state', async () => {
    fetchSnapshotMock.mockResolvedValue(
      snapshot({
        latestSeason: { kind: 'airing', seasonNumber: 2, airedCount: 3, episodeCount: 8, finaleDate: null },
        seasons: [season(1, { runtimeMinutes: 450 }), season(2, { state: 'airing', episodeCount: 8 }), season(3, { state: 'upcoming', episodeCount: 0, airDate: null })],
      }),
    );
    await render(<ShowScreen />);
    expect(await screen.findByText('Season 1')).toBeOnTheScreen();
    expect(screen.getByText('Complete')).toBeOnTheScreen();
    expect(screen.getByText('10 episodes · 7h 30m')).toBeOnTheScreen();
    expect(screen.getByText('Airing · 3 of 8 out')).toBeOnTheScreen();
    expect(screen.getByText('Announced')).toBeOnTheScreen();
  });

  it('marks a season as seen on a followed show', async () => {
    useWatchlist.setState({ hydrated: true, shows: [followed()] });
    fetchSnapshotMock.mockResolvedValue(snapshot());
    await render(<ShowScreen />);
    await fireEvent.press(await screen.findByLabelText('Season 1, not seen'));
    expect(useWatchlist.getState().shows[0].seenSeasons).toEqual([1]);
    expect(screen.queryByText(/marked as seen/)).toBeNull();
    await fireEvent.press(screen.getByLabelText('Season 1, seen'));
    expect(useWatchlist.getState().shows[0].seenSeasons).toEqual([]);
  });

  it('marks earlier seasons too, with an undo', async () => {
    const show = snapshot({
      latestSeason: { kind: 'complete', seasonNumber: 3, episodeCount: 10, runtimeMinutes: null, completedOn: null },
      seasons: [season(1), season(2), season(3)],
    });
    useWatchlist.setState({ hydrated: true, shows: [followed(show)] });
    fetchSnapshotMock.mockResolvedValue(show);
    await render(<ShowScreen />);
    await fireEvent.press(await screen.findByLabelText('Season 3, not seen'));
    expect(useWatchlist.getState().shows[0].seenSeasons).toEqual([1, 2, 3]);
    expect(screen.getByText('3 seasons marked as seen')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Undo'));
    expect(useWatchlist.getState().shows[0].seenSeasons).toEqual([]);
  });

  it('only lets you mark complete seasons', async () => {
    fetchSnapshotMock.mockResolvedValue(
      snapshot({
        latestSeason: { kind: 'airing', seasonNumber: 2, airedCount: 3, episodeCount: 8, finaleDate: null },
        seasons: [season(1), season(2, { state: 'airing' })],
      }),
    );
    await render(<ShowScreen />);
    expect(await screen.findByLabelText('Season 2, not seen')).toBeDisabled();
  });

  it('follows the show when you mark a season seen, with an undo', async () => {
    fetchSnapshotMock.mockResolvedValue(snapshot());
    await render(<ShowScreen />);
    await fireEvent.press(await screen.findByLabelText('Season 2, not seen'));
    expect(useWatchlist.getState().shows[0]).toMatchObject({ id: 1, seenSeasons: [1, 2] });
    expect(screen.getByText('Now following Severance · 2 seasons marked as seen')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Undo'));
    expect(useWatchlist.getState().shows).toEqual([]);
  });

  it('warns when notifications are blocked for a followed show', async () => {
    permissions.mockResolvedValue({ granted: false, canAskAgain: false } as Notifications.NotificationPermissionsStatus);
    useWatchlist.setState({ hydrated: true, shows: [followed()] });
    fetchSnapshotMock.mockResolvedValue(snapshot());
    await render(<ShowScreen />);
    await waitFor(() => expect(screen.getByText(/Notifications are off for Finale/)).toBeOnTheScreen());
  });

  it('shows the stored snapshot and refreshes it for a followed show', async () => {
    useWatchlist.setState({ hydrated: true, shows: [followed({ status: 'returning' })] });
    fetchSnapshotMock.mockResolvedValue(snapshot({ status: 'cancelled' }));
    await render(<ShowScreen />);
    expect(await screen.findByText('Cancelled')).toBeOnTheScreen();
    expect(useWatchlist.getState().shows[0].snapshot.status).toBe('cancelled');
  });

  it('shows an error when the show cannot be loaded', async () => {
    fetchSnapshotMock.mockRejectedValue(new Error('offline'));
    await render(<ShowScreen />);
    expect(await screen.findByText(/Couldn't load this show/)).toBeOnTheScreen();
  });
});
