// Each test gets its own empty data folder through EGER_DATA_DIR.
// The tests use exceljs directly only to play the part of a person in Excel.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ExcelJS from 'exceljs';
import {
  DEFAULT_PRICE, DEFAULT_TEMPLATE, SHEETS, STATUS_NAMES, StoreError,
  assertWritable, isLockError, isLocked, readData, storeErrorOf, writeData,
} from '../lib/store.js';
import { backupDir, backupFile, dataDir, dataFile, lockFile } from '../lib/paths.js';
import { addDays, excelDateToText, localDateText, textToExcelDate } from '../lib/dates.js';
import { withComputed } from '../lib/reminders.js';

async function freshFolder(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'eger-store-'));
  process.env.EGER_DATA_DIR = dir;
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return dir;
}

function customer(n, extra = {}) {
  return {
    id: `c00${n}`,
    name: `Тест Клиент ${n}`,
    phone: `+35988000000${n}`,
    address: `ул. Тестова ${n}`,
    carModel: 'Тест Модел',
    carPlate: `PB000${n}TT`,
    lastServiceDate: '2026-01-15',
    smsSentAt: null,
    ...extra,
  };
}

function sample() {
  return {
    customers: [
      customer(1),
      customer(2, { lastServiceDate: '2024-02-29', smsSentAt: '2026-03-19T21:21:01' }),
      customer(3, { address: '', lastServiceDate: '2026-03-29' }),
    ],
    smsTemplate: 'Тест {{carPlate}} {{serviceDate}}',
    smsPricePerSegment: 0.2,
    weeklyDaysOff: [0, 1],
    holidays: ['2026-12-25', '2026-01-01', '2026-03-03'],
    officialHolidays: [],
    holidayCheckDate: null,
  };
}

/** Change the file the way a person does in Excel. */
async function editInExcel(change) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(dataFile());
  await change(wb);
  await wb.xlsx.writeFile(dataFile());
}

function columnOf(ws, header) {
  let found = 0;
  ws.getRow(1).eachCell((cell, n) => { if (cell.value === header) found = n; });
  assert.ok(found, `column ${header} exists`);
  return found;
}

const withoutProblems = ({ problems, ...rest }) => rest;

test('a missing file is created with all sheets and headers', async t => {
  await freshFolder(t);
  const data = await readData();
  assert.deepEqual(data.customers, []);
  assert.equal(data.smsTemplate, DEFAULT_TEMPLATE);
  assert.equal(data.smsPricePerSegment, DEFAULT_PRICE);
  assert.deepEqual(data.weeklyDaysOff, [0, 1]);
  assert.deepEqual(data.holidays, []);
  assert.deepEqual(data.problems, []);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(dataFile());
  assert.deepEqual(wb.worksheets.map(ws => ws.name),
    [SHEETS.customers, SHEETS.settings, SHEETS.holidays, SHEETS.officialHolidays]);
  const headers = wb.getWorksheet(SHEETS.customers).getRow(1).values.slice(1);
  assert.deepEqual(headers, ['ID', 'Име', 'Телефон', 'Адрес', 'Автомобил', 'Рег. номер',
    'Последен преглед', 'SMS изпратен на', 'Следващ преглед', 'Напомняне на', 'Статус']);
});

// The computed columns are for the eyes of the staff only (specs D31).
test('a read does not give the computed columns as data', async t => {
  await freshFolder(t);
  await writeData({ ...sample(), customers: [customer(1, {
    nextServiceDate: '2027-01-15', nextReminderDate: '2027-01-08', status: 'pending',
  })] });
  const data = await readData();
  assert.deepEqual(Object.keys(data.customers[0]).sort(), ['address', 'carModel', 'carPlate',
    'id', 'lastServiceDate', 'name', 'phone', 'smsSentAt']);
});

