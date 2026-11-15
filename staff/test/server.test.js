// The routes and the request guard, against a real (temporary) Excel file.
// The server listens on a free port of 127.0.0.1. No SMS goes out: the Twilio
// keys are taken away.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../app.js';
import { refusalOf } from '../lib/guard.js';
import { addDays, localDateText } from '../lib/dates.js';
import { readData, writeData } from '../lib/store.js';

// A last inspection of 10 days ago: the expiry date is far in the future.
const recentDay = () => addDays(localDateText(), -10);

const TWILIO_KEYS = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'];

function customer(extra = {}) {
  return {
    id: 'c001', name: 'Test Client', phone: '+359880000001', address: '',
    carModel: 'Test Model', carPlate: 'PB0001TT',
    lastServiceDate: '2025-11-24', smsSentAt: '2025-11-25T10:00:00',
    ...extra,
  };
}

/** Start the app on a free port with one customer in a new data folder. */
async function start(t, appOptions = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'eger-server-'));
  process.env.EGER_DATA_DIR = dir;
  const saved = TWILIO_KEYS.map(key => [key, process.env[key]]);
  TWILIO_KEYS.forEach(key => delete process.env[key]);
  // A refused request prints a line. Keep the test output clean.
  t.mock.method(console, 'warn', () => {});

  await writeData({
    customers: [customer()],
    smsTemplate: 'Hi {{name}}', smsPricePerSegment: 0.1, holidays: [], weeklyDaysOff: [0, 1],
  });

  const server = http.createServer(createApp(appOptions));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    saved.forEach(([key, value]) => { if (value !== undefined) process.env[key] = value; });
    await fs.rm(dir, { recursive: true, force: true });
  });

  /** One request. `http.request`, not `fetch`: a test must set `Host`. */
  function call(method, url, { body, headers = {} } = {}) {
    const text = body === undefined ? null : (typeof body === 'string' ? body : JSON.stringify(body));
    const all = { Host: `localhost:${port}`, ...headers };
    if (text !== null && !('Content-Type' in all)) all['Content-Type'] = 'application/json';
    return new Promise((resolve, reject) => {
      const req = http.request({ host: '127.0.0.1', port, method, path: url, headers: all }, res => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', chunk => { raw += chunk; });
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(raw); } catch { /* not JSON: `raw` has the text */ }
          resolve({ status: res.statusCode, headers: res.headers, json, raw });
        });
      });
      req.on('error', reject);
      if (text !== null) req.write(text);
      req.end();
    });
  }
  return { call, port };
}

// ─── The guard, as a pure function ───────────────────────────────────────────

test('refusalOf: our own page passes', () => {
  assert.equal(refusalOf({ method: 'GET', host: 'localhost:3000' }, 3000), null);
  assert.equal(refusalOf({ method: 'GET', host: '127.0.0.1:3000' }, 3000), null);
  assert.equal(refusalOf({
    method: 'POST', host: 'localhost:3000', origin: 'http://localhost:3000',
    contentType: 'application/json; charset=utf-8',
  }, 3000), null);
});

test('refusalOf: foreign host, foreign origin, wrong type', () => {
  assert.equal(refusalOf({ method: 'GET', host: 'evil.example' }, 3000), 'HOST');
  assert.equal(refusalOf({ method: 'GET', host: 'localhost:9999' }, 3000), 'HOST');
  assert.equal(refusalOf({ method: 'GET', host: undefined }, 3000), 'HOST');
  assert.equal(refusalOf({ method: 'GET', host: 'localhost:3000', origin: 'https://evil.example' }, 3000), 'ORIGIN');
  assert.equal(refusalOf({ method: 'GET', host: 'localhost:3000', origin: 'null' }, 3000), 'ORIGIN');
  assert.equal(refusalOf({ method: 'POST', host: 'localhost:3000', contentType: 'text/plain' }, 3000), 'CONTENT_TYPE');
  assert.equal(refusalOf({ method: 'DELETE', host: 'localhost:3000' }, 3000), 'CONTENT_TYPE');
});

