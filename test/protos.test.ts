// The protos page's cards and the `?play` playlist (protos/protos.ts, src/proto/flags.ts): every live card either
// shares the island or says why it is a chapter, the playlist reaches every live card, and island toys have a spot.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ANSWERED, PROTOS, PLAYTEST_ORDER, playlist, onIsland } from '../protos/protos.ts';
import { ISLAND } from '../src/proto/flags.ts';

const live = PROTOS.filter((p) => p.status === 'live');

test('every island toy is a live or answered card, and every other live card is a chapter with a reason', () => {
  for (const id of ISLAND)
    assert.ok(
      PROTOS.some((p) => p.id === id && (p.status === 'live' || ANSWERED.includes(p.status))),
      `${id} is not a live or answered card`,
    );
  for (const p of live) assert.ok(onIsland(p) !== !!p.chapter, `${p.id}: on the island xor a chapter`);
});

test('the playlist reaches every live card once, in PLAYTEST_ORDER', () => {
  const ids = playlist().map((s) => s.card.id);
  assert.equal(new Set(ids).size, ids.length, 'a card twice: keep its entries together in PLAYTEST_ORDER');
  for (const p of live) assert.ok(ids.includes(p.id), `${p.id} is not in PLAYTEST_ORDER`);
  for (const o of PLAYTEST_ORDER) {
    const p = PROTOS.find((x) => x.id === o.id);
    assert.ok(p, `PLAYTEST_ORDER names ${o.id}`);
    if (o.variant)
      assert.ok(
        p.variants?.some((v) => v.name === o.variant),
        `${o.id} has no variant ${o.variant}`,
      );
  }
});

test('island toys have a spot of their own (moves goes with you)', () => {
  const spots = live.filter((p) => onIsland(p) && p.id !== 'moves').map((p) => ({ id: p.id, s: p.spawn }));
  for (const { id, s } of spots) assert.ok(s, `${id} has no spawn`);
  for (let a = 0; a < spots.length; a++)
    for (let b = a + 1; b < spots.length; b++) {
      const d = Math.hypot(spots[a].s!.x - spots[b].s!.x, spots[a].s!.z - spots[b].s!.z);
      assert.ok(d > 2, `${spots[a].id} and ${spots[b].id} start on the same spot`);
    }
});

test('variant names are unique per card and the variant urls name their variant', () => {
  for (const p of PROTOS) {
    const names = (p.variants ?? []).map((v) => v.name);
    assert.equal(new Set(names).size, names.length, p.id);
    for (const v of p.variants ?? [])
      assert.equal(new URLSearchParams(v.url.split('?')[1]).get('v'), v.name, `${p.id}/${v.name}: add &v=${v.name}`);
  }
});

test("graduated, answered and parked cards carry the owner's verdict and what comes next", () => {
  for (const p of PROTOS.filter((q) => ANSWERED.includes(q.status)))
    assert.ok(p.answer?.verdict && p.answer.next && p.answer.on, `${p.id}: add its answer`);
});
