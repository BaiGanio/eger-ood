// The only code that touches the Excel file (repository pattern).
//
// The file is the one store, and the staff also edit it by hand. So:
//  - a read checks every row and reports the bad ones, it never crashes;
//  - a write changes the existing workbook in place. Rows that the app did
//    not load (bad rows) and columns that the staff added stay as they are;
//  - a write goes to a temp file first, then a rename puts it over the real
//    file. A power cut cannot leave half a file;
//  - three grey columns show the computed values to the staff (specs D31):
//    "Следващ преглед", "Напомняне на", "Статус". The app writes them on each
//    save, and a read writes them again when they are old (a new day). The
//    app never reads them as data.

import ExcelJS from 'exceljs';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import {
  excelDateTimeToText, excelDateToText, isDateText, localDateText,
  momentToExcelDateTime, textToExcelDate, toDateText,
} from './dates.js';
import {
  backupDir, backupFile, dataDir, dataFile, lockFile, pendingSendsFile, DATA_FILE_NAME,
} from './paths.js';
import { normalizePlate } from '../public/sms-text.js';
// One phone rule for a row of the Excel file and for a request.
import { PHONE, plateKey } from './validate.js';
import { withComputed } from './reminders.js';

// ─── Defaults (their one home) ───────────────────────────────────────────────

// Cyrillic is billed as UCS-2, so one SMS is 70 characters. This default is a
// 57 characters with an 8-character plate, whatever the customer's name, i.e.
// one message.
export const DEFAULT_TEMPLATE =
  'ЕГЕР ООД: ГТП на {{номер}} изтича {{дата}}. Запазете час';
export const DEFAULT_PRICE = 0.1466;          // Twilio price per segment to a BG number
export const DEFAULT_WEEKLY_DAYS_OFF = [0, 1]; // Sunday, Monday (specs D7)

const KEEP_BACKUPS = 30;

// ─── Layout of the workbook ──────────────────────────────────────────────────

export const SHEETS = {
  customers: 'Клиенти',
  settings: 'Настройки',
  holidays: 'Почивни дни',
  // Filled by the app (holiday-check.js). The staff do not need to touch it.
  officialHolidays: 'Официални празници',
};

// `appOnly` columns get a grey fill, so the staff see what not to touch.
const CUSTOMER_COLUMNS = [
  { field: 'id',              header: 'ID',               width: 16, appOnly: true },
  { field: 'name',            header: 'Име',              width: 28 },
  { field: 'phone',           header: 'Телефон',          width: 18, numFmt: '@' },
  { field: 'address',         header: 'Адрес',            width: 32 },
  { field: 'carModel',        header: 'Автомобил',        width: 22 },
  { field: 'carPlate',        header: 'Рег. номер',       width: 14 },
  { field: 'lastServiceDate', header: 'Последен преглед', width: 18, numFmt: 'dd.mm.yyyy' },
  { field: 'smsSentAt',       header: 'SMS изпратен на',  width: 20, numFmt: 'dd.mm.yyyy hh:mm', appOnly: true },
  // Computed (specs D31): a copy of what the dashboard shows. The file can
  // have none of them (an old file): the app adds them at the end.
  { field: 'nextServiceDate',  header: 'Следващ преглед', width: 18, numFmt: 'dd.mm.yyyy', appOnly: true, computed: true },
  { field: 'nextReminderDate', header: 'Напомняне на',    width: 18, numFmt: 'dd.mm.yyyy', appOnly: true, computed: true },
  { field: 'status',           header: 'Статус',          width: 14, appOnly: true, computed: true },
];
const STORED_COLUMNS = CUSTOMER_COLUMNS.filter(c => !c.computed);
const COMPUTED_COLUMNS = CUSTOMER_COLUMNS.filter(c => c.computed);

// The same words as the status badges of the dashboard.
export const STATUS_NAMES = {
  overdue: 'Просрочен',
  sent: 'Изпратен',
  due: 'За днес',
  pending: 'Очаква',
};

const SETTING_KEYS = {
  smsTemplate: 'SMS шаблон',
  smsPricePerSegment: 'Цена за 1 SMS',
  weeklyDaysOff: 'Почивни дни от седмицата',
  holidayCheckDate: 'Последна проверка на празниците',
};

// Index = Date.getDay() number.
const DAY_NAMES = ['неделя', 'понеделник', 'вторник', 'сряда', 'четвъртък', 'петък', 'събота'];
const GREY = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } };

// ─── Errors ──────────────────────────────────────────────────────────────────

