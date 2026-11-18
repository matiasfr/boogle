// Replace-room authority, checkpoint and announcement contracts, through the real HTTP service and sockets.
// Admission budgets and the key-length boundary are replace-admission.test.ts; trusted addresses client-address.test.ts.
import test from 'node:test';
import { WebSocket } from './helpers/accounts.ts';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createService, loadConfig, type ServerConfig } from './helpers/accounts.ts';
import { buildSeedDoc } from '../src/seeds/build.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import type { RailwayWorldHost } from '../src/host/world-host.ts';
import { SeedValidationBusyError, validateSeedDoc } from '../src/seeds/validate.ts';
import { jumpOf } from '../../src/world/railway-jump.ts';

const KEY = 'replace-test-key-01234567890123456789';

async function start(overrides: Partial<ServerConfig> = {}, existing?: string) {
  const dataDir = existing ?? (await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-replace-')));
  const svc = createService(
    loadConfig(
      { DATA_DIR: dataDir, ADVANCE_KEY: KEY, REPORT_TOKEN: 'report', REPLACE_FLY_PROXY: '1' },
      {
        log: () => {},
        replaceRatePerMin: 1000,
        replaceCountdownMs: 80,
        ...overrides,
      },
    ),
  );
  const base = `http://127.0.0.1:${await svc.listen(0)}`;
  const post = (body: unknown, key = KEY, room = 'testing') =>
    fetch(`${base}/admin/rooms/${railwayRoomId(room)}/replace`, {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  return { svc, dataDir, base, post };
}
const body = { stage: 'awake', confirm: 'testing' };

test('replace: disabled, wrong key, report token, confirmation, room and stage gates write nothing', async () => {
  const s = await start();
  try {
    for (const key of ['', 'wrong', 'report']) assert.equal((await s.post(body, key)).status, 401);
    for (const confirm of [undefined, '', 'other']) assert.equal((await s.post({ ...body, confirm })).status, 409);
    for (const stage of ['start', 'unknown', '__proto__', null, 1])
      assert.equal((await s.post({ ...body, stage })).status, 400);
    assert.equal(
      (
        await fetch(`${s.base}/admin/rooms/not-current/replace`, {
          method: 'POST',
          headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json' },
          body: JSON.stringify(body),
        })
      ).status,
      400,
    );
    assert.equal((await s.post({ stage: 'awake', confirm: 'boogle' }, KEY, 'boogle')).status, 403);
    assert.deepEqual(
      (await fs.readdir(s.dataDir)).filter((f) => f.endsWith('.json')),
      [],
    );
  } finally {
    await s.svc.close();
  }
});

test('replace: at most two authenticated rooms prepare concurrently and capacity is released on failure', async () => {
  let builds = 0;
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const s = await start();
  s.svc.jumps.docFor = async () => {
    builds++;
    await gate;
    return { status: 500, error: 'fixture failed' };
  };
  const first = s.post({ stage: 'awake', confirm: 'one' }, KEY, 'one');
  const second = s.post({ stage: 'q1-done', confirm: 'two' }, KEY, 'two');
  try {
    await until(() => builds === 2);
    const third = s.post({ stage: 'q3-done', confirm: 'three' }, KEY, 'three');
    const response = await Promise.race([third, new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000))]);
    assert.equal(response?.status, 429, 'excess work is refused without waiting for a build');
    assert.equal(builds, 2);
    release();
    await Promise.all([first, second]);
    assert.notEqual((await s.post({ stage: 'q3-done', confirm: 'three' }, KEY, 'three')).status, 429);
    assert.equal(builds, 3);
  } finally {
    release();
    await Promise.all([first, second]);
    await s.svc.close();
  }
});

test('validation workers share a two-worker cap and release capacity after failure', async () => {
  const bad = { tick: -1, data: {} };
  const workers = [validateSeedDoc(bad), validateSeedDoc(bad)];
  const settled = Promise.allSettled(workers);
  await assert.rejects(validateSeedDoc(bad), SeedValidationBusyError);
  assert.ok((await settled).every((result) => result.status === 'rejected'));
  await assert.rejects(validateSeedDoc(bad), /invalid seed document/);
});

test('replace: seed, new birth, host record, pinned backup, restore, and earlier-stage rule', async () => {
  const seed = await buildSeedDoc('q1-done');
  const s = await start({ advanceShared: true, jumpBuildDoc: async () => seed });
  try {
    const first = await s.post({ stage: 'q1-done', confirm: 'boogle' }, KEY, 'boogle');
    assert.equal(first.status, 200, await first.clone().text());
    const result = (await first.json()) as { backup: string; born: string; bornBefore: string; restore: string };
    assert.notEqual(result.born, result.bornBefore);
    assert.match(result.restore, /restore/);
    const id = railwayRoomId('boogle');
    const saved = JSON.parse(await fs.readFile(path.join(s.dataDir, `${id}.json`), 'utf8'));
    assert.deepEqual(saved.data, seed.data);
    const status = (await (await fetch(`${s.base}/rooms/${id}/host`)).json()) as {
      replaced: { born: string; stage: string };
    };
    assert.equal(status.replaced.born, result.born);
    assert.equal(status.replaced.stage, 'q1-done');
    const observer = connect(s.base, 'boogle', 'observer');
    try {
      await until(() => observer.messages.some((m) => m.t === 'welcome'));
      const host = s.svc.roomHost()!.room(id)!.world as RailwayWorldHost;
      await host.whenReady();
      assert.deepEqual(host.status().seats, [], 'a replaced host starts with no seat occupants');
    } finally {
      observer.ws.close();
    }
    await until(() => s.svc.roomHost()!.room(id)!.status().players === 0);
    assert.equal((await s.post({ stage: 'awake', confirm: 'boogle' }, KEY, 'boogle')).status, 409);
    const restore = await fetch(`${s.base}/admin/rooms/${id}/restore?backup=${encodeURIComponent(result.backup)}`, {
      method: 'POST',
      headers: { authorization: 'Bearer report' },
    });
    assert.equal(restore.status, 200, await restore.clone().text());
    assert.equal(JSON.parse(await fs.readFile(path.join(s.dataDir, `${id}.json`), 'utf8')).born, result.bornBefore);
  } finally {
    await s.svc.close();
  }
});

test('replace: unavailable and invalid seeds never touch the room', async () => {
  const seeds = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-no-seeds-'));
  const missing = await start({ jumpBuild: 'prebuilt', jumpSeedsDir: seeds });
  try {
    assert.equal((await missing.post(body)).status, 503);
  } finally {
    await missing.svc.close();
  }
  const invalid = await start({ jumpBuildDoc: async () => ({ tick: 10, data: { invalid: true } }) });
  try {
    assert.equal((await invalid.post(body)).status, 422);
    assert.deepEqual(
      (await fs.readdir(invalid.dataDir)).filter((f) => f.endsWith('.json')),
      [],
    );
  } finally {
    await invalid.svc.close();
  }
});

test('replace: a replaced jump room survives jump expiry, including restart', async () => {
  const s = await start();
  let stopped = false;
  try {
    const jump = await fetch(`${s.base}/jump`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ stage: 'start', ns: railwayRoomId('').slice(0, -1) }),
    });
    const { room } = (await jump.json()) as { room: string };
    assert.equal(jump.status, 200);
    const r = await s.post({ stage: 'awake', confirm: room }, KEY, room);
    assert.equal(r.status, 200);
    await s.svc.close();
    stopped = true;
    const id = railwayRoomId(room);
    const old = new Date(Date.now() - 10 * 86400000);
    await fs.utimes(path.join(s.dataDir, `${id}.json`), old, old);
    const restarted = await start({ jumpIdleDays: 0.00001 }, s.dataDir);
    try {
      assert.equal((await fetch(`${restarted.base}/rooms/${id}/snapshot`)).status, 200);
      const host = (await (await fetch(`${restarted.base}/rooms/${id}/host`)).json()) as {
        seed?: unknown;
        replaced?: unknown;
      };
      assert.equal(host.seed, undefined);
      assert.ok(host.replaced);
    } finally {
      await restarted.svc.close();
    }
  } finally {
    if (!stopped) await s.svc.close();
  }
});

