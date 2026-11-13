# ЕГЕР ООД — progress

Update this file at the end of each work session. Rules are in `specs.md`.

Last update: 2026-11-13.

## Where we are

**Now:** chapter 02 (baseline commit) is done in the work tree. It waits for the owner's commit. **Next:** chapter 03 (split the repo). First answer O6 (one repo or two).

## Chapters

Status: ⬜ not started · 🟨 in work · ✅ done

| # | Chapter | Status | Notes |
|---|---|---|---|
| 00 | Project docs (`specs.md`, `progress.md`, `CLAUDE.md`, `README.md`) | ✅ | 2026-11-13. Not committed yet. |
| 01 | Goals and design | ✅ | Reference only. No code. |
| 02 | Baseline commit | 🟨 | Work is in `59593fe`. Consent feature removed after that (D12), not committed yet. The table has 7 columns again, so `colspan="7"` is correct. |
| 03 | Split repo into `site/` and `staff/` | ⬜ | |
| 04 | Public site: static + deploy | ⬜ | Can run in parallel with 05. The host depends on O6. |
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

See `specs.md` section 3. The most important one:

- **O6:** one repo or two? Chapters 03 and 04 depend on it.

## Found on the way

Write here what you see but must not fix in the present chapter.

- 2026-11-13: the built file `ЕГЕР-Сервиз` (17 MB) is in git. Chapter 03 removes it.
- 2026-11-13: chapters 05 and 06 were written before decision D7 (days off) and D9 (holidays script). Read `specs.md` first.

## Session log

| Date | What was done |
|---|---|
| 2026-11-13 | Plan written (chapters 01–09). SMS counter work committed (`59593fe`). |
| 2026-11-13 | Added `specs.md`, `progress.md`, `CLAUDE.md`, new `README.md`. Owner answered Q1, Q6, and the expiry-date question. |
| 2026-11-13 | Removed the GDPR / consent feature from code, data, and docs (D12). Saturday is a work day (D7). `plan/01-dev-notes/` is git-ignored. |
