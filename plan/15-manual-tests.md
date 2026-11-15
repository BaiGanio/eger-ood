# 15 — Manual tests and staff practice

Needs: chapter 10 (staff guide) written. Rules: `specs.md` sections 5, 6, 7.

## Why

The app has many edge cases. The automatic tests check the rules, but not the real screen, the real Excel and the real phone. We find the problems now, by hand, and not in live use. The staff also learn the daily work with safe exercises.

## Decisions (owner, 2026-11-15)

- Two lists. **List A**: staff practice, easy and safe. **List B**: owner tests, the hard cases. The staff do not do list B.
- List A runs on the **real file**, with one fake customer "ТЕСТ". The staff delete it at the end. No practice mode, no new code in the engine.
- List A sends **real SMS** (2 at most), only to the phone of the staff. The SMS has the real Bulgarian template: `specs.md` section 9 (short English words) is for the developer account and list B.
- List A is the page "Упражнения" under "Помощ" in the app (D11): task 11, `staff/public/help/practice.html`. Built 2026-11-15, after the owner's OK of the list and of the page proposal.
- The page shows the real dates for today (`help/practice.js`). The staff do not work a date out. Tick boxes are not saved. No pictures: each group names its guide task.
- The page has 21 steps. Steps A5–A6 and A16–A17 of the table below are split there, so that one step has one result. A change of list A goes into the table and into the page.
- Known holes are not fixed first. Their steps have the mark **KNOWN**. After a fix, the step is the check of the fix.

## Form of a step

**Do** → **You must see** → tick. If the screen shows another thing: stop, write down what you did and what you saw, call for help.

Dates in the steps: "today + 3, last year" means: take the day 3 days after today, and type it with the year before. Example: today is 17.11.2026 → type 20.11.2025.

## List A — staff practice (about 20 minutes)

Before the start: the app is open, the box in the menu is green, no yellow banner about SMS.

| # | Do | You must see |
|---|---|---|
| A1 | Look at the card "Всички клиенти". Write the number down. | A number (N). |
| A2 | "Добави клиент". Name `ТЕСТ`, model `Тест`, plate `pb 0000 tt` (small letters, with spaces), your own phone typed with 0 (`0888…`), last inspection: today + 3, last year. Save. | A question offers `+359…`. Click "Промени". Toast "Клиентът е добавен". |
| A3 | Look at the cards. | "Всички клиенти" = N + 1. "Очакващи SMS" is 1 more than before. |
| A4 | Type `ТЕСТ` in the search. | One row. Plate `PB0000TT` (capital letters, no spaces). Status "За днес". "Следващ преглед" is 3 days after today. |
| A5 | Pencil on the row. Clear the name. Save. | A warning "Моля, попълнете всички задължителни полета". Nothing is saved. |
| A6 | In the same window: put the name back. Set the date to tomorrow. Save. | Error "Датата на последния преглед не може да е в бъдещето". Click "Отказ". |
| A7 | Click the card "Очакващи SMS". Find `ТЕСТ`. Click "Изпрати". | The window "Преглед на SMS" shows the name, the plate and the expiry date (3 days after today). |
| A8 | Send. | Toast "SMS изпратен до ТЕСТ!". The SMS comes to your phone. The row is gone from "Очакващи SMS". |
| A9 | Click the card "Изпратени SMS". | `ТЕСТ` is on top, with the day and time of now. |
| A10 | Click the card "Очаквани за преглед". Click "7 дни". | `ТЕСТ` is in the list. |
| A11 | Click "Всички клиенти". Search `ТЕСТ`. | Status "Изпратен". No "Изпрати" button. |
| A12 | Pencil. Change the phone to the phone of a colleague. Save. Click "Очакващи SMS". | `ТЕСТ` is in the list again, with "Изпрати". (Why: the first SMS went to a wrong number.) Send it if you want: the colleague gets the SMS. |
| A13 | "The customer passed the inspection." Pencil. Last inspection = today. Save. | Status "Очаква". "Следващ преглед" is one year after today. `ТЕСТ` is not in "Очакващи SMS". |
| A14 | "The customer did not come." Pencil. Last inspection = today − 2, last year. Save. | Status "Просрочен". The card "Просрочени" is 1 more. No "Изпрати" button for `ТЕСТ`. |
| A15 | Pencil. Last inspection = today + 20, last year. Save. Read the date in "Напомняне" and write it down. | Status "Очаква". |
| A16 | "Настройки" → the calendar. Click the day that you wrote down. | The day is orange. A toast says that reminders moved (1 or more). `ТЕСТ` now has an earlier "Напомняне" date. |
| A17 | Click the same day again. | The day is not orange. `ТЕСТ` has the first "Напомняне" date again. |
| A18 | Bin button on `ТЕСТ`. Say yes. | Toast "Клиент ТЕСТ е изтрит". "Всички клиенти" = N. |
| A19 | Click "Помощ". | The list of the 10 tasks. |