/** An error with a clear Bulgarian message that the user can see. */
export class StoreError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'StoreError';
    this.code = code; // 'LOCKED' | 'NO_ACCESS' | 'MISSING_SHEET' | 'MISSING_COLUMN' | 'UNREADABLE'
  }
}

const LOCKED_MESSAGE =
  `Файлът „${DATA_FILE_NAME}“ е отворен в Excel. Затворете файла в Excel и опитайте отново.`;

const ACCESS_CODES = ['EPERM', 'EACCES'];

/**
 * Windows gives these codes when another program holds the file. On a Mac,
 * Excel does not lock the file, and EPERM / EACCES mean no access (example:
 * the privacy rules of macOS for the Documents folder).
 */
export function isLockError(err, platform = process.platform) {
  if (!err) return false;
  if (err.code === 'EBUSY') return true;
  return platform === 'win32' && ACCESS_CODES.includes(err.code);
}

function noAccessMessage() {
  return `Програмата няма достъп до папката „${dataDir()}“. ` +
    'На Mac: Системни настройки → Поверителност и сигурност → Файлове и папки → ' +
    'разрешете „Документи“ за Terminal. Стартирайте програмата отново.';
}

/** The clear StoreError for a file error, or null when it is another error. */
export function storeErrorOf(err, platform = process.platform) {
  if (isLockError(err, platform)) return new StoreError('LOCKED', LOCKED_MESSAGE);
  if (err && ACCESS_CODES.includes(err.code)) return new StoreError('NO_ACCESS', noAccessMessage());
  return null;
}

// ─── Small helpers ───────────────────────────────────────────────────────────

export function generateId(taken = new Set()) {
  let id;
  do { id = 'c' + crypto.randomBytes(5).toString('hex'); } while (taken.has(id));
  return id;
}

/** The plain value of a cell: formula → its result, rich text → text. */
function plainValue(cell) {
  const v = cell.value;
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'object') {
    if (Array.isArray(v.richText)) return v.richText.map(part => part.text).join('');
    if ('result' in v) return v.result ?? null;
    if ('text' in v) return v.text;
    return null; // an error cell, or a formula with no result yet
  }
  return v;
}

function cellText(cell) {
  const v = plainValue(cell);
  if (v === null || v instanceof Date) return '';
  return String(v).trim();
}

function sameText(a, b) {
  return a.trim().toLocaleLowerCase('bg') === b.trim().toLocaleLowerCase('bg');
}

/** Date cell, "YYYY-MM-DD" or "DD.MM.YYYY" text → "YYYY-MM-DD". Else null. */
function readDate(cell) {
  const v = plainValue(cell);
  if (v instanceof Date) return excelDateToText(v);
  if (typeof v !== 'string') return null;
  const text = v.trim();
  if (isDateText(text)) return text;
  const m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(text);
  if (!m) return null;
  const iso = toDateText(Number(m[3]), Number(m[2]), Number(m[1]));
  return isDateText(iso) ? iso : null;
}

/** Date-time cell or text → "YYYY-MM-DDTHH:mm:ss". Else null. */
function readDateTime(cell) {
  const v = plainValue(cell);
  if (v instanceof Date) return excelDateTimeToText(v);
  if (typeof v !== 'string') return null;
  const asCell = momentToExcelDateTime(v.trim());
  return asCell ? excelDateTimeToText(asCell) : null;
}

function isBlank(cell) {
  const v = plainValue(cell);
  return v === null || (typeof v === 'string' && v.trim() === '');
}

// ─── New workbook ────────────────────────────────────────────────────────────

function styleHeader(ws) {
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
}

function addCustomerSheet(wb) {
  const ws = wb.addWorksheet(SHEETS.customers);
  ws.columns = CUSTOMER_COLUMNS.map(c => ({ header: c.header, key: c.field, width: c.width }));
  CUSTOMER_COLUMNS.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    // A column format also covers the cells of rows that the staff add later.
    // "@" = text: Excel then keeps the "+" of a phone number.
    if (c.numFmt) col.numFmt = c.numFmt;
    if (c.appOnly) col.fill = GREY;
  });
  styleHeader(ws);
  return ws;
}

function addSettingsSheet(wb) {
  const ws = wb.addWorksheet(SHEETS.settings);
  ws.columns = [
    { header: 'Настройка', width: 30 },
    { header: 'Стойност', width: 80 },
  ];
  styleHeader(ws);
  ws.addRow([SETTING_KEYS.smsTemplate, DEFAULT_TEMPLATE]);
  ws.addRow([SETTING_KEYS.smsPricePerSegment, DEFAULT_PRICE]);
  ws.addRow([SETTING_KEYS.weeklyDaysOff, formatWeeklyDaysOff(DEFAULT_WEEKLY_DAYS_OFF)]);
  return ws;
}