function connect(base: string, room: string, self: string) {
  const ws = new WebSocket(
    `${base.replace('http:', 'ws:')}/room/${railwayRoomId(room)}?self=${self}&pid=${self}pid&key=${self}pidkey0000000000&b=test`,
    ['boogle.1'],
  );
  const messages: Record<string, unknown>[] = [];
  ws.onmessage = (e) => messages.push(JSON.parse(String(e.data)));
  return { ws, messages };
}
async function until(fn: () => boolean) {
  for (let n = 0; n < 400; n++) {
    if (fn()) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  assert.fail('condition timed out');
}

test('replace: occupied override, server-only announcement, busy, late join, bye, and restart cancels pending work', async () => {
  const s = await start({ replaceCountdownMs: 5000 });
  const a = connect(s.base, 'testing', 'aaa');
  const b = connect(s.base, 'testing', 'bbb');
  try {
    await until(() => a.messages.some((m) => m.t === 'welcome') && b.messages.some((m) => m.t === 'welcome'));
    // Hostile frames cannot announce or start a replacement; the heartbeat echo proves they were all processed.
    for (const frame of [
      { t: 'replace', stage: 'ring-joined' },
      { t: 'replacing', label: 'forged', seconds: 10 },
      { t: 'm', d: { t: 'replacing', label: 'forged', seconds: 10 } },
      { t: 'm', d: { t: 'r:edit', e: { op: 'rail.replace', stage: 'ring-joined' } } },
      { t: 'hb', at: 123 },
    ])
      a.ws.send(JSON.stringify(frame));
    await until(() => a.messages.some((m) => m.t === 'hb' && m.at === 123));
    const announced = (m: Record<string, unknown>) =>
      m.t === 'replacing' || (m.d as Record<string, unknown> | undefined)?.t === 'replacing';
    assert.equal(b.messages.some(announced), false);
    assert.equal(s.svc.roomHost()!.room(railwayRoomId('testing'))!.status().players, 2);
    assert.equal((await s.post(body)).status, 409);
    const pending = s.post({ ...body, override: true });
    await until(() => a.messages.some((m) => m.t === 'replacing') && b.messages.some((m) => m.t === 'replacing'));
    for (const client of [a, b])
      assert.deepEqual(client.messages.find(announced), { t: 'replacing', label: jumpOf('awake')!.label, seconds: 10 });
    assert.equal((await s.post({ ...body, override: true })).status, 409);
    const c = connect(s.base, 'testing', 'ccc');
    await until(() => c.messages.some((m) => m.t === 'replacing'));
    const born = (client: typeof a) => client.messages.find((m) => m.t === 'welcome')!.born;
    assert.equal(born(c), born(a));
    assert.ok(Number(c.messages.find((m) => m.t === 'replacing')!.seconds) <= 10);
    await s.svc.close();
    assert.equal((await pending).status, 503);
    for (const client of [a, b, c]) {
      const bye = client.messages.findIndex((m) => m.t === 'bye');
      assert.ok(bye > client.messages.findIndex((m) => m.t === 'replacing'), 'the announcement precedes bye');
    }
    const restarted = await start({}, s.dataDir);
    try {
      const status = (await (await fetch(`${restarted.base}/rooms/${railwayRoomId('testing')}/host`)).json()) as {
        replaced?: unknown;
      };
      assert.equal(status.replaced, undefined);
      assert.equal((await restarted.post(body)).status, 200);
    } finally {
      await restarted.svc.close();
    }
  } finally {
    a.ws.close();
    b.ws.close();
    if (s.svc.server.listening) await s.svc.close();
  }
});

test('replace: shutdown checkpoints other rooms while a seed build is still pending', async () => {
  let entered = false;
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const seed = await buildSeedDoc('awake');
  const other = railwayRoomId('other-room');
  const s = await start({
    serverRooms: ['*', other],
    serverSaveMs: 1000000,
    jumpBuildDoc: async () => {
      entered = true;
      await gate;
      return seed;
    },
  });
  const world = s.svc.roomHost()!.room(other)!.world as RailwayWorldHost;
  await world.whenReady();
  world.wake();
  world.step(1);
  const tick = world.status().tick;
  const pending = s.post(body);
  await until(() => entered);
  const closing = s.svc.close();
  try {
    await until(() => !s.svc.roomHost()!.room(other));
    const saved = JSON.parse(await fs.readFile(path.join(s.dataDir, `${other}.json`), 'utf8')) as { tick: number };
    assert.ok(saved.tick >= tick, 'unrelated room saved before the seed build finishes');
  } finally {
    release();
    await closing;
    await pending;
  }
});
