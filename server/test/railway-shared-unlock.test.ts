// Co-op abilities, option E (docs/brainstorms/coop-abilities.md): an ability one player finds belongs to the whole
// world at once. The railway host (Server kind) accepts one player's claim; every connected client's mirror shows it
// on the same step, a client that reconnects or joins late rebuilds it from the whole state, and it survives an
// orderly restart (the save) and a crash after the checkpoint. Only presentation differs per player, and that is Local.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store.ts';
import { createRailwayWorldHost } from '../src/host/world-host.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import { createRailwayMirror } from '../../src/world/railway-replicate.ts';
import { rail } from '../../test/helpers/rail.ts';
import { LINE1_JUMP_DEVICE } from '../../src/sim/railway-line-layout.ts';

const START = 1800000000000;
type Obj = Record<string, unknown>;

async function fixture() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-shared-unlock-'));
  const store = createStore({ dataDir: dir, maxRooms: 4 });
  await store.init();
  let now = START;
  const pids = new Map([
    ['a', 'alice'],
    ['b', 'bob'],
    ['c', 'carol'],
  ]);
  const sent: Obj[] = [];
  const mirrors = new Map<string, ReturnType<typeof createRailwayMirror>>();
  const create = () => {
    const h = createRailwayWorldHost({
      roomId: railwayRoomId('shared-unlock'),
      store,
      tick: false,
      saveMs: 2000,
      now: () => now,
      pidOf: (sid) => pids.get(sid) ?? null,
    });
    h.onSend((m) => sent.push(m));
    return h;
  };
  let host = create();
  await host.whenReady();
  /** A client connects (or reconnects): a fresh mirror, filled whole from the next packets. */
  const connect = (cid: string) => {
    mirrors.set(cid, createRailwayMirror());
    host.replication.addClient(cid);
  };
  const disconnect = (cid: string) => {
    host.replication.removeClient(cid);
    mirrors.delete(cid);
  };
  const step = async (ticks: number) => {
    for (let k = 0; k < ticks; k++) {
      await host.sync.whenDurable();
      now += 100;
      host.step(0.1);
      host.replication.commit(host.sync.roomStep());
      host.replication.flush(host.sync.roomStep(), (cid, _p, json) => {
        assert.ok(mirrors.get(cid)?.mirror.apply(JSON.parse(json), 0), 'a well-formed packet');
      });
    }
    await host.sync.whenDurable();
  };
  const open = (sid: string) => {
    host.deliver({ t: 'r:open' }, sid);
    const msg = sent.findLast((m) => m.t === 'r:session' && m.to === sid);
    assert.ok(msg);
    return msg.epoch as number;
  };
  /** Take the double jump at its device, standing where the server's reach check wants the actor. */
  const claimJump = async (sid: string, epoch: number) => {
    const d = LINE1_JUMP_DEVICE;
    host.deliver({ t: 'r:edit', e: { op: 'rail.jump', epoch, request: 1, at: [d.x, d.y, d.z], ms: now - START } }, sid);
    await step(3);
    return host.rules.railway.outcome(pids.get(sid)!, epoch, 1);
  };
  const jump = (cid: string) => {
    const m = mirrors.get(cid)!;
    return m.synced() && rail(m.world()).jump;
  };
  return {
    connect,
    disconnect,
    step,
    open,
    claimJump,
    jump,
    get host() {
      return host;
    },
    async restart() {
      await host.close({ save: true });
      host = create();
      await host.whenReady();
      for (const cid of mirrors.keys()) connect(cid);
    },
    async crash() {
      await host.close({ save: false });
      host = create();
      await host.whenReady();
      for (const cid of mirrors.keys()) connect(cid);
    },
    async close() {
      await host.close({ save: false });
      await fs.rm(dir, { recursive: true, force: true });
    },
  };
}

test("one player's double jump reaches every connected player at once, a reconnect and a late joiner", async () => {
  const f = await fixture();
  try {
    f.connect('a');
    f.connect('b');
    await f.step(3);
    assert.equal(f.jump('a'), false);
    assert.equal(f.jump('b'), false);
    const outcome = await f.claimJump('a', f.open('a'));
    assert.equal(outcome?.status, 'accepted');
    assert.equal(rail(f.host.rules.railway.world()).jump, true);
    // Both mirrors show it from the same packets: the finder and the friend who did nothing.
    assert.equal(f.jump('a'), true, "the finder's mirror");
    assert.equal(f.jump('b'), true, "the friend's mirror, with no action of their own");
    // Bob drops and comes back: his new mirror is rebuilt whole and has it.
    f.disconnect('b');
    await f.step(2);
    f.connect('b');
    assert.equal(f.jump('b'), false, 'nothing before the whole state arrives');
    await f.step(3);
    assert.equal(f.jump('b'), true, 'a reconnect rebuilds the unlock');
    // Carol was never here: she arrives to it.
    f.connect('c');
    await f.step(3);
    assert.equal(f.jump('c'), true, 'a late joiner inherits the unlock');
    // A second claim is a no-op, not a second unlock.
    const again = await f.claimJump('b', f.open('b'));
    assert.notEqual(again?.status, 'accepted');
  } finally {
    await f.close();
  }
});

test('the shared unlock survives an orderly restart (the save) and a crash after the checkpoint', async () => {
  const f = await fixture();
  try {
    f.connect('a');
    f.connect('b');
    await f.step(3);
    assert.equal((await f.claimJump('a', f.open('a')))?.status, 'accepted');
    await f.restart();
    await f.step(3);
    assert.equal(rail(f.host.rules.railway.world()).jump, true, 'restored from the save');
    assert.equal(f.jump('a'), true);
    assert.equal(f.jump('b'), true);
    // Past a periodic checkpoint, a crash keeps it too.
    const saves = f.host.sync.worldStatus().saves;
    while (f.host.sync.worldStatus().saves === saves) await f.step(1);
    await f.crash();
    await f.step(3);
    assert.equal(rail(f.host.rules.railway.world()).jump, true, 'restored from the checkpoint');
    assert.equal(f.jump('b'), true);
  } finally {
    await f.close();
  }
});
