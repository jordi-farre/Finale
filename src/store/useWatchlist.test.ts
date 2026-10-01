import AsyncStorage from '@react-native-async-storage/async-storage';

import { presentAlerts } from '@/lib/notifications';
import { STORAGE_KEY_FOR_TESTS } from '@/lib/storage';
import { fetchSnapshot } from '@/lib/tmdb';
import { useWatchlist } from '@/store/useWatchlist';
import { snapshot } from '@/test-utils/fixtures';

jest.mock('@/lib/tmdb', () => ({ ...jest.requireActual('@/lib/tmdb'), fetchSnapshot: jest.fn() }));
jest.mock('@/lib/notifications', () => ({ presentAlerts: jest.fn().mockResolvedValue(undefined) }));

const fetchSnapshotMock = jest.mocked(fetchSnapshot);
const presentAlertsMock = jest.mocked(presentAlerts);

beforeEach(() => {
  presentAlertsMock.mockClear();
});

async function persisted() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  return JSON.parse((await AsyncStorage.getItem(STORAGE_KEY_FOR_TESTS)) ?? 'null');
}

describe('useWatchlist', () => {
  it('follows a show once and persists it', async () => {
    useWatchlist.getState().follow(snapshot());
    useWatchlist.getState().follow(snapshot());
    expect(useWatchlist.getState().shows).toHaveLength(1);
    expect((await persisted()).shows[0].snapshot.name).toBe('Severance');
  });

  it('unfollows a show', async () => {
    useWatchlist.getState().follow(snapshot());
    useWatchlist.getState().unfollow(1);
    expect(useWatchlist.getState().shows).toEqual([]);
    expect((await persisted()).shows).toEqual([]);
  });

  it('restores persisted shows on hydrate', async () => {
    useWatchlist.getState().follow(snapshot({ name: 'Andor' }));
    await persisted();
    useWatchlist.setState({ shows: [], hydrated: false });
    await useWatchlist.getState().hydrate();
    expect(useWatchlist.getState()).toMatchObject({ hydrated: true, shows: [{ snapshot: { name: 'Andor' } }] });
  });

  it('only updates snapshots of followed shows', () => {
    useWatchlist.getState().updateSnapshot(snapshot({ id: 9 }));
    expect(useWatchlist.getState().shows).toEqual([]);
  });

  it('refreshes every show and keeps the old snapshot when a fetch fails', async () => {
    useWatchlist.getState().follow(snapshot({ id: 1, status: 'returning' }));
    useWatchlist.getState().follow(snapshot({ id: 2, name: 'Andor' }));
    fetchSnapshotMock.mockImplementation((id) =>
      id === 1 ? Promise.resolve(snapshot({ id: 1, status: 'cancelled' })) : Promise.reject(new Error('offline')),
    );
    await useWatchlist.getState().refreshAll();
    const [first, second] = useWatchlist.getState().shows;
    expect(first.snapshot.status).toBe('cancelled');
    expect(second.snapshot.name).toBe('Andor');
    expect(useWatchlist.getState().refreshing).toBe(false);
  });

  it('primes alerts on follow so nothing fires for seasons that were already out', () => {
    useWatchlist.getState().follow(snapshot());
    expect(useWatchlist.getState().shows[0].notified).toEqual(['premiere:2', 'complete:2']);
  });

  it('marks and unmarks seasons as seen', () => {
    useWatchlist.getState().follow(snapshot());
    useWatchlist.getState().setSeen(1, 2, true);
    useWatchlist.getState().setSeen(1, 1, true);
    expect(useWatchlist.getState().shows[0].seenSeasons).toEqual([1, 2]);
    useWatchlist.getState().setSeen(1, 2, false);
    expect(useWatchlist.getState().shows[0].seenSeasons).toEqual([1]);
  });

  it('notifies once when a followed season starts and once when it completes', async () => {
    useWatchlist.getState().follow(snapshot({ latestSeason: { kind: 'upcoming', seasonNumber: 3, premiereDate: null } }));

    fetchSnapshotMock.mockResolvedValue(
      snapshot({ latestSeason: { kind: 'airing', seasonNumber: 3, airedCount: 1, episodeCount: 8, finaleDate: null } }),
    );
    expect((await useWatchlist.getState().refreshAll()).map((alert) => alert.title)).toEqual([
      'Severance: Season 3 has started',
    ]);
    expect(await useWatchlist.getState().refreshAll()).toEqual([]);

    fetchSnapshotMock.mockResolvedValue(
      snapshot({ latestSeason: { kind: 'complete', seasonNumber: 3, episodeCount: 8, runtimeMinutes: null, completedOn: null } }),
    );
    expect((await useWatchlist.getState().refreshAll()).map((alert) => alert.title)).toEqual([
      'Severance: Season 3 is complete',
    ]);
    expect(presentAlertsMock).toHaveBeenCalledTimes(3);
    expect(useWatchlist.getState().shows[0].notified).toEqual(['premiere:3', 'complete:3']);
  });

  it('keeps seen seasons when a refresh replaces the snapshot', async () => {
    useWatchlist.getState().follow(snapshot());
    useWatchlist.getState().setSeen(1, 1, true);
    fetchSnapshotMock.mockResolvedValue(snapshot({ name: 'Severance (renamed)' }));
    await useWatchlist.getState().refreshAll();
    expect(useWatchlist.getState().shows[0]).toMatchObject({ seenSeasons: [1], snapshot: { name: 'Severance (renamed)' } });
  });
});
