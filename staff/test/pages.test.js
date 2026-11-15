import test from 'node:test';
import assert from 'node:assert/strict';
import { clampPage, pageButtons, pageCount } from '../public/pages.js';

test('page count rounds up, and an empty list has one page', () => {
  assert.equal(pageCount(0, 25), 1);
  assert.equal(pageCount(25, 25), 1);
  assert.equal(pageCount(26, 25), 2);
  assert.equal(pageCount(312, 25), 13);
});

test('a page past the end goes to the last page', () => {
  assert.equal(clampPage(5, 26, 25), 2);
  assert.equal(clampPage(0, 26, 25), 1);
  assert.equal(clampPage(2, 0, 25), 1);
});

test('few pages show all buttons', () => {
  assert.deepEqual(pageButtons(1, 1), [1]);
  assert.deepEqual(pageButtons(2, 5), [1, 2, 3, 4, 5]);
});

test('many pages show the ends, the near pages and gaps', () => {
  assert.deepEqual(pageButtons(1, 13), [1, 2, 3, null, 13]);
  assert.deepEqual(pageButtons(7, 13), [1, null, 5, 6, 7, 8, 9, null, 13]);
  assert.deepEqual(pageButtons(13, 13), [1, null, 11, 12, 13]);
});

test('a gap of one page shows that page, not "…"', () => {
  assert.deepEqual(pageButtons(4, 13), [1, 2, 3, 4, 5, 6, null, 13]);
});
