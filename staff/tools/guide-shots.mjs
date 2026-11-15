// Makes the screenshots of the staff guide (public/help.html) in public/help/.
// Fake data only. Run it from staff/:
//
//   EGER_DATA_DIR=./data npm run test-data -- --force
//   npm install --no-save playwright && npx playwright install chromium
//   EGER_DATA_DIR=./data TZ=Europe/Sofia node tools/guide-shots.mjs
//
// The --no-save install keeps playwright out of package.json. No .env is
// read: no SMS can go out. The script never clicks "Изпрати SMS".
import { createApp } from '../app.js';
import { ensureDataFile } from '../lib/store.js';
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';

const OUT = fileURLToPath(new URL('../public/help/', import.meta.url));
await ensureDataFile();
const server = createApp({ autoHolidayCheck: false }).listen(3999, '127.0.0.1');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 1 });
await page.goto('http://127.0.0.1:3999/');
await page.waitForSelector('#table-body tr td.fw-semibold, #table-body .fw-semibold');
// Hide the banners: they are not part of this task.
await page.addStyleTag({ content: '.alert{display:none!important}' });

// Draws a red frame and a number on an element.
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
    document.body.appendChild(box);
  }, [selector, n]);
}
const clearMarks = () => page.evaluate(() => document.querySelectorAll('.guide-mark').forEach(e => e.remove()));

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

await browser.close();
server.close();
