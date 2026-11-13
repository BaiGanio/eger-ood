# ЕГЕР ООД — work plan

Written 2026-11-13. One chapter = one work session.

## The two apps

| | Public site | Staff app |
|---|---|---|
| Entry file | `index.html` | `ati.html` |
| Who uses it | Customers, on the internet | Staff of the car service |
| Where it runs | GitHub Pages | One Windows PC at the service (and the developer Mac) |
| Server | None. Static files only. | Small local Node server, `127.0.0.1` only |
| Data | None (one static holidays file) | One Excel file (`.xlsx`) |
| SMS | Never | Manual send by staff, through Twilio |

The two apps share **nothing** at run time. No link goes from one to the other.

## Decisions already made

1. One repo, two folders: `site/` and `staff/`.
2. The public site goes on GitHub Pages. It has no `server.js`.
3. The staff app keeps a local engine (Node server). It holds the Twilio keys and writes the data file.
4. **No automatic SMS for now.** Staff send each SMS by hand. The daily cron job goes away.
5. Data lives in **one Excel file**. It is the only store. Staff can also edit it by hand in Excel.
6. There is no old customer table. We design the columns.
7. The data in `data/customers.json` is test data. No git history cleanup is necessary.
8. We add 5 to 7 more test customers (10 to 12 in total).
9. The staff app must build and run on Windows (staff) and macOS (developer).

## Chapters and order

Do them in this order. Each chapter lists what it needs from earlier chapters.

| # | File | What it does | Needs |
|---|---|---|---|
| 01 | `01-goals-and-design.md` | Goals and design of both apps. Read first. No code. | — |
| 02 | `02-baseline-commit.md` | Commit the unfinished SMS counter work. | — |
| 03 | `03-split-repo.md` | Move files into `site/` and `staff/`. Cut the links between them. | 02 |
| 04 | `04-public-site.md` | Make the site fully static. Deploy to GitHub Pages. | 03 |
| 05 | `05-excel-storage.md` | Replace `customers.json` with one `.xlsx` file. Test data. | 03 |
| 06 | `06-reminder-logic.md` | Fix date bugs. Remove cron. Yearly cycle. Manual send flow. | 05 |
| 07 | `07-security.md` | Close the local server. Validate input. | 03 |
| 08 | `08-dashboard-cleanup.md` | Clean `scripts.js` and `ati.html`. | 06 |
| 09 | `09-packaging.md` | Windows + Mac builds, data location, README. | 05, 06, 07 |

Chapters 04 and 05 do not depend on each other. Chapter 07 can run any time after 03.

## Open questions

**Answered 2026-11-13: Q1, Q2, Q6, and the expiry-date question in chapter 06. The answers are in `specs.md` section 2. `specs.md` wins over this table.**

Each one has a default. If nobody answers, the chapter uses the default.

| # | Question | Default | Chapter |
|---|---|---|---|
| Q1 | GitHub Pages on a free account needs a **public** repo. Then the staff app code is public too (no data, no keys). OK? | Yes, public repo. Data and `.env` stay out of git. | 04 |
| Q2 | The calendar on the public site reads holidays from the server today. Where does it get them when there is no server? | A static file `site/holidays.json`, edited by the developer once per year. | 04 |
| Q3 | After a reminder SMS, when does the next yearly cycle start? | When staff record the new inspection date ("Прегледът мина" button). | 06 |
| Q4 | Where does the Excel file live on the staff PC? | `Documents\ЕГЕР-Сервиз\клиенти.xlsx`, path can be changed in a config file. | 09 |
| Q5 | Do staff want a "send to all due today" button, or one SMS at a time? | One at a time first. Bulk button is a later item. | 06 |
| Q6 | Which phone, email, and address are correct on the public site? Links and visible text do not match today. | Visible text is correct; fix the links to match. | 04 |

## Rules for every session

- Read `specs.md`, `progress.md`, and `01-goals-and-design.md` first, then the one chapter.
- Update `progress.md` at the end of the session.
- Do only the work of that chapter.
- Tick the checklist at the end of the chapter file when a step is done.
- Run the tests before the commit.
- Never commit a real customer file or a `.env` file.
