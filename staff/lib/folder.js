// Opens the data folder in the file manager of the computer (specs D29).
// The path never comes from a request: it is always the data folder.

import { execFile } from 'child_process';
import { dataDir } from './paths.js';

/** The program and its arguments that show `dir` on this system. No shell. */
export function openFolderCommand(platform, dir) {
  if (platform === 'win32') return { file: 'explorer.exe', args: [dir] };
  if (platform === 'darwin') return { file: 'open', args: [dir] };
  return { file: 'xdg-open', args: [dir] };
}

/** Resolves when the folder window is asked for. Rejects when it cannot open. */
export function openDataFolder(platform = process.platform) {
  const { file, args } = openFolderCommand(platform, dataDir());
  return new Promise((resolve, reject) => {
    execFile(file, args, err => {
      // Explorer opens the window and still ends with code 1. Only a start
      // that failed (no such program) is an error there.
      const windowsExit = platform === 'win32' && err && typeof err.code === 'number';
      if (err && !windowsExit) reject(err);
      else resolve();
    });
  });
}
