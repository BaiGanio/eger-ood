import test from 'node:test';
import assert from 'node:assert/strict';
import { dayKind, monthWeeks, movedReminders, weekdayOf } from '../public/calendar.js';

test('a month starts on its weekday, Monday first', () => {
  // 1 November 2026 is a Sunday: the last cell of the first week.
  const weeks = monthWeeks(2026, 11);
  assert.deepEqual(weeks[0], [null, null, null, null, null, null, '2026-11-01']);
  assert.equal(weeks.flat().filter(Boolean).length, 30);
  assert.ok(weeks.every(w => w.length === 7));
  // February of a leap year.
  assert.equal(monthWeeks(2028, 2).flat().filter(Boolean).at(-1), '2028-02-29');
});

test('weekdayOf does not depend on the time zone', () => {
  assert.equal(weekdayOf('2026-11-15'), 0);
  assert.equal(weekdayOf('2026-11-14'), 6);
});

test('dayKind: staff day, then official, then weekly day off, then work day', () => {
  const days = {
    staff: new Set(['2026-12-24', '2026-11-18']),
    official: new Map([['2026-12-24', {}], ['2026-12-25', {}]]),
    weeklyDaysOff: [0, 1],
  };
  assert.equal(dayKind('2026-12-24', days), 'staff');
  assert.equal(dayKind('2026-12-25', days), 'official');
  assert.equal(dayKind('2026-11-15', days), 'weekly');
  assert.equal(dayKind('2026-11-17', days), 'work');
});

test('movedReminders counts only the customers with a new reminder day', () => {
  const before = [{ id: 'a', nextReminderDate: '2026-12-24' }, { id: 'b', nextReminderDate: '2026-12-10' }];
  const after  = [{ id: 'a', nextReminderDate: '2026-12-23' }, { id: 'b', nextReminderDate: '2026-12-10' },
                  { id: 'c', nextReminderDate: '2026-12-01' }];
  assert.equal(movedReminders(before, after), 1);
});
