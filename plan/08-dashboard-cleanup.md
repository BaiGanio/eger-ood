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
| The sidebar is fixed at 220 px. The page is hard to use on a narrow window. | `ati.html:19` |
| Customers show two times: the dashboard table and the settings table. | `ati.html:234` |

## Steps
- [ ] Add one `api(method, path, body)` helper. It sends JSON, checks `res.ok`, and throws the server's error text.
- [ ] Add one `refresh()` function that calls the three render functions.
- [ ] Move the template fill into `sms-text.js` as `fillTemplate(template, customer)`. Use it on both sides.
- [ ] Take the price default only from the server.
- [ ] Replace inline `onclick` with one click listener per table that reads `data-action` and `data-id`.
- [ ] Show load errors with the toast. Remove empty `catch` blocks.
- [ ] Use the computed `status` from the server (chapter 06). Remove `effectiveStatus` from the browser.
- [ ] Add the "Прегледът мина" button and its small dialog (chapter 06).
- [ ] Add the test-mode banner and the bad-rows banner (chapters 05, 06).
- [ ] Set the name to "ЕГЕР ООД" in the title and the sidebar.
- [ ] Decide with the user: keep the second customer table in settings, or move "delete" into the main table and remove it.

### Staff requests (screenshot, 2026-11-14)
- [ ] Bulgarian template variables: `{{име}}`, `{{модел}}`, `{{номер}}`, `{{дата}}`, `{{телефон}}`. The chips show and insert these. `fillTemplate` accepts them. The old English tokens (`{{name}}`, `{{carModel}}`, `{{carPlate}}`, `{{serviceDate}}`, `{{phone}}`) still work, so a saved template does not break. Note: the regex `\w` does not match Cyrillic. Change it. Add tests.
- [ ] Plate with no spaces ("PB1234AB"). Remove the spaces and use capitals when a customer is saved (dashboard and Excel read). `fillTemplate` also removes spaces, for old rows. Change the placeholder and the test data. Add tests.

## Do not do here
- No framework. No build step. Plain JavaScript stays.

## Done when
- No `onclick=` in `staff/public/`.
- A stopped server gives a red toast on each action, never a green one.
- Hand test of every button passes.
