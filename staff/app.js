// The routes of the staff app. No business logic, and no start: `server.js`
// starts the server, and a test can load the routes with no open port.

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { measureSms } from './public/sms-text.js';
import { localDateText } from './lib/dates.js';
import { openDataFolder } from './lib/folder.js';
import { apiGuard, securityHeaders } from './lib/guard.js';
import { checkHolidaysInBackground, lastCheckError, runHolidayCheck } from './lib/holiday-check.js';
import { FIRST_YEAR, LAST_YEAR, officialHolidays } from './lib/holidays.js';
import { startNewCycle, startNewSend, withComputed } from './lib/reminders.js';
import { SendError, buildSmsText, sendReminder, smsMode } from './lib/sms.js';
import { StoreError, generateId, readData, writeData } from './lib/store.js';
import { dataFile } from './lib/paths.js';
import { APP_ID } from './lib/port.js';

import { checkCustomer, checkHolidays, checkTemplate } from './lib/validate.js';

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');

const NOT_FOUND = 'Клиентът не е намерен. Презаредете страницата.';

// The next inspection date, the reminder date and the status are computed on
// each read (specs section 4). The rules are in lib/reminders.js. The Excel
// file shows a copy of them to the staff (specs D31); the store writes it.
async function loadData() {
  const data = await readData();
  const today = localDateText();
  data.customers = data.customers.map(c => withComputed(c, data, today));
  return data;
}

// Express 4 does not catch an error from an async route. Without this, a
// locked Excel file would stop the whole server.
const route = handler => (req, res, next) => handler(req, res, next).catch(next);

/**
 * `autoHolidayCheck`: check the official days off on the internet when it is
 * due (server.js turns it on; a test does not go to the internet).
 * `fetchHolidays`: the fetch of the check, for the tests.
 * `openFolder`: opens the data folder; a test gives its own, so no window opens.
 */
