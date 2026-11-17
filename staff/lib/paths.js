// Where the files are: data folder, backup folder, .env.
//
// Every function reads the environment at call time. So a value from `.env`
// (loaded by server.js at start) and a value set by a test both work.

import fs from 'fs';
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

const DATA_DIR_NAME = 'ЕГЕР-Сервиз';

/**
 * The documents folder that `user-dirs.dirs` names (Linux, XDG), or null.
 * A Bulgarian desktop names it "Документи". The value is `$HOME/...` or an
 * absolute path. A value equal to the home folder means "no documents
 * folder": null then.
 */
export function xdgDocumentsDir(home, configText) {
  const line = String(configText ?? '').split('\n')
    .map(l => l.trim())
    .find(l => l.startsWith('XDG_DOCUMENTS_DIR='));
  if (!line) return null;
  let value = line.slice('XDG_DOCUMENTS_DIR='.length).trim();
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
  if (value === '$HOME' || value.startsWith('$HOME/')) value = home + value.slice('$HOME'.length);
  if (!path.isAbsolute(value)) return null;
  value = path.resolve(value);   // also drops a trailing "/"
  if (value === path.resolve(home)) return null;
  return value;
}

/**
 * The parent of the data folder. Windows and Mac: `Documents`. Linux: the
 * documents folder of the desktop (specs O3), but an old data file in
 * `~/Documents` stays in use, so an update never hides the data.
 * `platform`, `home`, `env`, `exists` and `readText` are for the tests.
 */
export function documentsDir({
  platform = process.platform,
  home = os.homedir(),
  env = process.env,
  exists = fs.existsSync,
  readText = file => fs.readFileSync(file, 'utf8'),
} = {}) {
  const usual = path.join(home, 'Documents');
  if (platform !== 'linux') return usual;
  if (exists(path.join(usual, DATA_DIR_NAME, DATA_FILE_NAME))) return usual;
  const configHome = env.XDG_CONFIG_HOME && path.isAbsolute(env.XDG_CONFIG_HOME)
    ? env.XDG_CONFIG_HOME : path.join(home, '.config');
  let text;
  try {
    text = readText(path.join(configHome, 'user-dirs.dirs'));
  } catch {
    return usual;
  }
  return xdgDocumentsDir(home, text) ?? usual;
}

// The documents folder does not change while the app runs. Found one time.
let documentsDirCache = null;

/** Folder of the Excel file. `EGER_DATA_DIR` overrides the default (specs O3). */
export function dataDir() {
  const override = process.env.EGER_DATA_DIR;
  if (override && override.trim()) return path.resolve(override.trim());
  documentsDirCache ??= documentsDir();
  return path.join(documentsDirCache, DATA_DIR_NAME);
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
