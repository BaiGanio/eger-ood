// The check of the official days off on the internet (Nager.Date API).
//
// The law gives most days off (holidays.js). The API adds the one-time days
// off that the government declares. The check runs at most once in
// CHECK_EVERY_DAYS days, when the app starts or the page loads, and when the
// staff click "Провери сега". It is not a timer job (specs D4).
//
// Only the year and the country go out. No customer data.
// No internet, or a bad answer: the app keeps the last good list and the law.

import { addDays, localDateText } from './dates.js';
import { legalHolidays } from './holidays.js';
import { StoreError, readData, writeHolidayCheck } from './store.js';

const API = 'https://date.nager.at/api/v3/PublicHolidays';
const COUNTRY = 'BG';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const CHECK_EVERY_DAYS = 30;
// After a failed check, the page loads must not try again each time.
const RETRY_AFTER_MS = 60 * 60 * 1000;
const TIMEOUT_MS = 8000;
const NAME_MAX = 100;

/** True when the last good check is CHECK_EVERY_DAYS days old, or there is none. */
export function checkIsDue(lastCheck, today) {
  return !lastCheck || addDays(lastCheck, CHECK_EVERY_DAYS) <= today;
}

/** The years that a check asks for: this year and the next one. */
export function yearsToCheck(today) {
  const year = Number(today.slice(0, 4));
  return [year, year + 1];
}

/** The days off of one year from the API: `[{ date, name }]`. Throws on a bad answer. */
export async function fetchYear(year, fetchImpl = globalThis.fetch) {
  const res = await fetchImpl(`${API}/${year}/${COUNTRY}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`API answered ${res.status} for ${year}`);
  const list = await res.json();
  if (!Array.isArray(list) || list.length === 0) throw new Error(`API gave no days for ${year}`);
  const days = list
    .filter(h => h && Array.isArray(h.types) && h.types.includes('Public'))
    .map(h => ({
      date: h.date,
      name: String(h.localName || h.name || '').trim().slice(0, NAME_MAX),
    }));
  const bad = days.find(h => typeof h.date !== 'string' || !DATE_RE.test(h.date) || !h.date.startsWith(`${year}-`));
  if (bad) throw new Error(`Bad date from the API for ${year}`);
  return days;
}

/** The old list with the checked years put in new. Pure. */
export function mergeChecked(oldList, years, fresh) {
  const keep = oldList.filter(h => !years.some(y => h.date.startsWith(`${y}-`)));
  return [...keep, ...fresh].sort((a, b) => a.date.localeCompare(b.date));
}

// The state of this run of the app. It is not saved.
let running = null;
let lastFail = null;   // { at: ms, message }

/** The last failed check, for the page. Null after a good check. */
export function lastCheckError() {
  return lastFail ? lastFail.message : null;
}

/** For the tests. */
export function resetCheckState() {
  running = null;
  lastFail = null;
}

/**
 * Checks the days off on the internet when it is due, or always with `force`.
 * Returns `{ status, lastCheck, added }`:
 *   status 'fresh'   — not due, nothing done;
 *   status 'updated' — the list is saved; `added` = new one-time days off;
 *   status 'failed'  — no internet, a bad answer, or Excel has the file.
 */
export async function runHolidayCheck({ force = false, now = new Date(), fetchImpl = globalThis.fetch } = {}) {
  if (running) return running;
  running = runCheck({ force, now, fetchImpl }).finally(() => { running = null; });
  return running;
}

async function runCheck({ force, now, fetchImpl }) {
  const today = localDateText(now);
  const data = await readData();
  const lastCheck = data.holidayCheckDate;
  if (!force) {
    if (!checkIsDue(lastCheck, today)) return { status: 'fresh', lastCheck, added: [] };
    if (lastFail && now.getTime() - lastFail.at < RETRY_AFTER_MS) {
      return { status: 'failed', lastCheck, added: [], error: lastFail.message };
    }
  }

  const years = yearsToCheck(today);
  let fresh;
  try {
    fresh = (await Promise.all(years.map(y => fetchYear(y, fetchImpl)))).flat();
  } catch (err) {
    console.error('[HOLIDAYS] Check failed:', err.message);
    return fail(now, lastCheck, 'Няма връзка със сървъра за празниците. Ще се опита отново по-късно.');
  }

  // "New" = a day that neither the law nor the last check knew.
  const known = new Set([
    ...data.officialHolidays.map(h => h.date),
    ...years.flatMap(y => legalHolidays(y).map(h => h.date)),
  ]);
  const officialHolidays = mergeChecked(data.officialHolidays, years, fresh);
  try {
    await writeHolidayCheck({ officialHolidays, holidayCheckDate: today });
  } catch (err) {
    if (!(err instanceof StoreError)) throw err;
    return fail(now, lastCheck, err.message);
  }
  lastFail = null;
  console.log(`[HOLIDAYS] Checked ${years.join(', ')}: ${fresh.length} days.`);
  return { status: 'updated', lastCheck: today, added: fresh.filter(h => !known.has(h.date)) };
}

function fail(now, lastCheck, message) {
  lastFail = { at: now.getTime(), message };
  return { status: 'failed', lastCheck, added: [], error: message };
}

/** The same check with no wait and no error: for the start and the page loads. */
export function checkHolidaysInBackground(options) {
  runHolidayCheck(options).catch(err => console.error('[HOLIDAYS] Check failed:', err.message));
}
