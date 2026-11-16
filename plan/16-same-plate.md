# 16 — One plate, one row

Rule: `specs.md` D28. Found in chapter 10 (2026-11-15): the app accepted two customers with the same plate. Owner: refuse it.

**Open (2026-11-16, `specs.md` O7):** the owner is not sure that the rule is right. Two different cars can maybe have the same plate in the file. The owner asks the staff. The code stays as built until the answer. Possible results: keep the rule, change it to a warning with "save anyway", or remove it.

## The rule

- One plate = one row. The same phone on two rows is allowed (one person, two cars).
- The compare ignores spaces and small letters. A Cyrillic letter counts as its Latin twin ("РВ" = "PB"). The saved plate stays as typed.
- "Добави" and edit: the server answers 400 with "Вече има клиент с рег. номер … : име. Един автомобил се записва само един път." Nothing is saved.
- Excel: the first row with a plate loads. A later row with the same plate is a bad row: "рег. номер … вече е на ред N; един автомобил се записва само един път". It stays in the file. The staff choose the right row in Excel.

## Steps

- [x] `lib/validate.js`: `plateKey`, `samePlateCustomer`; `checkCustomer` takes the saved customers.
- [x] `app.js`: POST and PUT give the saved customers to `checkCustomer`.
- [x] `lib/store.js`: a second row with the same plate goes to the problems list.
- [x] Tests: `validate.test.js`, `server.test.js`, `store.test.js`. Both time zones.
- [x] `specs.md` D28.
- [ ] Help pages: see `plan/to-do.md`.

## Owner checks

- [ ] Before the staff get this version: look in the real file for two rows with the same plate. The second row will not load. The banner names it.
- [ ] "Добави" with a plate that is already there: the red message shows, with the name.
- [ ] Edit a customer and keep the plate: the save works.

## Done when

- [x] No path makes a second row with the same plate through the dashboard.
- [x] A double row in Excel does not crash the app, and no row is lost from the file.
