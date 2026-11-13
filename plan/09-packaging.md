# 09 — Packaging for Windows and Mac

Needs: chapters 05, 06, 07. Open question: Q4 in `README.md`.

## Findings

| Finding | Where |
|---|---|
| **Data loss risk.** The build tool `caxa` unpacks the app into a temp folder. The data path is `__dirname/data` (`server.js:34`), so the data file is in the temp folder too. A new build or a temp cleanup can lose it. | `server.js:34` |
| The `.env` file has the same problem: it is looked for in the unpack folder. | `server.js:18` |
| `build:mac` uses the fixed path `/opt/homebrew/bin/node`. It works only on a Mac with Homebrew Node. | `package.json` |
| There are two ways to start: the built file, and `start.bat` + Node install (`check-node.bat`). It is not clear which one staff use. | repo root |
| `README.md` is old: name `ping-my-car`, a `public/` layout that did not exist, half a guide. | `README.md` |
| The port is fixed at 3000. If it is busy, the app fails with a raw error. | `server.js:33` |

## Design

### One way to start
Staff get **one built file per system** (`ЕГЕР-Сервиз.exe`). No Node install on the staff PC. `start.sh` / `start.bat` stay only as developer tools, or go away.

### Where things live on the staff PC

```
C:\Users\<name>\Documents\ЕГЕР-Сервиз\
  клиенти.xlsx          ← the data. Staff open this in Excel.
  backups\              ← daily copies
  настройки.env         ← Twilio keys (filled in one time at install)
```

- Windows: `Documents\ЕГЕР-Сервиз\`. Mac: `~/Documents/ЕГЕР-Сервиз/`.
- An environment variable `EGER_DATA_DIR` overrides the folder. Developers point it at `staff/data/`.
- The app creates the folder and an empty `клиенти.xlsx` on first start.
- The app prints the full path of the data file at start, and the dashboard shows it in settings with an "Отвори папката" button.

## Steps
- [ ] `staff/lib/paths.js`: one place that works out the data folder, the backup folder, and the `.env` path.
- [ ] Load `.env` from the data folder (first) and from `staff/` (second, for developers).
- [ ] If port 3000 is busy: if our app is already running there, just open the browser; if not, try 3001–3010.
- [ ] Fix `build:mac` to pack the Node binary the same way as `build:win`.
- [ ] Add a `.caxa-ignore` (or the `--exclude` option): `data/`, `.env`, `test/`, `tools/`, `*.xlsx`.
- [ ] Build on the Mac. Run the built file. Check that the data file is in `~/Documents/ЕГЕР-Сервиз/`.
- [ ] Build for Windows. Test on a real Windows PC (or a VM):
  - [ ] Double-click starts it. The browser opens.
  - [ ] Bulgarian text in the console window is readable (code page).
  - [ ] Save works. With the file open in Excel, the clear message shows.
  - [ ] Windows SmartScreen warning: write down what staff must click.
  - [ ] Stop and start again: the data is still there.
- [ ] Rewrite `README.md`: what the two apps are, how to run each for development, how to build, how to deploy the site.
- [ ] Write `staff/ИНСТРУКЦИЯ.md` in Bulgarian for staff: install, start, daily use, where the Excel file is, "close Excel before you save", what the yellow test banner means, how to restore a backup.

## Later items (not in this plan)
- Automatic daily send (needs the PC to be on, or a Windows scheduled task).
- Bulk "send to all due" button.
- Twilio delivery status (did the SMS arrive).
- A sender name ("EGER") in place of a phone number.

## Done when
- A clean Windows PC with no Node runs the app from one file.
- A new build does not touch the data file.
- A person who never saw the project can start it with `ИНСТРУКЦИЯ.md` only.
