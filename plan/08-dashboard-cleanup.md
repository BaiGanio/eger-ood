# 08 — Dashboard cleanup

Needs: chapter 06.

## State today
`scripts.js` (578 lines) is readable. It is not spaghetti. It has these weak points:

| Finding | Where |
|---|---|
| The three calls `renderTable(); renderStats(); renderSettingsTable();` repeat 5 times. | `scripts.js:271`, `290`, `305`, `389`, … |
| `fetch` + JSON + error text is written again in each function. Some calls do not check `res.ok` (`saveCustomer`, `toggleDisabled`, `deleteCustomer`, `saveTemplate`). A server error then shows as a success. | whole file |
| Empty `catch (e) {}` hides load errors. | `scripts.js:47`, `56` |
| The template fill (`{{name}}` → value) is written on the server and again in the browser. | `server.js:118`, `scripts.js:411` |
| The price `0.1466` is written 4 times. | `server.js:40`, `scripts.js:4`, `42`, `ati.html:196` |
| All buttons use inline `onclick="..."`. This blocks a strict Content-Security-Policy. | `ati.html`, `scripts.js` |
| The page title and the sidebar say "АвтоСервиз", not "ЕГЕР ООД". | `ati.html:6`, `:28` |
| ~~The sidebar is fixed at 220 px. The page is hard to use on a narrow window.~~ Done 2026-11-14: it closes to 64 px. | `index.html` |
| Customers show two times: the dashboard table and the settings table. | `ati.html:234` |

## Steps
- [x] Add one `api(method, path, body)` helper. It sends JSON, checks `res.ok`, and throws the server's error text. (Done in chapter 07.)
- [x] Add one `refresh()` function that calls the three render functions.
- [x] Move the template fill into `sms-text.js` as `fillTemplate(template, customer)`. Use it on both sides. (Done in chapter 06.)
- [x] Take the price default only from the server. The number is only in `lib/store.js`. An empty price field saves no price.
- [x] Replace inline `onclick` with one click listener that reads `data-action` and `data-arg`. (Done in chapter 07.)
- [x] Show load errors with the toast. Remove empty `catch` blocks. The same toast text shows one time.
- [x] Use the computed `status` from the server (chapter 06). Remove `effectiveStatus` from the browser. (Done in chapter 06.)
- [ ] ~~Add the "Прегледът мина" button and its small dialog.~~ Not built: `specs.md` section 5. Waits for the owner's screenshots.
- [x] The no-keys banner and the bad-rows banner (chapters 05, 06). There is no test mode (owner, 2026-11-14).
- [x] Set the name to "ЕГЕР ООД" in the title and the sidebar.
- [x] Decide with the user: keep the second customer table in settings, or move "delete" into the main table and remove it. Owner, 2026-11-15: remove it (`specs.md` D20). The bin button is in the main table.

### Found in the earlier chapters (done 2026-11-15)
- [x] No `confirm()`. The page has its own yes / no dialog (`ask()` in `scripts.js`, a native `<dialog>`). It opens on top of the customer window.
- [x] A page that stays open over midnight loads the customers again on the new day.
- [x] The page has an icon (`public/favicon.svg`). No 404 for `/favicon.ico`.
- [x] A holiday that did not save does not stay in the list on the page.
- [x] `test/public.test.js`: no inline handler, no browser dialog, no price number, no empty `catch` in `public/`.

### Staff requests (screenshot, 2026-11-14)
- [x] Bulgarian template variables: `{{име}}`, `{{модел}}`, `{{номер}}`, `{{дата}}`, `{{телефон}}`. The chips show and insert these. `fillTemplate` accepts them. The old English tokens (`{{name}}`, `{{carModel}}`, `{{carPlate}}`, `{{serviceDate}}`, `{{phone}}`) still work, so a saved template does not break. Note: the regex `\w` does not match Cyrillic. Change it. Add tests.
- [x] Plate with no spaces ("PB1234AB"). Remove the spaces and use capitals when a customer is saved (dashboard and Excel read). `fillTemplate` also removes spaces, for old rows. Change the placeholder and the test data. Add tests.
- [x] Server state (staff, 2026-11-14): the page showed "Сървърът е активен" also with the server window closed. The page now asks `/api/status` every 5 s and on window focus. Each failed request also marks the server as stopped. Stopped = red box in the sidebar + red banner on top of the main area. When the server comes back, the page loads the data again.
- [x] Bigger server dot (staff, 2026-11-14): 12 px dot in a coloured box with 13 px text (green "Сървърът работи", red "Сървърът е спрян", grey "Проверка…").
- [x] Sidebar opens and closes (staff, 2026-11-14): button "Скрий менюто" / "Покажи менюто". Closed = 64 px, icons only, the name shows on hover. The browser keeps the choice (localStorage). Owner chose icons only and the top banner.

