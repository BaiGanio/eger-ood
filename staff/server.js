// Graceful error handling — keep terminal open on crash
process.on('uncaughtException', (err) => {
  console.error('\n  [ГРЕШКА]', err.message);
  console.error('  ', err.stack);
  console.log('\n  Натиснете Enter за да затворите...');
  process.stdin.resume();
  process.stdin.once('data', () => process.exit(1));
});
 
process.on('unhandledRejection', (reason) => {
  console.error('\n  [ГРЕШКА]', reason);
  console.log('\n  Натиснете Enter за да затворите...');
  process.stdin.resume();
  process.stdin.once('data', () => process.exit(1));
});
import { createRequire } from 'module';
import { ENV_FILE, dataFile } from './lib/paths.js';
const _require = createRequire(import.meta.url);
try { _require('dotenv').config({ path: ENV_FILE }); } catch(e) { /* no .env file, that's ok */ }
import { execSync } from 'child_process';
import { createApp } from './app.js';
import { ensureDataFile } from './lib/store.js';

// The routes are in app.js. This file only starts the server.
// The holiday check goes to the internet at most once a month (lib/holiday-check.js).
const app = createApp({ autoHolidayCheck: true });
const PORT = process.env.PORT || 3000;

// ─── Start ────────────────────────────────────────────────────────────────────
// Make an empty Excel file if there is none (first run).
try {
  const { created } = await ensureDataFile();
  console.log(`[INIT] ${created ? 'Created an empty data file' : 'Data file'}: ${dataFile()}`);
} catch (err) {
  console.error('\n  [ГРЕШКА] Файлът с данни не може да се създаде:', dataFile());
  throw err;
}
 
function openBrowser(url) {
  try {
    if (process.platform === 'win32') {
      execSync(`start "" "${url}"`, { stdio: 'ignore' });
    } else if (process.platform === 'darwin') {
      execSync(`open "${url}"`, { stdio: 'ignore' });
    } else {
      execSync(`xdg-open "${url}"`, { stdio: 'ignore' });
    }
  } catch (e) {
    console.log(`  Не може да се отвори браузърът автоматично.`);
    console.log(`  Моля отворете ръчно: ${url}`);
  }
}
 
app.listen(PORT, '127.0.0.1', () => {
  const url = `http://localhost:${PORT}`;
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║       ЕГЕР ООД — SMS Сервиз          ║');
  console.log(`  ║   Отворете: ${url}     ║`);
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
  console.log('  Затворете този прозорец за да спрете сървъра.');
  console.log('');
  openBrowser(url);
});