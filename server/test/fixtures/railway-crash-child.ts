// Process fixture for railway-crash.test.ts, using the real host, requests and atomic file store.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRailwayWorldHost } from '../../src/host/world-host.ts';
import { createStore } from '../../src/store.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 } from '../../../src/sim/railway-layout.ts';
import { isPlayableRailwayRoom, isRailwayRoom } from '../../../src/world/railway-namespace.ts';

const [dataDir, boundary, roomId] = process.argv.slice(2);
if (
  !dataDir ||
  !roomId ||
  !isRailwayRoom(roomId) ||
  !['published', 'replacement', 'recovery-checkpoint'].includes(boundary ?? '')
)
  throw new Error('bad crash fixture arguments');
const pid = 'crashtester';
const startedAt = boundary === 'recovery-checkpoint' ? Date.UTC(2026, 10, 4) : 1000000;
const now = () => startedAt;
const store = createStore({ dataDir, maxRooms: 4 });
await store.init();
let position = { x: RAILWAY_T1.x / 100, z: RAILWAY_T1.z / 100, at: now() };
let elapsed = 0;
const host = createRailwayWorldHost({
  roomId,
  store,
  tick: false,
  saveMs: 1000000000, // prove the pre-periodic-checkpoint crash window
  now,
  monotonicNow: () => elapsed,
  pidOf: (sid) => (sid === 'visitor' ? pid : null),
  positionOf: () => position,
});
await host.whenReady();
let published = 0;
host.onSend((m) => {
  if (m.t === 'w:edits' && Array.isArray(m.list)) published += m.list.length;
});
async function ticks(n: number) {
  for (let i = 0; i < n; i++) {
    elapsed += 100;
    host.step(0.1);
    await host.sync.whenDurable();
  }
}
host.deliver({ t: 'r:open' }, 'visitor');
await host.sync.whenDurable();
await ticks(3);
assert.equal(host.rules.railway.account(pid)?.epoch, 1);
let request = 0;
async function action(e: Record<string, unknown>, apply = true) {
  request++;
  host.deliver({ t: 'r:edit', e: { ...e, epoch: 1, request } }, 'visitor');
  await host.sync.whenDurable();
  if (apply) {
    await ticks(3);
    assert.equal(host.rules.railway.outcome(pid, 1, request)?.status, 'accepted');
  }
}
await action({ op: 'rail.wake' });
await ticks(RAILWAY_T1.wakeTicks);
for (let stroke = 0; stroke < 12; stroke++) {
  const source = RAILWAY_SOURCES[Math.floor(stroke / 5)]!;
  position = { x: source[1] / 100, z: source[2] / 100, at: now() };
  await action({
    op: 'rail.chop',
    id: source[0],
    ...(isPlayableRailwayRoom(roomId) ? { yaw: 0.5, collapsed: false } : {}),
  });
  position = { x: RAILWAY_T1.x / 100, z: RAILWAY_T1.z / 100, at: now() };
  if (stroke < 11) await action({ op: 'rail.deposit', station: 'T1', n: 2 });
}
assert.equal(host.rules.railway.counts().stock, 22);
assert.equal(host.rules.railway.counts().carry, 2);
const before = host.rules.railway.counts();
const priorPublished = published;
await action({ op: 'rail.deposit', station: 'T1', n: 2 }, false);
assert.equal(published, priorPublished + 1, 'final stamp actually published');
assert.equal(host.rules.railway.counts().stock, 22, 'final stamp not yet applied');
assert.equal(host.rules.railway.outcome(pid, 1, request), null);

async function announce(extra: Record<string, unknown> = {}) {
  await new Promise<void>((resolve, reject) => {
    if (!process.send) throw new Error('crash fixture requires IPC');
    process.send(
      { boundary, roomId, pid, request, published, before, tick: host.sync.world.tick, ...extra },
      (error) => (error ? reject(error) : resolve()),
    );
  });
}
if (boundary === 'recovery-checkpoint') {
  await ticks(3);
  assert.equal(host.rules.railway.counts().allocation, 24);
  await host.close();
  const resumedAt = startedAt + 20000;
  const write = store.write.bind(store);
  store.write = async (...args) => {
    const result = await write(...args);
    // The startup checkpoint reached disk, but its promise never resolves: no resume can yet be queued.
    await announce({ resumedAt, originalTimestamp: startedAt });
    await new Promise<void>(() => {});
    return result;
  };
  const restarting = createRailwayWorldHost({ roomId, store, tick: false, now: () => resumedAt });
  await restarting.whenReady();
} else if (boundary === 'replacement') {
  // Intercept the real Store's rename after its real temporary write. SIGKILL leaves the previous complete file.
  const rename = fs.rename;
  fs.rename = async (from, to) => {
    if (to === path.join(dataDir, `${roomId}.json`)) {
      await announce({ temporary: String(from) });
      await new Promise<void>(() => {});
    }
    await rename(from, to);
  };
  assert.equal(host.sync.saveNow(true), true);
  await host.sync.whenDurable();
} else await announce();
await new Promise<void>(() => {}); // parent SIGKILLs; never close/save this host
