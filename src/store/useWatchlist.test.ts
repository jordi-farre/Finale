import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEY_FOR_TESTS } from '@/lib/storage';
import { fetchSnapshot } from '@/lib/tmdb';
import { useWatchlist } from '@/store/useWatchlist';
import { snapshot } from '@/test-utils/fixtures';

jest.mock('@/lib/tmdb', () => ({ ...jest.requireActual('@/lib/tmdb'), fetchSnapshot: jest.fn() }));

const fetchSnapshotMock = jest.mocked(fetchSnapshot);

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
});
