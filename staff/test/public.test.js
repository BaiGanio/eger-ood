// Rules for the files of the dashboard (public/). They are text checks: the
// page has no test in a browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

// The text files, also in the folders (the guide pages are in public/help/).
// Pictures are not code.
const TEXT_FILE = /\.(html|css|js|svg)$/;

async function publicFiles() {
  const names = (await fs.readdir(PUBLIC_DIR, { recursive: true })).filter(name => TEXT_FILE.test(name));
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

// The guide (specs D11): the task list in help/js/tasks.js is the one home.
test('each written task of the guide has its page, and each page is in the list', async () => {
  const { HELP_TASKS } = await import('../public/help/js/tasks.js');
  const pages = (await fs.readdir(path.join(PUBLIC_DIR, 'help'))).filter(n => n.endsWith('.html') && n !== 'index.html');
  for (const task of HELP_TASKS.filter(t => t.ready)) {
    assert.ok(pages.includes(task.page), `no page for ${task.page}`);
  }
  for (const page of pages) {
    assert.ok(HELP_TASKS.some(t => t.page === page && t.ready), `${page} is not a written task in tasks.js`);
  }
});
