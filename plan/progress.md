# ЕГЕР ООД — progress

Update this file at the end of each work session. Rules are in `specs.md`.

Last update: 2026-11-15.

## Where we are

**Now:** chapter 07 (security) is done in code and waits for the owner's commit and his checks in the browser (`07-security.md`, "Owner checks"). Chapter 08 staff requests are done in code. Chapter 06 (reminder logic) is done in code. It waits for the owner's commit, his checks in the browser, and his screenshots about the "Прегледът мина" button. Chapter 05 waits for the checks with real Excel on Windows. Chapter 04 waits for the checks on the live URL. **Next:** the rest of chapter 08 (dashboard cleanup).

## Chapters

Status: ⬜ not started · 🟨 in work · ✅ done

| # | Chapter | Status | Notes |
|---|---|---|---|
| 00 | Project docs (`specs.md`, `progress.md`, `CLAUDE.md`, `README.md`) | ✅ | 2026-11-13. |
| 01 | Goals and design | ✅ | Reference only. No code. |
| 02 | Baseline commit | ✅ | Work is in `59593fe`. |
| 03 | Split repo into `site/` and `staff/` | ✅ | 2026-11-13. Committed in `d0cdb8d` on `master`. |
| 04 | Public site: static + GitHub Pages | 🟨 | 2026-11-13. Code is done. Owner must set Pages → "GitHub Actions", push, and check the live URL. |
| 05 | Excel storage | 🟨 | 2026-11-13. Code and 31 tests are done. Owner must do the Excel checks on Windows (`05-excel-storage.md`, "Owner checks"). |
| 06 | Reminder logic | 🟨 | 2026-11-14. Code and tests are done (66 tests). No cron. Owner must check the dashboard in a browser (`06-reminder-logic.md`, "Owner checks"). The "Прегледът мина" button waits for the owner's screenshots. |
| 07 | Security | 🟨 | 2026-11-15. Code and tests are done (104 tests). Request guard, input checks, CSP, no inline script, `.env.example`. Owner must check the dashboard in a browser (`07-security.md`, "Owner checks"). |
| 08 | Dashboard cleanup | 🟨 | 2026-11-14. Staff requests done: Bulgarian template names, plates with no spaces, server state that shows a stopped server, sidebar that closes. 74 tests. The rest of the chapter is not started. Owner must check the page in a browser. |
| 09 | Packaging | ⬜ | |
| 10 | Staff guide | ⬜ | After the staff app is done. Form is decided with the staff (`specs.md` D11). |
| 11 | Public site: land page (`zemya.html`) | 🟨 | 2026-11-14. Demo page done: invented text, stock photos, `noindex`. Waits for the real text and photos from the owners. |
| 12 | SEO | ⬜ | Last on the public site. The owners can start part A1 (Google Business Profile) now. Bulgarian guide for them is in the chapter. |
| 13 | Public site: fuel page (`goriva.html`) | 🟨 | 2026-11-14. Demo page done: partly invented text, `noindex`. Waits for the real text and photo rights. |
| 14 | Public site: redesign | 🟨 | 2026-11-14. New layout and look for the three pages (`specs.md` D18). Waits for the owner's review and a check on a real phone. |

## Later (not planned yet)

- Move the public site to Cloudflare with a dedicated domain.
- Automatic holiday update: a GitHub Action can run `tools/update-holidays.mjs` on a timer and commit `site/holidays.json`. It works with Cloudflare too, because Cloudflare publishes from the repo. Owner was not sure on 2026-11-13. Until a decision, the script runs by hand (D9).
- English version of the public site.
- More images on the public site (owner sends them).
- Extra staff pages after the talks with the staff.
- Bulk send. Automatic daily send. Twilio delivery status. Sender name "EGER".

## Waiting for an answer

See `specs.md` section 3. Nothing blocks the next chapter.

## Found on the way

Write here what you see but must not fix in the present chapter.

