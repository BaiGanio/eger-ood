# 17 — Computed columns in the Excel file

Rule: `specs.md` D31. Staff request (2026-11-16): the Excel file does not show the status and the reminder day. The owner said yes.

The time of the SMS was in the file before this chapter: column "SMS изпратен на".

## The rule

- Sheet "Клиенти" has three more grey columns: "Следващ преглед", "Напомняне на", "Статус" ("Просрочен", "Изпратен", "За днес", "Очаква").
- They are a copy of what the dashboard shows. The app does not read them as data. A value typed there by hand is overwritten.
- Each save writes them.
- Each read compares them with the computed values. If one is different, the app saves the file one time. This occurs on the first page load of a day, after a hand edit in Excel, and after a new day off.
- An old file has no such columns. The first read adds them after the last column in use. Columns of the staff stay.
- File open in Excel: the read works, the columns stay old, no message. The next page load with a free file makes them right.
- A bad row (not loaded) keeps its computed cells as they are.

## Steps

- [x] `specs.md`: D31, section 4 and section 7.
- [x] `lib/store.js`: the three columns, `STATUS_NAMES`, the compare on a read, `refreshComputed`, the write queue (`oneAtATime`).
- [x] Tests in `store.test.js`. Both time zones.
- [x] Speed check with 5000 customers (numbers in `progress.md`).
- [ ] Help pages: see `plan/to-do.md`.

## Owner checks

- [ ] Start the app with the real file (a copy first). Open the file in Excel: the three grey columns are at the end, with a value on each good row.
- [ ] The status in Excel is the same as in the dashboard for 5 customers.
- [ ] If the real file has a column of the staff with the name "Статус", "Следващ преглед" or "Напомняне на": the app takes it over. Rename that column before the first start.

## Done when

- [x] A new file and an old file both show the three columns.
- [x] A page load on a new day makes the columns right with no click.
- [x] No read fails because of the columns.
