// Every admission path must choose the same trusted address, before spending its own budget.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createService, loadConfig, type ServerConfig } from '../src/server.ts';
import { clientAddress, MAX_CLIENT_ADDRESSES, rememberAddress } from '../src/client-address.ts';
import { RAILWAY_PLAY_NS, railwayRoomId } from '../../src/world/railway-namespace.ts';

const KEY = 'client-address-test-01234567890123456789';
const cases = [
  { name: 'reports', url: '/report', budget: 2, status: 400 },
  { name: 'review reads', url: '/reviews', budget: 60, status: 200, get: true },
  { name: 'review uploads', url: '/reviews', budget: 6, status: 400 },
  { name: 'playdata posts', url: '/playdata', budget: 2, status: 400 },
  { name: 'jump posts', url: '/jump', budget: 2, status: 400 },
  { name: 'replacement', url: `/admin/rooms/${railwayRoomId('review')}/replace`, budget: 2, status: 409 },
  { name: 'new sessions', url: '/playdata', budget: 2, status: 204 },
  { name: 'daily jumps', url: '/jump', budget: 2, status: 200 },
  { name: 'socket admission', url: '/room/bad', budget: 2, status: 400 },
];
const modes = [
  { name: 'Fly IPv4', fly: true, a: '192.0.2.1', b: '192.0.2.2', separate: true },
  { name: 'Fly IPv6', fly: true, a: '2001:db8:1::1', b: '2001:db8:2::1', separate: true },
  { name: 'flag off', fly: false, a: '192.0.2.1', b: '192.0.2.2', separate: false },
  { name: 'missing header', fly: true, a: '', b: '', separate: false },
  { name: 'malformed header', fly: true, a: 'not-an-ip', b: '192.0.2.1, 192.0.2.2', separate: false },
];

async function fixture(t: test.TestContext, fly: boolean, overrides: Partial<ServerConfig> = {}) {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-address-'));
  const logs: unknown[][] = [];
  const service = createService(
    loadConfig(
      { DATA_DIR: dataDir, REPLACE_FLY_PROXY: fly ? '1' : '0' },
      {
        reportToken: KEY,
        advanceKey: KEY,
        log: (...args) => {
          logs.push(args);
        },
        reportRatePerMin: 2,
        playRatePerMin: 2,
        jumpRatePerMin: 2,
        replaceRatePerMin: 2,
        upgradesPerMin: 2,
        playNewSessionsPerHour: 2,
        jumpMaxPerAddressDay: 2,
        ...overrides,
      },
    ),
  );
  const base = `http://127.0.0.1:${await service.listen(0)}`;
  const now = Date.now();
  t.mock.method(Date, 'now', () => now); // Exhaustion cannot refill during a slow test run.
  t.after(async () => {
    t.mock.restoreAll();
    await service.close({ save: false });
    await fs.rm(dataDir, { recursive: true, force: true });
  });
  return { base, dataDir, logs };
}

for (const c of cases)
  for (const mode of modes) {
    test(`${c.name}: ${mode.name}, independent clients and untrusted XFF`, async (t) => {
      const f = await fixture(t, mode.fly, {
        ...(c.name === 'new sessions' ? { playRatePerMin: 10000 } : {}),
        ...(c.name === 'daily jumps' ? { jumpRatePerMin: 10000 } : {}),
      });
      let serial = 0;
      async function send(ip: string): Promise<number> {
        const headers = {
          authorization: `Bearer ${KEY}`,
          'content-type': 'application/json',
          // Fly app-side hop remains identical; the attacker can vary the leftmost XFF entry.
          'x-forwarded-for': `198.51.100.${++serial}, 203.0.113.9`,
          ...(ip ? { 'fly-client-ip': ip } : {}),
        };
        if (c.name === 'socket admission') {
          return new Promise((resolve, reject) => {
            const req = http.request(
              `${f.base}${c.url}`,
              {
                headers: { ...headers, connection: 'Upgrade', upgrade: 'websocket' },
              },
              (res) => {
                res.resume();
                resolve(res.statusCode!);
              },
            );
            req.on('error', reject);
            req.end(); // Missing WebSocket key: 400 only after passing admission, no room is opened.
          });
        }
        const body =
          c.name === 'new sessions'
            ? { s: `address-session-${serial}`, card: 'place', n: 0, now: 2, ev: [{ t: 1, k: 'p', x: 1 }] }
            : c.name === 'daily jumps'
              ? { stage: 'start', ns: RAILWAY_PLAY_NS }
              : {};
        const res = await fetch(`${f.base}${c.url}`, {
          method: c.get ? 'GET' : 'POST',
          headers,
          ...(c.get ? {} : { body: JSON.stringify(body) }),
        });
        await res.text();
        return res.status;
      }
      for (let i = 0; i < c.budget; i++) assert.equal(await send(mode.a), c.status, `request ${i}`);
      assert.equal(await send(mode.a), 429, 'rotating XFF cannot bypass the spent bucket');
      assert.equal(
        await send(mode.b),
        mode.separate ? c.status : 429,
        'only a trusted distinct client gets a new bucket',
      );
      assert.equal(await send(mode.a), 429, 'the original client stays exhausted');
      assert.ok(!JSON.stringify(f.logs).includes(mode.a || '198.51.100.'), 'admission never logs addresses');
      if (c.name === 'new sessions') {
        for (const file of await fs.readdir(path.join(f.dataDir, 'playdata'))) {
          const text = await fs.readFile(path.join(f.dataDir, 'playdata', file), 'utf8');
          assert.doesNotMatch(text, /192\.0\.2\.|2001:db8|198\.51\.100\.|fly-client-ip|forwarded-for/);
        }
      }
    });
  }

test('bounded address memory refreshes refused callers and evicts the oldest', () => {
  const map = new Map<string, number>();
  for (let i = 0; i < MAX_CLIENT_ADDRESSES; i++) rememberAddress(map, String(i), i);
  rememberAddress(map, '0', 100);
  rememberAddress(map, 'new', 1);
  assert.equal(map.size, 1024);
  assert.equal(map.get('0'), 100);
  assert.equal(map.has('1'), false);
  for (let i = 0; i < 2000; i++) rememberAddress(map, `next-${i}`, i);
  assert.equal(map.size, 1024);
});

test('unknown socket and duplicate Fly headers fail closed', () => {
  const socket = {} as http.IncomingMessage['socket'];
  assert.equal(clientAddress({ headers: {}, socket }, true), 'unknown');
  assert.equal(clientAddress({ headers: { 'fly-client-ip': ['192.0.2.1', '192.0.2.2'] }, socket }, true), 'unknown');
});

test('server address reads stay behind the shared resolver', async () => {
  const root = new URL('../src/', import.meta.url);
  for (const file of await fs.readdir(root, { recursive: true })) {
    if (!file.endsWith('.ts') || file === 'client-address.ts') continue;
    const source = await fs.readFile(new URL(file, root), 'utf8');
    assert.doesNotMatch(source, /\.\s*(?:ip|ips|remoteAddress)\b|\[\s*['"](?:ip|ips|remoteAddress)['"]\s*\]/, file);
    assert.doesNotMatch(source, /['"](?:fly-client-ip|x-forwarded-for)['"]/i, file);
  }
});