// ─── The guard, on the server ────────────────────────────────────────────────

test('a request with a foreign Host gets 403 and no data', async t => {
  const { call } = await start(t);
  const res = await call('GET', '/api/customers', { headers: { Host: 'evil.example' } });
  assert.equal(res.status, 403);
  assert.equal(res.json.customers, undefined);
});

test('a POST with a foreign Origin gets 403 and sends nothing', async t => {
  const { call } = await start(t);
  const res = await call('POST', '/api/customers/c001/send-sms',
    { body: {}, headers: { Origin: 'https://evil.example' } });
  assert.equal(res.status, 403);
});

test('a read with a foreign Origin gets 403, and no answer has a CORS header', async t => {
  const { call } = await start(t);
  const foreign = await call('GET', '/api/customers', { headers: { Origin: 'https://evil.example' } });
  assert.equal(foreign.status, 403);
  const own = await call('GET', '/api/customers');
  assert.equal(own.status, 200);
  assert.equal(own.headers['access-control-allow-origin'], undefined);
});

test('a write that is not JSON gets 415 (a plain web form)', async t => {
  const { call } = await start(t);
  const form = await call('POST', '/api/customers/c001/send-sms',
    { body: 'force=true', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  assert.equal(form.status, 415);
  const text = await call('DELETE', '/api/customers/c001', { headers: { 'Content-Type': 'text/plain' } });
  assert.equal(text.status, 415);
  assert.equal((await readData()).customers.length, 1);
});

test('our own page can read and write', async t => {
  const { call, port } = await start(t);
  const read = await call('GET', '/api/customers');
  assert.equal(read.status, 200);
  assert.equal(read.json.customers.length, 1);
  const write = await call('PUT', '/api/customers/c001',
    { body: { name: 'New Name' }, headers: { Host: `127.0.0.1:${port}`, Origin: `http://127.0.0.1:${port}` } });
  assert.equal(write.status, 200);
  assert.equal(write.json.name, 'New Name');
});

test('the old "disabled" route is gone', async t => {
  const { call } = await start(t);
  const res = await call('PATCH', '/api/customers/c001/toggle-disabled', { body: {} });
  assert.equal(res.status, 404);
});

test('each answer has the security headers', async t => {
  const { call } = await start(t);
  const page = await call('GET', '/');
  assert.equal(page.status, 200);
  const csp = page.headers['content-security-policy'];
  assert.match(csp, /script-src 'self' https:\/\/cdn\.jsdelivr\.net;/);
  assert.doesNotMatch(csp.split(';').find(part => part.includes('script-src')), /unsafe-inline/);
  assert.equal(page.headers['x-content-type-options'], 'nosniff');
  assert.equal(page.headers['x-powered-by'], undefined);
});

test('the dashboard page has no inline script and no inline handler', async t => {
  const { call } = await start(t);
  const page = (await call('GET', '/')).raw;
  assert.doesNotMatch(page, /\son[a-z]+\s*=/i);
  assert.doesNotMatch(page, /<script(?![^>]*\ssrc=)/i);
  const script = (await call('GET', '/scripts.js')).raw;
  assert.doesNotMatch(script, /\son(click|input|change)\s*=/i);
});

test('only public/ is served', async t => {
  const { call } = await start(t);
  for (const url of ['/server.js', '/app.js', '/.env', '/package.json', '/lib/store.js', '/../server.js']) {
    assert.equal((await call('GET', url)).status, 404, url);
  }
});

// ─── The input checks, on the server ─────────────────────────────────────────

test('PUT cannot change the ID or the SMS mark, and saves no other field', async t => {
  const { call } = await start(t);
  const res = await call('PUT', '/api/customers/c001',
    { body: { id: 'x', smsSentAt: '2000-01-01', disabled: true, name: 'New Name' } });
  assert.equal(res.status, 200);
  const saved = (await readData()).customers[0];
  assert.equal(saved.id, 'c001');
  assert.equal(saved.smsSentAt, '2025-11-25T10:00:00');
  assert.equal('disabled' in saved, false);
  assert.equal(saved.name, 'New Name');
});

test('PUT cleans the plate and a new date starts a new cycle', async t => {
  const { call } = await start(t);
  const res = await call('PUT', '/api/customers/c001',
    { body: { carPlate: 'pb 1234 ab', lastServiceDate: '2026-11-02' } });
  assert.equal(res.status, 200);
  const saved = (await readData()).customers[0];
  assert.equal(saved.carPlate, 'PB1234AB');
  assert.equal(saved.smsSentAt, null);
});

test('a bad phone gets 400 with a Bulgarian message, and nothing is saved', async t => {
  const { call } = await start(t);
  const put = await call('PUT', '/api/customers/c001', { body: { phone: '0880000001' } });
  assert.equal(put.status, 400);
  assert.match(put.json.error, /Телефонът/);
  const post = await call('POST', '/api/customers', { body: { ...customer(), phone: 'abc' } });
  assert.equal(post.status, 400);
  assert.match(post.json.error, /Телефонът/);
  const data = await readData();
  assert.equal(data.customers.length, 1);
  assert.equal(data.customers[0].phone, '+359880000001');
});

test('POST makes a customer with its own ID and no SMS mark', async t => {
  const { call } = await start(t);
  const res = await call('POST', '/api/customers',
    { body: { ...customer({ name: 'Second Client' }), id: 'c001', smsSentAt: '2026-01-01T10:00:00', disabled: true } });
  assert.equal(res.status, 201);
  assert.notEqual(res.json.id, 'c001');
  assert.equal(res.json.smsSentAt, null);
  assert.equal('disabled' in res.json, false);
});

test('a future inspection date gets 400', async t => {
  const { call } = await start(t);
  const res = await call('PUT', '/api/customers/c001', { body: { lastServiceDate: '2999-01-01' } });
  assert.equal(res.status, 400);
  assert.match(res.json.error, /бъдещето/);
});

test('holidays: a bad entry gets 400, a good list is saved', async t => {
  const { call } = await start(t);
  const bad = await call('PUT', '/api/holidays', { body: { holidays: ['2026-12-25', 'x'] } });
  assert.equal(bad.status, 400);
  assert.deepEqual((await readData()).holidays, []);
  const good = await call('PUT', '/api/holidays', { body: { holidays: ['2026-12-25', '2026-03-03'] } });
  assert.equal(good.status, 200);
  assert.deepEqual((await readData()).holidays, ['2026-03-03', '2026-12-25']);
});

test('holidays: the calendar of a year has the law days and the weekly days off', async t => {
  const { call } = await start(t);
  const res = await call('GET', '/api/holidays?year=2028');
  assert.equal(res.status, 200);
  assert.equal(res.json.year, 2028);
  assert.deepEqual(res.json.weeklyDaysOff, [0, 1]);
  assert.ok(res.json.official.some(h => h.date === '2028-03-03' && h.name));
  assert.deepEqual(res.json.checkedYears, []);
  assert.equal(res.json.lastCheck, null);
  for (const year of ['1999', '2100', 'abc', '2027.5']) {
    assert.equal((await call('GET', `/api/holidays?year=${year}`)).status, 400, year);
  }
});

test('holidays: "Провери сега" saves the checked days; a failed check gets 502', async t => {
  const { resetCheckState } = await import('../lib/holiday-check.js');
  resetCheckState();
  t.mock.method(console, 'log', () => {});
  t.mock.method(console, 'error', () => {});
  const year = Number(localDateText().slice(0, 4));
  let online = true;
  const fetchHolidays = async url => {
    if (!online) throw new Error('offline');
    const y = Number(url.split('/').at(-2));
    return { ok: true, json: async () => [{ date: `${y}-01-02`, localName: 'Extra', types: ['Public'] }] };
  };
  const { call } = await start(t, { fetchHolidays });
  const res = await call('POST', '/api/holidays/check', { body: {} });
  assert.equal(res.status, 200);
  assert.equal(res.json.lastCheck, localDateText());
  const cal = await call('GET', `/api/holidays?year=${year}`);
  assert.deepEqual(cal.json.checkedYears, [year, year + 1]);
  assert.ok(cal.json.official.some(h => h.date === `${year}-01-02` && h.fromCheck));

  online = false;
  const failed = await call('POST', '/api/holidays/check', { body: {} });
  assert.equal(failed.status, 502);
  assert.match(failed.json.error, /Няма връзка/);
  assert.ok((await readData()).officialHolidays.length > 0);
});

test('template: too long gets 400, unknown names come back as a warning', async t => {
  const { call } = await start(t);
  const long = await call('PUT', '/api/template', { body: { template: 'a'.repeat(501) } });
  assert.equal(long.status, 400);
  const res = await call('PUT', '/api/template', { body: { template: 'Hi {{name}} {{nam}}' } });
  assert.equal(res.status, 200);
  assert.deepEqual(res.json.unknownNames, ['nam']);
  assert.equal((await readData()).smsTemplate, 'Hi {{name}} {{nam}}');
});

test('a broken body and a body over 100 kb get a Bulgarian message', async t => {
  const { call } = await start(t);
  const broken = await call('PUT', '/api/customers/c001', { body: '{"name":' });
  assert.equal(broken.status, 400);
  assert.ok(broken.json.error);
  const big = await call('PUT', '/api/template', { body: { template: 'a'.repeat(200 * 1024) } });
  assert.equal(big.status, 413);
  assert.ok(big.json.error);
});

test('with no Twilio keys the send is refused and nothing is saved', async t => {
  const { call } = await start(t);
  // An inspection of some days ago: the customer is not sent and not expired.
  await call('PUT', '/api/customers/c001', { body: { lastServiceDate: recentDay() } });
  const res = await call('POST', '/api/customers/c001/send-sms', { body: {} });
  assert.equal(res.status, 503);
  assert.equal((await readData()).customers[0].smsSentAt, null);
});

test('`force` does not send a second SMS: 409, also with no check of the keys', async t => {
  const { call } = await start(t);
  await call('PUT', '/api/customers/c001', { body: { lastServiceDate: recentDay() } });
  const data = await readData();
  data.customers[0].smsSentAt = `${localDateText()}T10:00:00`;
  await writeData(data);

  const res = await call('POST', '/api/customers/c001/send-sms', { body: { force: true } });
  assert.equal(res.status, 409);
  assert.equal(res.json.code, 'ALREADY_SENT');
});

test('a send after the expiry date gets 409', async t => {
  const { call } = await start(t);
  const data = await readData();
  data.customers[0].lastServiceDate = '2020-01-10';
  data.customers[0].smsSentAt = null;
  await writeData(data);
  const res = await call('POST', '/api/customers/c001/send-sms', { body: {} });
  assert.equal(res.status, 409);
  assert.equal(res.json.code, 'EXPIRED');
});

test('PUT with a new phone clears the SMS mark; the same phone keeps it', async t => {
  const { call } = await start(t);
  await call('PUT', '/api/customers/c001', { body: { phone: '+359880000001', name: 'Same Phone' } });
  assert.equal((await readData()).customers[0].smsSentAt, '2025-11-25T10:00:00');
  // The staff type the same number with spaces: it is not a new number.
  await call('PUT', '/api/customers/c001', { body: { phone: '+359 880 000 001' } });
  assert.equal((await readData()).customers[0].smsSentAt, '2025-11-25T10:00:00');

  const res = await call('PUT', '/api/customers/c001', { body: { phone: '+359880000002' } });
  assert.equal(res.status, 200);
  assert.equal((await readData()).customers[0].smsSentAt, null);
});
