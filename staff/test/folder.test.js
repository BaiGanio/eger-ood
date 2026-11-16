import test from 'node:test';
import assert from 'node:assert/strict';
import { openFolderCommand } from '../lib/folder.js';

test('openFolderCommand: the file manager of each system, the folder as one argument', () => {
  const dir = 'C:\\Users\\Иван\\Documents\\ЕГЕР-Сервиз';
  assert.deepEqual(openFolderCommand('win32', dir), { file: 'explorer.exe', args: [dir] });
  assert.deepEqual(openFolderCommand('darwin', '/Users/a b/Documents'), { file: 'open', args: ['/Users/a b/Documents'] });
  assert.deepEqual(openFolderCommand('linux', '/home/a/Documents'), { file: 'xdg-open', args: ['/home/a/Documents'] });
});