End check: search `ТЕСТ` → no row. The calendar has no orange day that you added.

## List B — owner tests

Developer machine: `cd staff && EGER_DATA_DIR=./data npm run test-data -- --force && EGER_DATA_DIR=./data npm start`. Put your own phone number in each row that gets a send. Real sends: short English words only (`specs.md` section 9). The Windows steps run on the real PC, on a copy of the file.

### B1 — Excel file

| # | Do | You must see |
|---|---|---|
| B1.1 | Open `клиенти.xlsx` in Excel. Click "Изпрати" on a row. | The "close Excel" message. No SMS goes out. No SMS mark on the row. |
| B1.2 | Excel still open. Add a customer. | The same message. After Excel is closed, a second save works. |
| B1.3 | Close Excel. Make an empty file `~$клиенти.xlsx` in the data folder. Add a customer. | The "close Excel" message. Delete the small file → the save works. |
| B1.4 | In Excel: set one phone to `abc`, one date to `32.13.2026`. Save, close. Reload the page. | A banner with sheet, row and reason for the 2 rows. All other rows load. |
| B1.5 | After B1.4: edit a good customer in the app. Open the file. | The 2 bad rows are still in the file, not changed. |
| B1.6 | In Excel: add a column "Бележка" with text in some rows. Save, close. Edit a customer in the app. Open the file. | The column and its text are still there. |
| B1.7 | In Excel: look at a phone cell. | Text with `+`. Not a number, no `3.59E+11`. |
| B1.8 | A row with status "Изпратен": type a new "Последен преглед" (today) in Excel. Save, close, reload. | Status "Очаква", expiry one year later, no SMS mark. |
| B1.9 | A row with status "Изпратен": change the phone in Excel. Reload. | Still "Изпратен", no "Изпрати". (Rule: only an edit in the app clears the mark.) |
| B1.10 | First save of the day. Look in `backups/`. | One copy with the date of today. A second save makes no second copy. |
| B1.11 | Stop the app. Move the data file away. Start. | A new file with the right sheets. The app does not crash. |

### B2 — Dates and status

| # | Do | You must see |
|---|---|---|
| B2.1 | Last inspection = today, last year (expiry today). | Status "За днес", not "Просрочен". "Изпрати" works. |
| B2.2 | Last inspection = yesterday, last year. | "Просрочен". No "Изпрати". |
| B2.3 | Last inspection `29.02.2024` (type it in Excel). | "Следващ преглед" `28.02.2025`. |
| B2.4 | Pick a last inspection so that expiry − 7 days is a Sunday. Then a Monday. | "Напомняне" is the Saturday before, both times. |
| B2.5 | After B2.4: mark that Saturday as a day off in the calendar. | "Напомняне" is the Friday. "Следващ преглед" did not move. |
| B2.6 | Last inspection `08.01` of the present year (type it in Excel if it is in the future). | "Напомняне" is in December, on a work day (01.01 is a holiday). |
| B2.7 | Any date: compare "Последен преглед" in the app and in Excel. | The same day. No shift of one day. |
| B2.8 | Leave the page open over midnight (or change the PC clock by one day and wait). | The statuses are those of the new day, with no reload by hand. |
| B2.9 | Add a customer with a date of tomorrow. | Refused. |

### B3 — SMS