test('round trip: write then read gives the same data', async t => {
  await freshFolder(t);
  await writeData(sample());
  const first = await readData();
  assert.deepEqual(withoutProblems(first), sample());
  assert.deepEqual(first.problems, []);

  // A second write of what was read changes nothing.
  await writeData(first);
  assert.deepEqual(withoutProblems(await readData()), sample());
});

test('the file holds real Excel types: text phone, date cells', async t => {
  await freshFolder(t);
  await writeData(sample());
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(dataFile());
  const ws = wb.getWorksheet(SHEETS.customers);
  const phone = ws.getRow(2).getCell(columnOf(ws, 'Телефон'));
  assert.equal(phone.value, '+359880000001');
  assert.equal(phone.numFmt, '@');
  const last = ws.getRow(2).getCell(columnOf(ws, 'Последен преглед'));
  assert.ok(last.value instanceof Date);
  assert.ok(wb.getWorksheet(SHEETS.holidays).getRow(2).getCell(1).value instanceof Date);
  const settings = wb.getWorksheet(SHEETS.settings);
  const keys = settings.getColumn(1).values.filter(Boolean);
  assert.ok(keys.includes('Почивни дни от седмицата'));
});

test('add, edit and delete change the file', async t => {
  await freshFolder(t);
  await writeData(sample());
  const data = await readData();
  data.customers = data.customers.filter(c => c.id !== 'c001');
  data.customers[0].name = 'Ново Име';
  data.customers.push(customer(4, { id: '' }));
  await writeData(data);

  const after = await readData();
  assert.deepEqual(after.customers.map(c => c.name), ['Ново Име', 'Тест Клиент 3', 'Тест Клиент 4']);
  assert.match(after.customers[2].id, /^c[0-9a-f]{10}$/);
  assert.deepEqual(after.problems, []);
});

test('a hand edit in Excel shows on the next read', async t => {
  await freshFolder(t);
  await writeData(sample());
  await editInExcel(wb => {
    const ws = wb.getWorksheet(SHEETS.customers);
    ws.getRow(2).getCell(columnOf(ws, 'Име')).value = 'Редактиран на ръка';
    // A person types the date as text in the Bulgarian form.
    ws.getRow(2).getCell(columnOf(ws, 'Последен преглед')).value = '5.3.2026';
    wb.getWorksheet(SHEETS.holidays).addRow([new Date(Date.UTC(2027, 0, 1))]);
    wb.getWorksheet(SHEETS.settings).getRow(4).getCell(2).value = 'Неделя, събота';
  });
  const data = await readData();
  assert.equal(data.customers[0].name, 'Редактиран на ръка');
  assert.equal(data.customers[0].lastServiceDate, '2026-03-05');
  assert.ok(data.holidays.includes('2027-01-01'));
  assert.deepEqual(data.weeklyDaysOff, [0, 6]);
  assert.deepEqual(data.problems, []);
});

test('a bad row is reported, the good rows load, and a write keeps the bad row', async t => {
  await freshFolder(t);
  await writeData(sample());
  await editInExcel(wb => {
    const ws = wb.getWorksheet(SHEETS.customers);
    ws.getRow(3).getCell(columnOf(ws, 'Телефон')).value = null;          // missing phone
    ws.getRow(4).getCell(columnOf(ws, 'Последен преглед')).value = 'утре'; // bad date
    ws.getRow(4).getCell(columnOf(ws, 'Телефон')).value = 359880000003;   // Excel made it a number
  });

  const data = await readData();
  assert.deepEqual(data.customers.map(c => c.id), ['c001']);
  assert.equal(data.problems.length, 2);
  assert.deepEqual(data.problems.map(p => [p.sheet, p.row]), [[SHEETS.customers, 3], [SHEETS.customers, 4]]);
  assert.match(data.problems[0].reason, /липсва телефон/);
  assert.match(data.problems[1].reason, /телефонът/);
  assert.match(data.problems[1].reason, /невалидна дата/);

  // The dashboard saves. The two bad rows must still be in the file.
  data.customers[0].name = 'Променен';
  await writeData(data);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(dataFile());
  const ws = wb.getWorksheet(SHEETS.customers);
  assert.equal(ws.getRow(2).getCell(columnOf(ws, 'Име')).value, 'Променен');
  assert.equal(ws.getRow(3).getCell(columnOf(ws, 'Име')).value, 'Тест Клиент 2');
  assert.equal(ws.getRow(4).getCell(columnOf(ws, 'Последен преглед')).value, 'утре');
  assert.equal((await readData()).problems.length, 2);
});

