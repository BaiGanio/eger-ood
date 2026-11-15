// Keep the window open on a crash, so the staff can read the error.
process.on('uncaughtException', (err) => {
  console.error('\n  [ГРЕШКА]', err.message);
  console.error('  ', err.stack);
  waitForEnter(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('\n  [ГРЕШКА]', reason);
  waitForEnter(1);
});

import http from 'http';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import { dataFile, envFiles } from './lib/paths.js';
import { askIsOurApp, candidatePorts, choosePort, FIRST_PORT, LAST_PORT } from './lib/port.js';

// Before the app loads: the Twilio keys. A missing file is no error (no keys = no SMS).
const keyFiles = envFiles();
dotenv.config({ path: keyFiles, quiet: true });

const { createApp } = await import('./app.js');
const { ensureDataFile } = await import('./lib/store.js');

function waitForEnter(code) {
  console.log('\n  Натиснете Enter, за да затворите прозореца...');
  process.stdin.resume();
  process.stdin.once('data', () => process.exit(code));
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
    console.log('  Не може да се отвори браузърът автоматично.');
    console.log(`  Моля, отворете ръчно: ${url}`);
  }
}

// The routes are in app.js. This file only starts the server.
// The holiday check goes to the internet at most once a month (lib/holiday-check.js).
const server = http.createServer(createApp({ autoHolidayCheck: true }));

function listen(port) {
  return new Promise((resolve, reject) => {
    const onError = err => { server.off('listening', onListening); reject(err); };
    const onListening = () => { server.off('error', onError); resolve(); };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, '127.0.0.1');
  });
}

// ─── Start ────────────────────────────────────────────────────────────────────

// Make an empty Excel file if there is none (first run).
try {
  const { created } = await ensureDataFile();
  console.log(`[INIT] ${created ? 'Created an empty data file' : 'Data file'}: ${dataFile()}`);
} catch (err) {
  console.error('\n  [ГРЕШКА] Файлът с данни не може да се създаде:', dataFile());
  throw err;
}
console.log(`[INIT] Twilio keys: ${keyFiles.join(' | ')}`);

let choice;
try {
  choice = await choosePort(candidatePorts(process.env.PORT), { listen, isOurApp: askIsOurApp });
} catch (err) {
  if (err.code !== 'EADDRINUSE') throw err;
  console.error(`\n  [ГРЕШКА] Портовете ${FIRST_PORT}–${LAST_PORT} са заети от други програми.`);
  console.error('  Рестартирайте компютъра и стартирайте програмата отново.');
  waitForEnter(1);
}

if (choice) {
  const url = `http://localhost:${choice.port}`;

  if (choice.running) {
    // A second double-click: the app runs already. Show it and close this window.
    console.log('\n  Програмата вече работи. Отварям браузъра...');
    openBrowser(url);
    setTimeout(() => process.exit(0), 3000);
  } else {
    console.log('');
    console.log('  ╔══════════════════════════════════════╗');
    console.log('  ║       ЕГЕР ООД — SMS Сервиз          ║');
    console.log(`  ║   Отворете: ${url.padEnd(25)}║`);
    console.log('  ╚══════════════════════════════════════╝');
    console.log('');
    console.log('  Затворете този прозорец, за да спрете програмата.');
    console.log('');
    openBrowser(url);
  }
}
