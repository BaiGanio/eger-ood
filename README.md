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
  images/
staff/                   staff app (local only)
  server.js              local server + API
  public/
    index.html           staff dashboard
    scripts.js           staff dashboard logic
    sms-text.js          SMS length and cost
    style.css
  data/                  test data only
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

## Contact

ЕГЕР ООД — 0887979373 · 031514709 · eger@b-trust.org
