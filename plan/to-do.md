# To-do: texts that must follow the code

Changes of the code that the help pages and other texts do not show yet. Do them in one docs session. Remove a line when it is done.

## Help pages (`staff/public/help/`)

- [ ] **Same plate (chapter 16, D28).** `add.html` and `edit.html`: say that a plate can be in the list only one time, and what the message "Вече има клиент с рег. номер …" means. `errors.html`: add this message. `errors.html`, bad rows: add the reason "рег. номер … вече е на ред N" and what to do (keep one row, delete the other in Excel).
- [ ] **SMS counter warning (2026-11-16).** The warning now shows the true count: "Над 70 знака" (2 SMS, Bulgarian), "Над 134 знака" (3 SMS, Bulgarian), "Над 160 знака" (2 SMS, Latin letters only). `template.html` says only "Над 70 знака …" (step text, hint and the `alt` of `template-2-long.png`). Say there: Bulgarian text = 70 in one SMS, 71–134 = 2 SMS, 135–201 = 3 SMS.
- [ ] **Bad-rows banner (2026-11-16).** A bad value in sheet "Настройки" now shows a second line: "Във файла „клиенти.xlsx“ има настройки с грешка. Програмата използва обичайната стойност." Add it to `errors.html`.
- [ ] **Status option "Просрочени (всички)" (2026-11-16).** The option had the name "Просрочени". `overdue.html` (hint of the last step) names the old text, and `overdue-3-filter.png` shows it. Change the text and make the picture again (`tools/guide-shots.mjs`).

## Other texts

- [ ] `plan/15-manual-tests.md` (list B) and `help/practice.html` (list A): add a step "add the customer ТЕСТ a second time → the message shows". Check that no present step needs two rows with one plate.
- [ ] `staff/ИНСТРУКЦИЯ.md`: no change found. Check it in the docs session.
