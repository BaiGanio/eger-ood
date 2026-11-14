// The send flow against a real (temporary) Excel file. No SMS goes out:
// each test gives its own `send` function, and the Twilio keys are taken away.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { SendError, buildSmsText, sendReminder, smsMode } from '../lib/sms.js';
import { startNewCycle, withComputed } from '../lib/reminders.js';
import { StoreError, readData, writeData } from '../lib/store.js';
import { lockFile } from '../lib/paths.js';

const TWILIO_KEYS = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'];

async function freshFolder(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'eger-sms-'));
  process.env.EGER_DATA_DIR = dir;
  // The tests must never reach Twilio, also on a computer that has keys.
  const saved = TWILIO_KEYS.map(key => [key, process.env[key]]);
  TWILIO_KEYS.forEach(key => delete process.env[key]);
  t.after(async () => {
    saved.forEach(([key, value]) => { if (value !== undefined) process.env[key] = value; });
    await fs.rm(dir, { recursive: true, force: true });
  });
  // A failed send prints to the console. Keep the test output clean.
  t.mock.method(console, 'error', () => {});
}

function customer(extra = {}) {
  return {
    id: 'c001', name: 'Тест Клиент', phone: '+359880000001', address: '',
    carModel: 'Тест Модел', carPlate: 'PB 0001 TT',
    lastServiceDate: '2025-11-24', smsSentAt: null, disabled: false,
    ...extra,
  };
}

async function seed(...customers) {
  await writeData({
    customers,
    smsTemplate: 'ГТП на {{carPlate}} изтича {{serviceDate}}',
    smsPricePerSegment: 0.1,
    weeklyDaysOff: [0, 1],
    holidays: [],
  });
}

/** A `send` function that records its calls and sends nothing. */
function fakeSend() {
  const calls = [];
  const send = async (c, text) => { calls.push({ id: c.id, text }); return { sid: 'SM_TEST' }; };
  return { calls, send };
}

const at = (y, m, d, h = 10) => new Date(y, m - 1, d, h, 0, 0);

