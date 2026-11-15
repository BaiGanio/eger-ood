# 05 — Excel file as the only store

Needs: chapter 03.

## Why
Staff work better with Excel than with a JSON file. The dashboard and Excel must use the same file, so there is only one truth.

## Library
Use **`exceljs`**. It reads and writes `.xlsx`, keeps column widths and styles, and is on npm.
Do not use the `xlsx` (SheetJS) package from npm. The npm copy is old and has known security defects.

## The file: `клиенти.xlsx`

### Sheet 1 — `Клиенти`

| Column | Field | Type | Who writes it |
|---|---|---|---|
| ID | `id` | text | App only. If a hand-made row has no ID, the app gives it one. |
| Име | `name` | text | Staff |
| Телефон | `phone` | **text**, `+359...` | Staff |
| Адрес | `address` | text, optional | Staff |
| Автомобил | `carModel` | text | Staff |
| Рег. номер | `carPlate` | text | Staff |
| Последен преглед | `lastServiceDate` | Excel date | Staff |
| SMS изпратен на | `smsSentAt` | Excel date-time | App |
| ~~Активен~~ | — | Removed on 2026-11-15 (`specs.md` D19). The app ignores the column in an old file. | — |

**Owner decision, 2026-11-13:** "Следващ преглед" and "Напомняне на" are **not** in the file. `specs.md` section 4 says: do not store what can be computed. The app computes them (and the status) on each read. The staff see them in the dashboard.

The final field list depends on chapter 06 (the status model). Chapter 06 can add or remove a column.

### Sheet 2 — `Настройки`
Two columns, key and value: `SMS шаблон`, `Цена за 1 SMS`, `Почивни дни от седмицата`.

`Почивни дни от седмицата` holds the weekly days off as words, with commas: `неделя, понеделник` (the default, `specs.md` D7). In the data object it is `weeklyDaysOff`, a list of day numbers (0 = Sunday).

### Sheet 3 — `Почивни дни`
One column of dates (the holiday list).

### Format rules
- Header row is frozen and bold. App-only columns have a grey fill, so staff see what not to touch.
- `Телефон` is a text column. Otherwise Excel removes the `+` and changes the number.
- `Да` / `Не` columns have a drop-down list (data validation).

## Risks and how the store handles them

| Risk | Answer |
|---|---|
| Excel has the file open. On Windows the file is locked and a write fails (`EBUSY` / `EPERM`). | The app catches the error and shows: "Затворете файла в Excel и опитайте отново". Nothing is lost. The app also looks for the lock file `~$клиенти.xlsx` and warns before the write. |
| A write stops half way (power cut). | Write to a temp file in the same folder, then rename it over the real file. |
| Staff delete a column or type a bad date. | Each read checks every row. Bad rows are reported with sheet, row number, and reason. Good rows still load. A missing column stops the load with a clear message. |
| Staff delete rows by accident. | Before the first write of each day, copy the file to `backups/клиенти-YYYY-MM-DD.xlsx`. Keep the last 30. |
| Two rows get the same ID after a copy-paste. | The read finds duplicates and gives the second row a new ID. |
| Dates shift by one day. | Convert Excel dates to `YYYY-MM-DD` text with local date parts only. See chapter 06. |
| The file does not exist. | The app creates an empty one with the three sheets and the headers. |

## Steps
- [x] `npm install exceljs` in `staff/`.
- [x] Write `staff/lib/store.js` with `readData()` and `writeData(data)`. They return and accept the same object shape that `server.js` uses today (`customers`, `smsTemplate`, `smsPricePerSegment`, `holidays`), plus `weeklyDaysOff` and `problems`. `server.js` adds the computed fields after each read.
- [x] `readData` becomes async. Update all routes to `await` it.
- [x] Add the lock check, the temp-file write, the daily backup, and the row checks from the table above.
- [x] New route `GET /api/data-problems` + a banner in the dashboard that lists bad rows.
- [x] The data folder path comes from one config value, in `staff/lib/paths.js`. Default: `Documents/ЕГЕР-Сервиз/` (`specs.md` O3). `EGER_DATA_DIR` overrides it.
- [x] Write a one-time script `staff/tools/json-to-xlsx.js` that converts the old `customers.json`.
- [x] Write `staff/tools/make-test-data.js`. It creates `клиенти.xlsx` with 12 test customers (see below). Dates are relative to "today", so the file is always useful.
- [x] Delete `data/customers.json` from git. Add `staff/data/` and `backups/` to `.gitignore`.
- [x] Tests (`node --test`): round trip (write then read gives the same data), bad row, missing column, duplicate ID, locked file.

## Test customers (12)
The 5 present ones plus 7 new ones. All names and phones are invented. Each one covers a case:

| # | Case |
|---|---|
| 1–5 | The present five (move as they are) |
| 6 | Reminder is due **today** |
| 7 | Reminder was due 10 days ago (overdue) |
| 8 | Reminder date falls on a **Monday** (day off, must show on Saturday) |
| 9 | Reminder is far away (was: disabled customer, removed on 2026-11-15) |
| 10 | Very long name and car model (SMS goes over 70 characters) |
| 11 | Inspection anniversary falls on a **Sunday** |
| 12 | Last inspection on **29 February**, and one row with a missing phone (bad-row test) |

## Done when
- [x] The dashboard does add, edit, delete, and send, and the changes are in the `.xlsx` file. (Checked through the API on the Mac. **Owner checks** the clicks in the browser.)
- [ ] A hand edit in Excel shows in the dashboard after a reload. (A test does the edit with `exceljs`. **Owner checks** with real Excel.)
- [ ] With the file open in Excel on Windows, a save gives the clear message and no data is lost. (A test uses a lock file. **Owner checks** on Windows.)
- [x] All store tests pass. (31 tests, `TZ=Europe/Sofia` and `TZ=UTC`.)

### Owner checks (Windows PC with Excel)
1. In `staff/`: `npm install`, then `npm run test-data`, then `npm start`. The file is `Documents\ЕГЕР-Сервиз\клиенти.xlsx`.
2. Dashboard: 12 customers show. A yellow box names sheet "Клиенти", row 14, "липсва телефон".
3. Add a customer, edit it, send an SMS to it, delete it. After each step open the file in Excel, look, and **close Excel**.
4. In Excel: change a name, save, close. Reload the dashboard. The new name shows.
5. In Excel: look at "Телефон" (the `+` is there), "Последен преглед" (a date like 15.01.2026), "Активен" (a drop-down with Да / Не), the grey columns "ID" and "SMS изпратен на", the frozen bold header.
6. Keep the file **open** in Excel. In the dashboard click "Изпрати" on a customer and confirm. The message must be "…Затворете файла в Excel и опитайте отново." No SMS line shows in the black window.
7. Still open: edit a customer and save. Same message. Close Excel. Reload. The data is as before the edit.
8. Look in `Documents\ЕГЕР-Сервиз\backups\`. One file with today's date is there.