function addHolidaySheet(wb) {
  const ws = wb.addWorksheet(SHEETS.holidays);
  ws.columns = [{ header: 'Дата', width: 16 }];
  ws.getColumn(1).numFmt = 'dd.mm.yyyy';
  styleHeader(ws);
  return ws;
}

function addOfficialSheet(wb) {
  const ws = wb.addWorksheet(SHEETS.officialHolidays);
  ws.columns = [{ header: 'Дата', width: 16 }, { header: 'Име', width: 40 }];
  ws.getColumn(1).numFmt = 'dd.mm.yyyy';
  // Grey, like the app columns of the customer sheet: the app writes it.
  ws.getColumn(1).fill = GREY;
  ws.getColumn(2).fill = GREY;
  styleHeader(ws);
  return ws;
}

function newWorkbook() {
  const wb = new ExcelJS.Workbook();
  addCustomerSheet(wb);
  addSettingsSheet(wb);
  addHolidaySheet(wb);
  addOfficialSheet(wb);
  return wb;
}

// ─── Read: workbook → data ───────────────────────────────────────────────────

function findCustomerColumns(ws) {
  const cols = {};
  ws.getRow(1).eachCell((cell, colNumber) => {
    const header = cellText(cell);
    const known = CUSTOMER_COLUMNS.find(c => sameText(c.header, header));
    if (known && !cols[known.field]) cols[known.field] = colNumber;
  });
  // A computed column can be missing: the app adds it (addMissingComputedColumns).
  const missing = STORED_COLUMNS.filter(c => !cols[c.field]).map(c => `„${c.header}“`);
  if (missing.length) {
    throw new StoreError('MISSING_COLUMN',
      `В лист „${SHEETS.customers}“ липсва колона ${missing.join(', ')}. ` +
      'Върнете заглавието на колоната в първия ред и презаредете.');
  }
  return cols;
}

/** One sheet row → `{ customer }` or `{ reasons }`. */
function readCustomerRow(row, cols) {
  const text = field => cellText(row.getCell(cols[field]));
  const reasons = [];

  const customer = {
    id: text('id'),
    name: text('name'),
    phone: text('phone').replace(/[\s-]/g, ''),
    address: text('address'),
    carModel: text('carModel'),
    carPlate: normalizePlate(text('carPlate')),
    lastServiceDate: null,
    smsSentAt: null,
  };

  if (!customer.name) reasons.push('липсва име');
  if (!customer.phone) reasons.push('липсва телефон');
  else if (!PHONE.test(customer.phone)) reasons.push('телефонът трябва да е текст във вида +359881234567');
  if (!customer.carModel) reasons.push('липсва автомобил');
  if (!customer.carPlate) reasons.push('липсва рег. номер');

  const lastCell = row.getCell(cols.lastServiceDate);
  if (isBlank(lastCell)) reasons.push('липсва дата на последен преглед');
  else {
    customer.lastServiceDate = readDate(lastCell);
    if (!customer.lastServiceDate) reasons.push('невалидна дата на последен преглед');
  }

  const sentCell = row.getCell(cols.smsSentAt);
  if (!isBlank(sentCell)) {
    customer.smsSentAt = readDateTime(sentCell);
    if (!customer.smsSentAt) reasons.push('невалидна дата в „SMS изпратен на“');
  }

  return reasons.length ? { reasons } : { customer };
}

// ─── Computed columns (specs D31) ────────────────────────────────────────────

/** What the three computed cells of a customer must show. */
function computedValues(customer, settings, today) {
  const c = withComputed(customer, settings, today);
  return {
    nextServiceDate: c.nextServiceDate,
    nextReminderDate: c.nextReminderDate,
    status: STATUS_NAMES[c.status],
  };
}

/** What the three computed cells of a row show now. */
function readComputedCells(row, cols) {
  const cell = field => (cols[field] ? row.getCell(cols[field]) : null);
  const date = field => (cell(field) ? readDate(cell(field)) : null);
  return {
    nextServiceDate: date('nextServiceDate'),
    nextReminderDate: date('nextReminderDate'),
    status: cell('status') ? cellText(cell('status')) : '',
  };
}

function writeComputedCells(ws, cols, rowNumber, values) {
  const row = ws.getRow(rowNumber);
  for (const { field, numFmt } of COMPUTED_COLUMNS) {
    const cell = row.getCell(cols[field]);
    cell.value = numFmt ? textToExcelDate(values[field]) : values[field];
    if (numFmt) cell.numFmt = numFmt;
    cell.fill = GREY;
  }
}

