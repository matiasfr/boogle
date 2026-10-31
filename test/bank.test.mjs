// The offline helper bank (src/sim/bank.js, src/world/rules/bank.js): the gap a new host measures, freight capped at a
// section, and only the host's own wake with the gap it measured passes; a client replaying it is refused.
import test from 'node:test';
import assert from 'node:assert/strict';
import { offlineGap, offlineFreight, MS_PER_TICK, MIN_GAP_MS } from '../src/sim/bank.js';
import { TICK_MS, createSync } from '../src/world/sync.js';
import { installRules } from '../src/world/rules/index.js';
import { HELPER_EVERY } from '../src/sim/sites.js';
import { homeLand } from './helpers/land.mjs';
import { makeNet, run } from './helpers/net.mjs';

test('the gap is wall time not covered by ticks or earlier wakes, never negative', () => {
  assert.equal(MS_PER_TICK, TICK_MS);
  assert.equal(offlineGap(1_000_000, 0, 1000, 0), 900_000);
  assert.equal(offlineGap(1_000_000, 0, 1000, 400_000), 500_000);
  assert.equal(offlineGap(1_000, 0, 1000, 0), 0, 'a host clock behind the save');
  assert.equal(offlineGap(1.5, 0, 0, 0), 0);
});

test('freight: one piece per hut per HELPER_EVERY ticks, capped', () => {
  const per = HELPER_EVERY * MS_PER_TICK;
  assert.equal(offlineFreight(0, 10 * per, HELPER_EVERY, 60), 0);
  assert.equal(offlineFreight(2, 10 * per, HELPER_EVERY, 60), 20);
  assert.equal(offlineFreight(2, 1000 * per, HELPER_EVERY, 60), 60);
});

// A world with one helper hut built at site 0, saved an hour ago (by wall clock) at tick `tick`.
function savedWorld() {
  const s = createSync({ env: { canPlantAt: () => true } });
  s.setSelfId('old');
  s.setPid('builder');
  const rules = installRules(s, homeLand());
  const step = (e) => (s.submitEdit(e), [0, 1, 2].forEach(() => s.updateWorld(0.1)));
  step(null);
  for (let t = 0; t < 9; t++) step({ op: 'src.take', i: 0, j: 0, id: t });
  step({ op: 'site.stock', i: 0, j: 0, s: 0, ring: 1, n: 36 });
  assert.equal(rules.sites.helpers(), 1);
  const snap = JSON.parse(JSON.stringify(s.snapshot()));
  snap.epochMs = 5_000_000;
  return snap;
}

test("a host that loads an hour-old save banks the gap once; a client's wake is refused (hostOnly)", async () => {
  const snap = savedWorld();
  const now = snap.epochMs + snap.tick * TICK_MS + 3_600_000;
  const storage = { getItem: () => JSON.stringify(snap), setItem() {} };
  const net = makeNet();
  const mk = (id, host) => {
    const s = createSync({ env: { canPlantAt: () => true } });
    const rules = installRules(s, homeLand());
    const p = net.add(id, host);
    // the feature's logic (src/features/helper-bank.js), on this tab's clock
    s.onSnapshot(() => {
      if (s.worldStatus().mode !== 'host') return;
      const ms = offlineGap(now, s.world.epochMs, s.world.tick, rules.bank.ms());
      if (ms >= MIN_GAP_MS) s.submitEdit({ op: 'bank.wake', i: 0, j: 0, ms });
    });
    s.attachWorld(p.room, { roomId: 'bank', storage, now: () => now });
    return { s, rules, p };
  };
  const host = mk('h', true);
  const client = mk('c', false);
  const all = [host, client];
  await run(net, all, 40);
  assert.equal(host.rules.bank.ms(), 3_600_000);
  assert.equal(client.rules.bank.ms(), 3_600_000);
  const track = host.rules.sites.sites.list[0].stock[0];
  assert.equal(track, Math.min(60, Math.floor(3_600_000 / (HELPER_EVERY * TICK_MS))), 'an hour of one hut');
  assert.equal(host.rules.sites.sites.list[0].t0, -1, 'the machine waits for a player');
  client.s.submitEdit({ op: 'bank.wake', i: 0, j: 0, ms: 3_600_000 });
  await run(net, all, 20);
  assert.equal(host.rules.bank.ms(), 3_600_000, 'a replayed wake is refused');
  assert.deepEqual(client.s.stateHashes(), host.s.stateHashes());
});
