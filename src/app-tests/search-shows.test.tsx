import SearchScreen from '@/app/search';
import { getShow, searchShows } from '@/lib/tmdb';
import { showDetails } from '@/test-utils/fixtures';
import { fireEvent, render, screen, waitFor } from '@/test-utils/render';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/lib/tmdb', () => ({
  ...jest.requireActual('@/lib/tmdb'),
  searchShows: jest.fn(),
  getShow: jest.fn(),
}));

const searchShowsMock = jest.mocked(searchShows);
const getShowMock = jest.mocked(getShow);

async function typeQuery(text: string) {
  await fireEvent.changeText(screen.getByPlaceholderText('Search TV shows'), text);
  await waitFor(() => expect(searchShowsMock).toHaveBeenCalledWith(text));
}

describe('searching for shows', () => {
  it('prompts for a query at first', async () => {
    await render(<SearchScreen />);
    expect(screen.getByText('Find a show')).toBeOnTheScreen();
  });

  it('shows whether each result was cancelled', async () => {
    searchShowsMock.mockResolvedValue([
      { id: 1, name: 'Firefly', first_air_date: '2002-09-20', poster_path: null, overview: '' },
      { id: 2, name: 'Firefly Lane', first_air_date: '2021-02-03', poster_path: null, overview: '' },
    ]);
    getShowMock.mockImplementation((id) =>
      Promise.resolve(
        showDetails({ id, status: id === 1 ? 'Canceled' : 'Ended', vote_average: id === 1 ? 8.86 : 7, vote_count: id === 1 ? 4000 : 10 }),
      ),
    );
    await render(<SearchScreen />);
    await typeQuery('firefly');
    expect(await screen.findByText('Cancelled')).toBeOnTheScreen();
    expect(screen.getByText('Ended')).toBeOnTheScreen();
    expect(screen.getByLabelText('Rated 8.9')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Rated 7.0')).toBeNull();
  });

  it('says when nothing matches', async () => {
    searchShowsMock.mockResolvedValue([]);
    await render(<SearchScreen />);
    await typeQuery('zzzz');
    expect(await screen.findByText('No matches')).toBeOnTheScreen();
  });

  it('shows an error when TMDB is unreachable', async () => {
    searchShowsMock.mockRejectedValue(new Error('offline'));
    await render(<SearchScreen />);
    await typeQuery('firefly');
    expect(await screen.findByText(/Couldn't load shows/)).toBeOnTheScreen();
  });
});
