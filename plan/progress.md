# ЕГЕР ООД — progress

Update this file at the end of each work session. Rules are in `specs.md`.

Last update: 2026-11-14.

## Where we are

**Now:** chapter 05 (Excel storage) is done in code. It waits for the owner's commit and the checks with real Excel on Windows (list in `05-excel-storage.md`). Chapter 04 still waits for the checks on the live URL. **Next:** chapter 06 (reminder logic).

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
| 06 | Reminder logic | ⬜ | Must use the days-off rule (`specs.md` D7). |
| 07 | Security | ⬜ | Any time after 03. |
| 08 | Dashboard cleanup | ⬜ | |
| 09 | Packaging | ⬜ | |
| 10 | Staff guide | ⬜ | After the staff app is done. Form is decided with the staff (`specs.md` D11). |
| 11 | Public site: land page (`zemya.html`) | ⬜ | `specs.md` D14. Waits for the owner's text and the image rights. |
| 12 | SEO | ⬜ | Last on the public site. Owner can start part A (Google Business Profile) now. |

## Later (not planned yet)

- Move the public site to Cloudflare with a dedicated domain.
- Automatic holiday update: a GitHub Action can run `tools/update-holidays.mjs` on a timer and commit `site/holidays.json`. It works with Cloudflare too, because Cloudflare publishes from the repo. Owner was not sure on 2026-11-13. Until a decision, the script runs by hand (D9).
- English version of the public site.
- More images on the public site (owner sends them). Better UI design.
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
- 2026-11-14: map block. `specs.md` section 4 says no cookies. A Google Maps iframe sets cookies. Waits for the owner: map image + "Отвори в Google Maps" link (no cookies), or the iframe (rule change).
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
