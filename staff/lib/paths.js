// Where the files are: data folder, backup folder, .env.
//
// Every function reads the environment at call time. So a value from `.env`
// (loaded by server.js at start) and a value set by a test both work.

import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const STAFF_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export const DATA_FILE_NAME = 'клиенти.xlsx';

/** The file with the Twilio keys in the data folder (the staff PC). */
export const SETTINGS_ENV_NAME = 'настройки.env';

/**
 * The files with the Twilio keys, the first one first. The built app unpacks
 * into a temp folder, so the keys of the staff PC live in the data folder.
 * The `.env` next to the code is for developers. dotenv does not overwrite a
 * value that is already set, so the first file wins.
 */
export function envFiles() {
  return [path.join(dataDir(), SETTINGS_ENV_NAME), path.join(STAFF_DIR, '.env')];
}

/** Folder of the Excel file. `EGER_DATA_DIR` overrides the default (specs O3). */
export function dataDir() {
  const override = process.env.EGER_DATA_DIR;
  if (override && override.trim()) return path.resolve(override.trim());
  return path.join(os.homedir(), 'Documents', 'ЕГЕР-Сервиз');
}

export function dataFile() {
  return path.join(dataDir(), DATA_FILE_NAME);
}

export function backupDir() {
  return path.join(dataDir(), 'backups');
}

/** `клиенти-YYYY-MM-DD.xlsx` in the backup folder. */
export function backupFile(dateText) {
  const ext = path.extname(DATA_FILE_NAME);
  const base = path.basename(DATA_FILE_NAME, ext);
  return path.join(backupDir(), `${base}-${dateText}${ext}`);
}

/** Excel makes this small file next to a workbook while the workbook is open. */
export function lockFile() {
  return path.join(dataDir(), '~$' + DATA_FILE_NAME);
}

/**
 * SMS that went out but are not in the Excel file yet (specs D30). The store
 * writes them into the Excel file at the next read, then removes this file.
 */
export function pendingSendsFile() {
  return path.join(dataDir(), 'незаписани-sms.json');
}
