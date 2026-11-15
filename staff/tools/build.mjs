// Builds the staff app into one file for the system that runs this script
// (chapter 09). caxa packs the Node of this computer, so build the Windows
// file on Windows and the Mac file on a Mac.
//
//   npm run build      →  dist/ЕГЕР-Сервиз.exe (Windows) or dist/ЕГЕР-Сервиз (Mac, Linux)
//
// The built file unpacks into a temp folder at start. The data and the
// Twilio keys are never in it: they live in Documents/ЕГЕР-Сервиз/ (lib/paths.js).

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import caxa from 'caxa';

const STAFF_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIST_DIR = path.join(STAFF_DIR, 'dist');

// Never in the built file: data, keys, the build output, developer tools.
export const EXCLUDE = [
  'dist', 'data', 'backups', 'test', 'tools',
  '.env', '*.env', '.env.*', '*.xlsx', '~$*',
  'start.bat', 'start.sh', 'check-node.bat',
  '.DS_Store', 'Thumbs.db',
];

// caxa copies only the node file. Homebrew's Node needs its libnode.dylib
// next to it, so the built file would not start. The Node from nodejs.org
// (Windows and Mac) is one file.
async function sharedLibNode() {
  const lib = path.join(path.dirname(await fs.realpath(process.execPath)), '..', 'lib');
  try {
    return (await fs.readdir(lib)).find(n => /^libnode\..*(dylib|so)/.test(n)) ?? null;
  } catch { return null; }
}
const shared = await sharedLibNode();
if (shared) {
  console.error(`This Node (${process.execPath}) needs ${shared}; the built file would not start.`);
  console.error('Build with the Node from https://nodejs.org (LTS), for example:');
  console.error('  /usr/local/bin/node tools/build.mjs');
  process.exit(1);
}

const name = process.platform === 'win32' ? 'ЕГЕР-Сервиз.exe' : 'ЕГЕР-Сервиз';
const output = path.join(DIST_DIR, name);

// globby (inside caxa) reads the patterns from the working folder.
process.chdir(STAFF_DIR);
await fs.mkdir(DIST_DIR, { recursive: true });

console.log(`Building ${output} with Node ${process.version} ...`);
await caxa({
  input: '.',
  output,
  exclude: EXCLUDE,
  // The developer packages (caxa, nodemon) stay out.
  prepareCommand: 'npm prune --omit=dev',
  command: ['{{caxa}}/node_modules/.bin/node', '{{caxa}}/server.js'],
  uncompressionMessage: 'Първо стартиране на тази версия: разопаковане, моля изчакайте...',
});
console.log(`Done: ${output}`);
