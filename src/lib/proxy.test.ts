import Constants from 'expo-constants';

import { readTmdbProxyUrl } from '@/lib/proxy';

jest.unmock('@/lib/proxy');
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: {} } } }));

describe('readTmdbProxyUrl', () => {
  it('reads the proxy address from the app config, without a trailing slash', () => {
    Constants.expoConfig!.extra = { tmdbProxyUrl: 'https://finale-tmdb.example.workers.dev/' };
    expect(readTmdbProxyUrl()).toBe('https://finale-tmdb.example.workers.dev');
  });

  it('accepts a local Wrangler dev server', () => {
    Constants.expoConfig!.extra = { tmdbProxyUrl: 'http://192.168.1.20:8787' };
    expect(readTmdbProxyUrl()).toBe('http://192.168.1.20:8787');
  });

  it('is missing when nothing usable is configured', () => {
    Constants.expoConfig!.extra = {};
    expect(readTmdbProxyUrl()).toBeNull();
    Constants.expoConfig!.extra = { tmdbProxyUrl: 'not a url' };
    expect(readTmdbProxyUrl()).toBeNull();
  });
});
