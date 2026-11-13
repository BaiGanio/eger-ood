# 02 — Baseline commit

## Why
179 lines of work are not committed (SMS cost counter). `sms-text.js` is not in git. The split in chapter 03 moves these files. A move on top of uncommitted work is hard to review.

## Steps
- [ ] Start the app: `npm start`. Open `http://localhost:3000/app`.
- [ ] Check by hand: add a customer, open the SMS preview, change the template and the price.
- [ ] Fix the one known small defect: the "Зареждане…" row in `ati.html:147` has `colspan="7"`. The table has 8 columns.
- [ ] Create a branch: `git checkout -b restructure`.
- [ ] Commit `ati.html`, `scripts.js`, `server.js`, `sms-text.js`, `data/customers.json`.

## Do not do here
- Do not fix the date bugs or the cron job. They belong to chapter 06.

## Done when
- `git status` is clean.
- The app starts and the dashboard works as before.
