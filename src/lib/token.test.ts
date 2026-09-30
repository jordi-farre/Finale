import Constants from 'expo-constants';

import { scramble } from '@/lib/scramble';
import { readTmdbToken } from '@/lib/token';

jest.unmock('@/lib/token');
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: {} } } }));

const KEY = '0123456789abcdef0123456789abcdef';

describe('readTmdbToken', () => {
  it('decodes the scrambled token from the app config', () => {
    Constants.expoConfig!.extra = { tmdb: { key: KEY, value: scramble('secret-token', KEY) } };
    expect(readTmdbToken()).toBe('secret-token');
  });

  it('returns null when no token was configured', () => {
    Constants.expoConfig!.extra = {};
    expect(readTmdbToken()).toBeNull();
  });
});
