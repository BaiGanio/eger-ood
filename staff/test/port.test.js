// The port at start (chapter 09): our app runs already, or another program has the port.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { APP_ID, askIsOurApp, candidatePorts, choosePort } from '../lib/port.js';

const busy = () => Object.assign(new Error('busy'), { code: 'EADDRINUSE' });

test('candidatePorts: 3000 to 3010; a PORT from the environment comes first', () => {
  assert.deepEqual(candidatePorts(undefined), [3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010]);
  assert.deepEqual(candidatePorts('4000').slice(0, 2), [4000, 3000]);
  assert.deepEqual(candidatePorts('3005').filter(p => p === 3005).length, 1);
  assert.equal(candidatePorts('abc')[0], 3000);
});

test('choosePort: a free port is taken', async () => {
  const result = await choosePort([3000, 3001], { listen: async () => {}, isOurApp: async () => false });
  assert.deepEqual(result, { port: 3000, running: false });
});

test('choosePort: our app on 3000 → open it, do not start a second one', async () => {
  const tried = [];
  const result = await choosePort([3000, 3001], {
    listen: async port => { tried.push(port); throw busy(); },
    isOurApp: async port => port === 3000,
  });
  assert.deepEqual(result, { port: 3000, running: true });
  assert.deepEqual(tried, [3000]);
});

test('choosePort: another program on 3000 → 3001', async () => {
  const result = await choosePort([3000, 3001], {
    listen: async port => { if (port === 3000) throw busy(); },
    isOurApp: async () => false,
  });
  assert.deepEqual(result, { port: 3001, running: false });
});

test('choosePort: all ports busy → the EADDRINUSE error', async () => {
  await assert.rejects(
    choosePort([3000, 3001], { listen: async () => { throw busy(); }, isOurApp: async () => false }),
    { code: 'EADDRINUSE' });
});

test('choosePort: another listen error is not hidden', async () => {
  const denied = Object.assign(new Error('denied'), { code: 'EACCES' });
  await assert.rejects(
    choosePort([3000], { listen: async () => { throw denied; }, isOurApp: async () => false }),
    { code: 'EACCES' });
});

async function serve(t, handler) {
  const server = http.createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return server.address().port;
}

test('askIsOurApp: true only for the answer of our app', async t => {
  const ours = await serve(t, (req, res) => res.end(JSON.stringify({ app: APP_ID })));
  const other = await serve(t, (req, res) => res.end('<html>other</html>'));
  assert.equal(await askIsOurApp(ours), true);
  assert.equal(await askIsOurApp(other), false);
});

test('askIsOurApp: a port with no server gives false, not an error', async t => {
  const port = await serve(t, () => {});
  // A server that never answers: the time limit gives false.
  assert.equal(await askIsOurApp(port, 200), false);
});
