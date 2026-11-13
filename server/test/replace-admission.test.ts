// Admission under simulated floods: no world/seed work is needed to check the authority boundary.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createService, loadConfig, type ServerConfig } from '../src/server.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';

async function fixture(t: test.TestContext, overrides: Partial<ServerConfig> = {}) {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-admission-'));
  const logs: unknown[][] = [];
  let builds = 0;
  const svc = createService(
    loadConfig(
      { DATA_DIR: dataDir, ADVANCE_KEY: 'operator-key' },
      {
        log: (...args) => {
          logs.push(args);
        },
        jumpBuildDoc: async () => {
          builds++;
          throw new Error('unexpected seed build');
        },
        ...overrides,
      },
    ),
  );
  const port = await svc.listen(0);
  let now = Date.now();
  const clock = t.mock.method(Date, 'now', () => now);
  t.after(async () => {
    clock.mock.restore();
    await svc.close({ save: false });
    await fs.rm(dataDir, { recursive: true, force: true });
  });
  const send = async (key: string, ip: string, stage = 'invalid-stage') => {
    const response = await fetch(`http://127.0.0.1:${port}/admin/rooms/${railwayRoomId('review')}/replace`, {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'x-forwarded-for': ip, 'content-type': 'application/json' },
      body: JSON.stringify({ stage, confirm: 'review' }),
    });
    return { status: response.status, body: await response.text() };
  };
  return {
    send,
    advance: (ms: number) => {
      now += ms;
    },
    builds: () => builds,
    logs,
  };
}

test('review regression: a flooding IP cannot starve the operator over five simulated minutes', async (t) => {
  const f = await fixture(t);
  for (let n = 0; n < 24; n++) await f.send('wrong', '192.0.2.1');
  const statuses: number[] = [];
  for (let n = 0; n < 120; n++) {
    f.advance(2500);
    await f.send('wrong', '192.0.2.1');
    statuses.push((await f.send('operator-key', '192.0.2.2')).status);
  }
  assert.equal(statuses.at(-1), 400, 'key holder reaches validation instead of remaining locked out');
  assert.equal(statuses.filter((status) => status === 400).length, 120);
  assert.equal(f.builds(), 0);
});

test('distributed unauthenticated floods never consume operator admission or start seed work', async (t) => {
  const f = await fixture(t);
  let rejectedGuesses = 0;
  for (let n = 0; n < 120; n++) {
    f.advance(2500);
    for (let j = 0; j < 32; j++) {
      const ip = `198.18.${Math.floor((n * 32 + j) / 256)}.${(n * 32 + j) % 256}`;
      const wrong = await f.send('wrong', ip, 'awake');
      assert.ok(wrong.status === 401 || wrong.status === 429);
      if (wrong.status === 429) rejectedGuesses++;
    }
    assert.equal((await f.send('operator-key', '192.0.2.2')).status, 400, `operator attempt ${n + 1}`);
  }
  assert.ok(rejectedGuesses > 3600, 'distributed guesses spend the bounded failed-authentication budget');
  assert.equal(f.builds(), 0);
  assert.ok(!JSON.stringify(f.logs).includes('operator-key'));
  assert.ok(!JSON.stringify(f.logs).includes('wrong'));
});

test('per-IP refusals consume no other budget; failed and operator buckets are independent', async (t) => {
  const f = await fixture(t, { replaceRatePerMin: 1 });
  assert.equal((await f.send('wrong', '192.0.2.1')).status, 401);
  for (let n = 0; n < 32; n++) assert.equal((await f.send('wrong', '192.0.2.1')).status, 429);
  for (let n = 0; n < 23; n++) assert.equal((await f.send('wrong', `192.0.2.${n + 2}`)).status, 401);
  assert.equal((await f.send('wrong', '192.0.2.25')).status, 429);
  for (let n = 0; n < 24; n++) assert.equal((await f.send('operator-key', `198.51.100.${n + 1}`)).status, 400);
  assert.equal((await f.send('operator-key', '198.51.100.25')).status, 429);
  f.advance(2500);
  assert.equal(
    (await f.send('operator-key', '198.51.100.26')).status,
    400,
    'only the operator bucket refills its token',
  );
});

test('replacement IP state is capped at 1024 and evicts the least recently used address', async (t) => {
  const f = await fixture(t, { replaceRatePerMin: 1 });
  await f.send('wrong', '192.0.2.1');
  await f.send('wrong', '192.0.2.2');
  for (let n = 0; n < 1022; n++) await f.send('wrong', `198.18.${Math.floor(n / 256)}.${n % 256}`);
  assert.equal((await f.send('wrong', '192.0.2.1')).status, 429, 'refresh the oldest entry without passing admission');
  await f.send('wrong', '203.0.113.1');
  assert.equal((await f.send('operator-key', '192.0.2.1')).status, 429, 'the refreshed address remains tracked');
  assert.equal((await f.send('operator-key', '192.0.2.2')).status, 400, 'the least recently used address was evicted');
  assert.equal((await f.send('operator-key', '203.0.113.1')).status, 429, 'the newest address remains tracked');
});

test('wrong keys of different lengths and matching prefixes get the same generic body without disclosure', async (t) => {
  const f = await fixture(t);
  const guesses = ['', 'x', 'operator-ke', 'operator-key-extra', 'xperator-key', 'OPERATOR-KEY'];
  for (let n = 0; n < guesses.length; n++) {
    const answer = await f.send(guesses[n]!, `192.0.2.${n + 1}`, 'awake');
    assert.equal(answer.status, 401);
    assert.deepEqual(JSON.parse(answer.body), { error: 'unauthorized' });
  }
  assert.equal(f.builds(), 0);
  assert.ok(!JSON.stringify(f.logs).includes('operator-key'));
});