test('a bad setting and a bad holiday are reported and not overwritten', async t => {
  await freshFolder(t);
  await writeData(sample());
  await editInExcel(wb => {
    wb.getWorksheet(SHEETS.settings).getRow(3).getCell(2).value = 'евтино';
    wb.getWorksheet(SHEETS.settings).getRow(4).getCell(2).value = 'неделя, петак';
    wb.getWorksheet(SHEETS.holidays).addRow(['Коледа']);
  });
  const data = await readData();
  assert.equal(data.smsPricePerSegment, DEFAULT_PRICE);
  assert.deepEqual(data.weeklyDaysOff, [0, 1]);
  assert.deepEqual(data.problems.map(p => p.sheet), [SHEETS.settings, SHEETS.settings, SHEETS.holidays]);
  // A bad setting is not skipped: the default value is in use. A bad holiday is skipped.
  assert.deepEqual(data.problems.map(p => p.usesDefault === true), [true, true, false]);

  await writeData(data);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(dataFile());
  assert.equal(wb.getWorksheet(SHEETS.settings).getRow(3).getCell(2).value, 'евтино');
  assert.equal(wb.getWorksheet(SHEETS.holidays).getRow(5).getCell(1).value, 'Коледа');
});

test('a price with a comma is read as a number', async t => {
  await freshFolder(t);
  await writeData(sample());
  await editInExcel(wb => { wb.getWorksheet(SHEETS.settings).getRow(3).getCell(2).value = '0,15'; });
  const data = await readData();
  assert.equal(data.smsPricePerSegment, 0.15);
  assert.deepEqual(data.problems, []);
});

test('a missing column stops the load with a clear message', async t => {
  await freshFolder(t);
  await writeData(sample());
  await editInExcel(wb => {
    const ws = wb.getWorksheet(SHEETS.customers);
    ws.spliceColumns(columnOf(ws, 'Телефон'), 1);
  });
  await assert.rejects(readData(), err => {
    assert.ok(err instanceof StoreError);
    assert.equal(err.code, 'MISSING_COLUMN');
    assert.match(err.message, /Телефон/);
    return true;
  });
});

test('a missing customer sheet stops the load with a clear message', async t => {
  await freshFolder(t);
  await writeData(sample());
  await editInExcel(wb => { wb.getWorksheet(SHEETS.customers).name = 'Sheet1'; });
  await assert.rejects(readData(), err => err instanceof StoreError && err.code === 'MISSING_SHEET');
});

test('columns can be in another order', async t => {
  await freshFolder(t);
  await writeData(sample());
  await editInExcel(wb => {
    const ws = wb.getWorksheet(SHEETS.customers);
    const a = columnOf(ws, 'Име'), b = columnOf(ws, 'Автомобил');
    ws.eachRow(row => {
      const keep = row.getCell(a).value;
      row.getCell(a).value = row.getCell(b).value;
      row.getCell(b).value = keep;
    });
  });
  const data = await readData();
  assert.equal(data.customers[0].name, 'Тест Клиент 1');
  assert.equal(data.customers[0].carModel, 'Тест Модел');
});

test('duplicate ID: the second row gets a new ID, and it stays', async t => {
  await freshFolder(t);
  await writeData(sample());
  await editInExcel(wb => {
    const ws = wb.getWorksheet(SHEETS.customers);
    ws.getRow(3).getCell(columnOf(ws, 'ID')).value = 'c001'; // copy-paste of row 2
  });
  const first = await readData();
  assert.equal(first.customers[0].id, 'c001');
  assert.notEqual(first.customers[1].id, 'c001');
  assert.equal(new Set(first.customers.map(c => c.id)).size, 3);
  const second = await readData();
  assert.deepEqual(second.customers.map(c => c.id), first.customers.map(c => c.id));
});

