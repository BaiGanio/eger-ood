// The official days off by the law, and the day-off math of the reminders.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { legalHolidays, officialDates, officialHolidays, orthodoxEaster } from '../lib/holidays.js';
import { nextReminderDate } from '../lib/reminders.js';

const SETTINGS = { weeklyDaysOff: [0, 1], holidays: [], officialHolidays: [] };
const dates = year => legalHolidays(year).map(h => h.date);

test('Orthodox Easter Sunday for known years', () => {
  assert.equal(orthodoxEaster(2026), '2026-04-12');
  assert.equal(orthodoxEaster(2027), '2027-05-02');
  assert.equal(orthodoxEaster(2028), '2028-04-16');
  assert.equal(orthodoxEaster(2029), '2029-04-08');
});

test('the law for 2026 and 2027 gives the days of the public site, less the one-time days', async () => {
  const site = JSON.parse(await fs.readFile(new URL('../../site/holidays.json', import.meta.url), 'utf8'));
  for (const year of [2026, 2027]) {
    const fromSite = site.holidays.filter(d => d.startsWith(`${year}-`));
    const law = dates(year);
    // Each day of the law is on the site.
    assert.deepEqual(law.filter(d => !fromSite.includes(d)), [], `${year}: law days not on the site`);
    // The site has more only for the one-time days of the API.
    const onlySite = fromSite.filter(d => !law.includes(d));
    assert.deepEqual(onlySite, year === 2026 ? ['2026-01-02'] : [], `${year}: one-time days`);
  }
});

test('a fixed holiday on a weekend gives the next work day off', () => {
  // 2026-05-24 is a Sunday → Monday 25 off. 2026-12-26 is a Saturday → Monday 28.
  assert.ok(dates(2026).includes('2026-05-25'));
  assert.ok(dates(2026).includes('2026-12-28'));
  // 2027-12-25 and 26 are Saturday and Sunday → Monday 27 and Tuesday 28.
  assert.ok(dates(2027).includes('2027-12-27'));
  assert.ok(dates(2027).includes('2027-12-28'));
  // Easter Sunday is always a Sunday and gives no extra day.
  assert.equal(dates(2028).filter(d => d.startsWith('2028-04')).length, 4);
});

test('the law works for years far ahead, with a name for each day', () => {
  for (const year of [2028, 2029, 2035, 2099]) {
    const list = legalHolidays(year);
    assert.ok(list.length >= 14, `${year} has all days`);
    assert.ok(list.every(h => h.date.startsWith(`${year}-`) && h.name), `${year} has dates and names`);
  }
  assert.equal(legalHolidays(2029).find(h => h.date === '2029-03-03').name, 'Ден на Освобождението');
});

test('a checked day is added to the law; a law day is not doubled', () => {
  const checked = [
    { date: '2026-01-02', name: 'Почивен ден' },
    { date: '2026-03-03', name: 'Liberation Day' },
    { date: '2027-01-01', name: 'New Year' },
  ];
  const list = officialHolidays(2026, checked);
  assert.equal(list.filter(h => h.date === '2026-03-03').length, 1);
  assert.equal(list.find(h => h.date === '2026-03-03').fromCheck, false);
  assert.equal(list.find(h => h.date === '2026-01-02').fromCheck, true);
  assert.ok(!list.some(h => h.date === '2027-01-01'));
  assert.deepEqual(officialDates(2026, checked), list.map(h => h.date));
});

test('a reminder on an official holiday moves earlier with no list from the staff', () => {
  // Expiry Fri 2027-03-10 → reminder Wed 2027-03-03 (holiday) → Tue 2027-03-02.
  assert.equal(nextReminderDate('2027-03-10', SETTINGS), '2027-03-02');
  // Expiry 2029-05-08 → Tue 2029-05-01 (holiday) → Mon is off → Sun is off → Sat 2029-04-28.
  assert.equal(nextReminderDate('2029-05-08', SETTINGS), '2029-04-28');
});

test('a reminder in early January moves back over the Christmas days', () => {
  // Expiry 2027-01-05 → Tue 2026-12-29 is a work day.
  assert.equal(nextReminderDate('2027-01-05', SETTINGS), '2026-12-29');
  // Expiry 2027-01-08 → Fri 2027-01-01 (holiday) → Thu 2026-12-31.
  assert.equal(nextReminderDate('2027-01-08', SETTINGS), '2026-12-31');
});

test('a checked one-time day moves a reminder too', () => {
  // Expiry 2026-01-09 → Fri 2026-01-02, a one-time day off → Thu 2026-01-01 holiday → Wed 2025-12-31.
  const settings = { ...SETTINGS, officialHolidays: [{ date: '2026-01-02', name: 'x' }] };
  assert.equal(nextReminderDate('2026-01-09', SETTINGS), '2026-01-02');
  assert.equal(nextReminderDate('2026-01-09', settings), '2025-12-31');
});
