// Rules for the files of the dashboard (public/). They are text checks: the
// page has no test in a browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

async function publicFiles() {
  const names = await fs.readdir(PUBLIC_DIR);
  return Promise.all(names.map(async name => ({
    name, text: await fs.readFile(path.join(PUBLIC_DIR, name), 'utf8'),
  })));
}

/** The files that have a match of `pattern`. Comments count too. */
async function filesWith(pattern) {
  return (await publicFiles()).filter(f => pattern.test(f.text)).map(f => f.name);
}

test('no inline handler in public/ (the CSP refuses it)', async () => {
  assert.deepEqual(await filesWith(/\son\w+\s*=\s*["']/i), []);
});

test('no browser dialog in public/ (the page has its own)', async () => {
  assert.deepEqual(await filesWith(/(?<![\w.])(confirm|alert|prompt)\(/), []);
});

test('the SMS price is not written in public/ (its home is lib/store.js)', async () => {
  assert.deepEqual(await filesWith(/0\.1466/), []);
});

test('no empty catch block in public/', async () => {
  assert.deepEqual(await filesWith(/catch\s*(\(\w*\))?\s*\{\s*\}/), []);
});

test('the page links an icon that is in public/', async () => {
  const html = await fs.readFile(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
  const href = html.match(/<link rel="icon" href="([^"]+)"/)?.[1];
  assert.ok(href, 'no icon link');
  await fs.access(path.join(PUBLIC_DIR, href));
});