test('a hand-made row with no ID gets one, and it stays', async t => {
  await freshFolder(t);
  await writeData(sample());
  await editInExcel(wb => {
    wb.getWorksheet(SHEETS.customers).addRow(
      ['', 'На Ръка', '+359880000009', '', 'Модел', 'PB 0009 TT', new Date(Date.UTC(2026, 4, 6)), null, '']);
  });
  const first = await readData();
  const made = first.customers.at(-1);
  assert.equal(made.name, 'На Ръка');
  assert.equal(made.lastServiceDate, '2026-05-06');
  assert.equal(made.carPlate, 'PB0009TT');
  assert.ok(made.id);
  assert.equal((await readData()).customers.at(-1).id, made.id);
});

test('a plate typed in Excel with spaces and small letters loads as one word in capitals', async t => {
  await freshFolder(t);
  await writeData(sample());
  await editInExcel(wb => {
    const ws = wb.getWorksheet(SHEETS.customers);
    ws.getRow(2).getCell(columnOf(ws, 'Рег. номер')).value = ' pb 1234  ab ';
  });
  assert.equal((await readData()).customers[0].carPlate, 'PB1234AB');
});

test('a delete moves a whole row, so a column added by the staff stays with its customer', async t => {
  await freshFolder(t);
  await writeData(sample());
  await editInExcel(wb => {
    const ws = wb.getWorksheet(SHEETS.customers);
    ws.getRow(1).getCell(12).value = 'Бележки';
    ws.getRow(2).getCell(12).value = 'бележка 1';
    ws.getRow(3).getCell(12).value = 'бележка 2';
    ws.getRow(4).getCell(12).value = 'бележка 3';
  });
  const data = await readData();
  data.customers = data.customers.filter(c => c.id !== 'c002');
  await writeData(data);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(dataFile());
  const ws = wb.getWorksheet(SHEETS.customers);
  assert.equal(ws.getRow(1).getCell(12).value, 'Бележки');
  assert.deepEqual([2, 3].map(n => [ws.getRow(n).getCell(1).value, ws.getRow(n).getCell(12).value]),
    [['c001', 'бележка 1'], ['c003', 'бележка 3']]);
  assert.equal(ws.getRow(4).getCell(1).value, null);
  assert.equal((await readData()).customers.length, 2);
});

test('locked file: a write gives the clear message and the file does not change', async t => {
  await freshFolder(t);
  await writeData(sample());
  const before = await fs.readFile(dataFile());
  await fs.writeFile(lockFile(), ''); // Excel makes this file while the workbook is open

  assert.equal(await isLocked(), true);
  const check = err => {
    assert.ok(err instanceof StoreError);
    assert.equal(err.code, 'LOCKED');
    assert.match(err.message, /Затворете файла в Excel и опитайте отново/);
    return true;
  };
  await assert.rejects(assertWritable(), check);
  const data = sample();
  data.customers.pop();
  await assert.rejects(writeData(data), check);
  assert.deepEqual(await fs.readFile(dataFile()), before);

  // A read still works while Excel has the file.
  assert.equal((await readData()).customers.length, 3);

  await fs.rm(lockFile());
  assert.equal(await isLocked(), false);
  await writeData(data);
  assert.equal((await readData()).customers.length, 2);
});

test('locked file: a new ID is not saved, and the read says so', async t => {
  await freshFolder(t);
  await writeData(sample());
  await editInExcel(wb => { wb.getWorksheet(SHEETS.customers).getRow(2).getCell(1).value = null; });
  await fs.writeFile(lockFile(), '');
  const data = await readData();
  assert.equal(data.customers.length, 3);
  assert.equal(data.problems.length, 1);
  assert.match(data.problems[0].reason, /Затворете файла в Excel/);
});

