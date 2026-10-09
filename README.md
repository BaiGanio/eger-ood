# ping-my-car

npm install -g caxa


"scripts": {
  "start": "node server.js",
  "build:win":   "caxa -i . -o eger-servis.exe -- \"{{caxa}}/node_modules/.bin/node\" \"{{caxa}}/server.js\"",
  "build:mac":   "caxa -i . -o eger-servis     -- \"{{caxa}}/node_modules/.bin/node\" \"{{caxa}}/server.js\"",
  "build:linux": "caxa -i . -o eger-servis-linux -- \"{{caxa}}/node_modules/.bin/node\" \"{{caxa}}/server.js\""
}


**Step 3 — Add a `.caxa-ignore` file** so it doesn't bundle things it shouldn't:
```
.git
.env
*.log


npm install        # make sure node_modules is present first
npm run build:win  # produces eger-servis.exe
```

---

**Step 5 — What the car service people get**

Give them a folder like this:
```
ЕГЕР-Сервиз/
  eger-servis.exe      ← double-click to start
  data/
    customers.json     ← their data lives here
  .env                 ← Twilio credentials
  public/
    landing.html
    index.html
    scripts.js
    style.css