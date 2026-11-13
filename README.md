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

A push to `master` that changes `site/` publishes the site (`.github/workflows/pages.yml`).

### Holidays (one time per year, in December)

```bash
node tools/update-holidays.mjs          # this year and the next year
```

It computes the Bulgarian days off from the law (fixed dates, Orthodox Easter, the weekend rule), adds the one-time days from the Nager.Date API, and writes `site/holidays.json`. Look at the diff, then commit.

### Data (staff app)

The staff app keeps all data in one Excel file: `Documents/The-App/clients.xlsx`. The app makes an empty file on the first start. `EGER_DATA_DIR` (in `.env` or in the shell) gives another folder.

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

With no Twilio keys, the app sends nothing. It only prints the SMS in the console.

For real SMS, make a `.env` file in `staff/`:

```
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

**Never commit `.env`.** This repo is public.

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
  server.js              local server + API
  public/
    index.html           staff dashboard
    scripts.js           staff dashboard logic
    sms-text.js          SMS length and cost
    style.css
  lib/
    store.js             the only code that touches the Excel file
    dates.js             date math
    paths.js             data folder, backup folder, .env
  tools/
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

A guide for the staff (in Bulgarian) comes when the staff app is done.

## Security and privacy

- The staff app listens on `127.0.0.1` only.
- The data in this repo is invented test data. Real customer data never goes into git.

