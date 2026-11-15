// Who can call the local server (specs section 6).
//
// The server listens on 127.0.0.1 only. But each web page that is open in a
// browser on this computer can send a request to it. These checks let only our
// own dashboard read the customers and start an SMS.

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const LOCAL_NAMES = ['localhost', '127.0.0.1'];

// Only self and the two CDN hosts of the dashboard. No inline script: text
// from a customer row can then never run as code. Bootstrap sets inline
// styles and has small images as `data:` addresses.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
  "font-src 'self' https://cdn.jsdelivr.net https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

/** Headers for each answer: the dashboard page and the API. */
export function securityHeaders(req, res, next) {
  res.set('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'no-referrer');
  next();
}

/**
 * Why a request is refused, or null when it is good. A pure function.
 *
 * `port` is the port that the server listens on.
 * Returns null | 'HOST' | 'ORIGIN' | 'CONTENT_TYPE'.
 */
export function refusalOf({ method, host, origin, contentType }, port) {
  // A foreign name that points to 127.0.0.1 (DNS rebinding) has a foreign Host.
  const hosts = LOCAL_NAMES.map(name => `${name}:${port}`);
  // A browser leaves out the port 80.
  if (Number(port) === 80) hosts.push(...LOCAL_NAMES);
  if (!hosts.includes(String(host ?? '').toLowerCase())) return 'HOST';

  // Our own page sends no Origin on a read, and its own Origin on a write.
  if (origin !== undefined && !hosts.some(h => origin === `http://${h}`)) return 'ORIGIN';

  if (WRITE_METHODS.has(method)) {
    // A plain web form cannot send this type. A script on a foreign page can
    // send it only after a CORS check, and the server gives no CORS answer.
    const type = String(contentType ?? '').split(';')[0].trim().toLowerCase();
    if (type !== 'application/json') return 'CONTENT_TYPE';
  }
  return null;
}

/** Middleware for `/api/*`. */
export function apiGuard(req, res, next) {
  const refusal = refusalOf({
    method: req.method,
    host: req.headers.host,
    origin: req.headers.origin,
    contentType: req.headers['content-type'],
  }, req.socket.localPort);

  if (!refusal) return next();
  console.warn(`[GUARD] Refused ${req.method} ${req.path}: ${refusal}`);
  if (refusal === 'CONTENT_TYPE') return res.status(415).json({ error: 'Невалидна заявка.' });
  res.status(403).json({ error: 'Заявката е отказана.' });
}