/** An old file has no computed columns. They go after the last column in use. */
function addMissingComputedColumns(ws, cols) {
  let last = ws.columnCount;
  ws.getRow(1).eachCell((cell, colNumber) => { last = Math.max(last, colNumber); });
  for (const c of COMPUTED_COLUMNS) {
    if (cols[c.field]) continue;
    const n = ++last;
    const header = ws.getRow(1).getCell(n);
    header.value = c.header;
    header.font = { bold: true };
    header.fill = GREY;
    ws.getColumn(n).width = c.width;
    cols[c.field] = n;
  }
}

/** True when a computed cell of the file shows another value than the app. */
function computedIsOld(layout, data, today) {
  const { cols, computedInFile } = layout;
  if (COMPUTED_COLUMNS.some(c => !cols[c.field])) return true;
  return data.customers.some(customer => {
    const have = computedInFile.get(customer.id);
    const want = computedValues(customer, data, today);
    return !have || COMPUTED_COLUMNS.some(c => have[c.field] !== want[c.field]);
  });
}

function readCustomers(wb, problems) {
  const ws = wb.getWorksheet(SHEETS.customers);
  if (!ws) {
    throw new StoreError('MISSING_SHEET',
      `Във файла „${DATA_FILE_NAME}“ липсва лист „${SHEETS.customers}“. Върнете името на листа и презаредете.`);
  }
  const cols = findCustomerColumns(ws);
  const customers = [];
  const rowById = new Map();   // id → row number, for the rows that loaded
  const fileIds = new Set();   // ids that are really in the file
  const newIds = new Map();    // id made in this read → row number
  const rowByPlate = new Map(); // plate (compare form) → row number
  const computedInFile = new Map(); // id → the computed cells of the row, as they are
  let lastRow = 1;

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    // A row with only computed cells is empty: the staff cleared the customer.
    if (STORED_COLUMNS.every(c => isBlank(row.getCell(cols[c.field])))) return;
    lastRow = rowNumber;

    const { customer, reasons } = readCustomerRow(row, cols);
    if (reasons) {
      problems.push({ sheet: SHEETS.customers, row: rowNumber, reason: reasons.join('; ') });
      return;
    }
    // One plate = one row (specs D28). The first row loads. A later row with
    // the same plate is a bad row: the staff must choose which one is right.
    const plate = plateKey(customer.carPlate);
    if (rowByPlate.has(plate)) {
      problems.push({
        sheet: SHEETS.customers, row: rowNumber,
        reason: `рег. номер ${customer.carPlate} вече е на ред ${rowByPlate.get(plate)}; ` +
          'един автомобил се записва само един път',
      });
      return;
    }
    rowByPlate.set(plate, rowNumber);
    // No ID (a row made by hand) or a copy of an ID above (copy-paste):
    // the row gets a new ID.
    if (!customer.id || rowById.has(customer.id)) {
      customer.id = generateId(new Set([...rowById.keys(), ...fileIds]));
      newIds.set(customer.id, rowNumber);
    } else {
      fileIds.add(customer.id);
    }
    rowById.set(customer.id, rowNumber);
    computedInFile.set(customer.id, readComputedCells(row, cols));
    customers.push(customer);
  });

  return { customers, layout: { ws, cols, rowById, fileIds, newIds, computedInFile, lastRow } };
}

function parsePrice(value) {
  if (typeof value === 'number') return value >= 0 ? value : null;
  if (typeof value !== 'string') return null;
  // Bulgarian Excel shows 0,1466.
  const n = Number(value.trim().replace(',', '.'));
  return value.trim() !== '' && Number.isFinite(n) && n >= 0 ? n : null;
}

function parseWeeklyDaysOff(text) {
  const days = [];
  for (const part of text.split(/[,;]/).map(s => s.trim()).filter(Boolean)) {
    const day = DAY_NAMES.findIndex(name => sameText(name, part));
    if (day === -1) return null;
    if (!days.includes(day)) days.push(day);
  }
  return days.sort((a, b) => a - b);
}

function formatWeeklyDaysOff(days) {
  return days.map(d => DAY_NAMES[d]).join(', ');
}

