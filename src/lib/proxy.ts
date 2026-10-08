import Constants from 'expo-constants';

export function readTmdbProxyUrl(): string | null {
  const url = Constants.expoConfig?.extra?.tmdbProxyUrl;
  return typeof url === 'string' && /^https?:\/\//.test(url) ? url.replace(/\/+$/, '') : null;
}