- 2026-11-13: the built file `ЕГЕР-Сервиз` (17 MB) was in git. Chapter 03 removed it from the index. It stays in the git history (the repo is still big). The file is still on the disk, ignored.
- 2026-11-13: `staff/server.js` still has `toISOString()` for dates, the `cors` package, and the cron job. Chapters 06 and 07 fix them.
- 2026-11-13: `staff/check-node.bat` downloads Node v20.11.0 from a fixed URL. Check it in chapter 09.
- 2026-11-13: `site/images/eger1.jpeg` and `site/images/technical-inspection.jpg` are not used by `site/index.html`. Chapter 04 kept them (renamed only). Owner can delete them or use them.
- 2026-11-13: `staff/package.json` has the name `car-service-sms`. The dashboard title is "АвтоСервиз — SMS Напомняния". Chapter 08 or 09 can rename them.
- 2026-11-13: chapters 05 and 06 were written before decision D7 (days off) and D9 (holidays script). Read `specs.md` first.
- 2026-11-13 (ch04): the map block shows developer text to visitors ("Вмъкнете Google Maps iframe тук"). Waits for the owner: map link or embed.
- 2026-11-13 (ch04): text errors on the public site. 2026-11-14: four fixed ("Раковски", "продукти на едро", "горивна станция", "автомобилни"). Still open: turnover "€ 2 100 00" (owner gives the right number; 2020 was in leva). "29+ години" stays until the owners give real data.
- 2026-11-14: map block is a Leaflet + OpenStreetMap map (`specs.md` D15). It shows the centre of Раковски. Put in the exact coordinates and the Google pin link when the owners have Google Business Profile (`12-seo.md`, A1 steps 9–10).
- 2026-11-14: `zemya.html` and `goriva.html` copy the navbar and footer of `index.html`. A change there must be made in all three files (D17).
- 2026-11-14: the ГТП service card on `index.html` says "Напомняме ви автоматично с SMS". `specs.md` D4 says no automatic SMS. Change the text ("Напомняме ви с SMS") in a site session.
- 2026-11-14: slides 1 and 2 show the same photo. It stays until the owner has more photos.
- 2026-11-14: ImgBot is not installed on the repo. It only compresses without loss. Resize is in chapter 12, B3.
- 2026-11-13 (ch04): each carousel slide sets `background-image` two times in one `style`. The first value is dead. Slides 1 and 2 show the same photo. `site/images/eger2.jpg` is 870 kB, heavy for a phone.
- 2026-11-13 (ch04): the calendar script builds user text in JavaScript (month names, cell titles) and uses inline `onclick`. `specs.md` section 4 wants all visible text in the HTML. Fix it with the English version.
- 2026-11-13 (ch04): no API has all the moved days off. The script now computes them from the law and adds the API days. It cannot know a one-time day off before the API has it. `staff/` holidays (chapter 06) are a separate setting in the Excel file.
- 2026-11-13 (ch04): `tools/` at the repo root is new (D1 names only `site/` and `staff/`). The script is there so that GitHub Pages does not publish it.
- 2026-11-13 (ch05): `server.js` computes `nextServiceDate`, `nextReminderDate` and `status` after each read, with its old functions (`withComputed`). The old date bug is now easy to see in Sofia time: last inspection 10.06.2026 gives expiry 09.06.2027. Chapter 06 moves this to `lib/reminders.js` and uses `lib/dates.js` (`addDays`, `addYears`, `weekday` are there, with tests).
- 2026-11-13 (ch05): `server.js` does not use `weeklyDaysOff` yet. It still skips only Sunday. Chapter 06 uses the setting. The dashboard has no control for it. The staff change it in the Excel file (sheet "Настройки").
- 2026-11-13 (ch05): "Изпрати" still moves `lastServiceDate` one year forward (old flow). Chapter 06 changes it (`specs.md` section 5). `smsSentAt` is still made with `toISOString()` in `server.js`. The store saves it as local clock time.
- 2026-11-13 (ch05): the cron job in `server.js` has no error handler. A locked file at 09:00 gives an unhandled error. Chapter 06 removes the cron job.
- 2026-11-13 (ch05): `npm audit` in `staff/`: 12 findings (7 moderate, 4 high, 1 critical). `npm audit fix` repairs most of them (express parts). `exceljs` 4.4.0 brings one moderate finding (`uuid`). Chapter 07.
- 2026-11-13 (ch05): if Excel crashes, its lock file `~$клиенти.xlsx` can stay. Then the app says "close Excel" until someone deletes that file. Put this in the staff guide (chapter 10).
- 2026-11-13 (ch05): on a Mac, Excel does not lock the file. The lock file is the only sign there.
- 2026-11-13 (ch05): the browser calls still have no common `api()` helper. Chapter 05 added `readReply()` only, to show the server message. Chapter 08 makes the helper.
- 2026-11-13 (ch05): the default data folder is now `Documents/ЕГЕР-Сервиз/` on each computer, the developer Mac too. For development, set `EGER_DATA_DIR` (example: `EGER_DATA_DIR=./data`).
- 2026-11-13 (ch05): `plan/README.md` and `01-goals-and-design.md` still say `ati.html` and `data/customers.json`. They are old text.

