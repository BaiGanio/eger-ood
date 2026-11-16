# To-do: texts that must follow the code

Changes of the code that the help pages and other texts do not show yet. Do them in one docs session. Remove a line when it is done.

## Help pages (`staff/public/help/`)

- [ ] **Same plate (chapter 16, D28). Wait: the rule is under question (`specs.md` O7). Do not write this text before the staff answer.** `add.html` and `edit.html`: say that a plate can be in the list only one time, and what the message "Вече има клиент с рег. номер …" means. `errors.html`: add this message. `errors.html`, bad rows: add the reason "рег. номер … вече е на ред N" and what to do (keep one row, delete the other in Excel).
- [ ] **SMS counter warning (2026-11-16).** The warning now shows the true count: "Над 70 знака" (2 SMS, Bulgarian), "Над 134 знака" (3 SMS, Bulgarian), "Над 160 знака" (2 SMS, Latin letters only). `template.html` says only "Над 70 знака …" (step text, hint and the `alt` of `template-2-long.png`). Say there: Bulgarian text = 70 in one SMS, 71–134 = 2 SMS, 135–201 = 3 SMS.
- [ ] **Bad-rows banner (2026-11-16).** A bad value in sheet "Настройки" now shows a second line: "Във файла „клиенти.xlsx“ има настройки с грешка. Програмата използва обичайната стойност." Add it to `errors.html`.
- [ ] **Status option "Просрочени (всички)" (2026-11-16).** The option had the name "Просрочени". `overdue.html` (hint of the last step) names the old text, and `overdue-3-filter.png` shows it. Change the text and make the picture again (`tools/guide-shots.mjs`).
- [ ] **"Отвори папката" (2026-11-16, D29).** `file.html` (task 9): the fast way to the file is now "Настройки" → "Файл с данни" → "Отвори папката". Add the steps and one picture. `errors.html`: add "Папката не може да се отвори …".
- [ ] **SMS sent, save later (2026-11-16, D30).** `errors.html`: the message "SMS е изпратен, но не е записан" is now rare. Add the new yellow message "SMS изпратен до … Файлът е отворен в Excel: затворете го. Програмата ще запише изпращането сама." and say: close Excel, do nothing more. `file.html`: name the small file `незаписани-sms.json` and say "do not delete it".
- [ ] **Computed columns in the file (2026-11-16, D31).** `file.html` (task 9): the file now has three more grey columns: "Следващ преглед", "Напомняне на", "Статус". Say: the program fills them, do not type there, they are right after the program was opened that day with Excel closed. Check the picture of the file. `staff/ИНСТРУКЦИЯ.md`: the same, where it lists the columns.

## Other texts

- [ ] `plan/15-manual-tests.md` (list B) and `help/practice.html` (list A): add a step "add the customer ТЕСТ a second time → the message shows". Check that no present step needs two rows with one plate.
- [ ] `staff/ИНСТРУКЦИЯ.md`: the part "where is the file" can name the "Отвори папката" button. Name `незаписани-sms.json` too.
- [ ] Windows test (`09-packaging.md`): add "click Отвори папката: Explorer shows the folder". Check the OneDrive case there: the card shows the true path.
