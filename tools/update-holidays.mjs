// Gets the Bulgarian public holidays from the Nager.Date API
// and saves them to site/holidays.json (specs.md D9).
//
// Run one time per year, in December:
//   node tools/update-holidays.mjs              -> this year and the next year
//   node tools/update-holidays.mjs 2027 2028    -> the given years
//
// The public site reads only the file. It never calls the API.

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const API = 'https://date.nager.at/api/v3/PublicHolidays';
const COUNTRY = 'BG';
const OUT_FILE = fileURLToPath(new URL('../site/holidays.json', import.meta.url));
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function yearsFromArgs(args) {
  if (args.length === 0) {
    // Local year, not UTC: on 1 January at 01:00 in Sofia, UTC is still the old year.
    const year = new Date().getFullYear();
    return [year, year + 1];
  }
  const years = args.map(Number);
  if (years.some((y) => !Number.isInteger(y) || y < 2000 || y > 2100)) {
    throw new Error(`Bad year in: ${args.join(' ')}`);
  }
  return years;
}

async function fetchYear(year) {
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
const perYear = [];
// One year fails = no write. A half-empty file would show holidays as work days.
for (const year of years) perYear.push(await fetchYear(year));

const holidays = [...new Set(perYear.flat())].sort();
const body = JSON.stringify({ years, holidays }, null, 2) + '\n';
await writeFile(OUT_FILE, body, 'utf8');

console.log(`Saved ${holidays.length} holidays for ${years.join(', ')} to ${OUT_FILE}`);