function readSettings(wb, problems) {
  const settings = {
    smsTemplate: DEFAULT_TEMPLATE,
    smsPricePerSegment: DEFAULT_PRICE,
    weeklyDaysOff: [...DEFAULT_WEEKLY_DAYS_OFF],
    holidayCheckDate: null,
  };
  const ws = wb.getWorksheet(SHEETS.settings);
  const rowByKey = {};
  let lastRow = 1;
  if (!ws) return { settings, layout: null };

  // `usesDefault`: the row is not skipped. The app works with the default
  // value, and the banner says so.
  const bad = (row, reason) => problems.push({ sheet: SHEETS.settings, row, reason, usesDefault: true });

  ws.eachRow((row, rowNumber) => {
    lastRow = rowNumber;
    const key = cellText(row.getCell(1));
    const field = Object.keys(SETTING_KEYS).find(f => sameText(SETTING_KEYS[f], key));
    if (!field || rowByKey[field]) return;
    rowByKey[field] = rowNumber;
    const valueCell = row.getCell(2);
    // An empty value means "use the default". It is not a problem.
    if (isBlank(valueCell)) return;

    if (field === 'smsTemplate') {
      settings.smsTemplate = cellText(valueCell);
    } else if (field === 'smsPricePerSegment') {
      const price = parsePrice(plainValue(valueCell));
      if (price === null) bad(rowNumber, `„${key}“ не е число. Използва се ${DEFAULT_PRICE}.`);
      else settings.smsPricePerSegment = price;
    } else if (field === 'holidayCheckDate') {
      // A bad value only means: check again.
      settings.holidayCheckDate = readDate(valueCell);
    } else {
      const days = parseWeeklyDaysOff(cellText(valueCell));
      if (days === null) {
        bad(rowNumber, `„${key}“: непознат ден. Пишете дните с думи, например „неделя, понеделник“. ` +
          'Използват се неделя и понеделник.');
      } else settings.weeklyDaysOff = days;
    }
  });

  return { settings, layout: { ws, rowByKey, lastRow } };
}

function readHolidays(wb, problems) {
  const ws = wb.getWorksheet(SHEETS.holidays);
  const holidays = [];
  if (!ws) return { holidays, layout: null };
  const rowsByDate = new Map();
  let lastRow = 1;

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // the header
    const cell = row.getCell(1);
    if (isBlank(cell)) return;
    lastRow = rowNumber;
    const date = readDate(cell);
    if (!date) {
      problems.push({ sheet: SHEETS.holidays, row: rowNumber, reason: 'невалидна дата' });
      return;
    }
    if (!rowsByDate.has(date)) { rowsByDate.set(date, []); holidays.push(date); }
    rowsByDate.get(date).push(rowNumber);
  });

  return { holidays, layout: { ws, rowsByDate, lastRow } };
}

// The app writes this sheet. A row that is not good is left out with no
// report: the next check writes the sheet again.
function readOfficialHolidays(wb) {
  const ws = wb.getWorksheet(SHEETS.officialHolidays);
  const list = [];
  if (!ws) return list;
  const seen = new Set();
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const date = readDate(row.getCell(1));
    if (!date || seen.has(date)) return;
    seen.add(date);
    list.push({ date, name: cellText(row.getCell(2)) });
  });
  return list.sort((a, b) => a.date.localeCompare(b.date));
}

function parse(wb) {
  const problems = [];
  const c = readCustomers(wb, problems);
  const s = readSettings(wb, problems);
  const h = readHolidays(wb, problems);
  const officialHolidays = readOfficialHolidays(wb);
  return {
    data: { customers: c.customers, ...s.settings, holidays: h.holidays, officialHolidays, problems },
    layout: { customers: c.layout, settings: s.layout, holidays: h.layout },
  };
}

// ─── Write: data → workbook ──────────────────────────────────────────────────

function writeCustomerRow(ws, cols, rowNumber, customer) {
  const row = ws.getRow(rowNumber);
  const set = (field, value, numFmt) => {
    const cell = row.getCell(cols[field]);
    cell.value = value;
    if (numFmt) cell.numFmt = numFmt;
  };
  const fmt = field => CUSTOMER_COLUMNS.find(c => c.field === field).numFmt;

  set('id', customer.id);
  set('name', customer.name ?? '');
  set('phone', customer.phone ?? '', fmt('phone'));
  set('address', customer.address ?? '');
  set('carModel', customer.carModel ?? '');
  set('carPlate', customer.carPlate ?? '');
  // A value that is not a date stays as text. The next read reports the row.
  set('lastServiceDate',
    isDateText(customer.lastServiceDate) ? textToExcelDate(customer.lastServiceDate) : (customer.lastServiceDate ?? null),
    fmt('lastServiceDate'));
  set('smsSentAt', customer.smsSentAt ? momentToExcelDateTime(customer.smsSentAt) : null, fmt('smsSentAt'));
}

function deleteRows(ws, rowNumbers) {
  // From the bottom up, so the numbers of the rows above stay true.
  [...rowNumbers].sort((a, b) => b - a).forEach(n => ws.spliceRows(n, 1));
}

