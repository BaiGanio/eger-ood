# CLAUDE.md

## What this is

Two apps for ЕГЕР ООД, a family car service in Bulgaria. They share nothing at run time.

- **Public site** (`index.html`, later `site/`): static, Bulgarian, mobile first. Final host: Cloudflare + domain.
- **Staff app** (`ati.html` + `server.js`, later `staff/`): local Node server on `127.0.0.1`. Staff keep customers and send ГТП (annual inspection) reminder SMS by hand through Twilio. Data goes to one Excel file.

The repo is in the middle of a restructure. The root layout is the old one. The target layout is in `plan/03-split-repo.md`.

## Read before any work

1. `plan/specs.md` — the rules. It wins over every other file.
2. `plan/progress.md` — where we are.
3. The one chapter file in `plan/` for the present task.

## Hard rules

- Never commit `.env`, Twilio keys, real customer data, an `.xlsx` data file, or `plan/01-dev-notes/` (private).
- Never use `toISOString()` to make a date. Use local date parts. (Sofia is UTC+2/+3. This bug exists today.)
- No GDPR / consent feature for now. Do not add one.
- Staff days off: Sunday, Monday, holidays. A reminder moves earlier to a work day. Saturday is a work day.
- No automatic SMS. No cron.
- No framework. No build step. Plain HTML, CSS, JavaScript.
- Text for users is Bulgarian. Code and comments are English.
- Do only the work of the present chapter. Put other findings in `plan/progress.md`.
- **After any file or code change, end the reply with a commit message for that change.** The owner reviews it, then decides on the commit. Never commit or push without the owner's word.

## After each session

- Tick the checklist in the chapter file.
- Update `plan/progress.md` (status table and session log).
- If a rule changed, update `plan/specs.md` first.

## Commands (old layout, until chapter 03)

```
npm install
npm start          # http://localhost:3000  (site)  and  /app  (staff dashboard)
```

No Twilio keys in `.env` = simulated SMS (logged to the console).

Tests do not exist yet. They come in chapters 05–07 with `node --test`.
