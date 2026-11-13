# 01 — Goals and design

No code in this chapter. It is the reference for all other chapters.

## A. Public site

### Goal
A customer finds the car service, sees what it does, sees when it is open, and calls.

### Not a goal
- No login. No staff link. No customer data. No SMS. No server.

### Design
- Static files only: HTML, CSS, images, one small script for the calendar.
- Folder `site/`. GitHub Pages serves it.
- Bootstrap and fonts come from a CDN (as today).
- The work-day calendar reads `site/holidays.json` (see Q2 in `README.md`).
- All paths are **relative** (`images/...`, not `/images/...`). GitHub Pages serves the site under `/eger-ood/`, so absolute paths break.
- Language: Bulgarian.

### Done when
- The site opens from a plain file host with no server.
- There is no `/app` link and no `/api/` call.
- Phone and email links match the visible text.

## B. Staff app

### Goal
Staff keep a list of customers and cars. The app shows who needs a reminder for the annual inspection (ГТП). Staff send the SMS with one click. Each SMS costs as little as possible.

### Not a goal (for now)
- No automatic sending. No cron.
- No use from more than one computer.
- No access from the internet.

### Design

```
 Browser (staff PC)                Local engine (Node)             Outside
 ┌──────────────────┐   HTTP      ┌─────────────────────┐
 │ ati.html         │ 127.0.0.1   │ server.js           │  HTTPS   ┌────────┐
 │ scripts.js       │ ──────────► │  routes             │ ───────► │ Twilio │
 │ sms-text.js      │             │  reminder logic     │          └────────┘
 └──────────────────┘             │  excel store        │
                                  └─────────┬───────────┘
                                            │ read / write
                                  ┌─────────▼───────────┐
                                  │ клиенти.xlsx        │ ◄── staff can also
                                  │ (the only store)    │     open it in Excel
                                  └─────────────────────┘
```

- Folder `staff/`.
- The engine listens on `127.0.0.1` only. It serves only `staff/public/`.
- The Twilio keys are in a `.env` file next to the app. They never reach the browser.
- The Excel file is the only store. The engine reads it fresh for each request, so hand edits show up after a page reload.
- The engine is split into small files:

| File | Job |
|---|---|
| `staff/server.js` | Start, routes, static files |
| `staff/lib/store.js` | Read, check, and write the Excel file |
| `staff/lib/dates.js` | All date math (no UTC tricks) |
| `staff/lib/reminders.js` | Who is due, who is overdue, what status a customer has |
| `staff/lib/sms.js` | Build the text, send through Twilio, simulated mode |
| `staff/public/sms-text.js` | SMS length and cost (shared by engine and browser) |

### How a normal day looks
1. Staff double-click the app. The browser opens the dashboard.
2. The top of the dashboard shows **"За днес"** and **"Просрочени"** (due today, overdue).
3. Staff click "Изпрати" on a row. A preview shows the text and the cost. Staff confirm.
4. The row becomes "Изпратен".
5. When the customer passes the inspection, staff click "Прегледът мина" and give the date. The next yearly cycle starts.

### Done when
- The app runs with no internet link to the public site and no shared file.
- A missed day loses nothing: overdue customers stay on the list until staff act.
- A simulated SMS (no Twilio keys) is clearly marked on screen.
- The Excel file survives: a daily backup exists and a broken row gives a clear message, not a crash.
