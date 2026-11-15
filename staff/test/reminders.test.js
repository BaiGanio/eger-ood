// Run in two time zones (specs section 9):
//   TZ=Europe/Sofia node --test test/
//   TZ=UTC node --test test/
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  markSent, nextReminderDate, nextServiceDate, sendBlock, sentInThisCycle,
  startNewCycle, startNewSend, statusOf, withComputed,
} from '../lib/reminders.js';

const SETTINGS = { weeklyDaysOff: [0, 1], holidays: [] };

function customer(extra = {}) {
  return {
    id: 'c001', name: 'Тест Клиент', phone: '+359880000001', carModel: 'Тест', carPlate: 'PB0001TT',
    lastServiceDate: '2025-11-24', smsSentAt: null,
    ...extra,
  };
}

test('the expiry date is the last inspection + 1 year', () => {
  assert.equal(nextServiceDate('2026-04-13'), '2027-04-13');
});

test('29 February gives 28 February', () => {
  assert.equal(nextServiceDate('2024-02-29'), '2025-02-28');
});

test('the expiry date does not move off a Sunday or a holiday', () => {
  // 15.11.2026 is a Sunday.
  const c = withComputed(customer({ lastServiceDate: '2025-11-15' }),
    { weeklyDaysOff: [0, 1], holidays: ['2026-11-15'] }, '2026-01-01');
  assert.equal(c.nextServiceDate, '2026-11-15');
});

test('the reminder is 7 days before the expiry', () => {
  // Expiry Tuesday 24.11.2026 → reminder Tuesday 17.11.2026.
  assert.equal(nextReminderDate('2026-11-24', SETTINGS), '2026-11-17');
});

test('a reminder on a Sunday moves to Saturday', () => {
  assert.equal(nextReminderDate('2026-11-22', SETTINGS), '2026-11-14');
});

test('a reminder on a Monday moves to Saturday', () => {
  assert.equal(nextReminderDate('2026-11-23', SETTINGS), '2026-11-14');
});

test('a reminder on a holiday moves earlier, also over a second day off', () => {
  assert.equal(nextReminderDate('2026-11-24', { weeklyDaysOff: [0, 1], holidays: ['2026-11-17'] }), '2026-11-14');
  assert.equal(nextReminderDate('2026-11-23', { weeklyDaysOff: [0, 1], holidays: ['2026-11-14'] }), '2026-11-13');
});

test('the weekly days off are a setting', () => {
  // Only Sunday is a day off: a Monday reminder stays.
  assert.equal(nextReminderDate('2026-11-23', { weeklyDaysOff: [0], holidays: [] }), '2026-11-16');
});

// The customer of these tests: expiry 24.11.2026, reminder 17.11.2026.
const DATES = { serviceDate: '2026-11-24', reminderDate: '2026-11-17' };

test('status: pending before the reminder day', () => {
  assert.equal(statusOf(customer(), DATES, '2026-11-16'), 'pending');
});

test('status: due from the reminder day to the expiry day: a missed day loses nothing', () => {
  for (const today of ['2026-11-17', '2026-11-18', '2026-11-24']) {
    assert.equal(statusOf(customer(), DATES, today), 'due', today);
  }
});

test('status: sent when an SMS went out in this cycle', () => {
  const c = customer({ smsSentAt: '2026-11-17T10:00:00' });
  assert.equal(statusOf(c, DATES, '2026-11-20'), 'sent');
  assert.equal(statusOf(c, DATES, '2026-11-24'), 'sent');
});

test('status: overdue from the day after the expiry day, with or without an SMS', () => {
  assert.equal(statusOf(customer(), DATES, '2026-11-25'), 'overdue');
  assert.equal(statusOf(customer({ smsSentAt: '2026-11-17T10:00:00' }), DATES, '2026-11-25'), 'overdue');
});

test('an overdue customer stays overdue until the staff type a new inspection date', () => {
  const c = customer();
  for (const today of ['2026-11-25', '2026-12-30', '2027-03-01']) {
    assert.equal(withComputed(c, SETTINGS, today).status, 'overdue');
  }
  // The customer came on 28.11.2026: the next expiry is one year later.
  const next = withComputed(startNewCycle(c, '2026-11-28'), SETTINGS, '2026-11-28');
  assert.equal(next.status, 'pending');
  assert.equal(next.nextServiceDate, '2027-11-28');
});

test('a new date typed in Excel makes the old SMS mark empty', () => {
  // The SMS of 2026 stays in the file. The staff typed the new inspection date.
  const c = customer({ lastServiceDate: '2026-11-27', smsSentAt: '2026-11-17T10:00:00' });
  assert.equal(sentInThisCycle(c), false);
  const view = withComputed(c, SETTINGS, '2026-12-01');
  assert.equal(view.status, 'pending');
  assert.equal(view.smsSentAt, null);
  assert.equal(view.nextServiceDate, '2027-11-27');
});

test('an SMS from the day of the inspection is for the old cycle', () => {
  const c = customer({ lastServiceDate: '2026-11-17', smsSentAt: '2026-11-17T09:00:00' });
  assert.equal(sentInThisCycle(c), false);
});

test('a send changes only the SMS mark', () => {
  const before = customer();
  const after = markSent(before, '2026-11-17T10:00:00');
  assert.deepEqual(after, { ...before, smsSentAt: '2026-11-17T10:00:00' });
  assert.equal(after.lastServiceDate, before.lastServiceDate);
});

test('a new inspection date clears the SMS mark and moves the dates one year', () => {
  const sent = customer({ smsSentAt: '2026-11-17T10:00:00' });
  const next = withComputed(startNewCycle(sent, '2026-11-24'), SETTINGS, '2026-11-24');
  assert.equal(next.smsSentAt, null);
  assert.equal(next.nextServiceDate, '2027-11-24');
  assert.equal(next.nextReminderDate, '2027-11-17');
  assert.equal(next.status, 'pending');
});

// The staff do not use "disabled" (2026-11-15). A value from old data has no effect.
test('an old `disabled` value changes no status and blocks no send', () => {
  const old = customer({ disabled: true });
  assert.equal(statusOf(old, DATES, '2026-11-18'), 'due');
  assert.equal(sendBlock(old, '2026-11-18'), null);
});

test('one SMS for each cycle: a second send is refused', () => {
  const sent = customer({ smsSentAt: '2026-11-17T10:00:00' });
  assert.equal(sendBlock(sent, '2026-11-18'), 'ALREADY_SENT');
  assert.equal(sendBlock(customer(), '2026-11-18'), null);
});

test('a send is possible before the reminder day and on the expiry day, not after it', () => {
  assert.equal(sendBlock(customer(), '2026-10-01'), null);
  assert.equal(sendBlock(customer(), '2026-11-24'), null);
  assert.equal(sendBlock(customer(), '2026-11-25'), 'EXPIRED');
  assert.equal(sendBlock(customer({ smsSentAt: '2026-11-17T10:00:00' }), '2026-11-25'), 'EXPIRED');
});

test('a new phone number clears the SMS mark, so one more send is possible', () => {
  const sent = customer({ smsSentAt: '2026-11-17T10:00:00' });
  const next = startNewSend({ ...sent, phone: '+359880000002' });
  assert.equal(next.smsSentAt, null);
  assert.equal(next.lastServiceDate, sent.lastServiceDate);
  assert.equal(sendBlock(next, '2026-11-18'), null);
});