## Session log

| Date | What was done |
|---|---|
| 2026-11-13 | Plan written (chapters 01–09). SMS counter work committed (`59593fe`). |
| 2026-11-13 | Added `specs.md`, `progress.md`, `CLAUDE.md`, new `README.md`. Owner answered Q1, Q6, and the expiry-date question. |
| 2026-11-13 | Chapter 03: files moved to `site/` and `staff/`. Server serves only `staff/public/`. "Персонал" links removed. Short `.gitignore`. Built file out of git. |
| 2026-11-13 | Chapter 04: `site/holidays.json` + `tools/update-holidays.mjs` (Nager.Date). Calendar reads the file. Phone and email links match the text. Images renamed to Latin names. Description, favicon, Pages workflow. Side scroll at 360 px fixed. |
| 2026-11-13 | Chapter 04, part 2: holidays = law + API (D9 changed). Public site shows Monday as a day off (D7). Work is on `master` only from now. |
| 2026-11-13 | Saturday is a work day (D7). `dev-notes/` and `plan/01-dev-notes/` are git-ignored. Repo stays public, GitHub Pages until the domain (D2, D3). |
| 2026-11-13 | Chapter 05: `exceljs` store (`lib/store.js`, `lib/paths.js`, start of `lib/dates.js`). In-place write, temp file + rename, daily backup, lock check before send, bad-row report + banner. Tools for test data. 31 tests. `customers.json` removed. Computed columns are not in the file (owner). |
| 2026-11-13 | Dependabot PRs #5–#8 done by hand in `staff/`: express 4.22.3, body-parser 1.20.9, qs 6.16.2, axios 1.21.1, proxy-addr 2.0.8, brace-expansion. PRs #2–#4 point at the old root `package-lock.json` (gone). Still open in `npm audit`: minimatch (nodemon), uuid (exceljs), need major bumps. |
| 2026-11-13 | `npm audit` = 0. `overrides.uuid ^11.1.1` in `staff/package.json` (exceljs and node-cron use only `v4()`). `npm audit fix` set nodemon to 3.1.11 (safe minimatch). The override stays for exceljs (4.4.0 still asks for uuid 8). Remove it only if a new exceljs uses uuid 11. |
| 2026-11-14 | Four text errors fixed on the public site. Chapter 11 (land page) and 12 (SEO) written. D14 in `specs.md`. |
| 2026-11-14 | Map block: links to Google Maps, no embed (D15). Demo land page `site/zemya.html` (invented text, stock photos, `noindex`), link from the main page. Land photos renamed, `harvest.jpg` resized. Bulgarian Google Business Profile guide for the owners in `12-seo.md`. Checked at 360 px: no side scroll, no broken image. |
| 2026-11-14 | Map: Leaflet + OpenStreetMap, visible, no cookies (D15 changed). Demo fuel page `site/goriva.html` (D16, chapter 13). "Още от ЕГЕР ООД" section on the main page links both extra pages. Stay on plain HTML (D17). Checked at 360 px. |
| 2026-11-14 | Chapter 08, staff requests only: Bulgarian template names (`{{име}}`, `{{модел}}`, `{{номер}}`, `{{дата}}`, `{{телефон}}`; English still works), `normalizePlate` on save, on Excel read and in the SMS, server state check every 5 s with red box and banner, sidebar closes to 64 px. 74 tests pass in Sofia and UTC. |
- 2026-11-14 (ch14): redesign done. Two "found" items above are closed by it: the ГТП text has no "автоматично"; the turnover "€ 2 100 00" is removed from the page (put it back when the owner gives the right number).
- 2026-11-14 (ch14): the navbar and footer are now the same block in all three pages. A change must still be made three times (D17).
- 2026-11-14 (ch14): the station sign on `images/station.jpg` says "0/24" and shows A98. The site says 06:00 – 22:00 and A95 only. Owner says which is right. The photo also shows old prices in leva.
- 2026-11-14 (ch14): `site/images/eger2.jpg` (870 kB) is not used now; `station.jpg` is its small copy. `eger1.jpeg` and `technical-inspection.jpg` are still not used. `eger1.jpeg` has a Google watermark and `technical-inspection.jpg` looks like a stock photo: do not use them. Owner can delete the three files.
- 2026-11-14 (ch14): chapter 12 (SEO) must know that the home page `h1` is now "Бензиностанция, ГТП и автомивка в Раковски" and the anchor `#calendar-section` is now `#gtp`.
- 2026-11-14 (ch14): the owner wants the carousel on top and the about section second. The home page has this order now. Before any layout change: show a proposal and get the owner's OK.
- 2026-11-14 (ch06): chapter 06 done in code: `lib/reminders.js`, `lib/sms.js`, days-off rule from the settings, true expiry date, manual send only, `force` for a second SMS, test-mode banner, Excel column "Тестов SMS". The cron job and `node-cron` are removed. No `toISOString()` is left in `staff/` code. These "found" items above are closed by it: `toISOString()` and cron in `server.js`, `withComputed` date bug, `weeklyDaysOff` not used, "Изпрати" moves the date, cron with no error handler.
- 2026-11-14 (ch06): the dashboard was not checked in a browser by the agent. The routes were checked with `curl` on test data.
- 2026-11-14 (ch06): `staff/server.js` still has the `cors` package and takes any field from the request body (chapter 07). Some route errors are still in English ("Customer not found"). Chapter 07 or 08.
- 2026-11-14 (ch06): an overdue customer whose expiry date is in the past still gets the text "ГТП изтича ДАТА" with a past date. Ask the owner if a second text ("изтече") is necessary.
- 2026-11-14 (ch06): the dashboard takes the status from the engine at load time. A page that stays open over midnight shows the status of the day before until a reload. Chapter 08.
- 2026-11-14 (ch06): `scripts.js` still uses inline `onclick` and `confirm()`, and `previewSms`, `loadTemplate`, `loadHolidays` do not use `readReply`. Chapter 08.
- 2026-11-14 (ch06): the test data has customer `c001` with a last inspection in the future (2027-12-29). The app accepts a future date. Chapter 07 (input checks) decides.
- 2026-11-14 (ch06, part 2): the owner removed the simulated mode. No "Тестов SMS" column, no `smsSimulated`, no "Изпратен (тест)". With no Twilio keys the send is refused and a banner shows. Tests of the real flow use the owner's Twilio developer account. The entry above that names the test-mode banner and the "Тестов SMS" column is old.
- 2026-11-14 (ch06, part 2): the test data (`npm run test-data`) has invented phone numbers. With real Twilio keys, a send to them is a paid SMS to a number of a stranger. Put your own number in the row before a send. Chapter 07 or 09 can add a safer way.
- 2026-11-14 (ch06, part 2): a data file that the app wrote between the two parts can have the column "Тестов SMS". The app ignores it. Delete the column by hand in Excel, or make the test data again with `--force`.
- 2026-11-14 (ch06, part 2): `staff/.env.example` does not exist (`specs.md` section 6 wants it, with empty values). Chapter 07.
- 2026-11-14: staff requests from a screenshot: Bulgarian template variables and plates with no spaces. Owner chose: Bulgarian tokens (old English tokens still work), spaces removed on save and in the SMS. Added to chapter 08 steps.
- 2026-11-14: new test rule (`specs.md` §9): a real SMS send test uses only short English words. Bulgarian (UCS-2) uses up the Twilio test limit fast.
- 2026-11-14 (ch08, staff requests): the agent did not check the page in a browser (Chrome extension not connected). Routes checked with `curl` on test data. Owner checks: chips insert the Bulgarian names; the sidebar closes and stays closed after a reload; close the server window → red box and banner in about 5 s; start it again → green, data reloads.
- 2026-11-14 (ch08, staff requests): a plate can be typed with Cyrillic letters that look Latin ("РВ" instead of "PB"). The app keeps them as typed. Then search and the SMS have Cyrillic. Ask the owner if the app must change them to Latin.
- 2026-11-14 (ch08, staff requests): there is no test for the routes in `server.js` (the plate fix on save). `server.js` starts the server on import. Chapter 07 or 08 can move the routes so that a test can load them.
- 2026-11-14 (ch08, staff requests): a template saved in the Excel file before this change still has `{{carPlate}}` and `{{serviceDate}}`. It still works. The staff can type the Bulgarian names in "Настройки" if they want.
- 2026-11-14 (ch08, staff requests): all browser calls now go through `serverFetch()` in `scripts.js`. The `api()` helper of chapter 08 can build on it.
- 2026-11-15 (ch07): chapter 07 done in code: `staff/app.js` (routes), `lib/guard.js` (`Host`, `Origin`, `Content-Type`, CSP), `lib/validate.js` (fixed field list, phone, dates, holidays, template), `express.json` with 100 kb, `cors` and `body-parser` removed, `staff/.env.example`, `escHtml` escapes `'`, no customer text in a handler. `npm audit` = 0. 104 tests pass in Sofia and UTC.
- 2026-11-15 (ch07): these "found" items above are closed by it: `cors` and any field from the request body, English route errors, the future inspection date, no `.env.example`, no test for the routes, inline `onclick`, `previewSms` / `loadTemplate` / `loadHolidays` without `readReply`, no `api()` helper. Still open for chapter 08: `confirm()`, the status after midnight.
- 2026-11-15 (ch07): the agent checked the dashboard in a headless Chrome (clicks through the debug port) on a copy of the test data. A person did not look at the page.
- 2026-11-15 (ch07): test customer `c001` still has a future date (2027-12-29) in `tools/make-test-data.js`. The app lets it stay, but a request cannot set such a date. Change the test data if it is not wanted.
- 2026-11-15 (ch07): a plate accepts any character (example: `PB11'11<B>`). The page shows it safely. A rule for the plate (letters and digits only) goes with the Cyrillic question above. Ask the owner.
- 2026-11-15 (ch07): the server gives 404 for `/favicon.ico`. Chapter 08 can add an icon.
- 2026-11-15 (ch07): the test data still has invented phone numbers. With real Twilio keys a send to them is a paid SMS to a stranger. Not solved in chapter 07. Chapter 09.
- 2026-11-15 (ch07): the dashboard loads Bootstrap and the fonts from the internet with no integrity check (`integrity="sha384-…"`). Chapter 08 or 09 can add it, or keep the files in `staff/public/`.