/** `settings`: the days off, for the computed cells. */
function applyCustomers(layout, customers, settings, today) {
  const { ws, cols, rowById, fileIds } = layout;
  addMissingComputedColumns(ws, cols);
  const taken = new Set(rowById.keys());
  const wanted = new Set();
  let lastRow = layout.lastRow;

  for (const customer of customers) {
    if (!customer.id) customer.id = generateId(taken);
    taken.add(customer.id);
    wanted.add(customer.id);
    const rowNumber = rowById.get(customer.id) ?? ++lastRow;
    writeCustomerRow(ws, cols, rowNumber, customer);
    // A row that the next read will report (bad date) gets no computed cells.
    if (isDateText(customer.lastServiceDate)) {
      writeComputedCells(ws, cols, rowNumber, computedValues(customer, settings, today));
    }
  }
  // Delete only a row whose ID was in the file. A row that got its ID in this
  // same read is new to the caller: it did not ask to delete it.
  deleteRows(ws, [...fileIds].filter(id => !wanted.has(id)).map(id => rowById.get(id)));
}

function applySettings(layout, parsed, data) {
  const { ws, rowByKey } = layout;
  let lastRow = layout.lastRow;
  const put = (field, value) => {
    // An unchanged value is not written. So a cell with a typing error that
    // the read replaced by the default keeps the staff's text.
    const same = JSON.stringify(parsed[field]) === JSON.stringify(data[field]);
    if (same && (rowByKey[field] || value === null)) return;
    const rowNumber = rowByKey[field] ?? ++lastRow;
    ws.getRow(rowNumber).getCell(1).value = SETTING_KEYS[field];
    ws.getRow(rowNumber).getCell(2).value = value;
    return ws.getRow(rowNumber).getCell(2);
  };
  put('smsTemplate', data.smsTemplate);
  put('smsPricePerSegment', data.smsPricePerSegment);
  put('weeklyDaysOff', formatWeeklyDaysOff(data.weeklyDaysOff));
  const checkCell = put('holidayCheckDate',
    isDateText(data.holidayCheckDate) ? textToExcelDate(data.holidayCheckDate) : null);
  if (checkCell) checkCell.numFmt = 'dd.mm.yyyy';
}

function applyHolidays(layout, holidays) {
  const { ws, rowsByDate } = layout;
  const wanted = new Set(holidays);
  let lastRow = layout.lastRow;
  for (const date of wanted) {
    if (rowsByDate.has(date) || !isDateText(date)) continue;
    const cell = ws.getRow(++lastRow).getCell(1);
    cell.value = textToExcelDate(date);
    cell.numFmt = 'dd.mm.yyyy';
  }
  deleteRows(ws, [...rowsByDate].filter(([date]) => !wanted.has(date)).flatMap(([, rows]) => rows));
}

/** The app owns this sheet, so a write puts the whole list again. */
function applyOfficialHolidays(wb, list) {
  const ws = wb.getWorksheet(SHEETS.officialHolidays);
  if (ws.rowCount > 1) ws.spliceRows(2, ws.rowCount - 1);
  for (const h of list) {
    if (!isDateText(h.date)) continue;
    const row = ws.addRow([textToExcelDate(h.date), h.name ?? '']);
    row.getCell(1).numFmt = 'dd.mm.yyyy';
  }
}

// ─── File work ───────────────────────────────────────────────────────────────

async function exists(file) {
  try { await fs.access(file); return true; } catch { return false; }
}

async function loadWorkbook() {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.readFile(dataFile());
  } catch (err) {
    const known = storeErrorOf(err);
    if (known) throw known;
    console.error('[STORE] Cannot read the data file:', err);
    throw new StoreError('UNREADABLE',
      `Файлът „${DATA_FILE_NAME}“ не може да се прочете. Вземете копие от папка „backups“.`);
  }
  return wb;
}

let tempCounter = 0;

/** Temp file in the same folder, then rename: the real file is never half written. */
async function saveWorkbook(wb) {
  const file = dataFile();
  const temp = path.join(dataDir(), `.${DATA_FILE_NAME}.${process.pid}.${++tempCounter}.tmp`);
  try {
    await wb.xlsx.writeFile(temp);
    await fs.rename(temp, file);
  } catch (err) {
    await fs.rm(temp, { force: true });
    const known = storeErrorOf(err);
    if (known) throw known;
    throw err;
  }
}

