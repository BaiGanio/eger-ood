# ЕГЕР ООД

Two small apps for ЕГЕР ООД, a family car service in Bulgaria with more than 30 years of work.

| App | What it does | Where it runs |
|---|---|---|
| **Public site** | Shows the services, the work days, and the contact details. | GitHub Pages now, own domain later |
| **Staff app** | Keeps customers and cars. Shows who needs a reminder for the annual inspection (ГТП). Staff send the SMS with one click. | One PC at the service, local only |

The two apps share nothing at run time.

> **Status:** the project is in a restructure. See [`plan/progress.md`](plan/progress.md).

## Run it (development)

You need Node.js 20 or newer.

Staff app:

```bash
cd staff
npm install
npm start
```

- Staff dashboard: <http://localhost:3000/>

Public site: open `site/index.html` in a browser. It needs no server.

The calendar reads `site/holidays.json`. A browser does not read that file from a `file://` page, so the calendar then shows no holidays. To see them on your machine:

```bash
cd site
python3 -m http.server 8000     # http://localhost:8000/
```

### Deploy the public site

A push to `master` that changes `site/` publishes the site (`.github/workflows/pages.yml`). In GitHub: Settings → Pages → Source = "GitHub Actions". Later the site moves to Cloudflare with its own domain; all paths are relative, so the files stay the same.

### Holidays (one time per year, in December)

```bash
node tools/update-holidays.mjs          # this year and the next year
```

It computes the Bulgarian days off from the law (fixed dates, Orthodox Easter, the weekend rule), adds the one-time days from the Nager.Date API, and writes `site/holidays.json`. Look at the diff, then commit.

### Data (staff app)

The staff app keeps all data in one Excel file: `Documents/ЕГЕР-Сервиз/клиенти.xlsx`. The app makes an empty file on the first start. `EGER_DATA_DIR` (in the shell or in `staff/.env`) gives another folder. One copy a day goes to `backups/` in the same folder (30 are kept).

```bash
cd staff
EGER_DATA_DIR=./data npm run test-data     # invented customers, for development
EGER_DATA_DIR=./data npm start
```

Tests (two time zones):

```bash
cd staff
TZ=Europe/Sofia npm test
TZ=UTC npm test
```

**Never commit an `.xlsx` file.**

### SMS

With no Twilio keys, the app sends nothing. The send is refused and the dashboard shows a banner.

For real SMS, fill in the three Twilio values of `staff/.env.example`:

- development: copy it to `staff/.env`;
- staff PC: copy it to `Documents\ЕГЕР-Сервиз\настройки.env`. The built app reads this file first.

Each send is then a real, paid SMS. Use your own phone number in the test data.

**Never commit `.env`.** This repo is public.

### Build the staff app (one file, no Node on the staff PC)

```bash
cd staff
npm install
npm run build        # dist/ЕГЕР-Сервиз.exe on Windows, dist/ЕГЕР-Сервиз on a Mac
```

- caxa packs the Node that runs the build. So build the Windows file **on Windows**, and the Mac file on a Mac.
- Use the Node from <https://nodejs.org> (LTS). Homebrew's Node needs an extra library file; the build stops with a message then. Run `/path/to/nodejs.org/node tools/build.mjs` in place of `npm run build`.
- The built file has no data, no keys, no tests (`tools/build.mjs`, `EXCLUDE`). At start it unpacks into a temp folder. The data stays in `Documents/ЕГЕР-Сервиз/`, so a new build never touches it.
- If port 3000 is busy: the app opens the browser on a running copy of itself, or takes 3001–3010.
- Install on the staff PC: [`staff/ИНСТРУКЦИЯ.md`](staff/ИНСТРУКЦИЯ.md) (Bulgarian).

## Layout

```
site/                    public site (static)
  index.html
  holidays.json          public holidays for the calendar
  favicon.svg
  images/
tools/
  update-holidays.mjs    writes site/holidays.json (run one time per year)
.github/workflows/
  pages.yml              publishes site/ to GitHub Pages
staff/                   staff app (local only)
  server.js              starts the local server (keys, data file, port, browser)
  app.js                 the API routes
  .env.example           copy to .env (or настройки.env on the staff PC), fill in the Twilio keys
  ИНСТРУКЦИЯ.md          install and use, for the staff PC (Bulgarian)
  public/
    index.html           staff dashboard
    scripts.js           staff dashboard logic
    sms-text.js          SMS length and cost
    style.css
  lib/
    store.js             the only code that touches the Excel file
    dates.js             date math
    reminders.js         status and due rules
    sms.js               builds the SMS, sends it through Twilio
    validate.js          checks of the request input
    guard.js             who can call the server, security headers
    paths.js             data folder, backup folder, key files
    port.js              port at start (3000–3010, running copy)
    holidays.js          official days off by the law
    holiday-check.js     one-time days off from the internet
  tools/
    build.mjs            builds the one-file app (npm run build)
    make-test-data.js    makes клиенти.xlsx with invented customers
    json-to-xlsx.js      one-time: old customers.json → клиенти.xlsx
  test/                  node --test
plan/                    the work plan, specs, progress
```

## Docs

| File | What is in it |
|---|---|
| [`plan/specs.md`](plan/specs.md) | Rules and decisions for development |
| [`plan/progress.md`](plan/progress.md) | What is done, what is next |
| [`plan/README.md`](plan/README.md) | The chapters of the work plan |
| [`CLAUDE.md`](CLAUDE.md) | Short brief for the AI agent |
| [`staff/ИНСТРУКЦИЯ.md`](staff/ИНСТРУКЦИЯ.md) | Install and daily start on the staff PC (Bulgarian) |

The staff guide with pictures is in the app: menu "Помощ" (`staff/public/help/index.html`).

## Security and privacy

- The staff app listens on `127.0.0.1` only.
- The data in this repo is invented test data. Real customer data never goes into git.

