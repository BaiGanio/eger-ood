// The release number comes from the commit words (D32): tools/next-version.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { stepOf, nextVersion } from '../tools/next-version.mjs';

const c = (subject, body = '') => ({ subject, body });

test('step of one commit', () => {
  assert.equal(stepOf('feat: add a card'), 'minor');
  assert.equal(stepOf('feat(sms): add a card'), 'minor');
  assert.equal(stepOf('fix: date in Sofia'), 'patch');
  assert.equal(stepOf('perf: faster read'), 'patch');
  assert.equal(stepOf('feat!: new file format'), 'major');
  assert.equal(stepOf('fix(store)!: new file format'), 'major');
  assert.equal(stepOf('fix: x', 'Text.\n\nBREAKING CHANGE: new file format'), 'major');
  assert.equal(stepOf('Fix: capital word'), 'patch');
});

test('no release for other words', () => {
  assert.equal(stepOf('docs: help text'), 'none');
  assert.equal(stepOf('test: more tests'), 'none');
  assert.equal(stepOf('chore!: tool change'), 'none');
  assert.equal(stepOf('Add a card'), 'none');
  assert.equal(stepOf('feature: not the word'), 'none');
  assert.equal(stepOf('fix:no space'), 'none');
});

test('next version takes the biggest step', () => {
  assert.equal(nextVersion('v1.2.3', [c('fix: a')]), 'v1.2.4');
  assert.equal(nextVersion('v1.2.3', [c('fix: a'), c('feat: b')]), 'v1.3.0');
  assert.equal(nextVersion('v1.2.3', [c('feat: b'), c('fix!: c')]), 'v2.0.0');
  assert.equal(nextVersion('v1.2.3', [c('docs: a'), c('test: b')]), null);
  assert.equal(nextVersion('v1.2.3', []), null);
});

test('first release is v1.0.0', () => {
  assert.equal(nextVersion(null, [c('fix: a')]), 'v1.0.0');
  assert.equal(nextVersion(null, [c('docs: a')]), null);
});

test('bad tag stops', () => {
  assert.throws(() => nextVersion('release-1', [c('fix: a')]), /Bad tag/);
});
