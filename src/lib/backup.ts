import type { FollowedShow, PersistedState, ShowSnapshot } from '@/lib/types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNullableString(value: unknown): boolean {
  return value === null || typeof value === 'string';
}

function isSnapshot(value: unknown, id: number): value is ShowSnapshot {
  if (!isRecord(value)) return false;
  return (
    value.id === id &&
    typeof value.name === 'string' &&
    isNullableString(value.posterPath) &&
    isNullableString(value.firstAirYear) &&
    typeof value.overview === 'string' &&
    typeof value.status === 'string' &&
    typeof value.seasonCount === 'number' &&
    isRecord(value.latestSeason) &&
    typeof value.latestSeason.kind === 'string' &&
    Array.isArray(value.seasons) &&
    value.seasons.every((season) => isRecord(season) && Number.isInteger(season.seasonNumber)) &&
    typeof value.fetchedAt === 'string'
  );
}

function isShow(value: unknown): value is FollowedShow {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'number' &&
    Number.isInteger(value.id) &&
    typeof value.followedAt === 'string' &&
    Array.isArray(value.seenSeasons) &&
    value.seenSeasons.every((season) => Number.isInteger(season)) &&
    Array.isArray(value.notified) &&
    value.notified.every((key) => typeof key === 'string') &&
    isSnapshot(value.snapshot, value.id)
  );
}

export function serializeBackup(state: PersistedState): string {
  return JSON.stringify({ version: state.version, shows: state.shows }, null, 2);
}

export function parseBackup(text: string): PersistedState | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || parsed.version !== 1) return null;
  if (!Array.isArray(parsed.shows) || !parsed.shows.every(isShow)) return null;

  const shows: FollowedShow[] = parsed.shows;
  if (new Set(shows.map((show) => show.id)).size !== shows.length) return null;

  return { version: 1, shows };
}