### Staff requests (owner, 2026-11-15)
- [x] No "Активирай" / "Деактивирай" buttons. The whole function is removed (`specs.md` D19): button, badge "Деактивиран", filter entry, route `toggle-disabled`, `disabled` in the engine, Excel column "Активен" (ignored in an old file, not deleted).
- [x] Statuses: "Очаква", "За днес", "Изпратен", "Просрочен". The owner keeps "За днес".
- [x] A question before a send: the window "Преглед на SMS" already does this (owner, 2026-11-15). No change.

### Staff requests 3 (owner, 2026-11-15): status and send rules (`specs.md` D21)
- [x] "Просрочен" = the expiry date is past. It wins over "Изпратен".
- [x] "За днес" = the reminder day is today or past, no SMS yet, the expiry date is not past.
- [x] "Изпрати" only in a "За днес" or "Очаква" row. No "Изпрати отново". The server refuses the other sends, also with `force`.
- [x] A new phone number in the edit window clears the SMS mark.
- [x] Rows: "За днес" on top, then "Очаква", "Изпратен", "Просрочен". ~~The card "Очакващи SMS" counts "Очаква" + "За днес".~~ Changed by staff requests 4.

### Staff requests 4 (owner, 2026-11-15): send in advance before a holiday (`specs.md` D22)
- [x] The card "Очакващи SMS" counts the "За днес" customers. The card "За днес" is removed (owner chose it: same number two times).
- [x] A click on "Очакващи SMS" shows the send list: status filter "Очакващи SMS", period "Днес" = the "За днес" rows.
- [x] A buttons row "Напомняне до: Днес / 7 дни / 10 дни / 1 месец" adds the "Очаква" rows whose reminder date is in that period. "1 месец" = 30 days. Rule in `public/card-lists.js`, tests in `test/card-lists.test.js`.
- [x] Test data: 64 customers (50 new, `c014`–`c063`), most of them "Очаква" with a reminder in the next 1 to 35 days, and 10 "Просрочен" over the year.
- [x] The card count follows the chosen period (example: 6 today, 15 for 7 days). The card keeps the period, so its number and its list are the same.
- [x] "Просрочени" works the same way: the card counts the last 7 days; a click shows them and the row "Изтекли преди: 7 дни / 10 дни / 1 месец / 3 / 6 / 9 / 12 месеца". The status option "Просрочени" still shows all.

## Do not do here
- No framework. No build step. Plain JavaScript stays.

## Done when
- [x] No `onclick=` in `staff/public/`.
- [x] A stopped server gives a red toast on each action, never a green one. (Checked in a headless Chrome.)
- [ ] Hand test of every button passes. (Owner.)

## Owner checks
1. `cd staff`, then `EGER_DATA_DIR=./data npm start`.
2. The browser tab shows the name "ЕГЕР ООД" and a blue icon.
3. "Табло" → the red bin button in a row → a question shows in the page, not a browser box. "Отказ" keeps the customer.
3a. No pause button in a row. No "Деактивиран" in the status filter. "Настройки" has no customer table.
4. "Добави клиент" with the phone `0887 123 456` → the question about +359 shows on top of the window.
5. An "Изпратен" row and a "Просрочен" row have no "Изпрати" button. Type a new inspection date in a "Просрочен" row → "Очаква", next inspection one year later. Change the phone of an "Изпратен" row → the button is back.
5a. `npm run test-data -- --force` (with `EGER_DATA_DIR=./data`). Four cards. Click "Очакващи SMS" → only "За днес" rows and the buttons row. "7 дни", "10 дни", "1 месец" → more "Очаква" rows, the last reminder date is in the period. The card number changes with the button. Another status in the filter → the buttons row hides. Click "Просрочени" → the last 7 days and its buttons row; each button changes the card number. Status "Просрочени" in the drop-down → all overdue rows, no buttons row.
6. Close the server window. Press any button → red toast. Add a holiday → it does not show in the list.
