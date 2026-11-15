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

/** `sent` → `overdue` → `due` → `pending`. The order is the rule. */
export function statusOf(customer, reminderDate, today) {
  if (sentInThisCycle(customer)) return 'sent';
  if (reminderDate < today) return 'overdue';
  if (reminderDate === today) return 'due';
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
    status: statusOf(customer, reminderDate, today),
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

/**
 * Why a send must not go out: 'ALREADY_SENT', or null (send it).
 * `force` lets the staff send a second SMS on purpose.
 */
export function sendBlock(customer, { force = false } = {}) {
  if (sentInThisCycle(customer) && !force) return 'ALREADY_SENT';
  return null;
}
