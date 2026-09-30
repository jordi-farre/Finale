import { router } from 'expo-router';

import WatchlistScreen from '@/app/index';
import { readTmdbToken } from '@/lib/token';
import { useWatchlist } from '@/store/useWatchlist';
import { followed } from '@/test-utils/fixtures';
import { fireEvent, render, screen } from '@/test-utils/render';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

describe('watchlist', () => {
  it('shows an empty state that leads to search', async () => {
    useWatchlist.setState({ shows: [], hydrated: true });
    await render(<WatchlistScreen />);
    await fireEvent.press(screen.getByText('Search shows'));
    expect(router.push).toHaveBeenCalledWith('/search');
  });

  it('groups shows by whether their season is ready to binge', async () => {
    useWatchlist.setState({
      hydrated: true,
      shows: [
        followed({ id: 1, name: 'Severance' }),
        followed({
          id: 2,
          name: 'The Bear',
          latestSeason: { kind: 'airing', seasonNumber: 5, airedCount: 3, episodeCount: 10, finaleDate: null },
        }),
        followed({ id: 3, name: 'Andor', latestSeason: { kind: 'upcoming', seasonNumber: 3, premiereDate: null } }),
      ],
    });
    await render(<WatchlistScreen />);
    expect(screen.getByText('Ready to binge')).toBeOnTheScreen();
    expect(screen.getByText('Season 2 complete · 10 episodes · 8h 20m')).toBeOnTheScreen();
    expect(screen.getByText('Season airing')).toBeOnTheScreen();
    expect(screen.getByText('Season 5 airing · 3 of 10 out')).toBeOnTheScreen();
    expect(screen.getByText('Waiting for new episodes')).toBeOnTheScreen();
    expect(screen.getByText('Season 3 announced')).toBeOnTheScreen();
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

  it('explains how to add a TMDB token when it is missing', async () => {
    jest.mocked(readTmdbToken).mockReturnValue(null);
    useWatchlist.setState({ shows: [], hydrated: true });
    await render(<WatchlistScreen />);
    expect(screen.getByText(/No TMDB token found/)).toBeOnTheScreen();
  });
});
