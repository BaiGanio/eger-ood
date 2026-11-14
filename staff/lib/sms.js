// Build the SMS text and send it through Twilio.
//
// `sendReminder` is the one way an SMS goes out. A person starts it with a
// click. Nothing here runs on a timer (specs D4).

import { fillTemplate } from '../public/sms-text.js';
import { localDateText, localDateTimeText } from './dates.js';
import { markSent, sendBlock, withComputed } from './reminders.js';
import { assertWritable, readData, writeData } from './store.js';

/** An error with a clear Bulgarian message that the user can see. */
export class SendError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.name = 'SendError';
    // 'NOT_FOUND' | 'DISABLED' | 'ALREADY_SENT' | 'NO_KEYS' | 'SEND_FAILED' | 'NOT_SAVED'
    this.code = code;
    Object.assign(this, extra);
  }
}

/**
 * 'live' with Twilio keys in `.env`, 'off' with none.
 * There is no pretend send: an SMS that did not go out must never look sent.
 */
export function smsMode(env = process.env) {
  const sid = (env.TWILIO_ACCOUNT_SID || '').trim();
  const token = (env.TWILIO_AUTH_TOKEN || '').trim();
  const from = (env.TWILIO_PHONE_NUMBER || '').trim();
  // "AC_…" and "ACxxx…" are the placeholders of .env.example files.
  const placeholder = sid.startsWith('AC_') || /^ACx+$/i.test(sid);
  return sid && token && from && !placeholder ? 'live' : 'off';
}

export function buildSmsText(template, customer) {
  return fillTemplate(template, customer);
}

async function deliver(customer, text) {
  const { default: twilio } = await import('twilio');
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const message = await client.messages.create({
    body: text, from: process.env.TWILIO_PHONE_NUMBER, to: customer.phone,
  });
  // Live mode logs the ID and the SID only, never the phone with the text.
  console.log(`[SMS] Sent to customer ${customer.id}, SID ${message.sid}`);
  return { sid: message.sid };
}

/**
 * Send the reminder SMS to one customer and save the mark.
 *
 * Options: `force` sends again when an SMS already went out in this cycle.
 * `now` and `send` exist for the tests.
 * Returns `{ customer, sid }`. Throws a `SendError`, or a
 * `StoreError` when Excel has the file open.
 */
export async function sendReminder(customerId, { force = false, now = new Date(), send = null } = {}) {
  const data = await readData();
  const today = localDateText(now);
  const index = data.customers.findIndex(c => c.id === customerId);
  if (index === -1) throw new SendError('NOT_FOUND', 'Клиентът не е намерен. Презаредете страницата.');

  const customer = withComputed(data.customers[index], data, today);
  const block = sendBlock(customer, { force });
  if (block === 'DISABLED') {
    throw new SendError('DISABLED', 'Клиентът е деактивиран. Не се изпраща SMS.');
  }
  if (block === 'ALREADY_SENT') {
    throw new SendError('ALREADY_SENT', 'На този клиент вече е изпратен SMS.', { sentAt: customer.smsSentAt });
  }

  if (!send && smsMode() !== 'live') {
    throw new SendError('NO_KEYS', 'SMS не може да се изпрати: липсват ключовете за Twilio във файла .env.');
  }

  // Before the send, not after: a sent SMS is paid, and a locked file cannot
  // record it (specs section 7).
  await assertWritable();

  const text = buildSmsText(data.smsTemplate, customer);
  let result;
  try {
    result = await (send || deliver)(customer, text);
  } catch (err) {
    console.error(`[SMS] Send failed for customer ${customer.id}:`, err.message);
    throw new SendError('SEND_FAILED', 'SMS не е изпратен. Twilio върна грешка. Вижте черния прозорец на програмата.');
  }

  data.customers[index] = markSent(data.customers[index], localDateTimeText(now));
  try {
    await writeData(data);
  } catch (err) {
    console.error(`[SMS] Sent to customer ${customer.id} but not saved:`, err.message);
    throw new SendError('NOT_SAVED',
      'SMS е изпратен, но не е записан. Затворете файла в Excel. Не изпращайте втори път на този клиент.');
  }

  return {
    customer: withComputed(data.customers[index], data, today),
    sid: result.sid,
  };
}
