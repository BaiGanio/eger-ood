# ЕГЕР ООД — progress

Update this file at the end of each work session. Rules are in `specs.md`.

Last update: 2026-11-13.

## Where we are

**Now:** chapter 03 (split the repo) is done in the work tree on branch `ch03-split-repo`. It waits for the owner's commit. **Next:** chapter 04 (public site) or 05 (Excel storage).

## Chapters

Status: ⬜ not started · 🟨 in work · ✅ done

| # | Chapter | Status | Notes |
|---|---|---|---|
| 00 | Project docs (`specs.md`, `progress.md`, `CLAUDE.md`, `README.md`) | ✅ | 2026-11-13. |
| 01 | Goals and design | ✅ | Reference only. No code. |
| 02 | Baseline commit | ✅ | Work is in `59593fe`. |
| 03 | Split repo into `site/` and `staff/` | ✅ | 2026-11-13. Branch `ch03-split-repo`. Not committed yet. |
| 04 | Public site: static + GitHub Pages | ⬜ | Can run in parallel with 05. |
| 05 | Excel storage | ⬜ | |
| 06 | Reminder logic | ⬜ | Must use the days-off rule (`specs.md` D7). |
| 07 | Security | ⬜ | Any time after 03. |
| 08 | Dashboard cleanup | ⬜ | |
| 09 | Packaging | ⬜ | |
| 10 | Staff guide | ⬜ | After the staff app is done. Form is decided with the staff (`specs.md` D11). |

## Later (not planned yet)

- Move the public site to Cloudflare with a dedicated domain.
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
- 2026-11-13: `site/images/eger1.jpeg` and `site/images/Technical inspection.jpg` are not used by `site/index.html`. Chapter 04 can decide.
- 2026-11-13: `staff/package.json` has the name `car-service-sms`. The dashboard title is "АвтоСервиз — SMS Напомняния". Chapter 08 or 09 can rename them.
- 2026-11-13: chapters 05 and 06 were written before decision D7 (days off) and D9 (holidays script). Read `specs.md` first.

## Session log

| Date | What was done |
|---|---|
| 2026-11-13 | Plan written (chapters 01–09). SMS counter work committed (`59593fe`). |
| 2026-11-13 | Added `specs.md`, `progress.md`, `CLAUDE.md`, new `README.md`. Owner answered Q1, Q6, and the expiry-date question. |
| 2026-11-13 | Chapter 03: files moved to `site/` and `staff/`. Server serves only `staff/public/`. "Персонал" links removed. Short `.gitignore`. Built file out of git. |
| 2026-11-13 | Saturday is a work day (D7). `dev-notes/` and `plan/01-dev-notes/` are git-ignored. Repo stays public, GitHub Pages until the domain (D2, D3). |
