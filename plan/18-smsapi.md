# 18 — Send the SMS through SMSAPI.bg, not Twilio

Status: plan only. No code yet. The owner reads this file and says yes or no.

Rule to add first: `specs.md` D33 (text below, in "Step 1").

## Why

| | Twilio (now) | SMSAPI.bg |
|---|---|---|
| Price of 1 SMS part to a BG phone | $0.1466 ≈ €0.13 | €0.0537 (top-up €25–40.99), €0.0501 (€256+). Without VAT. |
| Monthly fee | $1.15 (US number) | none |
| 200 SMS / month, 1 part each | ≈ €27 | ≈ €10.70 + VAT ≈ €12.90 |
| What the customer sees as sender | a generic name: Bulgaria replaces the US number (Twilio "Sender ID preserved: No") | a company phone number or a name such as `EGER-OOD`, after SMSAPI verifies it. Before that: `INFO`. |
| Customer replies or calls back | no | yes, if the sender is a company phone number |
| Payment | card, USD | top-up (pay first), EUR, Bulgarian invoice |

Sources (checked 2026-11-18): <https://www.smsapi.bg/pricing>, <https://www.smsapi.bg/docs/>, <https://www.twilio.com/en-us/guidelines/bg/sms>, <https://www.twilio.com/en-us/sms/pricing/bg>.

The Cyrillic rule does not change: 70 characters = 1 part, 134 = 2, 201 = 3 (`public/sms-text.js` stays as it is).

## The SMSAPI API that we use

One request for one SMS:

```
POST https://api.smsapi.bg/sms.do
Authorization: Bearer <token>
Content-Type: application/x-www-form-urlencoded

to=359888123456&message=<text>&from=<sender>&format=json&encoding=utf-8&max_parts=3
```

- `to`: the phone with the country code. The app already makes `+359…` from `0…` (`public/scripts.js`). SMSAPI takes the `+` too.
- `from`: only a verified sender. Empty = the default sender of the account.
- `max_parts=3`: SMSAPI refuses a text of more than 3 parts (error 12). This stops a big bill by mistake.
- No `test=1` in the app. `test=1` answers "OK" and sends nothing, so the customer would look sent. `specs.md` §5: no simulated send.
- The token: made in the SMSAPI customer website, "OAuth Tokens", with the SMS scope only.

The answer:

- Success: `{"count":1,"list":[{"id":"…","points":…,"status":"QUEUE",…}]}`. "Accepted" = this answer. The app marks the customer "Изпратен" as it does today with Twilio.
- Failure: `{"error":<code>,"message":"…"}`. The HTTP code can be 200 with an error in the body, so the code reads the body, not only the HTTP code.

Error codes with their own message for the staff (the rest: the general "SMS не е изпратен"):

| Code | Meaning | Message for the staff |
|---|---|---|
| 101, 102, 401 | bad or old token | Ключът за SMSAPI е грешен. Обадете се на човека, който поддържа програмата. |
| 103 | no money left in the account | Няма пари в сметката за SMS. Заредете сметката в SMSAPI. |
| 13, 57, 59 | bad, blocked, or opted-out number | Номерът на клиента е грешен или блокиран. Проверете телефона. |
| 14 | the sender is not verified | Подателят на SMS не е одобрен в SMSAPI. |
| 12 | the text has more than 3 parts | Текстът е твърде дълъг (над 3 SMS). Скъсете шаблона. |

The texts are a proposal. The owner checks them.

## Delivery status: is there an endpoint? No.

I read the full SMSAPI documentation (release of 10-11-2026). Its parts: send, scheduled send, bulk send, templates, account balance, callback, receiving messages, contacts, black list, sub-users, sender names, price list, authenticator, special characters, **delivery statuses (a list of codes only)**, error codes.

- There is **no request to ask the status of a sent SMS**. Error 400 "Invalid message ID of a status response" exists, but no endpoint for it is in the documentation.
- The only way is the **callback**: SMSAPI calls a web address of ours with `MsgId`, `status` (404 `DELIVERED`, 405 `UNDELIVERED`, 403 `SENT` …) and `idx`. It needs an address that is open on the internet.
- The staff app listens only on `127.0.0.1` (`specs.md` §4). The internet cannot reach it. An open address (tunnel, cloud function) is a new server and a new risk. **Not in this chapter.**
- So: the app knows "accepted". To see "delivered", the staff open the SMSAPI customer website (the reports of the account). Step 6 checks that this page exists.
- Ask SMSAPI support: "Is there a GET request for the status of a sent SMS by ID?" If yes, a later chapter can add a "Провери доставката" button (a click, not a timer: D4).

## Steps

### Step 1. `specs.md` first

- [ ] Add D33: "The SMS goes through SMSAPI.bg (`api.smsapi.bg/sms.do`), not Twilio. Keys: `SMSAPI_TOKEN`, `SMSAPI_SENDER` in `настройки.env` / `.env`. The app marks "Изпратен" when SMSAPI accepts the SMS. The app does not know the delivery: the staff see it in the SMSAPI website. No `test=1` in the app. `max_parts=3` (owner, date)."
- [ ] §4: `lib/sms.js` = "Build text, send through SMSAPI.bg".
- [ ] §5 and §6: "Twilio keys" → "the SMSAPI key". Logs: the customer ID and the SMSAPI message ID. Never the phone with the text.
- [ ] §9: the real-send test rule (short English words) stays.

