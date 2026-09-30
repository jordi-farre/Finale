import { fetchSnapshot, hasTmdbToken, posterUrl, searchShows, TmdbError } from '@/lib/tmdb';
import { readTmdbToken } from '@/lib/token';
import { seasonDetails, showDetails } from '@/test-utils/fixtures';

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response);
}

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
});

describe('searchShows', () => {
  it('sends the query with the bearer token', async () => {
    fetchMock.mockReturnValue(jsonResponse({ results: [{ id: 7, name: 'Firefly' }] }));
    const results = await searchShows('  firefly ');
    expect(results).toEqual([{ id: 7, name: 'Firefly' }]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.themoviedb.org/3/search/tv?query=firefly&include_adult=false');
    expect(init.headers.Authorization).toBe('Bearer test-token');
  });

  it('skips the request for an empty query', async () => {
    expect(await searchShows('   ')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws a TmdbError on a failed response', async () => {
    fetchMock.mockReturnValue(jsonResponse({}, 401));
    await expect(searchShows('firefly')).rejects.toEqual(new TmdbError('TMDB request failed (401)', 401));
  });

  it('throws without a token', async () => {
    jest.mocked(readTmdbToken).mockReturnValue(null);
    expect(hasTmdbToken()).toBe(false);
    await expect(searchShows('firefly')).rejects.toBeInstanceOf(TmdbError);
  });
});

describe('fetchSnapshot', () => {
  it('loads the show and its current season', async () => {
    fetchMock.mockImplementation((url: string) =>
      url.endsWith('/tv/1') ? jsonResponse(showDetails()) : jsonResponse(seasonDetails(2, ['2025-03-14', '2025-03-21'])),
    );
    const snap = await fetchSnapshot(1, new Date(2026, 8, 30));
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://api.themoviedb.org/3/tv/1',
      'https://api.themoviedb.org/3/tv/1/season/2',
    ]);
    expect(snap.latestSeason).toMatchObject({ kind: 'complete', seasonNumber: 2, episodeCount: 2 });
  });

  it('skips the season request when the show has no seasons', async () => {
    fetchMock.mockReturnValue(jsonResponse(showDetails({ seasons: [], last_episode_to_air: null })));
    const snap = await fetchSnapshot(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(snap.latestSeason).toEqual({ kind: 'none' });
  });
});

describe('posterUrl', () => {
  it('builds an image url or returns null', () => {
    expect(posterUrl('/a.jpg', 'w342')).toBe('https://image.tmdb.org/t/p/w342/a.jpg');
    expect(posterUrl(null)).toBeNull();
  });
});
