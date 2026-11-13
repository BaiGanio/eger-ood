# 03 — Split the repo into `site/` and `staff/`

Needs: chapter 02.

## Why
Today one server serves both apps and the whole project folder. The public site must be static. The staff app must be private. They must not know about each other.

## Target layout

```
eger-ood/
  plan/
  site/                      ← public, GitHub Pages
    index.html
    holidays.json            (created in chapter 04)
    images/                  (all 6 image files — only index.html uses them)
  staff/                     ← private, staff PC
    server.js
    package.json
    package-lock.json
    lib/                     (created in chapters 05–06)
    public/
      ati.html  → rename to index.html
      scripts.js
      sms-text.js
      style.css              (only ati.html uses it)
    data/                    (git-ignored, see chapter 05)
    start.bat
    start.sh
    check-node.bat
  README.md
  .gitignore
```

## Steps
- [ ] Move the files with `git mv` so history stays.
- [ ] `staff/server.js`: serve only `staff/public/` (`express.static(path.join(__dirname, 'public'))`). Today it serves the whole project (`server.js:44`).
- [ ] `staff/server.js`: remove the `/` route to the landing page and the `/app` route. The dashboard is now at `/`.
- [ ] `staff/server.js`: fix the import of `sms-text.js` (now `./public/sms-text.js`).
- [ ] `site/index.html`: remove both "Персонал" links to `/app` (lines 32 and 484).
- [ ] `staff/public/index.html`: check it has no link to the public site.
- [ ] Remove the built file `ЕГЕР-Сервиз` (17 MB) from git: `git rm --cached "ЕГЕР-Сервиз"`. Add build outputs to `.gitignore`.
- [ ] Replace the `.gitignore` with a short Node one. The present file is a 7 KB Visual Studio template.
- [ ] Update `start.bat`, `start.sh`, and the `package.json` scripts for the new paths.

## Known leftover
The public calendar still calls `/api/holidays` after this chapter. It fails quietly and shows no holidays. Chapter 04 fixes it.

## Done when
- `cd staff && npm start` opens the dashboard at `http://localhost:3000/`.
- `http://localhost:3000/server.js` and `/data/...` give 404.
- `site/index.html` opens directly from disk and shows the page with images.
- `grep -rn "/app\|Персонал" site/` finds nothing.
