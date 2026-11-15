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
