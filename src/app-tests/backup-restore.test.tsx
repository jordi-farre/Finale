import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';

import SettingsScreen from '@/app/settings';
import { parseBackup, serializeBackup } from '@/lib/backup';
import type { PersistedState } from '@/lib/types';
import { useWatchlist } from '@/store/useWatchlist';
import { followed } from '@/test-utils/fixtures';
import { fireEvent, render, screen } from '@/test-utils/render';

const mockFiles: Record<string, string> = {};

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-file-system', () => {
  class File {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts.map((part) => (typeof part === 'string' ? part : part.uri)).join('/');
    }
    create() {}
    write(content: string) {
      mockFiles[this.uri] = content;
    }
    async text() {
      if (!(this.uri in mockFiles)) throw new Error('missing file');
      return mockFiles[this.uri];
    }
  }
  return { File, Paths: { cache: { uri: 'cache' } } };
});

const backup: PersistedState = {
  version: 1,
  shows: [followed({ id: 7, name: 'Imported show' }, { seenSeasons: [1, 2] })],
};

function seedCurrentData() {
  useWatchlist.setState({ shows: [followed({ id: 1, name: 'Current show' })], hydrated: true });
}

function pickFile(uri: string) {
  (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri }] });
}

function followedNames() {
  return useWatchlist.getState().shows.map((show) => show.snapshot.name);
}

beforeEach(() => {
  Object.keys(mockFiles).forEach((key) => delete mockFiles[key]);
  (DocumentPicker.getDocumentAsync as jest.Mock).mockReset();
  (Sharing.shareAsync as jest.Mock).mockClear();
  (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
});

describe('exporting a backup', () => {
  it('writes the followed shows to a file and shares it', async () => {
    seedCurrentData();
    await render(<SettingsScreen />);

    await fireEvent.press(screen.getByLabelText('Export backup'));

    const [uri, options] = (Sharing.shareAsync as jest.Mock).mock.calls[0];
    expect(uri).toMatch(/finale-backup-\d{4}-\d{2}-\d{2}\.json$/);
    expect(options).toMatchObject({ mimeType: 'application/json' });
    const written = parseBackup(mockFiles[uri]);
    expect(written?.shows.map((show) => show.snapshot.name)).toEqual(['Current show']);
  });

  it('says so when sharing is not available', async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);
    seedCurrentData();
    await render(<SettingsScreen />);

    await fireEvent.press(screen.getByLabelText('Export backup'));

    expect(await screen.findByText("Sharing isn't available on this device")).toBeOnTheScreen();
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });
});

describe('importing a backup', () => {
  it('replaces the current data after confirming', async () => {
    seedCurrentData();
    mockFiles['picked.json'] = serializeBackup(backup);
    pickFile('picked.json');
    await render(<SettingsScreen />);

    await fireEvent.press(screen.getByLabelText('Import backup'));
    expect(await screen.findByText('Replace your data?')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Replace'));

    expect(followedNames()).toEqual(['Imported show']);
    expect(useWatchlist.getState().shows[0].seenSeasons).toEqual([1, 2]);
    expect(await screen.findByText('Backup restored')).toBeOnTheScreen();
  });

  it('keeps the current data when the confirmation is cancelled', async () => {
    seedCurrentData();
    mockFiles['picked.json'] = serializeBackup(backup);
    pickFile('picked.json');
    await render(<SettingsScreen />);

    await fireEvent.press(screen.getByLabelText('Import backup'));
    await fireEvent.press(await screen.findByText('Cancel'));

    expect(followedNames()).toEqual(['Current show']);
  });

  it('rejects a file that is not a Finale backup and keeps the current data', async () => {
    seedCurrentData();
    mockFiles['picked.json'] = 'definitely not a backup';
    pickFile('picked.json');
    await render(<SettingsScreen />);

    await fireEvent.press(screen.getByLabelText('Import backup'));

    expect(await screen.findByText("That file isn't a valid Finale backup")).toBeOnTheScreen();
    expect(followedNames()).toEqual(['Current show']);
  });

  it('does nothing when the file picker is dismissed', async () => {
    seedCurrentData();
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({ canceled: true, assets: null });
    await render(<SettingsScreen />);

    await fireEvent.press(screen.getByLabelText('Import backup'));

    expect(screen.queryByText('Replace your data?')).toBeNull();
    expect(followedNames()).toEqual(['Current show']);
  });
});