// One write at a time. Each write loads the file, changes it and saves it.
// Two writes that run together can lose the change of the first one.
let lastWrite = Promise.resolve();
function oneAtATime(job) {
  const run = lastWrite.then(job);
  lastWrite = run.catch(() => {});
  return run;
}

/** Before the first write of each day: copy the file to backups/. Keep 30. */
async function backupOncePerDay() {
  const target = backupFile(localDateText());
  if (await exists(target) || !(await exists(dataFile()))) return;
  await fs.mkdir(backupDir(), { recursive: true });
  await fs.copyFile(dataFile(), target);

  const ext = path.extname(DATA_FILE_NAME);
  const prefix = path.basename(DATA_FILE_NAME, ext) + '-';
  // macOS can give file names in another Unicode form. NFC makes them equal.
  const backups = (await fs.readdir(backupDir()))
    .filter(name => {
      const n = name.normalize('NFC');
      return n.startsWith(prefix) && n.endsWith(ext) && isDateText(n.slice(prefix.length, -ext.length));
    })
    .sort((a, b) => a.normalize('NFC').localeCompare(b.normalize('NFC')));
  for (const old of backups.slice(0, -KEEP_BACKUPS)) {
    await fs.rm(path.join(backupDir(), old), { force: true });
  }
}

/**
 * True when Excel has the file open.
 * Two signs: Excel's own lock file, and (on Windows) a refused open for write.
 */
export async function isLocked() {
  if (await exists(lockFile())) return true;
  try {
    const handle = await fs.open(dataFile(), 'r+');
    await handle.close();
    return false;
  } catch (err) {
    if (isLockError(err)) return true;
    // No access is no lock: say the real reason (storeErrorOf).
    const known = storeErrorOf(err);
    if (known) throw known;
    return false;
  }
}

/** Throws the clear message when a write cannot work. Call it BEFORE an SMS send. */
export async function assertWritable() {
  if (await isLocked()) throw new StoreError('LOCKED', LOCKED_MESSAGE);
}

/** Makes an empty file with all the sheets when there is none. */
export async function ensureDataFile() {
  if (await exists(dataFile())) return { file: dataFile(), created: false };
  await fs.mkdir(dataDir(), { recursive: true });
  await saveWorkbook(newWorkbook());
  return { file: dataFile(), created: true };
}

async function persistNewIds(wb, layout, problems) {
  const { ws, cols, newIds } = layout.customers;
  try {
    await assertWritable();
    for (const [id, rowNumber] of newIds) ws.getRow(rowNumber).getCell(cols.id).value = id;
    await backupOncePerDay();
    await saveWorkbook(wb);
  } catch (err) {
    if (!(err instanceof StoreError) || err.code !== 'LOCKED') throw err;
    problems.push({
      sheet: SHEETS.customers,
      row: null,
      reason: 'Има редове без ID. Новите ID не са записани, защото файлът е отворен в Excel. ' +
        'Затворете файла в Excel и презаредете.',
    });
  }
}

// ─── SMS that are sent but not in the Excel file yet (specs D30) ─────────────
// An SMS is paid when Twilio takes it. If the save then fails (Excel opened the
// file in that second), the send is kept in a small file next to the data
// file. Each read puts it on the customer, so the row shows "Изпратен" and a
// second SMS is refused. The first read with a free file writes it into Excel.

async function readPendingSends() {
  try {
    const list = JSON.parse(await fs.readFile(pendingSendsFile(), 'utf8'));
    return Array.isArray(list)
      ? list.filter(p => p && typeof p.id === 'string' && typeof p.sentAt === 'string')
      : [];
  } catch {
    // No file (the usual case) or a file that is not ours: nothing waits.
    return [];
  }
}

/** Keep one sent SMS until the Excel file can take it. */
export async function addPendingSend(id, sentAt) {
  const list = (await readPendingSends()).filter(p => p.id !== id);
  list.push({ id, sentAt });
  await fs.mkdir(dataDir(), { recursive: true });
  await fs.writeFile(pendingSendsFile(), JSON.stringify(list, null, 2), 'utf8');
}

