import AsyncStorage from '@react-native-async-storage/async-storage';

import { mergeNotified } from '@/lib/alerts';
import { EMPTY_STATE, type FollowedShow, type PersistedState } from '@/lib/types';

const STORAGE_KEY = 'finale:v1';

function isPersistedState(value: unknown): value is PersistedState {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<PersistedState>;
  return candidate.version === 1 && Array.isArray(candidate.shows);
}

function normalize(show: FollowedShow): FollowedShow {
  const snapshot = { ...show.snapshot, seasons: show.snapshot.seasons ?? [] };
  return {
    ...show,
    snapshot,
    seenSeasons: show.seenSeasons ?? [],
    notified: show.notified ?? mergeNotified([], snapshot),
  };
}

export async function load(): Promise<PersistedState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw);
    return isPersistedState(parsed) ? { ...parsed, shows: parsed.shows.map(normalize) } : EMPTY_STATE;
  } catch {
    return EMPTY_STATE;
  }
}

export async function save(state: PersistedState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export const STORAGE_KEY_FOR_TESTS = STORAGE_KEY;
