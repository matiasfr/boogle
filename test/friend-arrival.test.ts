import test from 'node:test';
import assert from 'node:assert/strict';
import { friendArrivalStep, friendDestination } from '../src/place/friend-arrival.ts';
import { createReturnHalts } from '../src/entities/railway/return-halts.ts';
import { sourceFunction } from '../dev/level/source.ts';
import { searchLandings } from '../src/place/return-spot.ts';
import { PLAYER_R } from '../src/constants.ts';
import { HALL_PAD } from '../src/place/works-landing.ts';
import { jumpOf } from '../src/world/railway-jump.ts';
import { TRAIN_PHASE } from '../src/sim/railway-train.ts';
import { Train } from '../src/sim/railway-components.ts';
import { trainId } from '../src/sim/railway-queries.ts';
import { buildSeedWorld } from './helpers/rail.ts';
import type { ReadWorld } from '../src/sim/railway-rows.ts';

const seeded = buildSeedWorld('ring-joined');
const halts = createReturnHalts(() => seeded.w as unknown as ReadWorld);
const { standing, works } = halts.friends();
const ring = jumpOf('steel-kit')!.land!;
const pier = standing.find((p) => p.halt === 'line2:3')!;
const choose = (...friends: { x: number; z: number }[]) =>
  friendDestination(friends, standing, HALL_PAD, works)?.platforms[0]?.halt ?? null;
test('one entered friend at Ring gets Ring', () => assert.equal(choose(ring), 'line2:5'));
test('two eligible halts choose the friend closest to current works, in either arrival order', () => {
  assert.ok(Math.hypot(works.x - ring.x, works.z - ring.z) < Math.hypot(works.x - pier.x, works.z - pier.z));
  assert.equal(choose(pier, ring), 'line2:5');
  assert.equal(choose(ring, pier), 'line2:5');
});
test('Home radius is exclusive, a friend exactly 150 m away keeps the ordinary landing', () => {
  assert.equal(choose({ x: HALL_PAD.x + 150, z: HALL_PAD.z }), null);
});
test('a friend over 250 m off every built line cannot open a destination', () => {
  assert.equal(choose({ x: ring.x, z: ring.z - 500 }), null);
});
test('no friend leaves no destination', () => assert.equal(choose(), null));
test('before trains run an entered friend cannot start an arrival or a wait', () => {
  const early = buildSeedWorld('awake');
  const earlyHalts = createReturnHalts(() => early.w as unknown as ReadWorld);
  assert.equal(earlyHalts.running(), false);
  assert.equal(friendArrivalStep(false, false, earlyHalts.running(), 1, 0), 'skip');
});
test('presence holds through 1499 ms and releases at 1500 ms', () => {
  assert.equal(friendArrivalStep(false, false, true, 0, 1499), 'wait');
  assert.equal(friendArrivalStep(false, false, true, 0, 1500), 'skip');
});
test('an entered pose ends the wait on its first frame', () =>
  assert.equal(friendArrivalStep(false, false, true, 1, 127), 'choose'));
for (const [name, first, recent] of [
  ['first visit', true, false],
  ['recent reload', false, true],
] as const) {
  test(name + ' bypasses both the presence wait and a friend already at the halt', () => {
    for (const poses of [0, 1])
      assert.equal(friendArrivalStep(first, recent, true, poses, 0), recent ? 'resume' : 'skip');
  });
}

for (const mode of ['dwelling', 'no train', 'departing', 'occupied', 'moving collider', 'exhausted'] as const) {
  test('placement on the live halt and deck: ' + mode, () => {
    const w = buildSeedWorld('ring-joined').w;
    const live = createReturnHalts(() => w as unknown as ReadWorld);
    const platform = live.friends().standing.find((h) => h.halt === 'line2:5')!;
    const slot = 1;
    const id = trainId(w, slot);
    const writePhase = (phase: number) => Object.assign(w.mut(Train, id)!, { at: platform.stop!, phase });
    writePhase(mode === 'no train' ? TRAIN_PHASE.RUN : TRAIN_PHASE.STAND);
    const velocity = { x: 0, y: 0, z: 0 };
    const deck = { body: { position: ring, velocity, angularVelocity: { y: 0 } }, hx: 1.1, hz: 1.6, top: 0.5 };
    const passengerSpot = sourceFunction<typeof import('../src/entities/railway/arrival-deck.ts').passengerSpot>(
      'src/entities/railway/arrival-deck.ts',
      'passengerSpot',
      {
        PLAYER_R,
        platformById: (id: string) => (id === 'railway:train1-1' ? deck : null),
        fromPlatform: (_deck: unknown, p: typeof ring) => ({ x: ring.x + p.x, y: ring.y + p.y, z: ring.z + p.z }),
      },
    );
    const search = searchLandings([platform]);
    let resident = false;
    const probes = {
      settled: () => resident,
      deck: () => passengerSpot(live, platform, (x) => mode !== 'occupied' && mode !== 'exhausted' && x > ring.x),
      standable: () => mode !== 'exhausted',
      near: () => null,
    };
    assert.deepEqual(search.step(0, probes), { kind: 'hold' });
    assert.deepEqual(search.step(0.1, probes), { kind: 'hold' });
    if (mode === 'departing') writePhase(TRAIN_PHASE.RUN);
    if (mode === 'moving collider') velocity.z = 2;
    resident = true;
    const result = search.step(0.2, probes);
    if (mode === 'dwelling') {
      assert.equal(result.kind, 'land');
      assert.ok(result.kind === 'land' && result.deck);
      assert.equal(result.at.x, ring.x + 1.02);
      assert.equal(result.at.z, ring.z - 1.15);
      assert.equal(result.at.y, ring.y + 0.5);
    } else if (mode === 'exhausted') assert.deepEqual(result, { kind: 'home' });
    else assert.deepEqual(result, { kind: 'land', at: platform, from: platform });
  });
}
