# 06 — Reminder logic: dates, yearly cycle, manual send

Needs: chapter 05. Open questions: Q3, Q5 in `README.md`.

## Bugs to fix

### Bug 1 — Dates are one day early
`toDateStr` (`server.js:114`) uses `toISOString()`, which is UTC. Sofia is 2 or 3 hours ahead of UTC. Local midnight is the day before in UTC.
Proof (run on 2026-11-13, time zone Europe/Sofia): last inspection `2026-04-13` gives next inspection `2027-04-12`.
The Sunday check uses local time and the text uses UTC, so the Sunday rule is also wrong.
The same pattern is in `scripts.js:8` (`TODAY`) and `scripts.js:408`.

**Fix:** new file `staff/lib/dates.js`. All dates are `YYYY-MM-DD` text. Convert with local parts only (`getFullYear`, `getMonth`, `getDate`). No `toISOString` for dates anywhere.

### Bug 2 — The reminder works only one time
After a send, `status` is `sent` for ever. Nothing sets it back to `pending`. No reminder the next year.

### Bug 3 — A send moves the inspection date
`send-sms` sets `lastServiceDate = nextServiceDate` (`server.js:251`). That says the car passed an inspection that did not happen yet.

### Bug 4 — A simulated SMS looks real
With no Twilio keys, the app logs to the console and marks the customer `sent` (`server.js:136`).

### Bug 5 — Send logic exists two times
Once in the route (`server.js:246`), once in the cron job (`server.js:355`).

## New model

**Stop storing `status`. Compute it.** Stored fields per customer:

| Field | Meaning |
|---|---|
| `lastServiceDate` | Date of the last real inspection. Only staff change it. |
| `smsSentAt` | When the reminder for the **present** cycle went out. Empty = not sent. |
| `smsSimulated` | `true` if that send was simulated. |

Computed on each read, in `staff/lib/reminders.js`:

| Value | Rule |
|---|---|
| `nextServiceDate` | `lastServiceDate` + 1 year. (29 Feb → 28 Feb.) This is the legal expiry date, so **do not** shift it for Sundays or holidays. |
| `nextReminderDate` | `nextServiceDate` − 7 days. If that is a Sunday or a holiday, go earlier to a work day. |
| `status` | `disabled` → if not active. `sent` → if `smsSentAt` is set. `overdue` → not sent and reminder date is before today. `due` → reminder date is today. `pending` → all others. |

**Decided 2026-11-13 (`specs.md` D6, D7):** the expiry date is the true date and never moves. Staff do not work on Sunday and Monday, so the reminder date moves earlier off those days too (Sunday → Saturday, Monday → Saturday). The weekly days off are a setting.

Old note: today the code shifts `nextServiceDate` forward off a Sunday. The SMS says "ГТП изтича {{serviceDate}}" (expires). An expiry date must be the true date. Confirm with the user in the session.

### The yearly cycle (Q3)
- "Изпрати" sets `smsSentAt`. It changes nothing else.
- New button **"Прегледът мина"**: staff give the inspection date (default today). The app sets `lastServiceDate` to it and clears `smsSentAt` and `smsSimulated`. The next cycle starts by itself.
- An edit of `Последен преглед` in Excel has the same effect: if `smsSentAt` is older than `lastServiceDate`, the app treats it as empty.

## Manual send only
- [x] Remove the cron block (`server.js:337–377`) and the `node-cron` package.
- [x] One function `sendReminder(customerId)` in `staff/lib/sms.js`. The route calls it.
- [x] Order inside it: check active → build text → send → save `smsSentAt`. If the save fails after a real send (Excel has the file open), tell the staff clearly: "SMS е изпратен, но не е записан". Better: check the file lock **before** the send.
- [x] No send two times: if `smsSentAt` is set, the route refuses unless the request has `force: true`. The dashboard asks "Вече е изпратен на ДАТА. Изпрати отново?".
- [x] Simulated mode: the response has `simulated: true`. The dashboard shows a yellow banner "ТЕСТОВ РЕЖИМ — SMS не се изпращат" at all times when there are no Twilio keys. Add `GET /api/status` that returns `{ smsMode: "live" | "simulated" }`.
- [x] Dashboard: default sort puts overdue first, then due today (it does this already). Overdue rows stay until staff send or disable. A missed day loses nothing.
- [x] Q5: bulk send is not in this chapter.

## Tests (`node --test`, file `staff/test/dates.test.js` and `reminders.test.js`)
- [x] `2026-04-13` → next `2027-04-13`, with `TZ=Europe/Sofia` and with `TZ=UTC`.
- [x] `2024-02-29` → next `2025-02-28`.
- [x] Reminder on a Sunday moves to Saturday. Reminder on a holiday moves earlier.
- [x] Each status rule, one test each.
- [x] "Прегледът мина" clears `smsSentAt` and moves the dates one year.
- [x] Send when disabled → refused. Second send without `force` → refused.

## Result (2026-11-14)

- Done in code. 68 tests pass with `TZ=Europe/Sofia`, `TZ=UTC` and `TZ=America/Los_Angeles`.
- New files: `staff/lib/reminders.js`, `staff/lib/sms.js`, `staff/test/reminders.test.js`, `staff/test/sms.test.js`.
- **Not built: the "Прегледът мина" button.** The owner said that a change of the last inspection date is enough (dashboard pencil or Excel). The logic is there (`startNewCycle`), and the edit route uses it. The owner will show screenshots before a decision on a button.
- Changed from the text above: an SMS from the **same day** as `lastServiceDate` also counts as old (not only an older one). Reason: SMS in the morning, inspection the same day, date typed in Excel. With "older" only, the customer shows "sent" for the whole next year and gets no reminder.
- `smsSimulated` is a new Excel column, "Тестов SMS" (optional on a read).
- The template fill is in `staff/public/sms-text.js` (`fillTemplate`). The engine and the settings preview use the same function.

## Owner checks

- [ ] Open the dashboard on test data (commands in `CLAUDE.md`). The yellow banner "ТЕСТОВ РЕЖИМ" shows.
- [ ] "Изпрати" on a row: the row shows "Изпратен (тест)" and goes down the list.
- [ ] "Изпрати отново" asks first.
- [ ] Pencil → new inspection date: the row shows "Очаква" with dates one year later.

## Done when
- All tests pass in both time zones.
- A customer goes through two yearly cycles in a test with no hand fix.
- There is no `cron`, no stored `status`, and no `toISOString().split('T')` in the code.
