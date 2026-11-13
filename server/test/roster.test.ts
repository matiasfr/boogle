// Roster authority uses the real host, durable store and two actual session adapters.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './helpers/rail-tune.ts';
import { createRailwayWorldHost } from '../src/host/world-host.ts';
import { ROSTER_CHANGE_MS } from '../../src/world/rules/roster.ts';
import { serializeRoster } from '../../src/sim/roster.ts';

test('roster authenticates identity, rejects classic forgery and ignores replay', async (t) => {
  const f = await fixture(t);
  const a = f.join('alice');
  const b = f.join('bob');
  f.run(3);
  f.host.deliver({ t: 'w:edit', e: { op: 'who.set', n: 'Forged', c: 1 } }, 'bob');
  f.run(30);
  await f.settled();
  assert.equal(f.host.rules.roster.size(), 0);
  a.adapter.act('who.set', { n: '  Ana\u0000  ', c: 2, u: 'bob', p: 'bob' });
  f.run();
  await f.settled();
  assert.deepEqual(serializeRoster(f.host.rules.roster.roster), [['alice', 'Ana', 2]]);
  assert.equal(a.accepted.length, 1);
  assert.equal(b.accepted.length, 0);
  f.host.deliver({ t: 'r:edit', e: { ...a.edits[0], n: 'Replay' } }, 'alice');
  f.host.deliver({ t: 'r:edit', e: { ...a.edits[0], request: 3, n: 'Gap' } }, 'alice');
  f.run(3);
  assert.equal(f.host.rules.roster.nameOf(0), 'Ana');
  assert.ok(a.packets.some((p) => p.rej?.some(([, request, why]) => request === 3 && why === 'order')));
  assert.equal(Object.hasOwn(f.host.sync.stateHashes(), 'roster'), false);
  assert.deepEqual(a.mirror.roster.roster, b.mirror.roster.roster);
});

test('roster keeps ordinals across pending reconnect, departure, late join and server restart', async (t) => {
  const f = await fixture(t);
  const a = f.join('alice');
  const b = f.join('bob');
  f.run(3);
  const changes: unknown[][] = [[], []];
  a.mirror.roster.onChange((e) => changes[0]!.push(e));
  b.mirror.roster.onChange((e) => changes[1]!.push(e));
  const hold = f.holdNextWrite();
  a.adapter.act('who.set', { n: 'Ana', c: 2 });
  f.run();
  await hold.entered.promise;
  assert.equal(a.accepted.length, 0);
  a.disconnect();
  b.adapter.act('who.set', { n: 'Bo', c: 3 });
  f.run();
  a.reconnect();
  f.run(3);
  assert.equal(a.accepted.length, 0);
  hold.gate.resolve();
  await f.settled();
  f.run(40);
  await f.settled();
  assert.equal(a.accepted.length, 1);
  assert.equal(b.accepted.length, 1);
  assert.equal(a.mirror.roster.indexOf('alice'), 0);
  assert.equal(b.mirror.roster.indexOf('bob'), 1);
  assert.deepEqual(a.mirror.roster.roster, b.mirror.roster.roster);
  assert.equal(changes[0]!.length, 2);
  assert.equal(changes[1]!.length, 2, 'every peer observes replicated changes, not submitter receipts');
  a.disconnect();
  f.advanceTime(ROSTER_CHANGE_MS);
  b.adapter.act('who.set', { n: 'Bob', c: 4 });
  f.run();
  await f.settled();
  a.reconnect();
  const late = f.join('late');
  f.run(3);
  assert.equal(a.mirror.roster.nameOf(1), 'Bob');
  assert.deepEqual(late.mirror.roster.roster, b.mirror.roster.roster);
  const expected = serializeRoster(f.host.rules.roster.roster);
  await f.host.close({ save: false });
  const restarted = createRailwayWorldHost({
    roomId: f.roomId,
    store: f.store,
    tick: false,
    now: f.now,
    pidOf: (sid) => sid,
  });
  t.after(() => restarted.close({ save: false }));
  await restarted.whenReady();
  assert.deepEqual(serializeRoster(restarted.rules.roster.roster), expected);
  assert.equal(restarted.rules.roster.indexOf('alice'), 0);
});

test('accepted durable roster name stays identical across restart', async (t) => {
  const f = await fixture(t),
    a = f.join('alice');
  f.run(3);
  a.adapter.act('who.set', { n: 'abcdefghijklmno p', c: 2 });
  f.run();
  await f.settled();
  assert.equal(a.accepted.length, 1);
  const expected = f.host.rules.roster.nameOf(0);
  await f.host.close({ save: false });
  const restarted = createRailwayWorldHost({
    roomId: f.roomId,
    store: f.store,
    tick: false,
    now: f.now,
    pidOf: (s) => s,
  });
  t.after(() => restarted.close({ save: false }).catch(() => {}));
  await restarted.whenReady();
  assert.equal(restarted.rules.roster.nameOf(0), expected);
});

test('roster cadence uses host time, rejects without a save, and survives a replacement session', async (t) => {
  const f = await fixture(t);
  const a = f.join('alice'),
    b = f.join('bob');
  f.run(3);
  a.adapter.act('who.set', { n: 'Ana', c: 2 });
  f.run();
  await f.settled();
  const writes = f.writes.length;
  f.host.deliver({ t: 'r:edit', e: { ...a.edits[0], request: 2, ms: 1_000_000_000, n: 'Forged clock' } }, 'alice');
  f.run(3);
  assert.ok(a.packets.some((p) => p.rej?.some(([, request, reason]) => request === 2 && reason === 'refused')));
  assert.equal(f.host.rules.roster.nameOf(0), 'Ana');
  // A fresh session for the same authenticated player cannot reset their rate limit.
  a.disconnect();
  const replacement = f.join('alice');
  f.run(3);
  replacement.adapter.act('who.set', { n: 'Too soon', c: 3 });
  f.run();
  await f.settled();
  assert.equal(replacement.accepted.length, 0);
  assert.equal(replacement.refused.at(-1)?.reason, 'refused');
  assert.equal(f.writes.length, writes, 'rate refusals are non-durable');
  assert.equal(f.host.status().ready, true);
  // Other players have their own slot, and an unchanged value never spends it.
  b.adapter.act('who.set', { n: 'Bo', c: 1 });
  f.run();
  await f.settled();
  assert.equal(b.accepted.length, 1);
  f.advanceTime(ROSTER_CHANGE_MS);
  replacement.adapter.act('who.set', { n: 'Ana', c: 2 });
  f.run();
  await f.settled();
  replacement.adapter.act('who.set', { n: 'Annie', c: 3 });
  f.run();
  await f.settled();
  assert.equal(replacement.accepted.length, 1);
  assert.equal(f.host.rules.roster.nameOf(0), 'Annie');
});
