// Where the files are on the staff PC (chapter 09). The built app unpacks
// into a temp folder, so the keys must not be looked for only next to the code.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { dataDir, envFiles } from '../lib/paths.js';

test('envFiles: the data folder first, the developer .env second', t => {
  const saved = process.env.EGER_DATA_DIR;
  t.after(() => { if (saved === undefined) delete process.env.EGER_DATA_DIR; else process.env.EGER_DATA_DIR = saved; });
  process.env.EGER_DATA_DIR = path.join(path.sep, 'tmp', 'eger-x');
  const [first, second] = envFiles();
  assert.equal(first, path.join(dataDir(), 'настройки.env'));
  assert.equal(path.basename(second), '.env');
  assert.notEqual(path.dirname(second), dataDir());
});

// Linux: the documents folder of the desktop (specs O3). A Bulgarian
// desktop names it "Документи".
import { documentsDir, xdgDocumentsDir } from '../lib/paths.js';

const HOME = path.join(path.sep, 'home', 'servis');
const CONFIG = path.join(HOME, '.config', 'user-dirs.dirs');
const BG_DIRS = '# made by xdg-user-dirs-update\nXDG_DESKTOP_DIR="$HOME/Работен плот"\nXDG_DOCUMENTS_DIR="$HOME/Документи"\n';

function linux({ files = {}, env = {} } = {}) {
  return documentsDir({
    platform: 'linux', home: HOME, env,
    exists: f => f in files,
    readText: f => { if (f in files) return files[f]; throw new Error('ENOENT'); },
  });
}

test('xdgDocumentsDir: $HOME, an absolute path, and the bad values', () => {
  assert.equal(xdgDocumentsDir(HOME, BG_DIRS), path.join(HOME, 'Документи'));
  assert.equal(xdgDocumentsDir(HOME, 'XDG_DOCUMENTS_DIR="/data/docs"'), path.join(path.sep, 'data', 'docs'));
  assert.equal(xdgDocumentsDir(HOME, 'XDG_DOCUMENTS_DIR="$HOME/"'), null);   // the home folder = none
  assert.equal(xdgDocumentsDir(HOME, 'XDG_DOCUMENTS_DIR="docs"'), null);     // not absolute
  assert.equal(xdgDocumentsDir(HOME, 'XDG_DESKTOP_DIR="$HOME/Desktop"'), null);
  assert.equal(xdgDocumentsDir(HOME, ''), null);
});

test('documentsDir: Windows and Mac keep Documents', () => {
  for (const platform of ['win32', 'darwin']) {
    const dir = documentsDir({ platform, home: HOME, exists: () => false, readText: () => BG_DIRS });
    assert.equal(dir, path.join(HOME, 'Documents'));
  }
});

test('documentsDir: Linux uses the folder of user-dirs.dirs', () => {
  assert.equal(linux({ files: { [CONFIG]: BG_DIRS } }), path.join(HOME, 'Документи'));
});

test('documentsDir: Linux reads XDG_CONFIG_HOME when it is set', () => {
  const other = path.join(path.sep, 'cfg');
  const files = { [path.join(other, 'user-dirs.dirs')]: 'XDG_DOCUMENTS_DIR="$HOME/Docs"' };
  assert.equal(linux({ files, env: { XDG_CONFIG_HOME: other } }), path.join(HOME, 'Docs'));
});

test('documentsDir: Linux with no user-dirs.dirs uses Documents', () => {
  assert.equal(linux(), path.join(HOME, 'Documents'));
});

test('documentsDir: Linux keeps an old data file in Documents', () => {
  const old = path.join(HOME, 'Documents', 'ЕГЕР-Сервиз', 'клиенти.xlsx');
  assert.equal(linux({ files: { [CONFIG]: BG_DIRS, [old]: '' } }), path.join(HOME, 'Documents'));
});
