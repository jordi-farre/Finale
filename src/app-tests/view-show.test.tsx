import * as Notifications from 'expo-notifications';

import ShowScreen from '@/app/show/[id]';
import { fetchSnapshot } from '@/lib/tmdb';
import { useWatchlist } from '@/store/useWatchlist';
import { followed, season, snapshot } from '@/test-utils/fixtures';
import { render, screen } from '@/test-utils/render';

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

describe('viewing a show', () => {
  it('warns that a cancelled show may not have an ending', async () => {
    fetchSnapshotMock.mockResolvedValue(snapshot({ status: 'cancelled', seasonCount: 2 }));
    await render(<ShowScreen />);
    expect(await screen.findByText('Cancelled after 2 seasons. The story may not get an ending.')).toBeOnTheScreen();
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

  it('shows the show score with its vote count', async () => {
    fetchSnapshotMock.mockResolvedValue(snapshot({ rating: { score: 8.4, votes: 21390 } }));
    await render(<ShowScreen />);
    expect(await screen.findByText('8.4 · 21k votes')).toBeOnTheScreen();
  });

  it('leaves the show score out when there is none', async () => {
    fetchSnapshotMock.mockResolvedValue(snapshot({ rating: null }));
    await render(<ShowScreen />);
    await screen.findByText('Ongoing');
    expect(screen.queryByText(/votes$/)).toBeNull();
  });

  it('shows a season rating only when there is one', async () => {
    fetchSnapshotMock.mockResolvedValue(
      snapshot({ seasons: [season(1, { rating: 8.1 }), season(2, { rating: null })] }),
    );
    await render(<ShowScreen />);
    expect(await screen.findByLabelText('Season 1, rated 8.1, not seen')).toBeOnTheScreen();
    expect(screen.getByText('8.1')).toBeOnTheScreen();
    expect(screen.getByLabelText('Season 2, not seen')).toBeOnTheScreen();
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
