// Replication R0, revision 1: the server judges reach from the action's own position and cadence from the client's
// action clock, so a correct prediction is never refused for stale presence or bunched arrival.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store.ts';
import { createRailwayWorldHost } from '../src/host/world-host.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 as T1 } from '../../src/sim/railway-layout.ts';
import { RAILWAY_ROOM } from '../../src/world/railway-namespace.ts';

type Obj = Record<string, unknown>;

async function fixture() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-actor-checks-'));
  const store = createStore({ dataDir: dir, maxRooms: 10 });
  await store.init();
  let now = 1800000000000;
  const sent: Obj[] = [];
  // No presence at all: every accepted action below is judged from what it carries.
  const host = createRailwayWorldHost({
    roomId: RAILWAY_ROOM,
    store,
    tick: false,
    now: () => now,
    monotonicNow: () => now,
    pidOf: (sid) => (sid === 'a' ? 'alice' : null),
    positionOf: () => null,
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
  let request = 0;
  const send = (fields: Obj) => {
    request++;
    host.deliver({ t: 'r:edit', e: { ...fields, epoch: 1, request } }, 'a');
    return request;
  };
  const result = (r: number) => sent.findLast((m) => m.t === 'r:result' && m.request === r)?.status;
  host.deliver({ t: 'r:open' }, 'a');
  await step(3);
  return {
    host,
    step,
    send,
    result,
    close: () => host.close({ save: false }).then(() => fs.rm(dir, { recursive: true })),
  };
}

test('reach comes from the action position; cadence from the client action clock', async () => {
  const f = await fixture();
  try {
    // Without a position there is no fresh presence either: refused, as before.
    const blind = f.send({ op: 'rail.wake', ms: 0 });
    await f.step(3);
    assert.equal(f.result(blind), 'rejected');
    const wake = f.send({ op: 'rail.wake', at: [T1.x, 0, T1.z], ms: 100 });
    await f.step(3 + T1.wakeTicks);
    assert.equal(f.result(wake), 'accepted');

    const source = RAILWAY_SOURCES[0]!;
    const at = [source[1], 0, source[2]];
    // Two swings 250 ms apart on the client's clock, arriving in the same server instant: both accepted.
    const first = f.send({ op: 'rail.chop', id: source[0], yaw: 0, collapsed: false, at, ms: 1000 });
    const second = f.send({ op: 'rail.chop', id: source[0], yaw: 0, collapsed: false, at, ms: 1000 + T1.swingMs + 10 });
    await f.step(3);
    assert.equal(f.result(first), 'accepted');
    assert.equal(f.result(second), 'accepted');
    // A swing faster than the cadence on the client's own clock: refused.
    const fast = f.send({ op: 'rail.chop', id: source[0], yaw: 0, collapsed: false, at, ms: 1000 + T1.swingMs + 60 });
    await f.step(3);
    assert.equal(f.result(fast), 'rejected');
    // Out of reach by the action's own position: refused, whatever presence says.
    const far = f.send({ op: 'rail.chop', id: source[0], yaw: 0, collapsed: false, at: [0, 0, 0], ms: 3000 });
    await f.step(3);
    assert.equal(f.result(far), 'rejected');
    // No bound against the server clock: a client clock running far faster (a warped harness page) is still judged
    // by its own cadence alone.
    const ahead = f.send({ op: 'rail.chop', id: source[0], yaw: 0, collapsed: false, at, ms: 60000 });
    await f.step(3);
    assert.equal(f.result(ahead), 'accepted');
    // An action time going backwards within a session fails its own cadence.
    const back = f.send({ op: 'rail.chop', id: source[0], yaw: 0, collapsed: false, at, ms: 59000 });
    await f.step(3);
    assert.equal(f.result(back), 'rejected');
  } finally {
    await f.close();
  }
});
