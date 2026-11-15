// The lists behind the cards "Очакващи SMS" and "Просрочени" (specs D22).
// Shared by the browser and the tests.
//
// Each card has a period. The card shows the count for that period, and a
// click on the card shows the same customers in the table (staff requests,
// 2026-11-15). A period is a number of calendar days: "1 месец" = 30.

/** "Очакващи SMS": days after today. 0 = today only. */
export const SEND_PERIODS = [0, 7, 10, 30];

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

/** The overdue customers whose expiry date is on or after `sinceDate`. */
export function inOverdueList(customer, sinceDate) {
  return customer.status === 'overdue' && customer.nextServiceDate >= sinceDate;
}
