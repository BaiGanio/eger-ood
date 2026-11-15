// Status and due rules. Pure functions (specs section 5).
//
// The file stores only what the staff or the app enter: `lastServiceDate`,
// `smsSentAt`. All other values are computed here
// on each read, so they can never go out of step with the file.

import { addDays, addYears, workDayOnOrBefore } from './dates.js';

export const REMINDER_DAYS_BEFORE = 7;

/** The legal expiry date. It never moves off a day off (specs D6). */
export function nextServiceDate(lastServiceDate) {
  return addYears(lastServiceDate, 1);
}

/** The day the staff send the SMS: 7 days before the expiry, on a work day. */
export function nextReminderDate(serviceDate, { weeklyDaysOff = [], holidays = [] } = {}) {
  return workDayOnOrBefore(addDays(serviceDate, -REMINDER_DAYS_BEFORE), weeklyDaysOff, holidays);
}

/**
 * True when the saved SMS belongs to the present yearly cycle.
 *
 * The staff can type a new inspection date directly in Excel. Then the old
 * `smsSentAt` stays in the file. An SMS from the day of the inspection or
 * before it was for the old cycle, so it does not count.
 */
export function sentInThisCycle(customer) {
  if (!customer.smsSentAt) return false;
  return customer.smsSentAt.slice(0, 10) > customer.lastServiceDate;
}

/**
 * `overdue` → `sent` → `due` → `pending`. The order is the rule.
 *
 * `overdue`: the expiry date is past and the staff typed no new inspection.
 * It wins over `sent`: the staff must see who did not come.
 * `due`: the SMS is necessary now. It stays from the reminder day to the
 * expiry day, so a missed day loses nothing.
 */
export function statusOf(customer, { serviceDate, reminderDate }, today) {
  if (serviceDate < today) return 'overdue';
  if (sentInThisCycle(customer)) return 'sent';
  if (reminderDate <= today) return 'due';
  return 'pending';
}

/** The customer with the computed values, as the dashboard gets it. */
export function withComputed(customer, settings, today) {
  const serviceDate = nextServiceDate(customer.lastServiceDate);
  const reminderDate = nextReminderDate(serviceDate, settings);
  const sent = sentInThisCycle(customer);
  return {
    ...customer,
    smsSentAt: sent ? customer.smsSentAt : null,
    nextServiceDate: serviceDate,
    nextReminderDate: reminderDate,
    status: statusOf(customer, { serviceDate, reminderDate }, today),
  };
}

/** A new inspection date starts the next year: no SMS went out for it yet. */
export function startNewCycle(customer, inspectionDate) {
  return { ...customer, lastServiceDate: inspectionDate, smsSentAt: null };
}

/** A send changes only the SMS mark. The inspection date stays. */
export function markSent(customer, sentAt) {
  return { ...customer, smsSentAt: sentAt };
}

/** A new phone number: the SMS went to the wrong one. The staff can send again. */
export function startNewSend(customer) {
  return { ...customer, smsSentAt: null };
}

/**
 * Why a send must not go out: 'EXPIRED', 'ALREADY_SENT', or null (send it).
 * One SMS for each yearly cycle. No SMS after the expiry date.
 */
export function sendBlock(customer, today) {
  if (nextServiceDate(customer.lastServiceDate) < today) return 'EXPIRED';
  if (sentInThisCycle(customer)) return 'ALREADY_SENT';
  return null;
}
