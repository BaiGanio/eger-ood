# 10 — Staff guide

Needs: chapter 08 done (the screenshots must show the final dashboard). Decision: `specs.md` D11.

## Decisions (owner, 2026-11-15)

- Form: a help page in the staff app, `staff/public/help.html`. Staff print it or save it as PDF from the browser (Ctrl + P). No separate PDF file. No paper cheat sheet. No video.
- Each click is written out. One step = one action.
- Screenshots with red numbers. The numbers in the text match the numbers in the picture.
- Fake data only in the screenshots (`npm run test-data`).
- Staff start the app with a double-click on a desktop icon (chapter 09). The guide never says `npm`, `start.bat` or "server" as a task.
- Staff use "Настройки" too. The guide covers it.
- The example (task 1) comes first, to fix the style. The other tasks wait for the end of chapter 08.

## Decisions (owner, 2026-11-15, second session)

- Staff read only the help page. `staff/ИНСТРУКЦИЯ.md` is for the person who helps. So the daily parts of it go into the guide: the black window (task 1, task 10), Excel and the lock file (task 9). Install, Twilio keys and a new version stay out.
- New task "Клиентът мина прегледа" (D26: type the new date), after task 3. The guide has 10 tasks.
- Task 2: staff type the phone with 0 (0888…), then click "Промени" in the question. One screenshot of the question.
- Task 6 ("Просрочени"): never tell the staff to delete. Overdue more than 12 months: the status filter "Просрочени", or search in "Всички клиенти".
- Task 3 keeps the bin button (a wrong row).
- Task 8: the staff may change the SMS price. Task 7: the weekly days off are Sunday and Monday; to change them, call for help. No Excel steps.
- Task 9 (file): the daily copy (no "Копие на USB": removed, owner 2026-11-15). Restore of a copy: a grey box "само с помощ" with the steps, first line "обадете се за помощ".
- Task 10 (errors): text only, no screenshot of each banner.
- Work one task at a time. The owner checks each task before the next.
- One page per task (owner, 2026-11-15; specs D11). "Помощ" in the sidebar opens the list of tasks (the dashboard code changes for this, owner OK). A task opens in the same tab. Sidebar closed → "Помощ" opens the contents page. A task that is not written is grey, with no link.

## Files

| File | What |
|---|---|
| `staff/public/help.html` | Contents list of the guide. |
| `staff/public/help/tasks.js` | The list of the tasks (order, file, short name, title, written or not). The one home: sidebar, contents and "back / next" read it. A new task: add its page, set `ready: true`. |
| `staff/public/help/help-nav.js` | Draws the contents list, the task number and the "back / next" links. |
| `staff/public/help/*.html` | One page per task. Bulgarian. |
| `staff/public/help.css` | Look of the guide, and the print rules. |
| `staff/public/help/*.png` | Screenshots, next to their page. |
| `staff/tools/guide-shots.mjs` | Makes the screenshots again. Uses Playwright, installed with `--no-save` (not in `package.json`). Never clicks "Изпрати SMS". |

## Style of a task

1. Title with a number.
2. Blue box: the one thing to know before you start (only if needed).
3. Groups of steps with a grey heading ("Преди да започнете", "Изберете клиента", ...).
4. Picture first, then the steps for that picture.
5. Button names look like the button (`.ui-btn`). The red number (`.mark`) after the step.
6. Grey hint under a step: why, or what to do if the screen is not as shown.
7. "Готово. Какво стана?" — what changed.
8. "Ако нещо не стане" — the errors of this task, and who to call.

## Steps

