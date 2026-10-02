import { parseBackup, serializeBackup } from '@/lib/backup';
import type { PersistedState } from '@/lib/types';
import { followed } from '@/test-utils/fixtures';

const state: PersistedState = {
  version: 1,
  shows: [followed({ id: 1, name: 'Severance' }, { seenSeasons: [1] }), followed({ id: 2, name: 'Firefly', status: 'cancelled' })],
};

describe('backup', () => {
  it('round-trips a state through serialize and parse', () => {
    expect(parseBackup(serializeBackup(state))).toEqual(state);
  });

  it('accepts an empty state', () => {
    const empty: PersistedState = { version: 1, shows: [] };
    expect(parseBackup(serializeBackup(empty))).toEqual(empty);
  });

  it('rejects text that is not JSON', () => {
    expect(parseBackup('not json')).toBeNull();
  });

  it('rejects another version', () => {
    expect(parseBackup(JSON.stringify({ version: 2, shows: [] }))).toBeNull();
  });

  it('rejects a Punch backup', () => {
    expect(parseBackup(JSON.stringify({ version: 1, packs: [], sessions: [] }))).toBeNull();
  });

  it('rejects duplicate shows', () => {
    const [show] = state.shows;
    expect(parseBackup(JSON.stringify({ version: 1, shows: [show, show] }))).toBeNull();
  });

  it('rejects a show whose details belong to another show', () => {
    const [show] = state.shows;
    expect(parseBackup(JSON.stringify({ version: 1, shows: [{ ...show, id: 99 }] }))).toBeNull();
  });

  it.each([
    ['seen seasons', { seenSeasons: ['1'] }],
    ['sent alerts', { notified: [3] }],
    ['follow date', { followedAt: 5 }],
    ['show details', { snapshot: null }],
  ])('rejects broken %s', (_label, broken) => {
    const [show] = state.shows;
    expect(parseBackup(JSON.stringify({ version: 1, shows: [{ ...show, ...broken }] }))).toBeNull();
  });
});