test('isLockError knows the Windows codes', () => {
  assert.equal(isLockError({ code: 'EBUSY' }, 'win32'), true);
  assert.equal(isLockError({ code: 'EPERM' }, 'win32'), true);
  assert.equal(isLockError({ code: 'EACCES' }, 'win32'), true);
  assert.equal(isLockError({ code: 'ENOENT' }, 'win32'), false);
  assert.equal(isLockError(null, 'win32'), false);
});

// Bug (ch09, Mac build): macOS privacy blocks the Documents folder with EPERM.
// Excel on a Mac does not lock a file, so this is no "close Excel" case.
test('on a Mac, EPERM / EACCES is no access, not "open in Excel"', () => {
  assert.equal(isLockError({ code: 'EPERM' }, 'darwin'), false);
  assert.equal(isLockError({ code: 'EACCES' }, 'darwin'), false);
  const err = storeErrorOf({ code: 'EPERM' }, 'darwin');
  assert.equal(err.code, 'NO_ACCESS');
  assert.match(err.message, /няма достъп/);
  assert.doesNotMatch(err.message, /Excel/);
  assert.equal(storeErrorOf({ code: 'EPERM' }, 'win32').code, 'LOCKED');
  assert.equal(storeErrorOf({ code: 'ENOENT' }, 'darwin'), null);
});

test('a write leaves no temp file', async t => {
  await freshFolder(t);
  await writeData(sample());
  await writeData(sample());
  const names = (await fs.readdir(dataDir())).map(n => n.normalize('NFC')).sort();
  assert.deepEqual(names, ['backups', 'клиенти.xlsx']);
});

test('backup: one copy before the first write of the day', async t => {
  await freshFolder(t);
  await readData();                        // makes the empty file, no backup yet
  await assert.rejects(fs.access(backupDir()));
  await writeData(sample());               // first write today → backup of the empty file
  const today = backupFile(localDateText());
  const firstCopy = await fs.readFile(today);
  const data = sample();
  data.customers.pop();
  await writeData(data);                   // second write today → the backup stays
  assert.deepEqual(await fs.readFile(today), firstCopy);
  assert.equal((await fs.readdir(backupDir())).length, 1);
});

test('backup: only the last 30 stay', async t => {
  await freshFolder(t);
  await readData();
  await fs.mkdir(backupDir(), { recursive: true });
  const today = localDateText();
  for (let i = 1; i <= 35; i++) await fs.writeFile(backupFile(addDays(today, -i)), 'old');
  await fs.writeFile(path.join(backupDir(), 'бележки.txt'), 'not a backup');
  await writeData(sample());

  const names = (await fs.readdir(backupDir())).map(n => n.normalize('NFC')).sort();
  assert.equal(names.filter(n => n.endsWith('.xlsx')).length, 30);
  assert.ok(names.includes(path.basename(today && backupFile(today)).normalize('NFC')));
  assert.ok(!names.includes(path.basename(backupFile(addDays(today, -35))).normalize('NFC')));
  assert.ok(names.includes('бележки.txt'));
});

// Until 2026-11-15 the file had a column "Активен" (Да / Не). The staff did
// not use it. A file from before must load, and the app must not delete the
// column: the staff own the file.
test('an old file with the column "Активен" loads: "Не" has no effect and the column stays', async t => {
  await freshFolder(t);
  await writeData(sample());
  await editInExcel(wb => {
    const ws = wb.getWorksheet(SHEETS.customers);
    ws.getRow(1).getCell(12).value = 'Активен';
    ws.getRow(2).getCell(12).value = 'Не';
    ws.getRow(3).getCell(12).value = 'нещо друго';
  });
  const data = await readData();
  assert.deepEqual(data.problems, []);
  assert.deepEqual(withoutProblems(data), sample());

  await writeData(data);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(dataFile());
  const ws = wb.getWorksheet(SHEETS.customers);
  assert.equal(ws.getRow(2).getCell(columnOf(ws, 'Активен')).value, 'Не');
});

