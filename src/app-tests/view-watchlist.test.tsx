import { router } from 'expo-router';

import WatchlistScreen from '@/app/index';
import { readTmdbToken } from '@/lib/token';
import { useWatchlist } from '@/store/useWatchlist';
import { followed, season } from '@/test-utils/fixtures';
import { fireEvent, render, screen } from '@/test-utils/render';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

describe('viewing the watchlist', () => {
  it('shows an empty state that leads to search', async () => {
    useWatchlist.setState({ shows: [], hydrated: true });
    await render(<WatchlistScreen />);
    await fireEvent.press(screen.getByText('Search shows'));
    expect(router.push).toHaveBeenCalledWith('/search');
  });

  it('groups shows by what you can watch next', async () => {
    useWatchlist.setState({
      hydrated: true,
      shows: [
        followed({ id: 1, name: 'Severance' }, { seenSeasons: [1] }),
        followed(
          {
            id: 2,
            name: 'The Bear',
            latestSeason: { kind: 'airing', seasonNumber: 2, airedCount: 3, episodeCount: 10, finaleDate: null },
            seasons: [season(1), season(2, { state: 'airing' })],
          },
          { seenSeasons: [1] },
        ),
        followed(
          { id: 3, name: 'Andor', latestSeason: { kind: 'upcoming', seasonNumber: 3, premiereDate: null } },
          { seenSeasons: [1, 2] },
        ),
        followed({ id: 4, name: 'Firefly', status: 'cancelled' }, { seenSeasons: [1, 2] }),
      ],
    });
    await render(<WatchlistScreen />);
    expect(screen.getByText('Ready to binge')).toBeOnTheScreen();
    expect(screen.getByText('Season 2 to binge · 10 episodes')).toBeOnTheScreen();
    expect(screen.getByText('Season airing')).toBeOnTheScreen();
    expect(screen.getByText('Season 2 airing · 3 of 10 out')).toBeOnTheScreen();
    expect(screen.getByText('Waiting for new episodes')).toBeOnTheScreen();
    expect(screen.getByText('Season 3 announced')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Firefly')).toBeNull();
    expect(screen.getByText('1 finished show')).toBeOnTheScreen();
  });

  it('keeps hours out of the list', async () => {
    useWatchlist.setState({ hydrated: true, shows: [followed()] });
    await render(<WatchlistScreen />);
    expect(screen.queryByText(/\dh/)).toBeNull();
  });

  it('lists a show with an airing season under ready when older seasons are unseen', async () => {
    useWatchlist.setState({
      hydrated: true,
      shows: [
        followed({
          name: 'The Bear',
          latestSeason: { kind: 'airing', seasonNumber: 3, airedCount: 3, episodeCount: 10, finaleDate: null },
          seasons: [season(1, { runtimeMinutes: 300 }), season(2, { runtimeMinutes: 300 }), season(3, { state: 'airing' })],
        }),
      ],
    });
    await render(<WatchlistScreen />);
    expect(screen.getByText('Ready to binge')).toBeOnTheScreen();
    expect(screen.getByText('2 seasons to binge · 20 episodes')).toBeOnTheScreen();
    expect(screen.queryByText('Season airing')).toBeNull();
  });

  it('flags cancelled shows', async () => {
    useWatchlist.setState({ hydrated: true, shows: [followed({ status: 'cancelled' })] });
    await render(<WatchlistScreen />);
    expect(screen.getByText('Cancelled')).toBeOnTheScreen();
  });

  it('opens a show', async () => {
    useWatchlist.setState({ hydrated: true, shows: [followed({ id: 42 })] });
    await render(<WatchlistScreen />);
    await fireEvent.press(screen.getByLabelText('Severance'));
    expect(router.push).toHaveBeenCalledWith('/show/42');
  });

  it('tells a developer how to add a missing TMDB token', async () => {
    jest.mocked(readTmdbToken).mockReturnValue(null);
    useWatchlist.setState({ shows: [], hydrated: true });
    await render(<WatchlistScreen />);
    expect(screen.getByText(/Add TMDB_TOKEN to .env.local/)).toBeOnTheScreen();
  });

  describe('in a release build', () => {
    const runtime = globalThis as unknown as { __DEV__: boolean };
    const devFlag = runtime.__DEV__;

    beforeEach(() => {
      runtime.__DEV__ = false;
    });

    afterEach(() => {
      runtime.__DEV__ = devFlag;
    });

    it('shows users a plain message instead of setup instructions', async () => {
      jest.mocked(readTmdbToken).mockReturnValue(null);
      useWatchlist.setState({ shows: [], hydrated: true });
      await render(<WatchlistScreen />);
      expect(screen.getByText("Show info isn't available in this version of Finale. Please update the app.")).toBeOnTheScreen();
      expect(screen.queryByText(/TMDB_TOKEN/)).toBeNull();
    });
  });
});
