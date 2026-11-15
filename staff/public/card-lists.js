// The lists behind the cards "Очакващи SMS", "Изпратени SMS",
// "Очаквани за преглед" and "Просрочени" (specs D22).
// Shared by the browser and the tests.
//
// Each card has a period. The card shows the count for that period, and a
// click on the card shows the same customers in the table (staff requests,
// 2026-11-15). A period is a number of calendar days: "1 месец" = 30.
// All dates are "YYYY-MM-DD" text, so a text compare is a date compare.

/** "Очакващи SMS": days after today. 0 = today only. */
export const SEND_PERIODS = [0, 7, 10, 30];

/** "Изпратени SMS": days before today. 0 = today only. */
export const SENT_PERIODS = [0, 7, 10, 30, 90, 180, 270, 365];

/** "Очаквани за преглед": days after today. 0 = today only. */
export const COMING_PERIODS = [0, 7, 10, 30];

/** "Просрочени": days before today. The default is the last week. */
export const OVERDUE_PERIODS = [7, 10, 30, 90, 180, 270, 365];

/**
 * The send list up to the day `untilDate`: the SMS of today, plus the
 * "Очаква" customers whose reminder day comes by then. The staff send in
 * advance before a holiday. The reminder date counts, because that is the
 * day the SMS must go out.
 */
export function inSendList(customer, untilDate) {
  if (customer.status === 'due') return true;
  return customer.status === 'pending' && customer.nextReminderDate <= untilDate;
}

/**
 * The customers who got the SMS on `sinceDate` or later. The status does
 * not count: an SMS that went out stays sent, also when the customer is
 * now "Просрочен". The engine gives `smsSentAt` only for the present cycle.
 */
export function inSentList(customer, sinceDate) {
  return Boolean(customer.smsSentAt) && customer.smsSentAt.slice(0, 10) >= sinceDate;
}

/**
 * The customers who got the SMS of this cycle and whose expiry date is from
 * `today` to `untilDate`: the staff wait for them. A customer with no SMS
 * ("За днес", "Очаква") did not hear from us, so the staff do not wait for
 * him (staff requests, 2026-11-15). "Изпратен" = SMS of this cycle and the
 * expiry date is not past (lib/reminders.js, statusOf).
 */
export function inComingList(customer, today, untilDate) {
  return customer.status === 'sent' &&
    customer.nextServiceDate >= today && customer.nextServiceDate <= untilDate;
}

/** The overdue customers whose expiry date is on or after `sinceDate`. */
export function inOverdueList(customer, sinceDate) {
  return customer.status === 'overdue' && customer.nextServiceDate >= sinceDate;
}