export function createApp({ autoHolidayCheck = false, fetchHolidays, openFolder = openDataFolder } = {}) {
  const app = express();
  const holidayOptions = fetchHolidays ? { fetchImpl: fetchHolidays } : {};
  const checkWhenDue = () => {
    if (autoHolidayCheck) checkHolidaysInBackground(holidayOptions);
  };
  app.disable('x-powered-by');

  app.use(securityHeaders);
  app.use('/api', apiGuard);
  app.use(express.json({ limit: '100kb' }));
  // Only public/ is served. The engine code, the data, and .env stay private.
  // The dashboard is public/index.html, so it opens at "/".
  app.use(express.static(PUBLIC_DIR));

  // ─── Customers ─────────────────────────────────────────────────────────────

  app.get('/api/customers', route(async (req, res) => {
    checkWhenDue();
    res.json(await loadData());
  }));

  app.get('/api/customers/:id', route(async (req, res) => {
    const data = await loadData();
    const customer = data.customers.find(c => c.id === req.params.id);
    if (!customer) return res.status(404).json({ error: NOT_FOUND });
    res.json(customer);
  }));

  app.post('/api/customers', route(async (req, res) => {
    const data = await loadData();
    const today = localDateText();
    const { value, error } = checkCustomer(req.body, { today, customers: data.customers });
    if (error) return res.status(400).json({ error });

    const customer = withComputed({
      id: generateId(new Set(data.customers.map(c => c.id))),
      ...value,
      smsSentAt: null,
    }, data, today);

    data.customers.push(customer);
    await writeData(data);
    res.status(201).json(customer);
  }));

  app.put('/api/customers/:id', route(async (req, res) => {
    const data = await loadData();
    const idx = data.customers.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: NOT_FOUND });

    const existing = data.customers[idx];
    const today = localDateText();
    const { value, error } = checkCustomer(req.body, { existing, today, customers: data.customers });
    if (error) return res.status(400).json({ error });

    // `value` has only the fields that the staff can edit. The ID and the SMS
    // mark stay as they are in the file.
    let merged = { ...existing, ...value };

    // A new inspection date starts a new cycle: no SMS was sent for it yet.
    if (merged.lastServiceDate !== existing.lastServiceDate) {
      merged = startNewCycle(merged, merged.lastServiceDate);
    }
    // A new phone number: the SMS went to the wrong one (owner, 2026-11-15).
    if (merged.phone !== existing.phone) merged = startNewSend(merged);

    const updated = withComputed(merged, data, today);
    data.customers[idx] = updated;
    await writeData(data);
    res.json(updated);
  }));

  app.delete('/api/customers/:id', route(async (req, res) => {
    const data = await loadData();
    const idx = data.customers.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: NOT_FOUND });
    data.customers.splice(idx, 1);
    await writeData(data);
    res.json({ success: true });
  }));

  // One SMS for each yearly cycle. The engine refuses a second one.
  app.post('/api/customers/:id/send-sms', route(async (req, res) => {
    const result = await sendReminder(req.params.id);
    res.json({ success: true, ...result });
  }));

  // The SMS text for one customer. It changes nothing, but it is a POST.
  app.post('/api/preview-sms/:id', route(async (req, res) => {
    const data = await loadData();
    const customer = data.customers.find(c => c.id === req.params.id);
    if (!customer) return res.status(404).json({ error: NOT_FOUND });
    const body = buildSmsText(data.smsTemplate, customer);
    res.json({
      body,
      measure: measureSms(body),
      pricePerSegment: data.smsPricePerSegment,
    });
  }));

  // ─── State ─────────────────────────────────────────────────────────────────

  // "live" or "off" (no Twilio keys). The dashboard shows a banner when it is off.
  // `app` lets a second start see that our app runs on this port (lib/port.js).
  app.get('/api/status', (req, res) => {
    res.json({ app: APP_ID, smsMode: smsMode() });
  });

  // The rows of the Excel file that did not load (sheet, row, reason).
  app.get('/api/data-problems', route(async (req, res) => {
    const data = await readData();
    res.json({ problems: data.problems });
  }));

  // Where the data file is. "Настройки" shows the path (specs D29).
  app.get('/api/data-file', (req, res) => {
    res.json({ file: dataFile() });
  });

  // "Отвори папката": the file manager shows the data folder. The request
  // gives no path, so it cannot open a different folder.
  app.post('/api/data-file/open-folder', route(async (req, res) => {
    try {
      await openFolder();
    } catch (err) {
      console.error('[ПАПКА] Cannot open the data folder:', err.message);
      return res.status(500).json({ error: 'Папката не може да се отвори. Намерете я по пътя, написан в „Настройки“.' });
    }
    res.json({ success: true });
  }));

  // ─── Settings ──────────────────────────────────────────────────────────────

  app.get('/api/template', route(async (req, res) => {
    const data = await loadData();
    res.json({ template: data.smsTemplate, pricePerSegment: data.smsPricePerSegment });
  }));

  app.put('/api/template', route(async (req, res) => {
    const { value, error, unknownNames } = checkTemplate(req.body);
    if (error) return res.status(400).json({ error });
    const data = await loadData();
    data.smsTemplate = value.template;
    if (value.pricePerSegment !== null) data.smsPricePerSegment = value.pricePerSegment;
    await writeData(data);
    res.json({
      template: data.smsTemplate,
      pricePerSegment: data.smsPricePerSegment,
      unknownNames,
    });
  }));

  // The calendar of one year: the staff's days, the official days and the
  // weekly days off. With no `year`: this year.
  app.get('/api/holidays', route(async (req, res) => {
    const year = req.query.year === undefined
      ? Number(localDateText().slice(0, 4)) : Number(req.query.year);
    if (!Number.isInteger(year) || year < FIRST_YEAR || year > LAST_YEAR) {
      return res.status(400).json({ error: 'Невалидна година.' });
    }
    checkWhenDue();
    const data = await readData();
    res.json(holidayReply(data, year));
  }));

  // "Провери сега": the check runs now and the page waits for it.
  app.post('/api/holidays/check', route(async (req, res) => {
    const result = await runHolidayCheck({ force: true, ...holidayOptions });
    if (result.status === 'failed') return res.status(502).json({ error: result.error });
    res.json({ added: result.added, lastCheck: result.lastCheck });
  }));

  app.put('/api/holidays', route(async (req, res) => {
    const { value, error } = checkHolidays(req.body?.holidays);
    if (error) return res.status(400).json({ error });
    const data = await loadData();
    data.holidays = value;
    await writeData(data);
    res.json({ holidays: value });
  }));

  function holidayReply(data, year) {
    return {
      year,
      holidays: data.holidays,
      weeklyDaysOff: data.weeklyDaysOff,
      official: officialHolidays(year, data.officialHolidays),
      lastCheck: data.holidayCheckDate,
      // The years that the internet check confirmed. Other years: the law only.
      checkedYears: [...new Set(data.officialHolidays.map(h => Number(h.date.slice(0, 4))))].sort(),
      checkError: lastCheckError(),
    };
  }

  // An address that is not there gets JSON too, not the HTML page of Express.
  app.use('/api', (req, res) => res.status(404).json({ error: 'Невалидна заявка.' }));

  // ─── Errors ────────────────────────────────────────────────────────────────
  // The user sees a clear Bulgarian message. The stack trace stays in the console.
  app.use((err, req, res, next) => {
    if (err instanceof StoreError) {
      // 423 Locked: Excel has the file. 500: the file itself is wrong.
      return res.status(err.code === 'LOCKED' ? 423 : 500).json({ error: err.message, code: err.code });
    }
    if (err instanceof SendError) {
      const status = { NOT_FOUND: 404, EXPIRED: 409, ALREADY_SENT: 409, NO_KEYS: 503, SEND_FAILED: 502 }[err.code] || 500;
      return res.status(status).json({ error: err.message, code: err.code, sentAt: err.sentAt });
    }
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Невалидна заявка.' });
    }
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Заявката е твърде голяма.' });
    }
    console.error('[ГРЕШКА]', err);
    res.status(500).json({ error: 'Възникна грешка. Вижте черния прозорец на програмата.' });
  });

  return app;
}
