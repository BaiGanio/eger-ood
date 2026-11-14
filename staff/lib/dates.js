// All date math. Pure functions.
//
// A date is "YYYY-MM-DD" text. It is built from date parts, never from
// toISOString(): Sofia is UTC+2/+3, and toISOString() moves a local midnight
// to the day before.
//
// The reminder rules that use these functions are in reminders.js.

const DATE_TEXT = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(n, width = 2) {
  return String(n).padStart(width, '0');
}

function daysInMonth(year, month) {
  // Day 0 of the next month is the last day of this month.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Build "YYYY-MM-DD" from numbers. Month is 1 to 12. */
export function toDateText(year, month, day) {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

/** Split a date text into numbers. Returns null if it is not a real date. */
export function parseDateText(text) {
  const m = typeof text === 'string' ? DATE_TEXT.exec(text) : null;
  if (!m) return null;
  const year = Number(m[1]), month = Number(m[2]), day = Number(m[3]);
  if (year < 1900 || month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

/** True for a real "YYYY-MM-DD" date (2026-02-30 is false). */
export function isDateText(text) {
  return parseDateText(text) !== null;
}

/** The calendar day of a Date on this computer's clock. */
export function localDateText(date = new Date()) {
  return toDateText(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** Date and time on this computer's clock: "YYYY-MM-DDTHH:mm:ss". */
export function localDateTimeText(date = new Date()) {
  return `${localDateText(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** Add days to a date text. `days` can be negative. */
export function addDays(text, days) {
  const p = parseDateText(text);
  if (!p) throw new RangeError(`Not a date: ${text}`);
  // UTC has no summer time, so one day is always 24 hours here.
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day + days));
  return toDateText(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Add years to a date text. 29 Feb becomes 28 Feb in a short year. */
export function addYears(text, years) {
  const p = parseDateText(text);
  if (!p) throw new RangeError(`Not a date: ${text}`);
  const year = p.year + years;
  return toDateText(year, p.month, Math.min(p.day, daysInMonth(year, p.month)));
}

/** Day of the week: 0 = Sunday … 6 = Saturday. */
export function weekday(text) {
  const p = parseDateText(text);
  if (!p) throw new RangeError(`Not a date: ${text}`);
  return new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
}

// ─── Work days ───────────────────────────────────────────────────────────────

// A wrong setting (all seven days off) must not make an endless loop.
const MAX_STEPS_BACK = 60;

/** True when the staff do not work on that day (weekly day off or holiday). */
export function isDayOff(text, weeklyDaysOff = [], holidays = []) {
  return weeklyDaysOff.includes(weekday(text)) || holidays.includes(text);
}

/**
 * The same day if it is a work day. If not, the nearest work day before it
 * (specs D7: a reminder moves earlier, never later).
 */
export function workDayOnOrBefore(text, weeklyDaysOff = [], holidays = []) {
  let date = text;
  for (let step = 0; step < MAX_STEPS_BACK; step++) {
    if (!isDayOff(date, weeklyDaysOff, holidays)) return date;
    date = addDays(date, -1);
  }
  return text;
}

// ─── Excel cells ─────────────────────────────────────────────────────────────
// Excel has no time zone. exceljs gives a date cell as a Date whose *UTC* parts
// are the numbers the user sees in the cell. So the UTC parts are the right
// ones here, and only here. Local parts would move the day on a computer that
// is west of UTC.

/** Date cell → "YYYY-MM-DD". Returns null for a broken Date. */
export function excelDateToText(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  // Excel keeps a date as a fraction. Half a second covers its rounding.
  const d = new Date(date.getTime() + 500);
  return toDateText(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** "YYYY-MM-DD" → the Date that exceljs writes as that calendar day. */
export function textToExcelDate(text) {
  const p = parseDateText(text);
  if (!p) throw new RangeError(`Not a date: ${text}`);
  return new Date(Date.UTC(p.year, p.month - 1, p.day));
}

/** Date-time cell → "YYYY-MM-DDTHH:mm:ss" (the clock time the user sees). */
export function excelDateTimeToText(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const d = new Date(date.getTime() + 500);
  return `${toDateText(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

/**
 * A moment in time → the Date that exceljs writes as the local clock time.
 * Accepts a Date or any text that `new Date()` reads. Returns null if it
 * cannot be read.
 */
export function momentToExcelDateTime(value) {
  // Our own clock text goes in part by part. A trip through a local Date
  // would change an hour that summer time skips.
  const m = typeof value === 'string'
    ? /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(value) : null;
  if (m) {
    const p = parseDateText(m[1]);
    if (!p || m[2] > 23 || m[3] > 59 || m[4] > 59) return null;
    return new Date(Date.UTC(p.year, p.month - 1, p.day, +m[2], +m[3], +m[4]));
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(
    d.getFullYear(), d.getMonth(), d.getDate(),
    d.getHours(), d.getMinutes(), d.getSeconds()
  ));
}
