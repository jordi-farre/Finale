import AsyncStorage from '@react-native-async-storage/async-storage';

import { load, STORAGE_KEY_FOR_TESTS } from '@/lib/storage';
import { snapshot } from '@/test-utils/fixtures';

describe('storage', () => {
  it('returns an empty state when nothing is stored', async () => {
    expect(await load()).toEqual({ version: 1, shows: [] });
  });

  it('returns an empty state for corrupt data', async () => {
    await AsyncStorage.setItem(STORAGE_KEY_FOR_TESTS, '{not json');
    expect(await load()).toEqual({ version: 1, shows: [] });
  });

  it('upgrades shows saved before seasons, seen seasons and alerts existed', async () => {
    const { seasons, ...oldSnapshot } = snapshot();
    expect(seasons.length).toBeGreaterThan(0);
    await AsyncStorage.setItem(
      STORAGE_KEY_FOR_TESTS,
      JSON.stringify({ version: 1, shows: [{ id: 1, followedAt: '2026-09-01T00:00:00.000Z', snapshot: oldSnapshot }] }),
    );
    const [show] = (await load()).shows;
    expect(show.snapshot.seasons).toEqual([]);
    expect(show.seenSeasons).toEqual([]);
    expect(show.notified).toEqual(['premiere:2', 'complete:2']);
  });
});
