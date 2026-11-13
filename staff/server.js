// Graceful error handling — keep terminal open on crash
process.on('uncaughtException', (err) => {
  console.error('\n  [ГРЕШКА]', err.message);
  console.error('  ', err.stack);
  console.log('\n  Натиснете Enter за да затворите...');
  process.stdin.resume();
  process.stdin.once('data', () => process.exit(1));
});
 
process.on('unhandledRejection', (reason) => {
  console.error('\n  [ГРЕШКА]', reason);
  console.log('\n  Натиснете Enter за да затворите...');
  process.stdin.resume();
  process.stdin.once('data', () => process.exit(1));
});
import { createRequire } from 'module';
import { ENV_FILE, dataFile } from './lib/paths.js';
const _require = createRequire(import.meta.url);
try { _require('dotenv').config({ path: ENV_FILE }); } catch(e) { /* no .env file, that's ok */ }
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import { execSync } from 'child_process';
import { measureSms } from './public/sms-text.js';
import {
  StoreError, assertWritable, ensureDataFile, generateId, readData, writeData,
} from './lib/store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
// Only public/ is served. The engine code, the data, and .env stay private.
// The dashboard is public/index.html, so it opens at "/".
app.use(express.static(path.join(__dirname, 'public')));

// ─── Helpers ─────────────────────────────────────────────────────────────────

// The Excel file holds only what the staff or the app enter. The next
// inspection date, the reminder date and the status are computed on each read
// (specs section 4). Chapter 06 moves this to lib/reminders.js and fixes the
// date math below.
function withComputed(customer, holidays) {
  const nextServiceDate = computeNextServiceDate(customer.lastServiceDate, holidays);
  return {
    ...customer,
    nextServiceDate,
    nextReminderDate: computeReminderDate(nextServiceDate, holidays),
    status: customer.smsSentAt ? 'sent' : 'pending',
  };
}

async function loadData() {
  const data = await readData();
  data.customers = data.customers.map(c => withComputed(c, data.holidays));
  return data;
}

// Express 4 does not catch an error from an async route. Without this, a
// locked Excel file would stop the whole server.
const route = handler => (req, res, next) => handler(req, res, next).catch(next);

/**
 * Given a service date, compute the reminder date (7 days prior),
 * but skip Sundays and holidays by moving the reminder earlier if needed.
 */
function computeReminderDate(serviceDateStr, holidays = []) {
  const serviceDate = new Date(serviceDateStr + 'T00:00:00');
  let reminder = new Date(serviceDate);
  reminder.setDate(reminder.getDate() - 7);

  // If the reminder falls on Sunday (0) or a holiday, move earlier
  while (reminder.getDay() === 0 || holidays.includes(toDateStr(reminder))) {
    reminder.setDate(reminder.getDate() - 1);
  }
  return toDateStr(reminder);
}

/**
 * Compute next service date = exactly 1 year after last service.
 * If that day is Sunday or holiday, shift forward to Monday (or next working day).
 */
function computeNextServiceDate(lastServiceDateStr, holidays = []) {
  const d = new Date(lastServiceDateStr + 'T00:00:00');
  d.setFullYear(d.getFullYear() + 1);

  while (d.getDay() === 0 || holidays.includes(toDateStr(d))) {
    d.setDate(d.getDate() + 1);
  }
  return toDateStr(d);
}

function toDateStr(date) {
  return date.toISOString().split('T')[0];
}

function buildSmsBody(template, customer) {
  // Formatted by hand, not with toLocaleDateString('bg-BG'): that appends
  // " г." which reads badly ("2026 г..") and wastes 3 of the 70 characters.
  const [y, m, d] = customer.nextServiceDate.split('-');
  const formatted = `${d}.${m}.${y}`;
  return template
    .replace(/{{name}}/g, customer.name)
    .replace(/{{carModel}}/g, customer.carModel)
    .replace(/{{carPlate}}/g, customer.carPlate)
    .replace(/{{serviceDate}}/g, formatted)
    .replace(/{{phone}}/g, customer.phone);
}

