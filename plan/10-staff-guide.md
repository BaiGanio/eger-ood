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
- Task 9 (file): the daily copy and "Копие на USB". Restore of a copy: a grey box "само с помощ" with the steps, first line "обадете се за помощ".
- Task 10 (errors): text only, no screenshot of each banner.
- Work one task at a time. The owner checks each task before the next.

## Files

| File | What |
|---|---|
| `staff/public/help.html` | The guide. Bulgarian. One `<section>` per task. |
| `staff/public/help.css` | Look of the guide, and the print rules (each task on a new page). |
| `staff/public/help/*.png` | Screenshots. |
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
- [ ] Task 2: Как да добавя клиент.
- [ ] Task 3: Как да променя или изтрия клиент.
- [ ] Task 4 (new): Клиентът мина прегледа (D26).
- [ ] Task 5: Кой трябва да получи SMS днес (cards and periods).
- [ ] Task 6: Какво значи „Просрочени“.
- [ ] Task 7: Почивни дни и защо SMS идва по-рано.
- [ ] Task 8: SMS шаблон и цена.
- [x] Chapter 09 made the screenshots `help/sms-1-list.png` and `help/sms-2-preview.png` old if they show the sidebar or a banner: the sidebar has a new block "Копие на USB" (under "Помощ"), the yellow "no keys" banner now names `„настройки.env“`, and the red "Сървърът е спрян" banner names the desktop icon. Make them again (`tools/guide-shots.mjs`).
- [ ] Task 9: Къде е файлът с клиентите (Excel, backups, the lock file `~$клиенти.xlsx`). Staff asked how the backup works: each change is saved at once; one copy a day goes to `backups/`, 30 are kept. Explain the daily copy. The sidebar button "Копие на USB" is built (chapter 09, D27): explain it here too, with a screenshot. Text for it is in `staff/ИНСТРУКЦИЯ.md`, part 4.
- [ ] Task 10: Ако нещо не работи (all banners).
- [ ] Remove the "Ръководството още се пише" note.

## Owner checks

1. Start the app. Open `http://localhost:3000/help.html`.
2. Read task 1. Is the style good? Is each step clear?
3. Press Ctrl + P. Is the print good?
