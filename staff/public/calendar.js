// The year calendar of the settings page. Pure functions, no page access,
// so a test can load them (test/calendar.test.js).

export const MONTH_NAMES = [
  'Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни',
  'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември',
];

// A Bulgarian week starts on Monday.
export const WEEKDAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

// Index = Date.getDay() number.
export const DAY_NAMES = ['неделя', 'понеделник', 'вторник', 'сряда', 'четвъртък', 'петък', 'събота'];

const pad = n => String(n).padStart(2, '0');

/** Day of the week of a "YYYY-MM-DD" text: 0 = Sunday … 6 = Saturday. */
export function weekdayOf(date) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * The weeks of one month, Monday first. Each week has 7 cells: a date text,
 * or null for a cell outside the month. `month` is 1 to 12.
 */
export function monthWeeks(year, month) {
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const first = `${year}-${pad(month)}-01`;
  const cells = Array((weekdayOf(first) + 6) % 7).fill(null);
  for (let d = 1; d <= days; d++) cells.push(`${year}-${pad(month)}-${pad(d)}`);
  while (cells.length % 7) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/**
 * What one day is: 'staff' (a day the staff added), 'official', 'weekly'
 * (a weekly day off) or 'work'. A day the staff added wins, so they can see
 * and remove it. An official day wins over a weekly day off: its name is
 * more useful.
 */
export function dayKind(date, { staff, official, weeklyDaysOff }) {
  if (staff.has(date)) return 'staff';
  if (official.has(date)) return 'official';
  if (weeklyDaysOff.includes(weekdayOf(date))) return 'weekly';
  return 'work';
}

/** How many customers have a new reminder day. `before` and `after` are customer lists. */
export function movedReminders(before, after) {
  const old = new Map(before.map(c => [c.id, c.nextReminderDate]));
  return after.filter(c => old.has(c.id) && old.get(c.id) !== c.nextReminderDate).length;
}
