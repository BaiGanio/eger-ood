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
import { execSync } from 'child_process';
import { measureSms } from './public/sms-text.js';
import { isDateText, localDateText } from './lib/dates.js';
import { startNewCycle, withComputed } from './lib/reminders.js';
import { SendError, buildSmsText, sendReminder, smsMode } from './lib/sms.js';
import {
  StoreError, ensureDataFile, generateId, readData, writeData,
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
// (specs section 4). The rules are in lib/reminders.js.
async function loadData() {
  const data = await readData();
  const today = localDateText();
  data.customers = data.customers.map(c => withComputed(c, data, today));
  return data;
}

const BAD_DATE = 'Датата на последния преглед не е валидна.';

// Express 4 does not catch an error from an async route. Without this, a
// locked Excel file would stop the whole server.
const route = handler => (req, res, next) => handler(req, res, next).catch(next);

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
  if (!isDateText(lastServiceDate)) return res.status(400).json({ error: BAD_DATE });

  const customer = withComputed({
    id: generateId(new Set(data.customers.map(c => c.id))),
    name, phone, address: address || '',
    carModel, carPlate,
    lastServiceDate,
    smsSentAt: null,
    smsSimulated: false,
    disabled: false
  }, data, localDateText());

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
  // The SMS mark is the app's own. Only a send or a new cycle changes it.
  let merged = {
    ...existing, ...req.body,
    id: existing.id, smsSentAt: existing.smsSentAt, smsSimulated: existing.smsSimulated,
  };

  // The reminder rules cannot compute from a value that is not a date.
  if (!isDateText(merged.lastServiceDate)) return res.status(400).json({ error: BAD_DATE });

  // A new inspection date starts a new cycle: no SMS was sent for it yet.
  if (merged.lastServiceDate !== existing.lastServiceDate) {
    merged = startNewCycle(merged, merged.lastServiceDate);
  }

  const updated = withComputed(merged, data, localDateText());
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

// POST send SMS to a customer. `{ "force": true }` sends a second time.
app.post('/api/customers/:id/send-sms', route(async (req, res) => {
  const result = await sendReminder(req.params.id, { force: req.body?.force === true });
  res.json({ success: true, ...result });
}));

// PATCH toggle disabled
app.patch('/api/customers/:id/toggle-disabled', route(async (req, res) => {
  const data = await loadData();
  const idx = data.customers.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Customer not found' });
  data.customers[idx].disabled = !data.customers[idx].disabled;
  await writeData(data);
  // The status depends on `disabled`, so it is computed again.
  res.json(withComputed(data.customers[idx], data, localDateText()));
}));

// GET the SMS mode. The dashboard shows a banner in simulated mode.
app.get('/api/status', (req, res) => {
  res.json({ smsMode: smsMode() });
});

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
  const body = buildSmsText(data.smsTemplate, customer);
  res.json({
    body,
    measure: measureSms(body),
    pricePerSegment: data.smsPricePerSegment
  });
}));

// ─── Errors ───────────────────────────────────────────────────────────────────
// The user sees a clear Bulgarian message. The stack trace stays in the console.
app.use((err, req, res, next) => {
  if (err instanceof StoreError) {
    // 423 Locked: Excel has the file. 500: the file itself is wrong.
    return res.status(err.code === 'LOCKED' ? 423 : 500).json({ error: err.message, code: err.code });
  }
  if (err instanceof SendError) {
    const status = { NOT_FOUND: 404, DISABLED: 400, ALREADY_SENT: 409, SEND_FAILED: 502 }[err.code] || 500;
    return res.status(status).json({ error: err.message, code: err.code, sentAt: err.sentAt });
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