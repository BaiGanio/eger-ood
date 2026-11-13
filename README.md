# ЕГЕР ООД

Two small apps for ЕГЕР ООД, a family car service in Bulgaria with more than 30 years of work.

| App | What it does | Where it runs |
|---|---|---|
| **Public site** | Shows the services, the work days, and the contact details. | Static host (Cloudflare) |
| **Staff app** | Keeps customers and cars. Shows who needs a reminder for the annual inspection (ГТП). Staff send the SMS with one click. | One PC at the service, local only |

The two apps share nothing at run time.

> **Status:** the project is in a restructure. See [`plan/progress.md`](plan/progress.md).

## Run it (development)

You need Node.js 20 or newer.

```bash
npm install
npm start
```

- Public site: <http://localhost:3000>
- Staff dashboard: <http://localhost:3000/app>

### SMS

With no Twilio keys, the app sends nothing. It only prints the SMS in the console.

For real SMS, make a `.env` file in the project root:

```
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

**Never commit `.env`.**

## Layout

Today (old layout):

```
index.html        public site
ati.html          staff dashboard
scripts.js        staff dashboard logic
sms-text.js       SMS length and cost
server.js         local server + API
data/             test data only
plan/             the work plan, specs, progress
```

Target layout (after chapter 03): `site/` for the public site, `staff/` for the staff app.

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
