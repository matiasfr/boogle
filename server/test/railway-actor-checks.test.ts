// Replication R0, revision 1: the server judges reach from the action's own position and cadence from the client's
// action clock, so a correct prediction is never refused for stale presence or bunched arrival. Both are validation
// facts only: they never enter the saved state or what is replicated.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store.ts';
import { createRailwayWorldHost } from '../src/host/world-host.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 as T1 } from '../../src/sim/railway-layout.ts';
import { rail } from '../../test/helpers/rail.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';

type Obj = Record<string, unknown>;

async function fixture() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-actor-checks-'));
  const store = createStore({ dataDir: dir, maxRooms: 10 });
  await store.init();
  let now = 1800000000000;
  const sent: Obj[] = [];
  // There is no presence at all: everything accepted below is judged from what the action carries.
  const host = createRailwayWorldHost({
    roomId: railwayRoomId('actor-checks'),
    store,
    tick: false,
    now: () => now,
    pidOf: (sid) => (sid.startsWith('a') ? 'alice' : null),
  });
  host.onSend((m) => sent.push(m));
  await host.whenReady();
  const step = async (ticks: number) => {
    for (let k = 0; k < ticks; k++) {
      await host.sync.whenDurable();
      now += 100;
      host.step(0.1);
    }
    await host.sync.whenDurable();
  };
  const requests = new Map<string, number>();
  const send = (fields: Obj, sid = 'a', epoch = 1) => {
    const request = (requests.get(sid) ?? 0) + 1;
    requests.set(sid, request);
    host.deliver({ t: 'r:edit', e: { ...fields, epoch, request } }, sid);
    return request;
  };
  const result = (r: number, epoch = 1) => host.rules.railway.outcome('alice', epoch, r)?.status;
  const open = async (sid: string) => {
    host.deliver({ t: 'r:open' }, sid);
    await step(3);
  };
  await open('a');
  return {
    host,
    sent,
    step,
    send,
    result,
    open,
    close: () => host.close({ save: false }).then(() => fs.rm(dir, { recursive: true })),
  };
}

test('reach comes from the action position; cadence from the client action clock', async () => {
  const f = await fixture();
  try {
    const wake = f.send({ op: 'rail.wake', at: [T1.x, 0, T1.z], ms: 100 });
    await f.step(3 + T1.wakeTicks);
    assert.equal(f.result(wake), 'accepted');

    const source = RAILWAY_SOURCES[0]!;
    const at = [source[1], 0, source[2]];
    const chop = { op: 'rail.chop', id: source[0], yaw: 0, collapsed: false, at };
    // Two swings 250 ms apart on the client's clock, arriving in the same server instant: both accepted.
    const first = f.send({ ...chop, ms: 1000 });
    const second = f.send({ ...chop, ms: 1000 + T1.swingMs + 10 });
    await f.step(3);
    assert.equal(f.result(first), 'accepted');
    assert.equal(f.result(second), 'accepted');
    // The facts were judged, then left out of what is saved and replicated.
    const saved = JSON.stringify(f.host.sync.snapshot().data.railway);
    assert.ok(!saved.includes('"at"') && !saved.includes('"ms"'));
    // A swing faster than the cadence on the client's own clock: refused.
    const fast = f.send({ ...chop, ms: 1000 + T1.swingMs + 60 });
    await f.step(3);
    assert.equal(f.result(fast), 'rejected');
    // Out of reach by the action's own position: refused.
    const far = f.send({ ...chop, at: [0, 0, 0], ms: 3000 });
    await f.step(3);
    assert.equal(f.result(far), 'rejected');
    // No bound against the server clock: a client clock running far faster (a warped harness page) is still judged
    // by its own cadence alone.
    const ahead = f.send({ ...chop, ms: 60000 });
    await f.step(3);
    assert.equal(f.result(ahead), 'accepted');
    // An action time going backwards within a session fails its own cadence.
    const back = f.send({ ...chop, ms: 59000 });
    await f.step(3);
    assert.equal(f.result(back), 'rejected');
  } finally {
    await f.close();
  }
});

test('an action without well-formed position and time is a recorded rejection', async () => {
  const f = await fixture();
  try {
    const at = [T1.x, 0, T1.z];
    const malformed: Obj[] = [
      {}, // neither
      { at }, // no time
      { ms: 10 }, // no position
      { at: [T1.x, T1.z], ms: 10 },
      { at: [T1.x, 0, T1.z, 0], ms: 10 },
      { at: [T1.x + 0.5, 0, T1.z], ms: 10 },
      { at: [T1.x, 0, 300000], ms: 10 },
      { at: [T1.x, '0', T1.z], ms: 10 },
      { at, ms: -1 },
      { at, ms: 1.5 },
      { at, ms: '10' },
      { at, ms: 2 ** 31 },
    ];
    for (const facts of malformed) {
      // One at a time: eight outstanding requests fill the session's window.
      const r = f.send({ op: 'rail.wake', ...facts });
      await f.step(3);
      assert.equal(f.result(r), 'rejected', JSON.stringify(facts));
    }
    assert.equal(rail(f.host.rules.railway.world()).awake, -1);
  } finally {
    await f.close();
  }
});

test('a new session epoch starts a new client clock', async () => {
  const f = await fixture();
  try {
    const wake = f.send({ op: 'rail.wake', at: [T1.x, 0, T1.z], ms: 100 });
    await f.step(3 + T1.wakeTicks);
    assert.equal(f.result(wake), 'accepted');
    const source = RAILWAY_SOURCES[0]!;
    const chop = { op: 'rail.chop', id: source[0], yaw: 0, collapsed: false, at: [source[1], 0, source[2]] };
    assert.equal(await (async (r) => (await f.step(3), f.result(r)))(f.send({ ...chop, ms: 50000 })), 'accepted');
    // A reload: the same player, a new tab whose clock starts near zero again.
    await f.open('a2');
    const reloaded = f.send({ ...chop, ms: 200 }, 'a2', 2);
    await f.step(3);
    assert.equal(f.result(reloaded, 2), 'accepted');
  } finally {
    await f.close();
  }
});
