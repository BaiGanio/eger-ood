# ЕГЕР ООД — specs and rules

This file is the law for development. If a chapter file and this file disagree, this file wins. Change this file first, then the code.

Last update: 2026-11-14.

## 1. The product

ЕГЕР ООД is a family car service with more than 30 years of work. The repo holds two apps. They share nothing at run time.

| | Public site | Staff app |
|---|---|---|
| Folder | `site/` | `staff/` |
| Users | Customers, on the internet, mostly on phones | Staff, on one Windows PC |
| Job | Show what the company does, when it is open, how to call | Keep customers and cars. Show who needs a ГТП reminder. Send the SMS by hand. |
| Server | None. Static files. | Local Node server on `127.0.0.1` |
| Data | `site/holidays.json` only | One Excel file, `клиенти.xlsx` |
| Language | Bulgarian now. English later. | Bulgarian |

## 2. Decisions (do not reopen without the owner)

| # | Decision | Date |
|---|---|---|
| D1 | One repo, two folders: `site/` and `staff/`. | 2026-11-13 |
| D2 | The repo is **public**. No secret and no real customer data goes into git, ever. Private notes (`dev-notes/`, `plan/01-dev-notes/`) are git-ignored. | 2026-11-13 |
| D3 | The public site runs on **GitHub Pages** until the official domain exists. Then it moves to Cloudflare with that domain. All paths stay relative so both hosts work. | 2026-11-13 |
| D4 | No automatic SMS. Staff send each SMS by hand. No cron. | 2026-11-13 |
| D5 | One Excel file is the only data store. Staff can edit it by hand. | 2026-11-13 |
| D6 | The SMS shows the **true expiry date**: last inspection + 1 year. This date never moves. | 2026-11-13 |
| D7 | Staff do not work on **Sunday and Monday**. Saturday is a work day. A reminder never shows on a day off. It moves **earlier**. See section 5. | 2026-11-13 |
| D13 | After every file change the agent gives a commit message. The owner reviews and decides on the commit. | 2026-11-13 |
| D8 | The contact details that are visible on the public site are correct: `0887979373`, `031514709`, `eger@b-trust.org`. Links must match them. | 2026-11-13 |
| D9 | Holidays for the public site are made by a script **one time per year**. The script joins two sources: the law (fixed dates, Orthodox Easter, the weekend rule of Labour Code art. 154) and the Nager.Date API (one-time days off). It saves them to `site/holidays.json`. The site reads only that file. | 2026-11-13 |
| D10 | No framework and no build step. Plain HTML, CSS, JavaScript. Bootstrap from the CDN. | 2026-11-13 |
| D11 | The form of the staff guide (help page in the app, or one file) is decided with the staff at the end. | 2026-11-13 |
| D14 | The agricultural land work gets its own page, `site/zemya.html`, with a link from the main page. Not a section on the main page. | 2026-11-14 |
| D15 | The map on the public site is a visible map: Leaflet (cdnjs) + OpenStreetMap tiles. No cookies, no API key. Two buttons under it open Google Maps ("Отвори в Google Maps", "Упътване"). No Google embed, because it sets cookies (section 4). | 2026-11-14 |
| D16 | Wholesale fuels and lubricants get their own page, `site/goriva.html`, like D14. | 2026-11-14 |
| D18 | The public site has one style file, `site/css/site.css`, and one script file, `site/js/site.js` (home page). Bootstrap stays as the base (D10). The font is Sofia Sans (open licence), kept in `site/fonts/`, not loaded from a font service. Colours come from the station and the logo; each inner page changes one accent colour. The navbar and the footer are the same block on every page. | 2026-11-14 |
| D17 | The public site stays plain HTML (D10), also with more pages. No Angular or other app framework: a client-rendered app is worse for SEO and needs a build. If the copied navbar and footer become a pain (about 6+ pages), the next step is a static site generator, decided then. | 2026-11-14 |

## 3. Open questions

| # | Question | Default until answered |
|---|---|---|
| O2 | "Send to all due today" button? | No. One SMS at a time. |
| O3 | Where is the Excel file on the staff PC? | `Documents\ЕГЕР-Сервиз\клиенти.xlsx`. `EGER_DATA_DIR` overrides it. |
| O4 | Second customer table in settings: keep or remove? | Ask in chapter 08. |
| O5 | Extra pages that the staff want. | Wait for the talks with the staff. |

## 4. Architecture rules

### Public site
- Static files only. No `/api/` call. No link to the staff app.
- Mobile first. Check each change at 360 px width.
- All paths are relative (`images/a.jpg`, not `/images/a.jpg`).
- File names: Latin letters, no spaces.
- No form, no tracking, no cookies.
- All visible text sits in the HTML in a way that a second language can be added later (no text inside images, no text built in JavaScript).

### Staff app
- The engine listens on `127.0.0.1` only. It serves only `staff/public/`.
- One job per file. Layers go one way: `server.js` (routes) → `lib/reminders.js`, `lib/sms.js` → `lib/store.js`, `lib/dates.js`. A lower layer never imports a higher one.

| File | Job |
|---|---|
| `staff/server.js` | Start, routes, static files. No business logic. |
| `staff/lib/store.js` | The only code that touches the Excel file (repository pattern). |
| `staff/lib/dates.js` | All date math. Pure functions. |
| `staff/lib/reminders.js` | Status and due rules. Pure functions. |
| `staff/lib/sms.js` | Build text, send through Twilio. |
| `staff/lib/paths.js` | Data folder, backup folder, `.env` path. |
| `staff/public/sms-text.js` | SMS length, cost, template fill. Shared by engine and browser. |