// One plate = one row (specs D28).
test('a second row with the same plate is a bad row; the first row loads and both stay in the file', async t => {
  await freshFolder(t);
  await writeData(sample());
  let firstPlate;
  await editInExcel(wb => {
    const ws = wb.getWorksheet(SHEETS.customers);
    const col = columnOf(ws, 'Рег. номер');
    firstPlate = String(ws.getRow(2).getCell(col).value);
    // Typed by hand: small letters and a space.
    ws.getRow(4).getCell(col).value = `${firstPlate.slice(0, 2).toLowerCase()} ${firstPlate.slice(2)}`;
  });

  const data = await readData();
  assert.deepEqual(data.customers.map(c => c.id), ['c001', 'c002']);
  assert.deepEqual(data.problems.map(p => [p.sheet, p.row]), [[SHEETS.customers, 4]]);
  assert.match(data.problems[0].reason, new RegExp(`рег\\. номер ${firstPlate} вече е на ред 2`));

  await writeData(data);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(dataFile());
  const ws = wb.getWorksheet(SHEETS.customers);
  assert.equal(ws.getRow(4).getCell(columnOf(ws, 'Име')).value, 'Тест Клиент 3');
});

// ─── Computed columns in the file (specs D31) ────────────────────────────────

const COMPUTED_HEADERS = ['Следващ преглед', 'Напомняне на', 'Статус'];

/** One customer for each status, with dates around today. */
function statusSample() {
  const today = localDateText();
  return {
    ...sample(),
    holidays: [],
    customers: [
      customer(1, { lastServiceDate: addDays(today, -800) }),                                  // overdue
      customer(2, { lastServiceDate: addDays(today, -200), smsSentAt: `${today}T10:00:00` }),  // sent
      customer(3, { lastServiceDate: addDays(today, -362) }),                                  // due
      customer(4, { lastServiceDate: addDays(today, -30) }),                                   // pending
    ],
  };
}

/** The computed cells of the file, row by row: [next, reminder, status]. */
async function computedInFile() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(dataFile());
  const ws = wb.getWorksheet(SHEETS.customers);
  const [next, reminder, status] = COMPUTED_HEADERS.map(h => columnOf(ws, h));
  const rows = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const date = col => {
      const v = row.getCell(col).value;
      return v instanceof Date ? excelDateToText(v) : v;
    };
    rows.push([date(next), date(reminder), row.getCell(status).value]);
  });
  return rows;
}

function computedWanted(data) {
  const today = localDateText();
  return data.customers
    .map(c => withComputed(c, data, today))
    .map(c => [c.nextServiceDate, c.nextReminderDate, STATUS_NAMES[c.status]]);
}

test('a write puts the next inspection, the reminder day and the status into the file', async t => {
  await freshFolder(t);
  const data = statusSample();
  await writeData(data);
  const rows = await computedInFile();
  assert.deepEqual(rows, computedWanted(data));
  assert.deepEqual(rows.map(r => r[2]), ['Просрочен', 'Изпратен', 'За днес', 'Очаква']);

  // Real date cells, grey like the other columns of the app.
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(dataFile());
  const ws = wb.getWorksheet(SHEETS.customers);
  const cell = ws.getRow(2).getCell(columnOf(ws, 'Напомняне на'));
  assert.ok(cell.value instanceof Date);
  assert.equal(cell.numFmt, 'dd.mm.yyyy');
  assert.equal(cell.fill.fgColor.argb, 'FFE7E6E6');
});

test('a read with good computed columns does not write the file', async t => {
  await freshFolder(t);
  await writeData(statusSample());
  const before = await fs.readFile(dataFile());
  await readData();
  await readData();
  assert.deepEqual(await fs.readFile(dataFile()), before);
});

