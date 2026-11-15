// Makes the screenshots of the staff guide (public/help/*.html) in public/help/.
// Fake data only. Run it from staff/:
//
//   EGER_DATA_DIR=./data npm run test-data -- --force
//   npm install --no-save playwright && npx playwright install chromium
//   EGER_DATA_DIR=./data TZ=Europe/Sofia node tools/guide-shots.mjs
//
// The --no-save install keeps playwright out of package.json. No .env is
// read: no SMS can go out. The script never clicks "Изпрати SMS", and it
// never saves a customer (it clicks "Отказ").
import { createApp } from '../app.js';
import { ensureDataFile } from '../lib/store.js';
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';

const OUT = fileURLToPath(new URL('../public/help/', import.meta.url));
await ensureDataFile();
const server = createApp({ autoHolidayCheck: false }).listen(3999, '127.0.0.1');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 1 });

// The dashboard as the staff see it after the start. Banners are not part of a task.
async function openDashboard() {
  await page.goto('http://127.0.0.1:3999/');
  await page.waitForSelector('#table-body .fw-semibold');
  await page.addStyleTag({ content: '.alert{display:none!important}' });
  await page.mouse.move(0, 0);
}

// Draws a red frame and a number on an element. An element in an open
// <dialog> gets the mark inside the dialog: the dialog covers the page.
async function mark(selector, n) {
  await page.evaluate(([sel, num]) => {
    const el = document.querySelector(sel);
    const r = el.getBoundingClientRect();
    const box = document.createElement('div');
    box.className = 'guide-mark';
    Object.assign(box.style, {
      position: 'fixed', left: r.left - 6 + 'px', top: r.top - 6 + 'px',
      width: r.width + 12 + 'px', height: r.height + 12 + 'px',
      border: '4px solid #e0201b', borderRadius: '10px', zIndex: 99999, pointerEvents: 'none',
    });
    const tag = document.createElement('div');
    tag.textContent = num;
    Object.assign(tag.style, {
      position: 'absolute', left: '-18px', top: '-18px', width: '32px', height: '32px',
      borderRadius: '50%', background: '#e0201b', color: '#fff', font: '700 18px sans-serif',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    });
    box.appendChild(tag);
    (el.closest('dialog[open]') || document.body).appendChild(box);
  }, [selector, n]);
}
const clearMarks = () => page.evaluate(() => document.querySelectorAll('.guide-mark').forEach(e => e.remove()));

// "YYYY-MM-DD" of today + `days`, from local date parts (never toISOString).
function localDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ── Task 1 (sms.html) ─────────────────────────────────────────────────
await openDashboard();

// Shot 1: the card "Очакващи SMS", clicked, with the list and one "Изпрати" button.
await page.click('[data-arg="send"]');
await page.waitForTimeout(400); await page.mouse.move(0, 0);
await page.waitForSelector('[data-action="previewSms"]');
await mark('[data-arg="send"]', '1');
await mark('[data-action="previewSms"]', '2');
await page.screenshot({ path: `${OUT}sms-1-list.png` });
await clearMarks();

// Shot 2: the SMS preview window.
await page.click('[data-action="previewSms"]');
await page.waitForSelector('#sms-preview-modal.show');
await page.waitForTimeout(400);
await mark('#preview-modal-body', '3');
await mark('#confirm-send-btn', '4');
await page.screenshot({ path: `${OUT}sms-2-preview.png` });
await clearMarks();

// ── Task 2 (add.html) ─────────────────────────────────────────────────
await openDashboard();

// Shot 1: the search field and the button "Добави клиент".
await page.fill('#search-input', 'PB1234KA');
await page.waitForTimeout(200);
await mark('#search-input', '1');
await mark('[data-action="openAddModal"]', '2');
await page.screenshot({ path: `${OUT}add-1-button.png` });
await clearMarks();
await page.fill('#search-input', '');

// Shot 2: the window, filled with an invented customer. The phone as the
// staff type it, with 0.
await page.click('[data-action="openAddModal"]');
await page.waitForSelector('#customer-modal.show');
await page.waitForTimeout(400);
await page.fill('#f-name', 'Мария Иванова');
await page.fill('#f-phone', '0888 123 456');
await page.fill('#f-address', 'ул. Шипка 5, Раковски');
await page.fill('#f-carModel', 'Opel Astra');
await page.fill('#f-carPlate', 'PB1234KA');
await page.fill('#f-lastServiceDate', localDate(-20));
await page.locator('#f-lastServiceDate').blur();   // no highlighted day in the picture
await page.mouse.move(0, 0);
await mark('#f-phone', '3');
await mark('#f-lastServiceDate', '4');
await mark('[data-action="saveCustomer"]', '5');
await page.screenshot({ path: `${OUT}add-2-form.png` });
await clearMarks();