- A value has one home. No number or text is written two times (example: the SMS price).
- Do not store what can be computed. `status`, `nextServiceDate`, `nextReminderDate` are computed on each read.

## 5. Date and reminder rules

- A date is `YYYY-MM-DD` text. Build it from local parts (`getFullYear`, `getMonth`, `getDate`). **Never** use `toISOString()` for a date.
- One exception, in `lib/dates.js` only: an Excel cell. Excel has no time zone, and `exceljs` gives a date cell as a `Date` whose **UTC** parts are the numbers in the cell. So a cell is read and written with UTC parts. Local parts move the day west of UTC. (Chapter 05, 2026-11-13.)
- `nextServiceDate` = `lastServiceDate` + 1 year. 29 Feb → 28 Feb. Never moved (D6).
- `nextReminderDate` = `nextServiceDate` − 7 days. If that day is a day off, go **earlier** to the nearest work day (D7).
- Days off = the weekly days off + the holiday list. Both are settings in the Excel file. Default weekly days off: Sunday, Monday.
- Examples: reminder on Sunday → Saturday. Reminder on Monday → Saturday. Saturday is a holiday too → Friday.
- Status, in this order: `disabled` → `sent` (`smsSentAt` is set, for the present cycle) → `overdue` (reminder date before today) → `due` (today) → `pending`.
- An SMS belongs to the present cycle only if its day is **after** `lastServiceDate`. An SMS from the day of the inspection or before it counts as empty. So a new date typed in Excel starts the next year with no other step (chapter 06, 2026-11-14).
- An overdue customer stays on the list until staff send or disable. A missed day loses nothing.
- "Изпрати" sets `smsSentAt` only. A new `lastServiceDate` (dashboard edit or Excel) clears it. That starts the next year. A separate "Прегледът мина" button is not built: the owner said on 2026-11-14 that the date edit is enough. He will show screenshots before a decision on the button.
- A second SMS in one cycle needs `force: true`. The dashboard asks first ("Вече е изпратен на ДАТА. Изпрати отново?").
- There is no simulated send. With no Twilio keys in `.env` the send is refused, nothing is saved, and the dashboard shows a banner. Tests of the real flow use the owner's Twilio developer account (owner, 2026-11-14).

## 6. Security rules

- **Secrets:** Twilio keys live in `.env` only. `.env` is in `.gitignore`. Keys never reach the browser and never go into a log. `.env.example` has empty values.
- **Data in git:** only invented test customers. Never a real name, phone, or plate. `staff/data/`, `backups/`, `*.xlsx` are in `.gitignore`.
- **Local server:** no `cors` package. Each `/api/*` request must have `Host` = `localhost:PORT` or `127.0.0.1:PORT`. A write request with a foreign `Origin` gets 403. A write request must be `Content-Type: application/json`.
- **Input:** the server checks every field. It accepts a fixed list of fields and ignores all others. Phone: `^\+[1-9]\d{7,14}$`. Dates: real `YYYY-MM-DD`. Body limit 100 kb.
- **Output:** all customer text goes through `escHtml` (it escapes `& < > " '`). No customer text inside an `onclick`. No inline `onclick` at all. A `Content-Security-Policy` header allows self and the CDN hosts only.
- **Logs:** in live mode, log the customer ID and the Twilio SID. Never the phone with the text.
- **Dependencies:** `npm audit` shows no high or critical finding before a release. Do not use the `xlsx` npm package. Use `exceljs`.
- **Errors:** the user sees a clear Bulgarian message. The stack trace stays in the console.

## 7. Data safety rules (Excel)

- Write to a temp file in the same folder, then rename it over the real file.
- Before the first write of each day, copy the file to `backups/`. Keep 30.
- Check the Excel lock **before** an SMS send, not after.
- A bad row gives a report with sheet, row, and reason. Good rows still load. Never a crash.
- `Телефон` is a text column.
- A write changes the workbook in place. Rows that did not load (bad rows) and columns that the staff added stay in the file.
- The file holds no computed column. "Следващ преглед" and "Напомняне на" show in the dashboard only (owner, 2026-11-13).

## 8. Code rules

- Node ESM (`import`), `async`/`await`. Plain JavaScript in the browser.
- Small functions. Logic that has a rule gets a pure function and a test.
- Browser: one `api(method, path, body)` helper. It checks `res.ok` and throws the server text. No empty `catch`.
- Code comments and identifiers in English. Text that the user sees in Bulgarian.
- A comment says **why**, not what.
- No new dependency without a reason written in the commit message.

## 9. Test rules

- Runner: `node --test`. Tests live in `staff/test/`.
- Date tests run in two time zones: `TZ=Europe/Sofia` and `TZ=UTC`.
- A bug fix comes with a test that fails before the fix.
- All tests pass before a commit.
- The test data file comes from `staff/tools/make-test-data.js`. It is never a copy of a real file.

## 10. Work rules

- One chapter = one work session. All work is on `master`. No chapter branches (owner, 2026-11-13).
- Before work: read `CLAUDE.md`, this file, `progress.md`, and the one chapter.
- Do only the work of that chapter. Write other findings into `progress.md` → "Found on the way".
- After work: tick the chapter checklist and update `progress.md`.
- Commit messages: one short line that says what changed, in English, imperative ("Fix date shift in dates.js").
- After every file change, give the owner a commit message for it. The owner reviews, then decides. Never commit or push without the owner's word.

## 11. Definition of done (every chapter)

1. The chapter's "Done when" list is true.
2. Tests pass.
3. No secret and no real data in the diff.
4. `progress.md` and the docs match the code.
