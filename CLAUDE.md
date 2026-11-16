# CLAUDE.md

## What this is

Two apps for ЕГЕР ООД, a family car service in Bulgaria. They share nothing at run time.

- **Public site** (`site/index.html`): static, Bulgarian, mobile first. GitHub Pages now, Cloudflare + domain later.
- **Staff app** (`staff/public/index.html` + `staff/server.js` + `staff/app.js`): local Node server on `127.0.0.1`. Staff keep customers and send ГТП (annual inspection) reminder SMS by hand through Twilio. Data goes to one Excel file (`exceljs`, only through `staff/lib/store.js`).

The repo is in the middle of a restructure. The split into `site/` and `staff/` is done (`plan/03-split-repo.md`). `staff/lib/` has `store.js`, `paths.js`, `dates.js` (chapter 05), `reminders.js`, `sms.js` (chapter 06) and `validate.js`, `guard.js` (chapter 07). The routes are in `staff/app.js`; `staff/server.js` only starts the server.

## Read before any work

1. `plan/specs.md` — the rules. It wins over every other file.
2. `plan/progress.md` — where we are.
3. The one chapter file in `plan/` for the present task.

## Hard rules

- The repo is public. Never commit `.env`, Twilio keys, real customer data, an `.xlsx` data file, or the private notes (`dev-notes/`, `plan/01-dev-notes/`).
- Never use `toISOString()` to make a date. Use local date parts. (Sofia is UTC+2/+3. This bug exists today.)
- Staff days off: Sunday, Monday, holidays. A reminder moves earlier to a work day. Saturday is a work day.
- No automatic SMS. No cron.
- No framework. No build step. Plain HTML, CSS, JavaScript.
- Text for users is Bulgarian. Code and comments are English.
- Do only the work of the present chapter. Put other findings in `plan/progress.md`.
- **After any file or code change, end the reply with a commit message for that change.** The subject starts with a Conventional Commits word (`feat:`, `fix:`, `docs:`, `test:`, `chore:` …): in `staff/`, `feat:`/`fix:`/`perf:` make a public release (`plan/specs.md` D32). The owner reviews it, then decides on the commit. Never commit or push without the owner's word.

## After each session

- Tick the checklist in the chapter file.
- Update `plan/progress.md` (status table and session log).
- If a rule changed, update `plan/specs.md` first.

## Commands

```
cd staff
npm install
npm start          # http://localhost:3000/  (staff dashboard)
```

The public site has no server. Open `site/index.html` in a browser.

No Twilio keys in `.env` = no SMS. The send is refused and the dashboard shows a banner. There is no simulated send. With keys, each send is a real, paid SMS: use your own phone number in the test data.

Tests (in `staff/`, both time zones must pass):

```
TZ=Europe/Sofia npm test
TZ=UTC npm test
```

Data: `Documents/ЕГЕР-Сервиз/клиенти.xlsx`. For development use `EGER_DATA_DIR=./data` and `npm run test-data`.