// Shot 3: the question about +359. Then "Отказ": nothing is saved.
await page.click('[data-action="saveCustomer"]');
await page.waitForSelector('#ask-dialog[open]');
await page.waitForTimeout(200);
await mark('#ask-yes', '6');
await page.screenshot({ path: `${OUT}add-3-phone.png` });
await clearMarks();
await page.click('#ask-no');
await page.click('#customer-modal [data-action="closeModal"]');

// ── Task 3 (edit.html) ────────────────────────────────────────────────
await openDashboard();

// Shot 1: "Всички клиенти", the search, and the pencil and bin of the one row.
await page.click('[data-action="showAllCustomers"]');
await page.fill('#search-input', 'Георгиева');
await page.waitForTimeout(200);
await page.mouse.move(0, 0);
await mark('[data-action="showAllCustomers"]', '1');
await mark('#search-input', '2');
await mark('#table-body [data-action="openEditModal"]', '3');
await mark('#table-body [data-action="deleteCustomer"]', '4');
await page.screenshot({ path: `${OUT}edit-1-row.png` });
await clearMarks();

// Shot 2: the edit window. Then "Отказ": nothing is saved.
await page.click('#table-body [data-action="openEditModal"]');
await page.waitForSelector('#customer-modal.show');
await page.waitForTimeout(400);
await page.mouse.move(0, 0);
await mark('[data-action="saveCustomer"]', '5');
await page.screenshot({ path: `${OUT}edit-2-form.png` });
await clearMarks();
await page.click('#customer-modal [data-action="closeModal"]');
await page.waitForSelector('#customer-modal', { state: 'hidden' });

// Shot 3: the delete question. Then "Отказ": nothing is deleted.
await page.click('#table-body [data-action="deleteCustomer"]');
await page.waitForSelector('#ask-dialog[open]');
await page.waitForTimeout(200);
await mark('#ask-yes', '6');
await page.screenshot({ path: `${OUT}edit-3-delete.png` });
await clearMarks();
await page.click('#ask-no');

// ── Task 4 (passed.html) ──────────────────────────────────────────────
await openDashboard();

// The customer comes from the card "Очаквани за преглед": the staff wait for him.
await page.click('[data-arg="coming"]');
await page.waitForTimeout(200);
const plate = (await page.textContent('#table-body tr:first-child td:nth-child(2) .text-muted')).trim();

// Shot 1: "Всички клиенти", the plate in the search, the pencil.
await page.click('[data-action="showAllCustomers"]');
await page.fill('#search-input', plate);
await page.waitForTimeout(200);
await page.mouse.move(0, 0);
await mark('[data-action="showAllCustomers"]', '1');
await mark('#search-input', '2');
await mark('#table-body [data-action="openEditModal"]', '3');
await page.screenshot({ path: `${OUT}passed-1-row.png` });
await clearMarks();

// Shot 2: the edit window with today in "Дата на последен преглед". Then "Отказ".
await page.click('#table-body [data-action="openEditModal"]');
await page.waitForSelector('#customer-modal.show');
await page.waitForTimeout(400);
await page.fill('#f-lastServiceDate', localDate(0));
await page.locator('#f-lastServiceDate').blur();
await page.mouse.move(0, 0);
await mark('#f-lastServiceDate', '4');
await mark('[data-action="saveCustomer"]', '5');
await page.screenshot({ path: `${OUT}passed-2-date.png` });
await clearMarks();
await page.click('#customer-modal [data-action="closeModal"]');

// ── Task 5 (cards.html) ───────────────────────────────────────────────
await openDashboard();

// Shot 1: the card "Очакващи SMS" with its list of today.
await page.click('[data-arg="send"]');
await page.waitForTimeout(400); await page.mouse.move(0, 0);
await mark('[data-arg="send"]', '1');
await page.screenshot({ path: `${OUT}cards-1-send.png` });
await clearMarks();

// Shot 2: the period "7 дни" and the new count with its period text.
await page.click('[data-arg="send:7"]');
await page.waitForTimeout(300); await page.mouse.move(0, 0);
await mark('[data-arg="send:7"]', '2');
await mark('[data-arg="send"]', '3');   // the whole card: a small mark hides the count
await page.screenshot({ path: `${OUT}cards-2-period.png` });
await clearMarks();

// Shot 3: the other cards; the list of "Изпратени SMS" is open.
await openDashboard();
await page.click('[data-arg="sentin"]');
await page.waitForTimeout(400); await page.mouse.move(0, 0);
await mark('[data-arg="sentin"]', '4');
await mark('[data-arg="coming"]', '5');
await mark('[data-arg="expired"]', '6');
await mark('[data-action="showAllCustomers"]', '7');
await page.screenshot({ path: `${OUT}cards-3-other.png` });
await clearMarks();

await browser.close();
server.close();
