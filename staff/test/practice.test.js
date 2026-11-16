// The dates of the practice page (public/help/js/practice.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { practiceDate } from '../public/help/js/practice.js';
import { addYears } from '../lib/dates.js';
import { nextReminderDate, statusOf } from '../lib/reminders.js';

const day = (y, m, d) => new Date(y, m - 1, d);

test('a practice date is built from local parts', () => {
  assert.equal(practiceDate(day(2026, 11, 17), 0), '17.11.2026');
  assert.equal(practiceDate(day(2026, 11, 17), 3, -1), '20.11.2025');
  assert.equal(practiceDate(day(2026, 11, 17), -2, -1), '15.11.2025');
  assert.equal(practiceDate(day(2026, 11, 17), 0, 1), '17.11.2027');
});

test('a practice date crosses a month and a year', () => {
  assert.equal(practiceDate(day(2026, 12, 30), 3, -1), '02.01.2026');
  assert.equal(practiceDate(day(2027, 1, 1), -2, -1), '30.12.2025');
});

test('29 February in a year that has none is 28 February', () => {
  assert.equal(practiceDate(day(2028, 2, 26), 3, -1), '28.02.2027');
  assert.equal(practiceDate(day(2028, 2, 29), 0, 1), '28.02.2029');
});

// The page promises a status for each date. Check the promise with the
// engine, for each day of two years (a leap year is in them).
test('the practice dates give the status that the page promises', () => {
  const iso = text => text.split('.').reverse().join('-');
  const settings = { weeklyDaysOff: [0, 1], holidays: [], officialHolidays: [] };
  const status = (today, days) => {
    const todayIso = iso(practiceDate(today, 0));
    const last = iso(practiceDate(today, days, -1));
    const serviceDate = addYears(last, 1);
    const reminderDate = nextReminderDate(serviceDate, settings);
    return statusOf({ lastServiceDate: last, smsSentAt: null }, { serviceDate, reminderDate }, todayIso);
  };
  for (let i = 0; i < 731; i++) {
    const today = day(2027, 1, 1 + i);
    assert.equal(status(today, 3), 'due', `step 3 on ${today}`);
    assert.equal(status(today, -2), 'overdue', `step 16 on ${today}`);
    assert.equal(status(today, 20), 'pending', `step 17 on ${today}`);
  }
});
