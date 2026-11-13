# ЕГЕР ООД — progress

Update this file at the end of each work session. Rules are in `specs.md`.

Last update: 2026-11-13.

## Where we are

**Now:** chapter 04 (public site) is done. It waits for the owner's merge to `master`, push, and the checks on the live URL. **Next:** chapter 05 (Excel storage).

## Chapters

Status: ⬜ not started · 🟨 in work · ✅ done

| # | Chapter | Status | Notes |
|---|---|---|---|
| 00 | Project docs (`specs.md`, `progress.md`, `CLAUDE.md`, `README.md`) | ✅ | 2026-11-13. |
| 01 | Goals and design | ✅ | Reference only. No code. |
| 02 | Baseline commit | ✅ | Work is in `59593fe`. |
| 03 | Split repo into `site/` and `staff/` | ✅ | 2026-11-13. Committed in `d0cdb8d` on `master`. |
| 04 | Public site: static + GitHub Pages | 🟨 | 2026-11-13. Code is done. Owner must set Pages → "GitHub Actions", push, and check the live URL. |
| 05 | Excel storage | ⬜ | |
| 06 | Reminder logic | ⬜ | Must use the days-off rule (`specs.md` D7). |
| 07 | Security | ⬜ | Any time after 03. |
| 08 | Dashboard cleanup | ⬜ | |
| 09 | Packaging | ⬜ | |
| 10 | Staff guide | ⬜ | After the staff app is done. Form is decided with the staff (`specs.md` D11). |

## Later (not planned yet)

- Move the public site to Cloudflare with a dedicated domain.
- Automatic holiday update: a GitHub Action can run `tools/update-holidays.mjs` on a timer and commit `site/holidays.json`. It works with Cloudflare too, because Cloudflare publishes from the repo. Owner was not sure on 2026-11-13. Until a decision, the script runs by hand (D9).
- English version of the public site.
- More pages and images on the public site. Better UI design.
- Extra staff pages after the talks with the staff.
- Bulk send. Automatic daily send. Twilio delivery status. Sender name "EGER".

## Waiting for an answer

See `specs.md` section 3. Nothing blocks the next chapter.

## Found on the way

Write here what you see but must not fix in the present chapter.

- 2026-11-13: the built file `ЕГЕР-Сервиз` (17 MB) was in git. Chapter 03 removed it from the index. It stays in the git history (the repo is still big). The file is still on the disk, ignored.
- 2026-11-13: `staff/server.js` still has `toISOString()` for dates, the `cors` package, and the cron job. Chapters 06 and 07 fix them.
- 2026-11-13: `staff/server.js` prints "data/customers.json" in the `[INIT]` lines. Chapter 05 replaces that code.
- 2026-11-13: `staff/check-node.bat` downloads Node v20.11.0 from a fixed URL. Check it in chapter 09.
- 2026-11-13: `site/images/eger1.jpeg` and `site/images/technical-inspection.jpg` are not used by `site/index.html`. Chapter 04 kept them (renamed only). Owner can delete them or use them.
- 2026-11-13: `staff/package.json` has the name `car-service-sms`. The dashboard title is "АвтоСервиз — SMS Напомняния". Chapter 08 or 09 can rename them.
- 2026-11-13: chapters 05 and 06 were written before decision D7 (days off) and D9 (holidays script). Read `specs.md` first.
- 2026-11-13 (ch04): the map block shows developer text to visitors ("Вмъкнете Google Maps iframe тук"). Waits for the owner: map link or embed.
- 2026-11-13 (ch04): text errors on the public site: "Ракovski" (mixed alphabets), "продуктина едро", "модерна горивни станция", "автобомилни", turnover "€ 2 100 00". "29+ години" does not match "more than 30 years" in `specs.md`.
- 2026-11-13 (ch04): each carousel slide sets `background-image` two times in one `style`. The first value is dead. Slides 1 and 2 show the same photo. `site/images/eger2.jpg` is 870 kB, heavy for a phone.
- 2026-11-13 (ch04): the calendar script builds user text in JavaScript (month names, cell titles) and uses inline `onclick`. `specs.md` section 4 wants all visible text in the HTML. Fix it with the English version.
- 2026-11-13 (ch04): no API has all the moved days off. The script now computes them from the law and adds the API days. It cannot know a one-time day off before the API has it. `staff/` holidays (chapter 06) are a separate setting in the Excel file.
- 2026-11-13 (ch04): `tools/` at the repo root is new (D1 names only `site/` and `staff/`). The script is there so that GitHub Pages does not publish it.

## Session log

| Date | What was done |
|---|---|
| 2026-11-13 | Plan written (chapters 01–09). SMS counter work committed (`59593fe`). |
| 2026-11-13 | Added `specs.md`, `progress.md`, `CLAUDE.md`, new `README.md`. Owner answered Q1, Q6, and the expiry-date question. |
| 2026-11-13 | Chapter 03: files moved to `site/` and `staff/`. Server serves only `staff/public/`. "Персонал" links removed. Short `.gitignore`. Built file out of git. |
| 2026-11-13 | Chapter 04: `site/holidays.json` + `tools/update-holidays.mjs` (Nager.Date). Calendar reads the file. Phone and email links match the text. Images renamed to Latin names. Description, favicon, Pages workflow. Side scroll at 360 px fixed. |
| 2026-11-13 | Chapter 04, part 2: holidays = law + API (D9 changed). Public site shows Monday as a day off (D7). Work is on `master` only from now. |
| 2026-11-13 | Saturday is a work day (D7). `dev-notes/` and `plan/01-dev-notes/` are git-ignored. Repo stays public, GitHub Pages until the domain (D2, D3). |