async function applyPendingSends(data) {
  const pending = await readPendingSends();
  if (!pending.length) return;

  let toSave = 0;
  for (const { id, sentAt } of pending) {
    const customer = data.customers.find(c => c.id === id);
    // A deleted customer, or a mark that is already in the file: nothing to do.
    if (!customer || (customer.smsSentAt && customer.smsSentAt >= sentAt)) continue;
    customer.smsSentAt = sentAt;
    toSave += 1;
  }

  if (toSave) {
    try {
      await writeData(data);
    } catch (err) {
      // Still open in Excel: the marks stay in memory and in the small file.
      if (err instanceof StoreError) return;
      throw err;
    }
  }
  await fs.rm(pendingSendsFile(), { force: true });
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Reads the file fresh. Returns
 * `{ customers, smsTemplate, smsPricePerSegment, weeklyDaysOff, holidays,
 *   officialHolidays, holidayCheckDate, problems }`.
 * `problems` is a list of `{ sheet, row, reason }` for the rows that did not load.
 */
export async function readData() {
  await ensureDataFile();
  const wb = await loadWorkbook();
  const { data, layout } = parse(wb);
  // A new ID must be in the file. Otherwise the row gets another ID on each
  // read, and a click in the dashboard does not find the customer.
  if (layout.customers.newIds.size) await persistNewIds(wb, layout, data.problems);
  await applyPendingSends(data);
  if (computedIsOld(layout.customers, data, localDateText())) await refreshComputed();
  return data;
}

/**
 * Writes the computed columns again (specs D31). A read calls it when they
 * are old: the first read of a new day, a hand edit in Excel, a new day off.
 *
 * It loads the file fresh, inside the write queue. So it cannot put back an
 * old customer list over a save that ran in the meantime.
 * It never fails a read: the dashboard computes its own values. With the file
 * open in Excel, the columns stay old until the next read with a free file.
 */
async function refreshComputed() {
  try {
    await oneAtATime(async () => {
      await assertWritable();
      const wb = await loadWorkbook();
      const { data, layout } = parse(wb);
      const { ws, cols, rowById } = layout.customers;
      const today = localDateText();
      // A save in the meantime did the work already.
      if (!computedIsOld(layout.customers, data, today)) return;
      addMissingComputedColumns(ws, cols);
      for (const customer of data.customers) {
        writeComputedCells(ws, cols, rowById.get(customer.id), computedValues(customer, data, today));
      }
      await backupOncePerDay();
      await saveWorkbook(wb);
    });
  } catch (err) {
    if (!(err instanceof StoreError)) console.error('[STORE] Cannot refresh the computed columns:', err);
  }
}

/**
 * Writes `data` (same shape as `readData`) into the file.
 * Throws a `StoreError` with code `LOCKED` when Excel has the file open.
 */
export function writeData(data) {
  return oneAtATime(() => writeDataNow(data));
}

async function writeDataNow(data) {
  await ensureDataFile();
  await assertWritable();
  const wb = await loadWorkbook();
  if (!wb.getWorksheet(SHEETS.settings)) addSettingsSheet(wb);
  if (!wb.getWorksheet(SHEETS.holidays)) addHolidaySheet(wb);
  if (!wb.getWorksheet(SHEETS.officialHolidays)) addOfficialSheet(wb);
  const { data: parsed, layout } = parse(wb);

  const holidays = data.holidays ?? parsed.holidays;
  const official = data.officialHolidays ?? parsed.officialHolidays;
  const weeklyDaysOff = data.weeklyDaysOff ?? parsed.weeklyDaysOff;

  applyCustomers(layout.customers, data.customers ?? [],
    { weeklyDaysOff, holidays, officialHolidays: official }, localDateText());
  applySettings(layout.settings, parsed, {
    smsTemplate: data.smsTemplate ?? parsed.smsTemplate,
    smsPricePerSegment: data.smsPricePerSegment ?? parsed.smsPricePerSegment,
    weeklyDaysOff,
    holidayCheckDate: data.holidayCheckDate ?? parsed.holidayCheckDate,
  });
  applyHolidays(layout.holidays, holidays);
  if (JSON.stringify(official) !== JSON.stringify(parsed.officialHolidays)) {
    applyOfficialHolidays(wb, official);
  }

  await backupOncePerDay();
  await saveWorkbook(wb);
}

/**
 * Saves only the result of the holiday check: the official list and the day
 * of the check. The customers are not read and not written. So a check that
 * ran in the background cannot put back an old customer list.
 */
export function writeHolidayCheck(result) {
  return oneAtATime(() => writeHolidayCheckNow(result));
}

async function writeHolidayCheckNow({ officialHolidays, holidayCheckDate }) {
  await ensureDataFile();
  await assertWritable();
  const wb = await loadWorkbook();
  if (!wb.getWorksheet(SHEETS.settings)) addSettingsSheet(wb);
  if (!wb.getWorksheet(SHEETS.officialHolidays)) addOfficialSheet(wb);
  const { data: parsed, layout } = parse(wb);
  applySettings(layout.settings, parsed, { ...parsed, holidayCheckDate });
  applyOfficialHolidays(wb, officialHolidays);
  await backupOncePerDay();
  await saveWorkbook(wb);
}
