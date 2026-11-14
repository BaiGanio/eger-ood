// Makes клиенти.xlsx with invented test customers. Run it from staff/:
//
//   node tools/make-test-data.js            # stops if the file exists
//   node tools/make-test-data.js --force    # replaces the file
//
// The file goes to the data folder (see lib/paths.js). To keep it away from
// real data, give another folder:
//
//   EGER_DATA_DIR=./data node tools/make-test-data.js
//
// All names, phones and plates are invented. The dates of customers 6 to 12
// are relative to today, so the file is useful on any day.

import fs from 'fs/promises';
import { addDays, addYears, localDateText, parseDateText, weekday } from '../lib/dates.js';
import { dataFile } from '../lib/paths.js';
import { DEFAULT_PRICE, DEFAULT_TEMPLATE, DEFAULT_WEEKLY_DAYS_OFF, readData, writeData } from '../lib/store.js';

const today = localDateText();
const thisYear = parseDateText(today).year;

/** The inspection date that expires on `expiry` (one year before it). */
const inspectedFor = expiry => addYears(expiry, -1);

/** First day on or after `from` that is the given weekday (0 = Sunday). */
function nextWeekday(from, day) {
  let date = from;
  // Skip 29 Feb: one year back and one year forward does not give it again.
  while (weekday(date) !== day || addYears(inspectedFor(date), 1) !== date) date = addDays(date, 1);
  return date;
}

function lastLeapDay() {
  for (let year = thisYear; ; year--) {
    const date = `${year}-02-29`;
    if (parseDateText(date) && date <= today) return date;
  }
}

const base = { address: '', smsSentAt: null, disabled: false };

const customers = [
  // 1–5: the five customers of the old customers.json, as they were.
  { ...base, id: 'c001', name: 'Иван Петров', phone: '+359881234567', address: 'ul. Vasil Levski 12, Plovdiv',
    carModel: 'VW Golf 7', carPlate: 'PB1234AB', lastServiceDate: '2027-12-29', disabled: true },
  { ...base, id: 'c002', name: 'Мария Георгиева', phone: '+359887654321', address: 'bul. Bulgaria 45, Plovdiv',
    carModel: 'Toyota Yaris', carPlate: 'PB5678CD', lastServiceDate: '2026-01-15',
    smsSentAt: '2026-03-19T21:21:01', disabled: true },
  { ...base, id: 'c003', name: 'Георги Иванов', phone: '+359889998877', address: 'ul. Hristo Botev 7, Rakovski',
    carModel: 'Opel Astra H', carPlate: 'PB9012EF', lastServiceDate: '2025-03-10',
    smsSentAt: '2026-03-03T11:15:00' },
  { ...base, id: 'c004', name: 'Елена Иванова', phone: '+359882223344', address: 'ul. Shipka 3, Asenovgrad',
    carModel: 'Skoda Octavia', carPlate: 'PB3456GH', lastServiceDate: '2025-03-19' },
  { ...base, id: 'c005', name: 'Николай Стоянов', phone: '+359885556677', address: 'bul. Maritsa 22, Plovdiv',
    carModel: 'Ford Focus', carPlate: 'PB7890IJ', lastServiceDate: '2025-04-02', disabled: true },

  // 6: the reminder is due today (expiry in 7 days).
  { ...base, id: 'c006', name: 'Тест Днес', phone: '+359880000006',
    carModel: 'Dacia Logan', carPlate: 'PB0006TT', lastServiceDate: inspectedFor(addDays(today, 7)) },
  // 7: the reminder was due 10 days ago (overdue).
  { ...base, id: 'c007', name: 'Тест Просрочен', phone: '+359880000007',
    carModel: 'Renault Clio', carPlate: 'PB0007TT', lastServiceDate: inspectedFor(addDays(today, -3)) },
  // 8: expiry − 7 days is a Monday (day off). The reminder must show on Saturday.
  { ...base, id: 'c008', name: 'Тест Понеделник', phone: '+359880000008',
    carModel: 'Peugeot 308', carPlate: 'PB0008TT', lastServiceDate: inspectedFor(nextWeekday(addDays(today, 30), 1)) },
  // 9: a disabled customer.
  { ...base, id: 'c009', name: 'Тест Неактивен', phone: '+359880000009',
    carModel: 'Fiat Punto', carPlate: 'PB0009TT', lastServiceDate: inspectedFor(addDays(today, 60)), disabled: true },
  // 10: a very long name and car model (an SMS with them goes over 70 characters).
  { ...base, id: 'c010', name: 'Александра-Константина Христодулова-Papadopoulos', phone: '+359880000010',
    carModel: 'Mercedes-Benz Sprinter 316 CDI Extra Long High Roof', carPlate: 'PB0010TT',
    lastServiceDate: inspectedFor(addDays(today, 20)) },
  // 11: the expiry date (the anniversary) is a Sunday.
  { ...base, id: 'c011', name: 'Тест Неделя', phone: '+359880000011',
    carModel: 'Seat Ibiza', carPlate: 'PB0011TT', lastServiceDate: inspectedFor(nextWeekday(addDays(today, 45), 0)) },
  // 12: the last inspection was on 29 February.
  { ...base, id: 'c012', name: 'Тест Високосен', phone: '+359880000012',
    carModel: 'Honda Civic', carPlate: 'PB0012TT', lastServiceDate: lastLeapDay() },

  // A bad row: no phone. The dashboard must report it and load the other rows.
  { ...base, id: 'c013', name: 'Тест Без Телефон', phone: '',
    carModel: 'Lada Niva', carPlate: 'PB0013TT', lastServiceDate: inspectedFor(addDays(today, 90)) },
];

// Fixed-date public holidays, this year and the next. Enough for a test file.
const FIXED = ['01-01', '03-03', '05-01', '05-06', '05-24', '09-06', '09-22', '12-24', '12-25', '12-26'];
const holidays = [thisYear, thisYear + 1].flatMap(year => FIXED.map(day => `${year}-${day}`));

const force = process.argv.includes('--force');
const file = dataFile();
let fileExists = true;
try { await fs.access(file); } catch { fileExists = false; }

if (fileExists && !force) {
  console.error(`The file exists: ${file}`);
  console.error('Nothing was changed. Use --force to replace it with test data.');
  process.exit(1);
}
if (fileExists) await fs.rm(file);

await writeData({
  customers,
  smsTemplate: DEFAULT_TEMPLATE,
  smsPricePerSegment: DEFAULT_PRICE,
  weeklyDaysOff: DEFAULT_WEEKLY_DAYS_OFF,
  holidays,
});

const data = await readData();
console.log(`Wrote ${file}`);
console.log(`${data.customers.length} customers load, ${data.problems.length} bad row (made on purpose).`);
