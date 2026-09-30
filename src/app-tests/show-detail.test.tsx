import ShowScreen from '@/app/show/[id]';
import { fetchSnapshot } from '@/lib/tmdb';
import { useWatchlist } from '@/store/useWatchlist';
import { followed, snapshot } from '@/test-utils/fixtures';
import { fireEvent, render, screen } from '@/test-utils/render';

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: () => ({ id: '1' }),
}));
jest.mock('@/lib/tmdb', () => ({ ...jest.requireActual('@/lib/tmdb'), fetchSnapshot: jest.fn() }));

const fetchSnapshotMock = jest.mocked(fetchSnapshot);

describe('show detail', () => {
  it('warns that a cancelled show may not have an ending', async () => {
    fetchSnapshotMock.mockResolvedValue(snapshot({ status: 'cancelled', seasonCount: 2 }));
    await render(<ShowScreen />);
    expect(await screen.findByText('Cancelled after 2 seasons. The story may not get an ending.')).toBeOnTheScreen();
    expect(screen.getByText('Ready to binge')).toBeOnTheScreen();
  });

  it('follows and unfollows the show', async () => {
    fetchSnapshotMock.mockResolvedValue(snapshot());
    await render(<ShowScreen />);
    await fireEvent.press(await screen.findByText('Follow'));
    expect(useWatchlist.getState().shows.map((show) => show.id)).toEqual([1]);
    await fireEvent.press(screen.getByText('Following'));
    expect(useWatchlist.getState().shows).toEqual([]);
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
