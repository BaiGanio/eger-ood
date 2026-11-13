// One-time tool: puts the data of an old customers.json into клиенти.xlsx.
// Run it from staff/:
//
//   node tools/json-to-xlsx.js path/to/customers.json
//
// It stops if the Excel file already has customers. The computed fields of
// the old file (status, nextServiceDate, nextReminderDate) are not copied:
// the app computes them on each read.

import fs from 'fs/promises';
import { dataFile } from '../lib/paths.js';
import { readData, writeData } from '../lib/store.js';

const source = process.argv[2];
if (!source) {
  console.error('Usage: node tools/json-to-xlsx.js path/to/customers.json');
  process.exit(1);
}

const old = JSON.parse(await fs.readFile(source, 'utf-8'));
const current = await readData();
if (current.customers.length || current.problems.length) {
  console.error(`The Excel file already has rows: ${dataFile()}`);
  console.error('Nothing was changed.');
  process.exit(1);
}

await writeData({
  ...current,
  customers: (old.customers ?? []).map(c => ({ ...c, id: c.id ?? '' })),
  smsTemplate: typeof old.smsTemplate === 'string' ? old.smsTemplate : current.smsTemplate,
  smsPricePerSegment: typeof old.smsPricePerSegment === 'number' ? old.smsPricePerSegment : current.smsPricePerSegment,
  holidays: Array.isArray(old.holidays) ? old.holidays : current.holidays,
});

const data = await readData();
console.log(`Wrote ${dataFile()}`);
console.log(`${data.customers.length} customers load, ${data.problems.length} bad rows.`);
for (const p of data.problems) console.log(`  ${p.sheet}, row ${p.row}: ${p.reason}`);
