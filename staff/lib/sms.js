// Build the SMS text and send it through Twilio.
//
// `sendReminder` is the one way an SMS goes out. A person starts it with a
// click. Nothing here runs on a timer (specs D4).

import { fillTemplate } from '../public/sms-text.js';
import { localDateText, localDateTimeText } from './dates.js';
import { markSent, sendBlock, withComputed } from './reminders.js';
import { addPendingSend, assertWritable, readData, writeData } from './store.js';

/** An error with a clear Bulgarian message that the user can see. */
export class SendError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.name = 'SendError';
    // 'NOT_FOUND' | 'EXPIRED' | 'ALREADY_SENT' | 'NO_KEYS' | 'SEND_FAILED' | 'NOT_SAVED'
    this.code = code;
    Object.assign(this, extra);
  }
}

/**
 * 'live' with Twilio keys in `настройки.env` or `.env`, 'off' with none.
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

const SAVE_TRIES = 4; // the first save and 3 more

/** True when the file took the data. Excel can let go of the file in a moment. */
async function saveWithRetry(data, delayMs) {
  for (let attempt = 1; attempt <= SAVE_TRIES; attempt++) {
    try {
      await writeData(data);
      return true;
    } catch (err) {
      console.error(`[SMS] Save ${attempt} of ${SAVE_TRIES} failed:`, err.message);
      if (attempt < SAVE_TRIES) await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return false;
}

/**
 * Send the reminder SMS to one customer and save the mark.
 *
 * A second SMS in one cycle and an SMS after the expiry date are refused.
 * The options `now`, `send` and `retryDelayMs` exist for the tests.
 * Returns `{ customer, sid, savedLater }`. `savedLater`: the SMS went out, the
 * Excel file was busy, and the mark waits for the next read (specs D30). Throws a `SendError`, or a
 * `StoreError` when Excel has the file open.
 */
export async function sendReminder(customerId, { now = new Date(), send = null, retryDelayMs = 1000 } = {}) {
  const data = await readData();
  const today = localDateText(now);
  const index = data.customers.findIndex(c => c.id === customerId);
  if (index === -1) throw new SendError('NOT_FOUND', 'Клиентът не е намерен. Презаредете страницата.');

  const customer = withComputed(data.customers[index], data, today);
  const block = sendBlock(customer, today);
  if (block === 'EXPIRED') {
    throw new SendError('EXPIRED', 'Срокът на прегледа е изтекъл. Не се изпраща SMS.');
  }
  if (block === 'ALREADY_SENT') {
    throw new SendError('ALREADY_SENT', 'На този клиент вече е изпратен SMS.', { sentAt: customer.smsSentAt });
  }

  if (!send && smsMode() !== 'live') {
    throw new SendError('NO_KEYS', 'SMS не може да се изпрати: липсват ключовете за Twilio във файла „настройки.env“.');
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

  const sentAt = localDateTimeText(now);
  data.customers[index] = markSent(data.customers[index], sentAt);
  // The SMS is paid now. The mark must not get lost (specs D30).
  const savedLater = !(await saveWithRetry(data, retryDelayMs));
  if (savedLater) {
    try {
      await addPendingSend(customer.id, sentAt);
    } catch (err) {
      console.error(`[SMS] Sent to customer ${customer.id} but not saved:`, err.message);
      throw new SendError('NOT_SAVED',
        'SMS е изпратен, но не е записан. Затворете файла в Excel. Не изпращайте втори път на този клиент.');
    }
    console.warn(`[SMS] Sent to customer ${customer.id}. The Excel file is busy: the mark waits in the data folder.`);
  }

  return {
    customer: withComputed(data.customers[index], data, today),
    sid: result.sid,
    savedLater,
  };
}
