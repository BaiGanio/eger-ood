// The official Bulgarian days off. Pure functions.
//
// The law (Labour Code, art. 154) gives most of them, for any year:
// fixed dates, Orthodox Easter, and the rule that a holiday on a Saturday or
// Sunday gives the next work day off. So the app knows them with no internet.
// The law cannot know a one-time day off that the government declares
// (example: 2026-01-02). Those come from the API check (holiday-check.js).
//
// tools/update-holidays.mjs has the same law rules for the public site. The
// two apps share nothing at run time (specs section 1), so a change of the law
// must go into both files.

import { addDays, toDateText, weekday } from './dates.js';

/** The years that the Easter formula below is correct for. */
export const FIRST_YEAR = 2000;
export const LAST_YEAR = 2099;

// Art. 154 (1): the fixed official holidays.
const FIXED = [
  ['01-01', 'Нова година'],
  ['03-03', 'Ден на Освобождението'],
  ['05-01', 'Ден на труда'],
  ['05-06', 'Гергьовден'],
  ['05-24', 'Ден на българската просвета и култура'],
  ['09-06', 'Ден на Съединението'],
  ['09-22', 'Ден на Независимостта'],
  ['12-24', 'Бъдни вечер'],
  ['12-25', 'Коледа'],
  ['12-26', 'Коледа (втори ден)'],
];

// Days from Easter Sunday: Good Friday to Easter Monday.
const EASTER = [
  [-2, 'Велики петък'],
  [-1, 'Велика събота'],
  [0, 'Великден'],
  [1, 'Великден (втори ден)'],
];

/** Orthodox Easter Sunday (Meeus, Julian calendar) as a Gregorian date text. */
export function orthodoxEaster(year) {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  // The 13-day shift between the calendars is correct for 1900–2099.
  return addDays(toDateText(year, month, day), 13);
}

// The national weekend of the law. It is not the staff's days off.
const isWeekend = date => [0, 6].includes(weekday(date));

const lawCache = new Map();

/** The days off by the law for one year: `[{ date, name }]`, in date order. */
export function legalHolidays(year) {
  if (lawCache.has(year)) return lawCache.get(year);
  const byDate = new Map();
  const easter = orthodoxEaster(year);
  for (const [days, name] of EASTER) byDate.set(addDays(easter, days), name);
  const fixed = FIXED.map(([monthDay, name]) => ({ date: `${year}-${monthDay}`, name }));
  for (const h of fixed) byDate.set(h.date, h.name);

  // Art. 154 (2): a fixed holiday on a Saturday or Sunday gives the first work
  // day after it off. Two such holidays give two work days. Easter does not.
  for (const h of fixed) {
    if (!isWeekend(h.date)) continue;
    let day = h.date;
    do { day = addDays(day, 1); } while (isWeekend(day) || byDate.has(day));
    byDate.set(day, `Почивен ден вместо ${h.name}`);
  }

  const list = [...byDate].map(([date, name]) => ({ date, name }))
    .sort((x, y) => x.date.localeCompare(y.date));
  lawCache.set(year, list);
  return list;
}

/**
 * The official days off of one year: the law plus the days from the API check.
 * `[{ date, name, fromCheck }]`, in date order. `fromCheck` is true for a day
 * that only the API knows (a one-time day off).
 */
export function officialHolidays(year, checked = []) {
  const list = legalHolidays(year).map(h => ({ ...h, fromCheck: false }));
  const known = new Set(list.map(h => h.date));
  for (const h of checked) {
    if (!h.date.startsWith(`${year}-`) || known.has(h.date)) continue;
    known.add(h.date);
    list.push({ date: h.date, name: h.name, fromCheck: true });
  }
  return list.sort((x, y) => x.date.localeCompare(y.date));
}

/** Only the dates of `officialHolidays`, for the day-off math. */
export function officialDates(year, checked = []) {
  return officialHolidays(year, checked).map(h => h.date);
}