async function sendSms(to, body) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || accountSid.startsWith('AC_') || accountSid === 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
    // Simulate send in dev mode
    console.log(`[DEV] SMS to ${to}: ${body}`);
    return { sid: 'DEV_' + Date.now(), status: 'simulated' };
  }

  const { default: twilio } = await import('twilio');
  const client = twilio(accountSid, authToken);
  const message = await client.messages.create({ body, from: fromNumber, to });
  return { sid: message.sid, status: message.status };
}

// ─── API Routes ───────────────────────────────────────────────────────────────

// GET all customers
app.get('/api/customers', route(async (req, res) => {
  const data = await loadData();
  res.json(data);
}));

// GET single customer
app.get('/api/customers/:id', route(async (req, res) => {
  const data = await loadData();
  const customer = data.customers.find(c => c.id === req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  res.json(customer);
}));

// POST create customer
app.post('/api/customers', route(async (req, res) => {
  const data = await loadData();
  const { name, phone, address, carModel, carPlate, lastServiceDate } = req.body;

  if (!name || !phone || !carModel || !carPlate || !lastServiceDate) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const customer = withComputed({
    id: generateId(new Set(data.customers.map(c => c.id))),
    name, phone, address: address || '',
    carModel, carPlate,
    lastServiceDate,
    smsSentAt: null,
    disabled: false
  }, data.holidays);

  data.customers.push(customer);
  await writeData(data);
  res.status(201).json(customer);
}));

// PUT update customer
app.put('/api/customers/:id', route(async (req, res) => {
  const data = await loadData();
  const idx = data.customers.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Customer not found' });

  const existing = data.customers[idx];
  // The ID is the key of the row in the Excel file. A request cannot change it.
  const merged = { ...existing, ...req.body, id: existing.id };

  // A new inspection date starts a new cycle: no SMS was sent for it yet.
  if (req.body.lastServiceDate && req.body.lastServiceDate !== existing.lastServiceDate) {
    merged.smsSentAt = null;
  }

  const updated = withComputed(merged, data.holidays);
  data.customers[idx] = updated;
  await writeData(data);
  res.json(updated);
}));

// DELETE customer
app.delete('/api/customers/:id', route(async (req, res) => {
  const data = await loadData();
  const idx = data.customers.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Customer not found' });
  data.customers.splice(idx, 1);
  await writeData(data);
  res.json({ success: true });
}));

// POST send SMS to a customer
app.post('/api/customers/:id/send-sms', route(async (req, res) => {
  const data = await loadData();
  const idx = data.customers.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Customer not found' });

  const customer = data.customers[idx];
  if (customer.disabled) {
    return res.status(400).json({ error: 'Customer is disabled' });
  }

  // Check the Excel lock BEFORE the send (specs section 7). After the send it
  // is too late: the SMS is paid and the file cannot record it.
  await assertWritable();

  try {
    const body = buildSmsBody(data.smsTemplate, customer);
    const result = await sendSms(customer.phone, body);

    // Update customer: mark sent, advance service dates
    data.customers[idx] = withComputed({
      ...customer,
      smsSentAt: new Date().toISOString(),
      lastServiceDate: customer.nextServiceDate
    }, data.holidays);

    await writeData(data);
    res.json({ success: true, sid: result.sid, status: result.status, customer: data.customers[idx] });
  } catch (err) {
    console.error('SMS error:', err);
    res.status(500).json({ error: err.message });
  }
}));

// PATCH toggle disabled
app.patch('/api/customers/:id/toggle-disabled', route(async (req, res) => {
  const data = await loadData();
  const idx = data.customers.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Customer not found' });
  data.customers[idx].disabled = !data.customers[idx].disabled;
  await writeData(data);
  res.json(data.customers[idx]);
}));

// GET the rows of the Excel file that did not load (sheet, row, reason)
app.get('/api/data-problems', route(async (req, res) => {
  const data = await readData();
  res.json({ problems: data.problems });
}));

// GET SMS template
app.get('/api/template', route(async (req, res) => {
  const data = await loadData();
  res.json({
    template: data.smsTemplate,
    pricePerSegment: data.smsPricePerSegment
  });
}));

// PUT update SMS template
app.put('/api/template', route(async (req, res) => {
  const { template, pricePerSegment } = req.body;
  if (!template) return res.status(400).json({ error: 'Template is required' });
  const data = await loadData();
  data.smsTemplate = template;
  if (Number.isFinite(pricePerSegment) && pricePerSegment >= 0) {
    data.smsPricePerSegment = pricePerSegment;
  }
  await writeData(data);
  res.json({
    template: data.smsTemplate,
    pricePerSegment: data.smsPricePerSegment
  });
}));

// GET holidays
app.get('/api/holidays', route(async (req, res) => {
  const data = await loadData();
  res.json({ holidays: data.holidays });
}));

// PUT update holidays
app.put('/api/holidays', route(async (req, res) => {
  const { holidays } = req.body;
  if (!Array.isArray(holidays)) return res.status(400).json({ error: 'holidays must be an array' });
  const data = await loadData();
  data.holidays = holidays;
  await writeData(data);
  res.json({ holidays });
}));

// POST preview SMS body for a customer
app.post('/api/preview-sms/:id', route(async (req, res) => {
  const data = await loadData();
  const customer = data.customers.find(c => c.id === req.params.id);
  if (!customer) return res.status(404).json({ error: 'Not found' });
  const body = buildSmsBody(data.smsTemplate, customer);
  res.json({
    body,
    measure: measureSms(body),
    pricePerSegment: data.smsPricePerSegment
  });
}));

// ─── Daily cron job: auto-send to customers whose reminder date is today ──────
// Runs every day at 09:00, skips Sundays automatically
cron.schedule('0 9 * * 1-6', async () => {
  const today = toDateStr(new Date());
  const data = await loadData();
  console.log(`[CRON] Running daily check for ${today}`);

  if (data.holidays.includes(today)) {
    console.log('[CRON] Today is a holiday — skipping.');
    return;
  }

  const due = data.customers.filter(
    c => !c.disabled && c.status === 'pending' && c.nextReminderDate === today
  );

  console.log(`[CRON] ${due.length} customer(s) due for reminder today.`);

  for (const customer of due) {
    try {
      const body = buildSmsBody(data.smsTemplate, customer);
      const result = await sendSms(customer.phone, body);
      const idx = data.customers.findIndex(c => c.id === customer.id);
      data.customers[idx] = {
        ...customer,
        smsSentAt: new Date().toISOString(),
        lastServiceDate: customer.nextServiceDate
      };
      console.log(`[CRON] Sent to ${customer.name} (${customer.phone}) — SID: ${result.sid}`);
    } catch (err) {
      console.error(`[CRON] Failed for ${customer.name}:`, err.message);
    }
  }

  await writeData(data);
});

// ─── Errors ───────────────────────────────────────────────────────────────────
// The user sees a clear Bulgarian message. The stack trace stays in the console.
app.use((err, req, res, next) => {
  if (err instanceof StoreError) {
    // 423 Locked: Excel has the file. 500: the file itself is wrong.
    return res.status(err.code === 'LOCKED' ? 423 : 500).json({ error: err.message, code: err.code });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Невалидна заявка.' });
  }
  console.error('[ГРЕШКА]', err);
  res.status(500).json({ error: 'Възникна грешка. Вижте черния прозорец на програмата.' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
// Make an empty Excel file if there is none (first run).
try {
  const { created } = await ensureDataFile();
  console.log(`[INIT] ${created ? 'Created an empty data file' : 'Data file'}: ${dataFile()}`);
} catch (err) {
  console.error('\n  [ГРЕШКА] Файлът с данни не може да се създаде:', dataFile());
  throw err;
}
 
function openBrowser(url) {
  try {
    if (process.platform === 'win32') {
      execSync(`start "" "${url}"`, { stdio: 'ignore' });
    } else if (process.platform === 'darwin') {
      execSync(`open "${url}"`, { stdio: 'ignore' });
    } else {
      execSync(`xdg-open "${url}"`, { stdio: 'ignore' });
    }
  } catch (e) {
    console.log(`  Не може да се отвори браузърът автоматично.`);
    console.log(`  Моля отворете ръчно: ${url}`);
  }
}
 
app.listen(PORT, '127.0.0.1', () => {
  const url = `http://localhost:${PORT}`;
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║       ЕГЕР ООД — SMS Сервиз          ║');
  console.log(`  ║   Отворете: ${url}     ║`);
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
  console.log('  Затворете този прозорец за да спрете сървъра.');
  console.log('');
  openBrowser(url);
});