| # | Do | You must see |
|---|---|---|
| B3.1 | Start with no Twilio keys. Click "Изпрати". | Yellow banner. The send is refused. No SMS mark. |
| B3.2 | Put wrong keys in `.env`. Send. | A clear Bulgarian error. No SMS mark. "Изпрати" is still there. |
| B3.3 | Right keys. Click "Изпрати" two times fast in the preview window. | One SMS on the phone. |
| B3.4 | Open the app in two tabs. Send to one row in tab 1. Do not reload tab 2. Send to the same row in tab 2. | "На този клиент вече е изпратен SMS." One SMS on the phone. |
| B3.5 | Two tabs. A row with "Изпрати" shows in tab 2. In tab 1: edit that row, last inspection = today − 2, last year ("Просрочен"). In tab 2, with no reload: send. | "Срокът на прегледа е изтекъл. Не се изпраща SMS." |
| B3.6 | Send in advance: card "Очакващи SMS" → "1 месец" → send to an "Очаква" row. | The SMS has the true expiry date. Status "Изпратен". No second send near the date. |
| B3.7 | Template with more than 70 Bulgarian characters. | The counter shows 2 SMS and the price for 2. |
| B3.8 | Template with `{{xyz}}`. Save. | Saved, with a warning "Непознати променливи: {{xyz}}". Put the old template back. |
| B3.9 | Turn the internet off. Send. | A clear error. No SMS mark. |
| B3.10 | **KNOWN** — "SMS е изпратен, но не е записан": the row still has "Изпрати", a second paid SMS is possible. | Hard to make by hand. Decide the fix first (`progress.md`). |

### B4 — Input

| # | Do | You must see |
|---|---|---|
| B4.1 | Phone `0887 123 456`. | The app offers `+359887123456`. |
| B4.2 | Phone `+35988abc`. Phone `+359`. | "Телефонът трябва да е във вида +359881234567." |
| B4.3 | Name `<b>Иван</b> & 'син'`. | The page shows the text as typed. No bold text. No broken row. |
| B4.4 | A name with 101 characters. | "Текстът в някое от полетата е твърде дълъг." |
| B4.5 | **KNOWN** — add a second customer with the plate of the first. | Today: accepted (double row). Wanted: refused. |
| B4.6 | **KNOWN** — plate with Cyrillic letters `РВ1234АВ`. | Today: kept as typed. A search with Latin `PB` does not find it. |
| B4.7 | **KNOWN** — a Latin-only template with 100 characters. | Today: the warning says "Над 70 знака". It is wrong for Latin text (160). |

### B5 — The app

| # | Do | You must see |
|---|---|---|
| B5.1 | Close the black window. | In about 5 seconds: red box in the menu and a banner. |
| B5.2 | Start the app again. Do not reload the page. | Green box. Toast "Сървърът работи отново". The data loads. |
| B5.3 | Start the app a second time while it runs. | The browser opens the running app. No second black window stays. |
| B5.4 | Close a banner with ×. Wait 10 seconds. | The banner stays closed. It is back after a reload. |
| B5.5 | Table: 25 / 50 / 100 rows, page 2, then a new search. | "Показани …" is right. The search goes to page 1. |
| B5.6 | On page 2: edit a customer. | The page stays 2. |
| B5.7 | Internet off. "Настройки" → "Провери сега". | "Проверката не успя…". The calendar still shows the official days. |
| B5.8 | F12 → console, click through all pages. | No red line. |

### B6 — Windows PC (with `09-packaging.md`, "Windows test")

| # | Do | You must see |
|---|---|---|
| B6.1 | Start from the desktop icon. | The dashboard opens. The data folder is the folder that Explorer shows as "Документи\ЕГЕР-Сервиз" (OneDrive can move it: `progress.md`). |
| B6.2 | B1.1, B1.2 and B1.3 with real Excel. | The same results. `~$клиенти.xlsx` is a hidden file. |
| B6.3 | Excel crashes or the PC restarts with Excel open. | If the "close Excel" message stays: the hidden lock file is the cause. |
| B6.4 | `настройки.env` with the keys in the data folder. | No yellow banner. A send works. |

## Results

Write each failed step here: step, date, what the screen showed. Then a fix goes into its own chapter, with a test (`specs.md` section 9).

| Step | Date | What happened | Fix |
|---|---|---|---|
| | | | |

## Steps

- [x] Lists A and B written in this file (2026-11-15).
- [ ] Owner reads list B: add, remove, change steps.
- [x] Owner OK of list A and of the page proposal (2026-11-15: "all good").
- [x] Page "Упражнения" under "Помощ" for list A, in Bulgarian: `help/practice.html`, `help/practice.js`, line 11 in `help/tasks.js`, styles in `help.css`, `test/practice.test.js`.
- [ ] Owner reads the page text in the browser.
- [ ] Owner runs list B on the developer machine.
- [ ] Owner runs B6 on the Windows PC.
- [ ] Staff run list A with the owner next to them.
- [ ] Failed steps are in "Results" and in `progress.md`.

## Done when

- List A is a page in the app and the staff did it one time with no surprise.
- Each step of list B has a tick or a line in "Results".
- Each **KNOWN** step has a decision: fix or accept.
