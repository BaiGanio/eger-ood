import test from 'node:test';
import assert from 'node:assert/strict';
import { inComingList, inOverdueList, inSendList, inSentList } from '../public/card-lists.js';

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

const sentAt = (status, smsSentAt) => ({ status, smsSentAt });
const coming = (nextServiceDate, status = 'sent') => ({ status, nextServiceDate });

test('an SMS of today is in the sent list of today', () => {
  assert.equal(inSentList(sentAt('sent', '2026-11-15T08:01:00'), '2026-11-15'), true);
  assert.equal(inSentList(sentAt('sent', '2026-11-14T23:59:00'), '2026-11-15'), false);
});

test('the sent list goes back to the first day of the period', () => {
  assert.equal(inSentList(sentAt('sent', '2026-11-08T10:00:00'), '2026-11-08'), true);
  assert.equal(inSentList(sentAt('sent', '2026-11-07T10:00:00'), '2026-11-08'), false);
});

test('an overdue customer who got the SMS is in the sent list', () => {
  assert.equal(inSentList(sentAt('overdue', '2026-11-10T10:00:00'), '2026-11-01'), true);
});

test('a customer with no SMS is never in the sent list', () => {
  assert.equal(inSentList(sentAt('pending', null), '2000-01-01'), false);
});

test('the coming list goes from today to the last day', () => {
  assert.equal(inComingList(coming('2026-11-15'), '2026-11-15', '2026-11-15'), true);
  assert.equal(inComingList(coming('2026-11-22'), '2026-11-15', '2026-11-22'), true);
  assert.equal(inComingList(coming('2026-11-23'), '2026-11-15', '2026-11-22'), false);
});

test('an expiry date before today is not in the coming list', () => {
  assert.equal(inComingList(coming('2026-11-14'), '2026-11-15', '2026-12-15'), false);
});

test('a customer with no SMS is never in the coming list', () => {
  for (const status of ['due', 'pending']) {
    assert.equal(inComingList(coming('2026-11-20', status), '2026-11-15', '2026-12-15'), false);
  }
});
