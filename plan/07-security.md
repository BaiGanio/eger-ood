# 07 — Security of the local staff server

Needs: chapter 03. Can run before or after 05 and 06.

## The main risk
The server listens only on `127.0.0.1`. That is good. But a browser on the same PC can reach it from **any web page**. Today `cors()` is fully open (`server.js:42`) and there is no check of who calls. A bad web page can read all customers and start an SMS send.

## Steps

### Close the door
- [x] Remove the `cors` package and `app.use(cors())`. The dashboard and the API have the same origin, so CORS is not necessary.
- [x] Add one small middleware for `/api/*`:
  - Reject if the `Host` header is not `localhost:PORT` or `127.0.0.1:PORT`. (Stops DNS-rebinding.)
  - For `POST`, `PUT`, `PATCH`, `DELETE`: reject if an `Origin` header is present and is not our own origin.
  - Require `Content-Type: application/json` on requests that change data. Change `send-sms`, `toggle-disabled`, and `preview-sms` in `scripts.js` so they send it. (A plain web form cannot send this type without a CORS check.)
- [x] Static files: only `staff/public/` (done in chapter 03 — check it again).

### Check the input
- [x] `PUT /api/customers/:id` copies the whole request body into the customer (`server.js:202`). Accept only: `name`, `phone`, `address`, `carModel`, `carPlate`, `lastServiceDate`. Ignore all others.
- [x] Phone: must match `^\+[1-9]\d{7,14}$`. Offer to change `08...` to `+3598...` in the dashboard.
- [x] `lastServiceDate`: must be a real `YYYY-MM-DD` date, not in the future.
- [x] Holidays: each entry must be a real date.
- [x] Template: max 500 characters. Warn on unknown `{{...}}` names.
- [x] Replace `body-parser` with `express.json({ limit: '100kb' })`.

### Browser side
- [x] `escHtml` (`scripts.js:543`) does not escape `'`. Add `'` → `&#39;`.
- [x] `deleteCustomer` puts the customer name inside an `onclick` text (`scripts.js:224`). Pass only the ID and look the name up in the `customers` list.
- [x] Add a `Content-Security-Policy` header that allows only self, `cdn.jsdelivr.net`, and the Google Fonts hosts.

### Secrets and data
- [x] `.env` holds the Twilio keys. Add `staff/.env.example` with empty values. Confirm `.env` is in `.gitignore`.
- [x] Never log the full SMS text with the phone number in live mode. Log the customer ID and the Twilio SID only.
- [x] The data folder and the backups folder are in `.gitignore` (from chapter 05 — check again).
- [x] Run `npm audit` in `staff/`. Update what it reports.

## Tests
- [x] Request with `Host: evil.example` → 403.
- [x] `POST` with `Origin: https://evil.example` → 403.
- [x] `PUT` with `{ "id": "x", "smsSentAt": "2000-01-01" }` → these fields do not change.
- [x] Bad phone → 400 with a Bulgarian message.

## Done when
- All four tests pass.
- A test page on another origin cannot read `/api/customers` and cannot trigger a send.

## Result (2026-11-15)

- All steps are done. 104 tests pass in `Europe/Sofia` and in `UTC`.
- The routes moved to `staff/app.js`, so a test can load them. `server.js` only starts the server.
- The guard is stricter than the steps: a foreign `Origin` is refused on a read too.
- A write with a wrong type gets 415, not 403.
- A future inspection date that is already in the Excel file can stay. A request cannot set one.
- `scripts.js` has an `api()` helper now (from chapter 08), because each write must send JSON.
- All inline `onclick` are gone (from chapter 08), because the `Content-Security-Policy` refuses them.
- The agent checked the dashboard in a headless Chrome on a copy of the test data: all button types work, and an inline script is blocked.

## Owner checks

- [ ] `cd staff && EGER_DATA_DIR=./data npm start`. Click each button one time: add, edit, send, pause, delete, save template, add and remove a holiday.
- [ ] Type a phone as `0887123456` in the edit window. The page offers `+359887123456`.
- [ ] Open the browser console (F12). There is no red "Content Security Policy" line.
