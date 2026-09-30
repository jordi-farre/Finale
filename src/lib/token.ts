import Constants from 'expo-constants';

import { unscramble } from '@/lib/scramble';

type ScrambledToken = { key?: unknown; value?: unknown };

export function readTmdbToken(): string | null {
  const stored = Constants.expoConfig?.extra?.tmdb as ScrambledToken | undefined;
  if (typeof stored?.key !== 'string' || typeof stored.value !== 'string' || stored.key.length === 0) return null;
  return unscramble(stored.value, stored.key);
}
