// The internet check of the days off. A fake fetch plays the API: no test
// goes to the internet.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  checkIsDue, fetchYear, mergeChecked, resetCheckState, runHolidayCheck, yearsToCheck,
} from '../lib/holiday-check.js';
import { readData, writeData } from '../lib/store.js';

const NOW = new Date(2026, 10, 15, 10, 0, 0);   // 15 Nov 2026, local time

async function freshFolder(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'eger-check-'));
  process.env.EGER_DATA_DIR = dir;
  resetCheckState();
  t.mock.method(console, 'log', () => {});
  t.mock.method(console, 'error', () => {});
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
}

const customer = {
  id: 'c001', name: 'Test', phone: '+359880000001', address: '', carModel: 'Car',
  carPlate: 'PB0001TT', lastServiceDate: '2026-01-15', smsSentAt: null,
};

/** A fake API: the days for each year, as Nager.Date sends them. */
function fakeApi(byYear, calls = []) {
  return async url => {
    calls.push(url);
    const year = Number(url.split('/').at(-2));
    const days = byYear[year];
    if (!days) return { ok: false, status: 404, json: async () => ({}) };
    return {
      ok: true, status: 200,
      json: async () => days.map(([date, localName]) => ({ date, localName, name: 'x', types: ['Public'] })),
    };
  };
}

const API_DAYS = {
  2026: [['2026-01-01', 'Нова година'], ['2026-01-02', 'Почивен ден']],
  2027: [['2027-01-01', 'Нова година']],
};

test('the check is due after 30 days, or when there was none', () => {
  assert.equal(checkIsDue(null, '2026-11-15'), true);
  assert.equal(checkIsDue('2026-11-01', '2026-11-15'), false);
  assert.equal(checkIsDue('2026-10-16', '2026-11-15'), true);
  assert.deepEqual(yearsToCheck('2026-11-15'), [2026, 2027]);
});

test('fetchYear keeps only public days and refuses a bad answer', async () => {
  const api = async () => ({
    ok: true,
    json: async () => [
      { date: '2027-01-01', localName: 'Нова година', types: ['Public'] },
      { date: '2027-02-14', localName: 'Other', types: ['Observance'] },
    ],
  });
  assert.deepEqual(await fetchYear(2027, api), [{ date: '2027-01-01', name: 'Нова година' }]);
  await assert.rejects(fetchYear(2026, api));   // dates of another year
  await assert.rejects(fetchYear(2027, async () => ({ ok: true, json: async () => [] })));
});

test('mergeChecked puts the checked years in new and keeps the other years', () => {
  const old = [{ date: '2025-12-24', name: 'a' }, { date: '2026-05-05', name: 'old' }];
  const fresh = [{ date: '2026-01-02', name: 'new' }];
  assert.deepEqual(mergeChecked(old, [2026, 2027], fresh),
    [{ date: '2025-12-24', name: 'a' }, { date: '2026-01-02', name: 'new' }]);
});

test('a due check saves the days and the day of the check; the customers stay', async t => {
  await freshFolder(t);
  await writeData({ customers: [customer], holidays: ['2026-12-31'] });
  const result = await runHolidayCheck({ now: NOW, fetchImpl: fakeApi(API_DAYS) });
  assert.equal(result.status, 'updated');
  // Only the day that the law does not know is new.
  assert.deepEqual(result.added, [{ date: '2026-01-02', name: 'Почивен ден' }]);

  const data = await readData();
  assert.equal(data.holidayCheckDate, '2026-11-15');
  assert.deepEqual(data.officialHolidays.map(h => h.date), ['2026-01-01', '2026-01-02', '2027-01-01']);
  assert.deepEqual(data.customers, [customer]);
  assert.deepEqual(data.holidays, ['2026-12-31']);
});

test('a check that is not due does not go to the internet; force does', async t => {
  await freshFolder(t);
  await writeData({ customers: [], holidayCheckDate: '2026-11-01' });
  const calls = [];
  const fresh = await runHolidayCheck({ now: NOW, fetchImpl: fakeApi(API_DAYS, calls) });
  assert.equal(fresh.status, 'fresh');
  assert.equal(calls.length, 0);
  const forced = await runHolidayCheck({ now: NOW, force: true, fetchImpl: fakeApi(API_DAYS, calls) });
  assert.equal(forced.status, 'updated');
  assert.equal(calls.length, 2);
});

test('no internet: the old list stays, and the next page load does not try again at once', async t => {
  await freshFolder(t);
  const old = [{ date: '2026-01-02', name: 'Почивен ден' }];
  await writeData({ customers: [], officialHolidays: old, holidayCheckDate: '2026-09-01' });
  const calls = [];
  const down = async url => { calls.push(url); throw new Error('offline'); };

  const first = await runHolidayCheck({ now: NOW, fetchImpl: down });
  assert.equal(first.status, 'failed');
  assert.match(first.error, /Няма връзка/);
  const data = await readData();
  assert.deepEqual(data.officialHolidays, old);
  assert.equal(data.holidayCheckDate, '2026-09-01');

  const count = calls.length;
  const again = await runHolidayCheck({ now: NOW, fetchImpl: down });
  assert.equal(again.status, 'failed');
  assert.equal(calls.length, count);
});

test('one year that fails saves nothing', async t => {
  await freshFolder(t);
  await writeData({ customers: [] });
  const result = await runHolidayCheck({ now: NOW, fetchImpl: fakeApi({ 2026: API_DAYS[2026] }) });
  assert.equal(result.status, 'failed');
  const data = await readData();
  assert.deepEqual(data.officialHolidays, []);
  assert.equal(data.holidayCheckDate, null);
});