test('smsMode is off with no keys or with placeholder keys', () => {
  assert.equal(smsMode({}), 'off');
  assert.equal(smsMode({ TWILIO_ACCOUNT_SID: 'AC_your_sid', TWILIO_AUTH_TOKEN: 'x', TWILIO_PHONE_NUMBER: '+1' }), 'off');
  assert.equal(smsMode({ TWILIO_ACCOUNT_SID: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', TWILIO_AUTH_TOKEN: 'x', TWILIO_PHONE_NUMBER: '+1' }), 'off');
  assert.equal(smsMode({ TWILIO_ACCOUNT_SID: 'AC0123456789abcdef', TWILIO_AUTH_TOKEN: '' , TWILIO_PHONE_NUMBER: '+1' }), 'off');
  assert.equal(smsMode({ TWILIO_ACCOUNT_SID: 'AC0123456789abcdef', TWILIO_AUTH_TOKEN: 'x', TWILIO_PHONE_NUMBER: '+1' }), 'live');
});

test('the SMS text shows the true expiry date', () => {
  const c = withComputed(customer({ lastServiceDate: '2025-11-15' }), { weeklyDaysOff: [0, 1], holidays: [] }, '2026-11-01');
  // 15.11.2026 is a Sunday. The date in the SMS does not move.
  assert.equal(buildSmsText('ГТП на {{carPlate}} изтича {{serviceDate}}', c), 'ГТП на PB 0001 TT изтича 15.11.2026');
});

test('a send saves the SMS mark and does not move the inspection date', async t => {
  await freshFolder(t);
  await seed(customer());
  const { calls, send } = fakeSend();

  const result = await sendReminder('c001', { now: at(2026, 11, 17), send });

  assert.deepEqual(calls, [{ id: 'c001', text: 'ГТП на PB 0001 TT изтича 24.11.2026' }]);
  assert.equal(result.sid, 'SM_TEST');
  assert.equal(result.customer.status, 'sent');
  const saved = (await readData()).customers[0];
  assert.equal(saved.smsSentAt, '2026-11-17T10:00:00');
  assert.equal(saved.lastServiceDate, '2025-11-24');
});

test('with no Twilio keys the send is refused, and the customer is not marked', async t => {
  await freshFolder(t);
  await seed(customer());

  await assert.rejects(sendReminder('c001', { now: at(2026, 11, 17) }),
    err => err instanceof SendError && err.code === 'NO_KEYS');
  assert.equal((await readData()).customers[0].smsSentAt, null);
});

test('send to a disabled customer is refused, and nothing goes out', async t => {
  await freshFolder(t);
  await seed(customer({ disabled: true }));
  const { calls, send } = fakeSend();

  await assert.rejects(sendReminder('c001', { force: true, now: at(2026, 11, 17), send }),
    err => err instanceof SendError && err.code === 'DISABLED');
  assert.equal(calls.length, 0);
});

test('a second send is refused without force, and works with force', async t => {
  await freshFolder(t);
  await seed(customer());
  const { calls, send } = fakeSend();
  await sendReminder('c001', { now: at(2026, 11, 17), send });

  await assert.rejects(sendReminder('c001', { now: at(2026, 11, 18), send }),
    err => err instanceof SendError && err.code === 'ALREADY_SENT' && err.sentAt === '2026-11-17T10:00:00');
  assert.equal(calls.length, 1);

  await sendReminder('c001', { force: true, now: at(2026, 11, 18), send });
  assert.equal(calls.length, 2);
  assert.equal((await readData()).customers[0].smsSentAt, '2026-11-18T10:00:00');
});

test('an unknown customer is refused', async t => {
  await freshFolder(t);
  await seed(customer());
  await assert.rejects(sendReminder('nobody', { send: fakeSend().send }),
    err => err instanceof SendError && err.code === 'NOT_FOUND');
});

test('Excel has the file open: the check comes before the send, nothing goes out', async t => {
  await freshFolder(t);
  await seed(customer());
  await fs.writeFile(lockFile(), '');
  const { calls, send } = fakeSend();

  await assert.rejects(sendReminder('c001', { now: at(2026, 11, 17), send }),
    err => err instanceof StoreError && err.code === 'LOCKED');
  assert.equal(calls.length, 0);
});

test('Twilio fails: a clear message, and the customer is not marked', async t => {
  await freshFolder(t);
  await seed(customer());
  const send = async () => { throw new Error('twilio is down'); };

  await assert.rejects(sendReminder('c001', { now: at(2026, 11, 17), send }),
    err => err instanceof SendError && err.code === 'SEND_FAILED');
  assert.equal((await readData()).customers[0].smsSentAt, null);
});

test('the file locks during the send: the message says sent but not saved', async t => {
  await freshFolder(t);
  await seed(customer());
  // Excel opens the file in the moment between the check and the save.
  const send = async () => { await fs.writeFile(lockFile(), ''); return { sid: 'SM_TEST' }; };

  await assert.rejects(sendReminder('c001', { now: at(2026, 11, 17), send }),
    err => err instanceof SendError && err.code === 'NOT_SAVED' && err.message.includes('SMS е изпратен, но не е записан'));
});

test('two yearly cycles with no hand fix', async t => {
  await freshFolder(t);
  await seed(customer()); // last inspection 24.11.2025
  const { calls, send } = fakeSend();
  const view = async today => {
    const data = await readData();
    return withComputed(data.customers[0], data, today);
  };
  // The staff write the new inspection date (dashboard edit or Excel).
  const inspectionPassed = async date => {
    const data = await readData();
    data.customers[0] = startNewCycle(data.customers[0], date);
    await writeData(data);
  };

  // Year 1: expiry 24.11.2026, reminder 17.11.2026.
  assert.equal((await view('2026-11-16')).status, 'pending');
  assert.equal((await view('2026-11-17')).status, 'due');
  assert.equal((await view('2026-11-19')).status, 'overdue');
  await sendReminder('c001', { now: at(2026, 11, 19), send });
  assert.equal((await view('2026-11-19')).status, 'sent');
  assert.equal((await view('2026-11-19')).nextServiceDate, '2026-11-24');

  // The customer comes 10 days later. The staff write the new date.
  await inspectionPassed('2026-11-29');
  let c = await view('2026-11-29');
  assert.equal(c.status, 'pending');
  assert.equal(c.nextServiceDate, '2027-11-29');
  // 22.11.2027 is a Monday → Saturday 20.11.2027.
  assert.equal(c.nextReminderDate, '2027-11-20');

  // Year 2.
  assert.equal((await view('2027-11-19')).status, 'pending');
  assert.equal((await view('2027-11-20')).status, 'due');
  await sendReminder('c001', { now: at(2027, 11, 20), send });
  assert.equal((await view('2027-11-20')).status, 'sent');
  assert.equal(calls[1].text, 'ГТП на PB 0001 TT изтича 29.11.2027');

  await inspectionPassed('2027-11-26');
  c = await view('2027-11-26');
  assert.equal(c.status, 'pending');
  assert.equal(c.nextServiceDate, '2028-11-26');
});
