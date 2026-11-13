// Run in two time zones (specs section 9):
//   TZ=Europe/Sofia node --test test/
//   TZ=UTC node --test test/
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays, addYears, excelDateTimeToText, excelDateToText, isDateText,
  localDateText, localDateTimeText, momentToExcelDateTime, textToExcelDate,
  toDateText, weekday,
} from '../lib/dates.js';

test('toDateText pads the parts', () => {
  assert.equal(toDateText(2026, 3, 5), '2026-03-05');
});

test('isDateText accepts only real dates', () => {
  assert.equal(isDateText('2026-11-13'), true);
  assert.equal(isDateText('2024-02-29'), true);
  assert.equal(isDateText('2026-02-29'), false);
  assert.equal(isDateText('2026-13-01'), false);
  assert.equal(isDateText('13.11.2026'), false);
  assert.equal(isDateText(null), false);
});

test('localDateText gives the local calendar day at local midnight', () => {
  // toISOString() gives 2026-03-28 here when the zone is east of UTC.
  assert.equal(localDateText(new Date(2026, 2, 29, 0, 0, 0)), '2026-03-29');
  assert.equal(localDateText(new Date(2026, 0, 1, 0, 30, 0)), '2026-01-01');
  assert.equal(localDateText(new Date(2026, 11, 31, 23, 59, 59)), '2026-12-31');
});

test('localDateTimeText gives the local clock time', () => {
  assert.equal(localDateTimeText(new Date(2026, 2, 19, 21, 21, 1)), '2026-03-19T21:21:01');
});

test('addDays goes over month, year and summer-time borders', () => {
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-28', 2), '2026-03-30'); // clocks change on 29 March
  assert.equal(addDays('2026-10-24', 2), '2026-10-26'); // clocks change on 25 October
  assert.equal(addDays('2026-11-13', -7), '2026-11-06');
});

test('addYears moves 29 Feb to 28 Feb', () => {
  assert.equal(addYears('2024-02-29', 1), '2025-02-28');
  assert.equal(addYears('2024-02-29', 4), '2028-02-29');
  assert.equal(addYears('2026-11-13', -1), '2025-11-13');
});

test('weekday: 0 is Sunday', () => {
  assert.equal(weekday('2026-11-15'), 0);
  assert.equal(weekday('2026-11-16'), 1);
  assert.equal(weekday('2026-11-14'), 6);
});

test('Excel date: text → cell → text gives the same day', () => {
  for (const text of ['2026-01-01', '2026-03-29', '2026-10-25', '2024-02-29', '2026-12-31']) {
    assert.equal(excelDateToText(textToExcelDate(text)), text);
  }
});

test('Excel date-time: a moment is kept as the local clock time', () => {
  const cell = momentToExcelDateTime(new Date(2026, 2, 19, 21, 21, 1));
  assert.equal(excelDateTimeToText(cell), '2026-03-19T21:21:01');
  assert.equal(excelDateTimeToText(momentToExcelDateTime('2026-03-29T03:30:00')), '2026-03-29T03:30:00');
  assert.equal(momentToExcelDateTime('not a date'), null);
});

test('Excel date: a cell that is a hair before midnight is still that day', () => {
  // Excel keeps a date as a fraction of a day. It can be off by a millisecond.
  assert.equal(excelDateToText(new Date(Date.UTC(2026, 0, 15) - 1)), '2026-01-15');
});