- [x] Example task: "Как да изпратя SMS напомняне", 2 screenshots. "In progress" note on the page.
- [x] Owner approves the style of the example (2026-11-15: "small polishing").
- [x] Contact for errors: no name and no phone in the guide. It says "обадете се за помощ". The staff have the number (owner, 2026-11-15).
- [x] Desktop icon name stays "ЕГЕР-Сервиз" for now. Change it if the staff want another name.
- [x] Link "Помощ" in the dashboard menu, under "Настройки" (owner, 2026-11-15).
- [x] After chapter 08: make all screenshots again (`tools/guide-shots.mjs`). Done 2026-11-15 (second session): the two task 1 pictures show "Помощ" and "Копие на USB".
- [x] Task 1: hint about the black window (step 2).
- [x] One page per task; "Помощ" list in the sidebar (owner, 2026-11-15). Task 1 moved to `help/sms.html`.
- [x] Task 2: Как да добавя клиент (`help/add.html`, 3 screenshots). Search the plate first (no guard against double rows yet). Waits for the owner's check.
- [x] Task 3: Как да променя или изтрия клиент (`help/edit.html`, 3 screenshots; nothing saved or deleted). Delete only a wrong or double row; never an overdue customer. Waits for the owner's check.
- [x] Task 4 (new): Клиентът мина прегледа (D26) (`help/passed.html`, 2 screenshots; the customer of "Очаквани за преглед"; nothing saved). Waits for the owner's check.
- [x] Task 5: Кой трябва да получи SMS днес (cards and periods) (`help/cards.html`, 3 screenshots, status meanings). Waits for the owner's check.
- [x] "Копие на USB" removed (owner, 2026-11-15; D27): button, route, helpers, 4 tests, docs. All pictures made again without it.
- [x] Task 6: Какво значи „Просрочени“ (`help/overdue.html`, 3 screenshots: card, period "12 месеца", status filter "Просрочени"; nothing clicked in the rows). No delete step; more than 12 months: the status filter or a search in "Всички клиенти"; a late customer: task 4. Waits for the owner's check.
- [x] Task 7: Почивни дни и защо SMS идва по-рано (`help/days-off.html`, 2 screenshots: "Настройки" and the calendar, next month with a work day and the colours). The script clicks no day (a click saves at once). Three examples of the reminder day, checked with `nextReminderDate`. Weekly days off: "обадете се за помощ", no Excel steps. Waits for the owner's check.
- [x] Task 8: SMS шаблон и цена (`help/template.html`, 3 screenshots: text and name buttons, a text of 71 letters = 2 SMS, price and save). The script types in the page only and never clicks "Запази шаблона". The staff may change the price; the price is only for the "≈ $" estimate. Waits for the owner's check.
- [x] Chapter 09 made the screenshots `help/sms-1-list.png` and `help/sms-2-preview.png` old if they show the sidebar or a banner: the sidebar has a new block "Копие на USB" (under "Помощ"), the yellow "no keys" banner now names `„настройки.env“`, and the red "Сървърът е спрян" banner names the desktop icon. Make them again (`tools/guide-shots.mjs`).
- [x] Task 9: Къде е файлът с клиентите (`help/file.html`, text only: no dashboard screen shows the file, owner choice A). Path, Excel and the app, the lock file `~$клиенти.xlsx` (hidden on Windows: turn on "Скрити елементи"), the daily copy (made before the first save of a day; 30 days with a save, not 30 calendar days). Restore of a copy in a new grey box `.help-box` (owner OK), first line "обадете се за помощ". No "Копие на USB" (D27). No "Отвори папката" (O6). Waits for the owner's check.
- [x] Task 10: Ако нещо не работи (`help/errors.html`, text only). Each message text copied from the code: banners on top, red toasts, the server box in the sidebar, the black window. "SMS е изпратен, но не е записан": do not click "Изпрати", write down the plate and the time, call for help. Waits for the owner's check.
- [x] Remove the "Ръководството още се пише" note (`help.html`).

## Owner checks

1. Start the app. Open `http://localhost:3000/help.html`.
2. Read task 1. Is the style good? Is each step clear?
3. Press Ctrl + P. Is the print good?
4. On the dashboard, click "Помощ" in the sidebar. The list of 10 tasks opens; 1 and 2 are links, the rest grey. Click "Помощ" again: the list closes.
5. Click "Скрий менюто", then the "?" icon: the contents page opens.
6. Read task 2 (`help/add.html`). Do the steps match the dashboard? Do "back / next" at the bottom work?
7. Read task 3 (`help/edit.html`). Do the steps match the dashboard?
8. Read task 4 (`help/passed.html`). Do the steps match the dashboard?
9. Read task 5 (`help/cards.html`). Do the steps match the dashboard?
10. The sidebar has no "Копие на USB".
11. Read task 6 (`help/overdue.html`). Do the steps match the dashboard?
12. Read task 7 (`help/days-off.html`). Click a day in "Настройки": does the page match? Click it again to undo.
13. Read task 8 (`help/template.html`). Do the steps match "Настройки"?
14. Read task 9 (`help/file.html`). Is the grey box good on screen and in print (Ctrl + P)? On the staff PC: do the Explorer names "Изглед" → "Покажи" → "Скрити елементи" match Windows there?
15. Read task 10 (`help/errors.html`). Is each answer right? Is a message missing?
16. Open `help.html`: no yellow "още се пише" note; all 10 tasks are links.
