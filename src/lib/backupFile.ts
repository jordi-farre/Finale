import { format } from 'date-fns';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { parseBackup, serializeBackup } from '@/lib/backup';
import type { PersistedState } from '@/lib/types';

export type ExportOutcome = 'shared' | 'unavailable';

export type ImportResult =
  | { status: 'cancelled' }
  | { status: 'invalid' }
  | { status: 'ok'; state: PersistedState };

export async function exportBackupFile(state: PersistedState, now: Date = new Date()): Promise<ExportOutcome> {
  if (!(await Sharing.isAvailableAsync())) return 'unavailable';
  const file = new File(Paths.cache, `finale-backup-${format(now, 'yyyy-MM-dd')}.json`);
  file.create({ overwrite: true });
  file.write(serializeBackup(state));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save Finale backup' });
  return 'shared';
}

export async function pickBackupFile(): Promise<ImportResult> {
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (result.canceled) return { status: 'cancelled' };
  try {
    const text = await new File(result.assets[0].uri).text();
    const state = parseBackup(text);
    return state ? { status: 'ok', state } : { status: 'invalid' };
  } catch {
    return { status: 'invalid' };
  }
}
