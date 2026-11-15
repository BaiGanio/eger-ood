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
- [x] `staff/lib/paths.js`: one place that works out the data folder, the backup folder, and the `.env` path. (Chapter 05; the key files `envFiles()` in chapter 09.)
- [x] Load `.env` from the data folder (first) and from `staff/` (second, for developers). The file in the data folder is `настройки.env`.
- [x] If port 3000 is busy: if our app is already running there, just open the browser; if not, try 3001–3010. (`lib/port.js`, `/api/status` names the app.)
- [x] Fix `build:mac` to pack the Node binary the same way as `build:win`. Now one `npm run build` (`tools/build.mjs`) for the system it runs on. It stops on a Node that needs `libnode.dylib` (Homebrew): build with the Node of nodejs.org.
- [x] Add a `.caxa-ignore` (or the `--exclude` option): `data/`, `.env`, `test/`, `tools/`, `*.xlsx`. (`EXCLUDE` in `tools/build.mjs`; dev packages pruned; output in `staff/dist/`.)
- [x] Build on the Mac. Run the built file. Check that the data file is in `~/Documents/ЕГЕР-Сервиз/`. (With Node 21 of nodejs.org and a test `HOME`; restart keeps the file.) Owner run with the real `HOME`: macOS asks for access to Documents (System Settings → Privacy & Security → Files and Folders → Terminal → Documents). The app now says this in place of "open in Excel".
- [ ] Build for Windows. Test on a real Windows PC (or a VM):
  - [ ] Double-click starts it. The browser opens.
  - [ ] Bulgarian text in the console window is readable (code page).
  - [ ] Save works. With the file open in Excel, the clear message shows.
  - [ ] Windows SmartScreen warning: write down what staff must click.
  - [ ] Stop and start again: the data is still there.
- [x] Staff request (D27): a button in the sidebar that saves a copy of `клиенти.xlsx` to a place the staff choose (USB stick). The daily copy stays. Show the owner a proposal (place, name, icon, how the save window works in the staff browser) and get an OK before any code. Tests. Add it to `10-staff-guide.md`, task 8. (Owner OK on the proposal; route `GET /api/backup-copy`; the save window itself is checked on the Windows PC.)
- [x] Rewrite `README.md`: what the two apps are, how to run each for development, how to build, how to deploy the site.
- [x] Write `staff/ИНСТРУКЦИЯ.md` in Bulgarian for staff: install, start, daily use, where the Excel file is, "close Excel before you save", what the yellow test banner means (now: the yellow "no keys" banner; the test mode is gone), how to restore a backup.

- [x] Banner "Сървърът е спрян": the text names the desktop icon, not `start.bat` (found in ch10).
- [x] `staff/package.json` name `eger-staff` (found in ch05/ch08).
- [ ] "Отвори папката" in "Настройки" with the path of the data file (Design section). **Not decided** (owner, 2026-11-15; specs O6). Proposal: card "Файл с данни" at the end of "Настройки", full path + button. Do not build before the owner's OK.
- [x] `start.bat`, `start.sh`, `check-node.bat` deleted (owner, 2026-11-15): `npm start` for developers, `npm run build` for the staff file.

### Windows test (owner, on the real PC)

1. Install Node LTS from <https://nodejs.org> (only on the build PC, not on the staff PC).
2. `git clone` (or pull) the repo. `cd staff`, `npm install`, `npm run build`.
3. Copy `staff\dist\ЕГЕР-Сервиз.exe` to the test PC (a PC with no Node is best).
4. Follow `staff/ИНСТРУКЦИЯ.md`, part 1. Write down the exact SmartScreen text and buttons.
5. Check the list above (browser opens, Bulgarian text in the black window, save, Excel open → clear message, stop and start → data stays).
6. Double-click the icon a second time: no second server, the browser opens.
7. "Копие на USB" with a USB stick in Edge: the "Save as" window, the name `клиенти-копие-<date>.xlsx`, the green toast, the file opens in Excel. "Cancel": no toast.
8. `настройки.env` with keys: the yellow banner goes away. One real SMS to your own phone, short English words (specs §9).

## Later items (not in this plan)
- Automatic daily send (needs the PC to be on, or a Windows scheduled task).
- Bulk "send to all due" button.
- Twilio delivery status (did the SMS arrive).
- A sender name ("EGER") in place of a phone number.

## Done when
- A clean Windows PC with no Node runs the app from one file.
- A new build does not touch the data file.
- A person who never saw the project can start it with `ИНСТРУКЦИЯ.md` only.
