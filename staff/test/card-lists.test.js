import test from 'node:test';
import assert from 'node:assert/strict';
import { inOverdueList, inSendList } from '../public/card-lists.js';

const send = (status, nextReminderDate) => ({ status, nextReminderDate });
const expired = (status, nextServiceDate) => ({ status, nextServiceDate });

test('a "due" customer is always in the send list', () => {
  assert.equal(inSendList(send('due', '2026-11-10'), '2026-11-15'), true);
});

test('a "pending" customer is in the send list up to and on the last day', () => {
  assert.equal(inSendList(send('pending', '2026-11-22'), '2026-11-22'), true);
  assert.equal(inSendList(send('pending', '2026-11-23'), '2026-11-22'), false);
});

test('with the period "today" no "pending" customer is in the send list', () => {
  assert.equal(inSendList(send('pending', '2026-11-16'), '2026-11-15'), false);
});

test('"sent" and "overdue" are never in the send list', () => {
  assert.equal(inSendList(send('sent', '2026-11-14'), '2026-12-31'), false);
  assert.equal(inSendList(send('overdue', '2026-10-01'), '2026-12-31'), false);
});

test('an overdue customer is in the overdue list from the first day on', () => {
  assert.equal(inOverdueList(expired('overdue', '2026-11-08'), '2026-11-08'), true);
  assert.equal(inOverdueList(expired('overdue', '2026-11-14'), '2026-11-08'), true);
  assert.equal(inOverdueList(expired('overdue', '2026-11-07'), '2026-11-08'), false);
});

test('only "overdue" customers are in the overdue list', () => {
  for (const status of ['due', 'pending', 'sent']) {
    assert.equal(inOverdueList(expired(status, '2026-11-14'), '2026-01-01'), false);
  }
});
