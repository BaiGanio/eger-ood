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

const base = { address: '', smsSentAt: null };

const customers = [
  // 1–5: the five customers of the old customers.json, as they were.
  { ...base, id: 'c001', name: 'Иван Петров', phone: '+359881234567', address: 'ul. Vasil Levski 12, Plovdiv',
    carModel: 'VW Golf 7', carPlate: 'PB1234AB', lastServiceDate: '2027-12-29' },
  { ...base, id: 'c002', name: 'Мария Георгиева', phone: '+359887654321', address: 'bul. Bulgaria 45, Plovdiv',
    carModel: 'Toyota Yaris', carPlate: 'PB5678CD', lastServiceDate: '2026-01-15',
    smsSentAt: '2026-03-19T21:21:01' },
  { ...base, id: 'c003', name: 'Георги Иванов', phone: '+359889998877', address: 'ul. Hristo Botev 7, Rakovski',
    carModel: 'Opel Astra H', carPlate: 'PB9012EF', lastServiceDate: '2025-03-10',
    smsSentAt: '2026-03-03T11:15:00' },
  { ...base, id: 'c004', name: 'Елена Иванова', phone: '+359882223344', address: 'ul. Shipka 3, Asenovgrad',
    carModel: 'Skoda Octavia', carPlate: 'PB3456GH', lastServiceDate: '2025-03-19' },
  { ...base, id: 'c005', name: 'Николай Стоянов', phone: '+359885556677', address: 'bul. Maritsa 22, Plovdiv',
    carModel: 'Ford Focus', carPlate: 'PB7890IJ', lastServiceDate: '2025-04-02' },

  // 6: the reminder is due today (expiry in 7 days).
  { ...base, id: 'c006', name: 'Тест Днес', phone: '+359880000006',
    carModel: 'Dacia Logan', carPlate: 'PB0006TT', lastServiceDate: inspectedFor(addDays(today, 7)) },
  // 7: the reminder was due 10 days ago (overdue).
  { ...base, id: 'c007', name: 'Тест Просрочен', phone: '+359880000007',
    carModel: 'Renault Clio', carPlate: 'PB0007TT', lastServiceDate: inspectedFor(addDays(today, -3)) },
  // 8: expiry − 7 days is a Monday (day off). The reminder must show on Saturday.
  { ...base, id: 'c008', name: 'Тест Понеделник', phone: '+359880000008',
    carModel: 'Peugeot 308', carPlate: 'PB0008TT', lastServiceDate: inspectedFor(nextWeekday(addDays(today, 30), 1)) },
  // 9: the reminder is far away (expiry in 60 days).
  { ...base, id: 'c009', name: 'Тест Очаква', phone: '+359880000009',
    carModel: 'Fiat Punto', carPlate: 'PB0009TT', lastServiceDate: inspectedFor(addDays(today, 60)) },
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

  ...manyCustomers(),
];

/**
 * 50 more customers (c014–c063), so a list has the size of a real month.
 * Most of them are "Очаква" with a reminder in the next 1 to 35 days: the
 * staff send in advance before a holiday and filter by 7, 10 and 30 days.
 * The "Просрочен" ones spread over the periods of their card.
 * The days are relative to today, like customers 6 to 12.
 */
function manyCustomers() {
  const FIRST = ['Петър', 'Димитър', 'Стефан', 'Христо', 'Тодор', 'Васил', 'Ангел', 'Борис', 'Калин',
    'Росен', 'Пламен', 'Марин', 'Йордан', 'Здравко', 'Красимир'];
  const FIRST_F = ['Десислава', 'Цветелина', 'Габриела', 'Радка', 'Веселина', 'Милена', 'Силвия',
    'Теодора', 'Надежда', 'Яна'];
  const LAST = ['Колев', 'Митев', 'Тонев', 'Динев', 'Генчев', 'Пеев', 'Радев', 'Славов', 'Бонев',
    'Кирилов', 'Маринов', 'Ангелов'];
  const CARS = ['VW Passat', 'Opel Corsa', 'BMW 320d', 'Audi A4', 'Toyota Corolla', 'Kia Ceed',
    'Hyundai i30', 'Skoda Fabia', 'Renault Megane', 'Citroen C3', 'Mazda 3', 'Nissan Qashqai',
    'Suzuki Vitara', 'Dacia Duster', 'Ford Fiesta', 'Volvo V60'];
  const PREFIX = ['PB', 'PB', 'PB', 'CB', 'PA', 'C', 'A', 'EH'];

  // Days from today to the expiry date, one entry per customer, by group.
  // Pending: reminder (expiry − 7) in 1–35 days. Some sit on the 7, 10 and
  // 30 day edges of the filter.
  const pending = [8, 9, 9, 10, 11, 12, 13, 14, 14, 15, 16, 17, 17, 18, 19, 20, 22, 24,
    26, 28, 30, 33, 35, 37, 38, 40, 42];
  const due = [1, 3, 5, 7];                 // reminder day reached, no SMS
  const sent = [2, 6, 9, 12, 16, 21];       // SMS already sent this cycle
  // Expiry date past. Spread over the periods of the card: 7 and 10 days, 1 to 12 months.
  const overdue = [-1, -5, -8, -14, -30, -45, -60, -120, -200, -300];
  const far = [75, 120, 180, 240, 300];     // reminder months away

  const plan = [
    ...pending.map(days => ({ days })),
    ...due.map(days => ({ days })),
    ...sent.map((days, i) => ({ days, sentDaysAgo: 1 + (i % 5) })),
    ...overdue.map(days => ({ days })),
    ...far.map(days => ({ days })),
  ];

  return plan.map(({ days, sentDaysAgo }, i) => {
    const n = 14 + i;
    const female = i % 3 === 2;
    const first = female ? FIRST_F[i % FIRST_F.length] : FIRST[i % FIRST.length];
    // Bulgarian family names take "-а" for a woman.
    const last = LAST[(i * 7) % LAST.length] + (female ? 'а' : '');
    const num = String(n).padStart(4, '0');
    return {
      ...base,
      id: `c${String(n).padStart(3, '0')}`,
      name: `${first} ${last}`,
      phone: `+3598800${String(n).padStart(5, '0')}`,
      carModel: CARS[(i * 5) % CARS.length],
      carPlate: `${PREFIX[i % PREFIX.length]}${num}${'ABEHKMTX'[i % 8]}${'ABEHKMTX'[(i * 3) % 8]}`,
      lastServiceDate: inspectedFor(addDays(today, days)),
      smsSentAt: sentDaysAgo ? `${addDays(today, -sentDaysAgo)}T10:${String(10 + i).slice(-2)}:00` : null,
    };
  });
}

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
