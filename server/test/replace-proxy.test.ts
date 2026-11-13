// Replacement admission must use the trusted edge address and a sufficiently long operator key.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createService, loadConfig } from '../src/server.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import type { Request } from 'express';
import { replacementClientAddress } from '../src/replace.ts';

const KEY = 'replace-proxy-test-key-01234567890123456789';
async function fixture(t: test.TestContext, key = KEY, fly = true) {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-proxy-'));
  const logs: unknown[][] = [];
  const service = createService(
    loadConfig(
      { DATA_DIR: dataDir, ADVANCE_KEY: key, REPLACE_FLY_PROXY: fly ? '1' : '0' },
      {
        log: (...args) => {
          logs.push(args);
        },
      },
    ),
  );
  const base = `http://127.0.0.1:${await service.listen(0)}`;
  const now = Date.now();
  t.mock.method(Date, 'now', () => now);
  t.after(async () => {
    t.mock.restoreAll();
    await service.close({ save: false });
    await fs.rm(dataDir, { recursive: true, force: true });
  });
  const send = async (headers: Record<string, string> = {}, credential = KEY) => {
    const response = await fetch(`${base}/admin/rooms/${railwayRoomId('review')}/replace`, {
      method: 'POST',
      headers: { authorization: `Bearer ${credential}`, 'content-type': 'application/json', ...headers },
      body: JSON.stringify({ stage: 'invalid', confirm: 'review' }),
    });
    return { status: response.status, body: await response.text() };
  };
  return { base, send, logs };
}

test('review regression: Fly clients sharing the app-side forwarding hop retain separate admission', async (t) => {
  const f = await fixture(t);
  for (let n = 0; n < 30; n++)
    await f.send(
      {
        'x-forwarded-for': '192.0.2.1, 203.0.113.9',
        'fly-client-ip': '192.0.2.1',
      },
      'wrong',
    );
  assert.equal(
    (
      await f.send({
        'x-forwarded-for': '192.0.2.2, 203.0.113.9',
        'fly-client-ip': '192.0.2.2',
      })
    ).status,
    400,
    'fresh edge client must not inherit the attacker app-hop bucket',
  );
});

test('review regression: a short ADVANCE_KEY disables replacement without crashing the server', async (t) => {
  const f = await fixture(t, 'x');
  assert.equal((await fetch(`${f.base}/healthz`)).status, 200);
  assert.equal((await f.send({}, 'x')).status, 404);
  assert.match(JSON.stringify(f.logs), /ADVANCE_KEY.*32/);
  assert.ok(!f.logs.flat().includes('x'), 'warning must not log the configured key');
});

test('a 31-character key is disabled with a warning that never contains the key', async (t) => {
  const key = 'short-key-marker-01234567890123';
  assert.equal(key.length, 31);
  const f = await fixture(t, key);
  assert.equal((await f.send({}, key)).status, 404);
  assert.match(JSON.stringify(f.logs), /ADVANCE_KEY.*32/);
  assert.ok(!JSON.stringify(f.logs).includes(key));
});

test('a 32-character key enables replacement without a short-key warning', async (t) => {
  const key = '0123456789abcdef0123456789abcdef';
  const f = await fixture(t, key);
  assert.equal((await f.send({}, key)).status, 400);
  assert.ok(!JSON.stringify(f.logs).includes('ADVANCE_KEY'));
});

test('outside the Fly proxy, forged Fly and forwarded headers cannot rotate the socket bucket', async (t) => {
  const f = await fixture(t, KEY, false);
  for (let n = 0; n < 30; n++)
    await f.send(
      {
        'x-forwarded-for': `192.0.2.${n + 1}`,
        'fly-client-ip': `198.51.100.${n + 1}`,
      },
      'wrong',
    );
  assert.equal((await f.send({ 'x-forwarded-for': '192.0.2.99', 'fly-client-ip': '198.51.100.99' })).status, 429);
});

test('missing Fly headers fall back to the socket, never spoofed forwarded addresses', async (t) => {
  const f = await fixture(t);
  for (let n = 0; n < 30; n++) await f.send({ 'x-forwarded-for': `192.0.2.${n + 1}` }, 'wrong');
  assert.equal((await f.send({ 'x-forwarded-for': '192.0.2.99' })).status, 429);
});

test('replacement address selection handles IPv6, missing and malformed edge headers', () => {
  const address = (fromFly: boolean, headers: Record<string, string>, socket = '::1') =>
    replacementClientAddress(
      {
        get: ((name: string) => headers[name.toLowerCase()]) as Request['get'],
        socket: { remoteAddress: socket } as Request['socket'],
      },
      fromFly,
    );
  assert.equal(
    address(true, { 'fly-client-ip': '2001:db8::1234', 'x-forwarded-for': '192.0.2.1, 203.0.113.9' }),
    '2001:db8::1234',
  );
  assert.equal(address(true, { 'fly-client-ip': '192.0.2.1', 'x-forwarded-for': 'spoofed' }), '192.0.2.1');
  assert.equal(address(true, {}), '::1');
  assert.equal(address(true, { 'x-forwarded-for': '192.0.2.99' }), '::1');
  assert.equal(address(true, { 'fly-client-ip': '192.0.2.1, 192.0.2.2' }), '::1');
  assert.equal(address(true, { 'fly-client-ip': 'not-an-ip' }), '::1');
  assert.equal(address(false, { 'fly-client-ip': '2001:db8::1234' }, '2001:db8::beef'), '2001:db8::beef');
});
