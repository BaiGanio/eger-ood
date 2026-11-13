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
| Следващ преглед | `nextServiceDate` | Excel date | App (computed) |
| Напомняне на | `nextReminderDate` | Excel date | App (computed) |
| SMS изпратен на | `smsSentAt` | Excel date-time | App |
| Съгласие за SMS | `smsConsent` | `Да` / `Не` | Staff |
| Съгласие от дата | `smsConsentAt` | Excel date | App, or staff |
| Активен | `disabled` (inverted) | `Да` / `Не` | Staff |

The final field list depends on chapter 06 (the status model). Chapter 06 can add or remove a column.

### Sheet 2 — `Настройки`
Two columns, key and value: `SMS шаблон`, `Цена за 1 SMS`.

### Sheet 3 — `Почивни дни`
One column of dates.

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
- [ ] `npm install exceljs` in `staff/`.
- [ ] Write `staff/lib/store.js` with `readData()` and `writeData(data)`. They return and accept the same object shape that `server.js` uses today (`customers`, `smsTemplate`, `smsPricePerSegment`, `holidays`). Then the routes need almost no change.
- [ ] `readData` becomes async. Update all routes to `await` it.
- [ ] Add the lock check, the temp-file write, the daily backup, and the row checks from the table above.
- [ ] New route `GET /api/data-problems` + a banner in the dashboard that lists bad rows.
- [ ] The data folder path comes from one config value (default `staff/data/`). Chapter 09 sets the final place.
- [ ] Write a one-time script `staff/tools/json-to-xlsx.js` that converts the old `customers.json`.
- [ ] Write `staff/tools/make-test-data.js`. It creates `клиенти.xlsx` with 12 test customers (see below). Dates are relative to "today", so the file is always useful.
- [ ] Delete `data/customers.json` from git. Add `staff/data/` and `backups/` to `.gitignore`.
- [ ] Tests (`node --test`): round trip (write then read gives the same data), bad row, missing column, duplicate ID, locked file.

## Test customers (12)
The 5 present ones plus 7 new ones. All names and phones are invented. Each one covers a case:

| # | Case |
|---|---|
| 1–5 | The present five (move as they are) |
| 6 | Reminder is due **today**, has consent |
| 7 | Reminder was due 10 days ago (overdue), has consent |
| 8 | Due today, **no consent** (send must be blocked) |
| 9 | Disabled customer |
| 10 | Very long name and car model (SMS goes over 70 characters) |
| 11 | Inspection anniversary falls on a **Sunday** |
| 12 | Last inspection on **29 February**, and one row with a missing phone (bad-row test) |

## Done when
- The dashboard does add, edit, delete, and send, and the changes are in the `.xlsx` file.
- A hand edit in Excel shows in the dashboard after a reload.
- With the file open in Excel on Windows, a save gives the clear message and no data is lost.
- All store tests pass.
