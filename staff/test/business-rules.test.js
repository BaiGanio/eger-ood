// Staff stories: the real engine (lib/reminders.js) makes each customer as the
// dashboard gets it, then the card lists (public/card-lists.js) sort them.
// Each test is one sentence of the staff rules (specs D21, D22). A unit test
// checks one function; these check that the parts give the answer the staff
// expect together.
import test from 'node:test';
import assert from 'node:assert/strict';
import { markSent, withComputed } from '../lib/reminders.js';
import { inComingList, inOverdueList, inSendList, inSentList } from '../public/card-lists.js';

const TODAY = '2026-11-18';   // a Wednesday: a work day
const SETTINGS = { weeklyDaysOff: [0, 1], holidays: [] };   // Sunday, Monday

// A customer as the dashboard gets it. The expiry is one year after the inspection.
function customer(lastServiceDate, smsSentAt = null) {
  return withComputed({ id: 'c1', name: 'Test', lastServiceDate, smsSentAt }, SETTINGS, TODAY);
}

const lists = c => ({
  send:    inSendList(c, '2026-12-18'),
  sent:    inSentList(c, '2025-11-18'),
  coming:  inComingList(c, TODAY, '2026-12-18'),
  overdue: inOverdueList(c, '2025-11-18'),
});

test('expiry in 3 days, no SMS yet: "За днес", to send, not expected', () => {
  const c = customer('2025-11-21');
  assert.equal(c.status, 'due');
  assert.deepEqual(lists(c), { send: true, sent: false, coming: false, overdue: false });
});

test('expiry in 20 days, no SMS yet: "Очаква", not expected', () => {
  const c = customer('2025-12-08');
  assert.equal(c.status, 'pending');
  assert.equal(lists(c).coming, false);
});

test('expiry in 3 days, SMS sent: "Изпратен", expected for the inspection', () => {
  const c = customer('2025-11-21', '2026-11-14T09:00:00');
  assert.equal(c.status, 'sent');
  assert.deepEqual(lists(c), { send: false, sent: true, coming: true, overdue: false });
});

test('after the send, the same customer moves from the send list to the coming list', () => {
  const before = customer('2025-11-21');
  const raw = markSent({ id: 'c1', name: 'Test', lastServiceDate: '2025-11-21', smsSentAt: null },
                       `${TODAY}T10:00:00`);
  const after = withComputed(raw, SETTINGS, TODAY);
  assert.deepEqual([lists(before).send, lists(before).coming], [true, false]);
  assert.deepEqual([lists(after).send, lists(after).coming], [false, true]);
});

test('expiry today with the SMS: still expected today, not overdue', () => {
  const c = customer('2025-11-18', '2026-11-12T09:00:00');
  assert.equal(c.status, 'sent');
  assert.equal(lists(c).coming, true);
  assert.equal(lists(c).overdue, false);
});

test('expiry yesterday with the SMS: overdue, not expected any more', () => {
  const c = customer('2025-11-17', '2026-11-11T09:00:00');
  assert.equal(c.status, 'overdue');
  assert.deepEqual(lists(c), { send: false, sent: true, coming: false, overdue: true });
});

test('an SMS of the old year does not count: to send again, not expected', () => {
  // The staff typed the new inspection in Excel; the old SMS mark stayed.
  const c = customer('2025-11-21', '2025-11-14T09:00:00');
  assert.equal(c.status, 'due');
  assert.equal(lists(c).coming, false);
  assert.equal(lists(c).send, true);
});