test('an old file with no computed columns gets them on the first read, after the staff columns', async t => {
  await freshFolder(t);
  const data = statusSample();
  await writeData(data);
  await editInExcel(wb => {
    const ws = wb.getWorksheet(SHEETS.customers);
    ws.spliceColumns(columnOf(ws, 'Следващ преглед'), 3);
    ws.getRow(1).getCell(9).value = 'Бележки';
    ws.getRow(2).getCell(9).value = 'бележка 1';
  });

  const read = await readData();
  assert.deepEqual(read.problems, []);
  assert.deepEqual(withoutProblems(read), data);
  assert.deepEqual(await computedInFile(), computedWanted(data));

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(dataFile());
  const ws = wb.getWorksheet(SHEETS.customers);
  assert.deepEqual(ws.getRow(1).values.slice(9), ['Бележки', ...COMPUTED_HEADERS]);
  assert.equal(ws.getRow(2).getCell(9).value, 'бележка 1');
});

test('old computed values (a new day) are made right by the next read', async t => {
  await freshFolder(t);
  const data = statusSample();
  await writeData(data);
  // The file as it was left on a day before: other status, other reminder day.
  await editInExcel(wb => {
    const ws = wb.getWorksheet(SHEETS.customers);
    ws.getRow(4).getCell(columnOf(ws, 'Статус')).value = 'Очаква';
    ws.getRow(5).getCell(columnOf(ws, 'Напомняне на')).value = textToExcelDate('2020-01-01');
  });
  assert.notDeepEqual(await computedInFile(), computedWanted(data));
  await readData();
  assert.deepEqual(await computedInFile(), computedWanted(data));
});

test('a new inspection date typed in Excel moves the computed columns on the next read', async t => {
  await freshFolder(t);
  const data = statusSample();
  await writeData(data);
  const today = localDateText();
  await editInExcel(wb => {
    const ws = wb.getWorksheet(SHEETS.customers);
    ws.getRow(2).getCell(columnOf(ws, 'Последен преглед')).value = textToExcelDate(today);
  });
  const read = await readData();
  assert.equal(read.customers[0].lastServiceDate, today);
  const rows = await computedInFile();
  assert.deepEqual(rows, computedWanted(read));
  assert.equal(rows[0][2], 'Очаква');
});

test('locked file: old computed columns stay, the read works and the file does not change', async t => {
  await freshFolder(t);
  await writeData(statusSample());
  await editInExcel(wb => {
    const ws = wb.getWorksheet(SHEETS.customers);
    ws.getRow(2).getCell(columnOf(ws, 'Статус')).value = 'Очаква';
  });
  const before = await fs.readFile(dataFile());
  await fs.writeFile(lockFile(), '');

  const data = await readData();
  assert.equal(data.customers.length, 4);
  assert.deepEqual(data.problems, []);
  assert.deepEqual(await fs.readFile(dataFile()), before);

  // Excel is closed: the next read repairs the column.
  await fs.rm(lockFile());
  await readData();
  assert.equal((await computedInFile())[0][2], 'Просрочен');
});

test('a bad row keeps its computed cells as they are', async t => {
  await freshFolder(t);
  await writeData(statusSample());
  await editInExcel(wb => {
    const ws = wb.getWorksheet(SHEETS.customers);
    ws.getRow(3).getCell(columnOf(ws, 'Телефон')).value = null;
    ws.getRow(3).getCell(columnOf(ws, 'Статус')).value = 'на ръка';
  });
  const data = await readData();
  assert.equal(data.problems.length, 1);
  await writeData(data);
  assert.equal((await computedInFile())[1][2], 'на ръка');
});

test('two saves at the same time: both end, and the file is good', async t => {
  await freshFolder(t);
  await writeData(statusSample());
  const a = statusSample();
  a.customers[0].name = 'Първи';
  const b = statusSample();
  b.customers[0].name = 'Втори';
  await Promise.all([writeData(a), writeData(b)]);
  const data = await readData();
  assert.equal(data.customers[0].name, 'Втори');
  assert.deepEqual(data.problems, []);
});
