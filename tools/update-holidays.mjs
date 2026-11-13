// Makes site/holidays.json: the Bulgarian days off for the public site (specs.md D9).
//
// Run one time per year, in December:
//   node tools/update-holidays.mjs              -> this year and the next year
//   node tools/update-holidays.mjs 2027 2028    -> the given years
//
// Two sources, joined:
//   1. The law (Labour Code, art. 154): fixed dates, Orthodox Easter, and the
//      rule that a holiday on a weekend gives the next work day off.
//   2. The Nager.Date API: it adds one-time days off that the government
//      declares (example: 2026-01-02).
// The API alone is not complete: it misses some of the moved days off.
// The law alone does not know the one-time days. So the result is the union.
//
// The public site reads only the file. It never calls the API.

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const API = 'https://date.nager.at/api/v3/PublicHolidays';
const COUNTRY = 'BG';
const OUT_FILE = fileURLToPath(new URL('../site/holidays.json', import.meta.url));
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Art. 154 (1): month-day of each fixed official holiday.
const FIXED = ['01-01', '03-03', '05-01', '05-06', '05-24', '09-06', '09-22', '12-24', '12-25', '12-26'];

// Local date parts only. toISOString() gives the UTC day, which is wrong in Sofia.
function fmt(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

function addDays(date, n) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
}

// Orthodox Easter Sunday (Meeus, Julian calendar) as a Gregorian date.
// The 13-day shift between the calendars is correct for 1900–2099.
function orthodoxEaster(year) {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  return new Date(year, month - 1, day + 13);
}

function legalHolidays(year) {
  const easter = orthodoxEaster(year);
  const set = new Set([-2, -1, 0, 1].map((n) => fmt(addDays(easter, n))));
  const fixed = FIXED.map((md) => `${year}-${md}`);
  fixed.forEach((d) => set.add(d));

  // Art. 154 (2): a holiday on Saturday or Sunday (not the Easter days) gives
  // the first work day after it as a day off. Two such days give two work days.
  for (const iso of fixed) {
    const [y, m, d] = iso.split('-').map(Number);
    let day = new Date(y, m - 1, d);
    if (day.getDay() !== 0 && day.getDay() !== 6) continue;
    do {
      day = addDays(day, 1);
    } while (day.getDay() === 0 || day.getDay() === 6 || set.has(fmt(day)));
    set.add(fmt(day));
  }
  return [...set];
}

function yearsFromArgs(args) {
  if (args.length === 0) {
    const year = new Date().getFullYear();
    return [year, year + 1];
  }
  const years = args.map(Number);
  if (years.some((y) => !Number.isInteger(y) || y < 2000 || y > 2099)) {
    throw new Error(`Bad year in: ${args.join(' ')}`);
  }
  return years;
}

async function apiHolidays(year) {
  const res = await fetch(`${API}/${year}/${COUNTRY}`);
  if (!res.ok) throw new Error(`API answered ${res.status} for ${year}`);
  const list = await res.json();
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error(`API gave no holidays for ${year}`);
  }
  const dates = list
    .filter((h) => Array.isArray(h.types) && h.types.includes('Public'))
    .map((h) => h.date);
  const bad = dates.find((d) => !DATE_RE.test(d) || !d.startsWith(`${year}-`));
  if (bad !== undefined) throw new Error(`Bad date from the API for ${year}: ${bad}`);
  return dates;
}

const years = [...new Set(yearsFromArgs(process.argv.slice(2)))].sort();
const all = new Set();
// One year fails = no write. A half-empty file would show holidays as work days.
for (const year of years) {
  const legal = legalHolidays(year);
  const api = await apiHolidays(year);
  const onlyApi = api.filter((d) => !legal.includes(d)).sort();
  const onlyLaw = legal.filter((d) => !api.includes(d)).sort();
  // The owner reads these two lines to check the list against the official calendar.
  console.log(`${year}: only in the API (one-time days off): ${onlyApi.join(', ') || 'none'}`);
  console.log(`${year}: only from the law (the API does not have them): ${onlyLaw.join(', ') || 'none'}`);
  [...legal, ...api].forEach((d) => all.add(d));
}

const holidays = [...all].sort();
const body = JSON.stringify({ years, holidays }, null, 2) + '\n';
await writeFile(OUT_FILE, body, 'utf8');

console.log(`Saved ${holidays.length} days off for ${years.join(', ')} to ${OUT_FILE}`);
