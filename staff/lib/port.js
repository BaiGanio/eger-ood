// Which port the server takes at start (chapter 09).
//
// Port 3000 can be busy: our app runs already (a second double-click), or
// another program has it. The first case opens the browser on the app that
// runs. The second case tries the next port, up to 3010.

import http from 'http';

export const FIRST_PORT = 3000;
export const LAST_PORT = 3010;

/** The ports to try, in order. A `PORT` from the environment comes first. */
export function candidatePorts(envPort) {
  const ports = [];
  const own = Number(envPort);
  if (Number.isInteger(own) && own > 0 && own < 65536) ports.push(own);
  for (let p = FIRST_PORT; p <= LAST_PORT; p++) if (!ports.includes(p)) ports.push(p);
  return ports;
}

/**
 * Finds the port to use. `listen(port)` resolves when the server listens and
 * rejects with the error of Node (`EADDRINUSE` when busy). `isOurApp(port)`
 * says if our app answers there.
 *
 * Returns { port, running: false } when the server now listens, or
 * { port, running: true } when our app runs there already.
 * Throws the last error when no port works.
 */
export async function choosePort(ports, { listen, isOurApp }) {
  let lastError = null;
  for (const port of ports) {
    try {
      await listen(port);
      return { port, running: false };
    } catch (err) {
      if (err.code !== 'EADDRINUSE') throw err;
      lastError = err;
      if (await isOurApp(port)) return { port, running: true };
    }
  }
  throw lastError ?? new Error('No port to try.');
}

/** Our app answers `/api/status` with `app: APP_ID` (app.js). */
export const APP_ID = 'eger-staff';

/** True when our app answers on this port of 127.0.0.1. Never throws. */
export function askIsOurApp(port, timeoutMs = 1500) {
  return new Promise(resolve => {
    const req = http.get({
      host: '127.0.0.1', port, path: '/api/status', timeout: timeoutMs,
      // The request guard of our app wants this Host (lib/guard.js).
      headers: { Host: `localhost:${port}` },
    }, res => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(raw).app === APP_ID); } catch { resolve(false); }
      });
    });
    req.on('timeout', () => req.destroy());
    req.on('error', () => resolve(false));
  });
}
