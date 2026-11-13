# 07 — Security of the local staff server

Needs: chapter 03. Can run before or after 05 and 06.

## The main risk
The server listens only on `127.0.0.1`. That is good. But a browser on the same PC can reach it from **any web page**. Today `cors()` is fully open (`server.js:42`) and there is no check of who calls. A bad web page can read all customers and start an SMS send.

## Steps

### Close the door
- [ ] Remove the `cors` package and `app.use(cors())`. The dashboard and the API have the same origin, so CORS is not necessary.
- [ ] Add one small middleware for `/api/*`:
  - Reject if the `Host` header is not `localhost:PORT` or `127.0.0.1:PORT`. (Stops DNS-rebinding.)
  - For `POST`, `PUT`, `PATCH`, `DELETE`: reject if an `Origin` header is present and is not our own origin.
  - Require `Content-Type: application/json` on requests that change data. Change `send-sms`, `toggle-disabled`, and `preview-sms` in `scripts.js` so they send it. (A plain web form cannot send this type without a CORS check.)
- [ ] Static files: only `staff/public/` (done in chapter 03 — check it again).

### Check the input
- [ ] `PUT /api/customers/:id` copies the whole request body into the customer (`server.js:202`). Accept only: `name`, `phone`, `address`, `carModel`, `carPlate`, `lastServiceDate`, `smsConsent`. Ignore all others.
- [ ] Phone: must match `^\+[1-9]\d{7,14}$`. Offer to change `08...` to `+3598...` in the dashboard.
- [ ] `lastServiceDate`: must be a real `YYYY-MM-DD` date, not in the future.
- [ ] Holidays: each entry must be a real date.
- [ ] Template: max 500 characters. Warn on unknown `{{...}}` names.
- [ ] Replace `body-parser` with `express.json({ limit: '100kb' })`.

### Browser side
- [ ] `escHtml` (`scripts.js:543`) does not escape `'`. Add `'` → `&#39;`.
- [ ] `deleteCustomer` puts the customer name inside an `onclick` text (`scripts.js:224`). Pass only the ID and look the name up in the `customers` list.
- [ ] Add a `Content-Security-Policy` header that allows only self, `cdn.jsdelivr.net`, and the Google Fonts hosts.

### Secrets and data
- [ ] `.env` holds the Twilio keys. Add `staff/.env.example` with empty values. Confirm `.env` is in `.gitignore`.
- [ ] Never log the full SMS text with the phone number in live mode. Log the customer ID and the Twilio SID only.
- [ ] The data folder and the backups folder are in `.gitignore` (from chapter 05 — check again).
- [ ] Run `npm audit` in `staff/`. Update what it reports.

## Tests
- [ ] Request with `Host: evil.example` → 403.
- [ ] `POST` with `Origin: https://evil.example` → 403.
- [ ] `PUT` with `{ "id": "x", "smsConsentAt": "2000-01-01" }` → these fields do not change.
- [ ] Bad phone → 400 with a Bulgarian message.

## Done when
- All four tests pass.
- A test page on another origin cannot read `/api/customers` and cannot trigger a send.