### Step 2. Code: `staff/lib/sms.js`

- [ ] `smsMode(env)`: `'live'` when `SMSAPI_TOKEN` is set and is not a placeholder. `SMSAPI_SENDER` may be empty.
- [ ] `deliver(customer, text)`: one `fetch` POST, as above. No npm package (Node 18+ has `fetch`). Time limit 15 s (`AbortSignal.timeout`).
- [ ] Read the JSON body. An `error` field = throw. Success = return `{ sid: list[0].id }`. The name `sid` stays, so `sendReminder` and the routes do not change.
- [ ] Log: `[SMS] Sent to customer <id>, SMSAPI ID <id>`. On error: the code and SMSAPI's English message, never the phone or the text.
- [ ] `SendError`: add the codes of the table above, with the Bulgarian texts. `SEND_FAILED` text: "SMS не е изпратен. SMSAPI върна грешка. Вижте черния прозорец на програмата."
- [ ] `NO_KEYS` text: "SMS не може да се изпрати: липсва ключът за SMSAPI във файла „настройки.env“."
- [ ] The comment at the top of the file: SMSAPI.bg.

### Step 3. Remove Twilio

- [ ] `npm uninstall twilio` in `staff/`. The build becomes smaller.
- [ ] `staff/.env.example`: the three `TWILIO_*` lines → `SMSAPI_TOKEN=` and `SMSAPI_SENDER=`, with a comment: the sender must be verified in the SMSAPI website; empty = `INFO`.
- [ ] `staff/server.js` (start log), `staff/app.js` (comment), `lib/paths.js` (comments), `tools/build.mjs` (comment): "Twilio keys" → "SMSAPI key".
- [ ] An old `настройки.env` with only `TWILIO_*` lines: the app is "off", the banner shows. The staff PC needs the new lines (step 6).

### Step 4. Price

- [ ] `lib/store.js`: `DEFAULT_PRICE = 0.0537` (SMSAPI.bg, € per SMS part, without VAT, top-up €25–40.99).
- [ ] `public/index.html`: "Цена за 1 SMS (USD)" → "Цена за 1 SMS (EUR)". Look for other "USD" or "$" texts.
- [ ] An existing Excel file keeps its old price (0.1466) in sheet "Настройки". The staff type the new price one time in "Настройки". This goes into the help (step 5).

### Step 5. Texts for the staff

- [ ] `public/index.html`: the banner "липсват ключовете за Twilio" → "липсва ключът за SMSAPI".
- [ ] `public/help/errors.html`: the same texts as in the code (the messages live in two places: `progress.md`, ch10).
- [ ] `staff/ИНСТРУКЦИЯ.md` part "Ключовете за SMS": SMSAPI account, token, sender, top-up, where to see the delivery.
- [ ] `README.md`: the Twilio lines.
- [ ] `plan/15-manual-tests.md` B3.1: "no Twilio keys" → "no SMSAPI key".

### Step 6. Tests

- [ ] `test/sms.test.js` and `test/server.test.js`: the key names. The tests remove `SMSAPI_*` from `process.env`, so a test never sends a real SMS.
- [ ] New tests for `deliver` with a fake `fetch` (no network): success → the ID; an error body with HTTP 200 → `SEND_FAILED`; 103 → the "no money" message; a time-out → `SEND_FAILED`, customer not marked; the request has `max_parts=3`, `format=json`, the `Authorization` header, and no `test`.
- [ ] `TZ=Europe/Sofia npm test` and `TZ=UTC npm test` pass.

### Step 7. Commit word

This changes the keys file of the staff PC. Without the new lines, no SMS goes out. Proposal: `feat(staff)!: send the SMS through SMSAPI.bg, not Twilio` → version 2.0.0 (D32). The owner decides, and fills in `настройки.env` on the staff PC **before** the staff take the new version.

## Owner checks

Before the code (the answers go into the code):

- [ ] Open the SMSAPI.bg account for ЕГЕР ООД. Note the free test SMS.
- [ ] Add a sender in "Sendernames": a company phone number or `EGER-OOD` (up to 11 characters: letters, digits, `-`, `.`, space). Write down: the price and the time to verify. Not in the docs.
- [ ] Ask SMSAPI: how long does a top-up stay valid? Is there a status request by message ID?
- [ ] Make a token with the SMS scope only.

After the code:

- [ ] `staff/.env` with the token and the verified sender. One customer with **your own** phone, a template of short English words (specs §9). "Изпрати" → the SMS comes. The sender is the one you chose.
- [ ] The SMSAPI website shows the SMS as delivered. Write down where (for `ИНСТРУКЦИЯ.md`).
- [ ] A wrong token → the "ключът … е грешен" message. The customer is not marked.
- [ ] No token → the yellow banner. "Изпрати" is refused.
- [ ] The staff PC: new lines in `Documents\ЕГЕР-Сервиз\настройки.env`, the new price in "Настройки".

## Done when

- [ ] No `twilio` in `staff/package.json`, the code, the help, or the README (the plan history may keep it).
- [ ] A real SMS through SMSAPI reached the owner's phone with the chosen sender.
- [ ] All tests pass in both time zones.
- [ ] `progress.md` has the result of the status-request question.

## Not in this chapter

- Delivery status in the app (needs a status request or an internet address, see above).
- Replies from the customer (SMSAPI "Receiving messages").
- Bulk send (D4, O2).
