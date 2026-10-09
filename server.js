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
const _require = createRequire(import.meta.url);
try { _require('dotenv').config(); } catch(e) { /* no .env file, that's ok */ }
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'customers.json');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// Landing page at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Dashboard app at /app
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'ati.html'));
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readData() {
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function generateId() {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

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
  const serviceDate = new Date(customer.nextServiceDate + 'T00:00:00');
  const formatted = serviceDate.toLocaleDateString('bg-BG', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
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
app.get('/api/customers', (req, res) => {
  const data = readData();
  res.json(data);
});

// GET single customer
app.get('/api/customers/:id', (req, res) => {
  const data = readData();
  const customer = data.customers.find(c => c.id === req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  res.json(customer);
});

// POST create customer
app.post('/api/customers', (req, res) => {
  const data = readData();
  const { name, phone, address, carModel, carPlate, lastServiceDate } = req.body;

  if (!name || !phone || !carModel || !carPlate || !lastServiceDate) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const nextServiceDate = computeNextServiceDate(lastServiceDate, data.holidays);
  const nextReminderDate = computeReminderDate(nextServiceDate, data.holidays);

  const customer = {
    id: generateId(),
    name, phone, address: address || '',
    carModel, carPlate,
    lastServiceDate,
    nextReminderDate,
    nextServiceDate,
    status: 'pending',
    smsSentAt: null,
    disabled: false
  };

  data.customers.push(customer);
  writeData(data);
  res.status(201).json(customer);
});

// PUT update customer
app.put('/api/customers/:id', (req, res) => {
  const data = readData();
  const idx = data.customers.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Customer not found' });

  const existing = data.customers[idx];
  const updated = { ...existing, ...req.body };

  // Recompute dates if lastServiceDate changed
  if (req.body.lastServiceDate && req.body.lastServiceDate !== existing.lastServiceDate) {
    updated.nextServiceDate = computeNextServiceDate(req.body.lastServiceDate, data.holidays);
    updated.nextReminderDate = computeReminderDate(updated.nextServiceDate, data.holidays);
    updated.status = 'pending';
    updated.smsSentAt = null;
  }

  data.customers[idx] = updated;
  writeData(data);
  res.json(updated);
});

// DELETE customer
app.delete('/api/customers/:id', (req, res) => {
  const data = readData();
  const idx = data.customers.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Customer not found' });
  data.customers.splice(idx, 1);
  writeData(data);
  res.json({ success: true });
});

// POST send SMS to a customer
app.post('/api/customers/:id/send-sms', async (req, res) => {
  const data = readData();
  const idx = data.customers.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Customer not found' });

  const customer = data.customers[idx];
  if (customer.disabled) {
    return res.status(400).json({ error: 'Customer is disabled' });
  }

  try {
    const body = buildSmsBody(data.smsTemplate, customer);
    const result = await sendSms(customer.phone, body);

    // Update customer: mark sent, advance service dates
    const newLastServiceDate = customer.nextServiceDate;
    const newNextServiceDate = computeNextServiceDate(newLastServiceDate, data.holidays);
    const newNextReminderDate = computeReminderDate(newNextServiceDate, data.holidays);

    data.customers[idx] = {
      ...customer,
      status: 'sent',
      smsSentAt: new Date().toISOString(),
      lastServiceDate: newLastServiceDate,
      nextServiceDate: newNextServiceDate,
      nextReminderDate: newNextReminderDate
    };

    writeData(data);
    res.json({ success: true, sid: result.sid, status: result.status, customer: data.customers[idx] });
  } catch (err) {
    console.error('SMS error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH toggle disabled
app.patch('/api/customers/:id/toggle-disabled', (req, res) => {
  const data = readData();
  const idx = data.customers.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Customer not found' });
  data.customers[idx].disabled = !data.customers[idx].disabled;
  writeData(data);
  res.json(data.customers[idx]);
});

// GET SMS template
app.get('/api/template', (req, res) => {
  const data = readData();
  res.json({ template: data.smsTemplate });
});

// PUT update SMS template
app.put('/api/template', (req, res) => {
  const { template } = req.body;
  if (!template) return res.status(400).json({ error: 'Template is required' });
  const data = readData();
  data.smsTemplate = template;
  writeData(data);
  res.json({ template });
});

// GET holidays
app.get('/api/holidays', (req, res) => {
  const data = readData();
  res.json({ holidays: data.holidays });
});

// PUT update holidays
app.put('/api/holidays', (req, res) => {
  const { holidays } = req.body;
  if (!Array.isArray(holidays)) return res.status(400).json({ error: 'holidays must be an array' });
  const data = readData();
  data.holidays = holidays;
  writeData(data);
  res.json({ holidays });
});

// POST preview SMS body for a customer
app.post('/api/preview-sms/:id', (req, res) => {
  const data = readData();
  const customer = data.customers.find(c => c.id === req.params.id);
  if (!customer) return res.status(404).json({ error: 'Not found' });
  const body = buildSmsBody(data.smsTemplate, customer);
  res.json({ body });
});

// ─── Daily cron job: auto-send to customers whose reminder date is today ──────
// Runs every day at 09:00, skips Sundays automatically
cron.schedule('0 9 * * 1-6', async () => {
  const today = toDateStr(new Date());
  const data = readData();
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
      const newLastServiceDate = customer.nextServiceDate;
      const newNextServiceDate = computeNextServiceDate(newLastServiceDate, data.holidays);
      data.customers[idx] = {
        ...customer,
        status: 'sent',
        smsSentAt: new Date().toISOString(),
        lastServiceDate: newLastServiceDate,
        nextServiceDate: newNextServiceDate,
        nextReminderDate: computeReminderDate(newNextServiceDate, data.holidays)
      };
      console.log(`[CRON] Sent to ${customer.name} (${customer.phone}) — SID: ${result.sid}`);
    } catch (err) {
      console.error(`[CRON] Failed for ${customer.name}:`, err.message);
    }
  }

  writeData(data);
});

// ─── Start ────────────────────────────────────────────────────────────────────
// Auto-create data file if missing (first run)
if (!fs.existsSync(DATA_FILE)) {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify({
    customers: [],
    smsTemplate: 'Здравейте, {{name}}! Вашият автомобил {{carModel}} ({{carPlate}}) е записан за годишен преглед на {{serviceDate}}. Авто Сервиз ЕГЕР ООД.',
    holidays: []
  }, null, 2));
  console.log('[INIT] Created empty data/customers.json');
} else{ 
  console.log('[INIT] Initial file existed at; data/customers.json');
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