// R4e, the island's folk (docs/plans/ring-island-build1.md, step 4e): the pure decisions in
// src/entities/ring-folk/shape.ts. The rota (four posts of six crew, two relieved at each whistle, a pure function of the
// room tick), what a first read or a stall does (snap, no whistle), the lane the walkers keep off the tarp, and which line each fact earns. The drawing (the lean, the walk, the whistle's sound) is
// the kit's and needs a browser: the look covers it.
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { RING_HALT } from '../src/sim/railway-ring-layout.ts';
import {
  CREW,
  HOOTER_UV,
  LANE_LAT,
  POSTS,
  POST_UV,
  REST_UV,
  ROTA_TICKS,
  glidingTheGap,
  linesFor,
  postsAt,
  restersAt,
  shiftAt,
  shiftChange,
  standingUV,
  stationOf,
  swamToIsland,
  walkStep,
  waypoints,
  type Facts,
  type UV,
} from '../src/entities/ring-folk/shape.ts';
import { HOOTER, RIVET, SQUINT } from '../src/entities/ring-folk/lines.ts';

const none: Facts = { joined: false, wet: false, glided: false, swam: false, rode: false, players: 1 };

test('the shift is the room tick over 450, the same for every page', () => {
  assert.equal(shiftAt(0), 0);
  assert.equal(shiftAt(ROTA_TICKS - 1), 0);
  assert.equal(shiftAt(ROTA_TICKS), 1);
  assert.equal(shiftAt(ROTA_TICKS * 7 + 12), 7);
  assert.equal(shiftAt(-5), 0);
});

test('four posts of six crew: always four distinct on, two resting, two relieved at each whistle', () => {
  assert.equal(CREW, 6);
  assert.equal(POSTS, 4);
  for (let n = 0; n < 40; n++) {
    const on = postsAt(n);
    assert.equal(new Set(on).size, 4, `shift ${n}`);
    assert.ok(on.every((c) => c >= 0 && c < CREW));
    assert.equal(restersAt(n).length, 2);
    assert.equal(new Set([...on, ...restersAt(n)]).size, CREW);
    const next = postsAt(n + 1),
      changed = next.filter((c) => !on.includes(c));
    assert.equal(changed.length, 2, `two new faces at the whistle after shift ${n}`);
    assert.equal(next.filter((c, p) => c === on[p]).length, 2, 'the other two stay where they were, on the same posts');
  }
});

test('nobody stands on shift for longer than two shifts, and everyone gets a turn', () => {
  const run = new Array<number>(CREW).fill(0);
  let worst = 0;
  const turns = new Set<number>();
  for (let n = 0; n < 60; n++) {
    for (let c = 0; c < CREW; c++) {
      run[c] = stationOf(c, n).kind === 'post' ? run[c]! + 1 : 0;
      worst = Math.max(worst, run[c]!);
      if (stationOf(c, n).kind === 'post') turns.add(c);
    }
  }
  assert.ok(worst <= 2, `longest run ${worst}`);
  assert.equal(turns.size, CREW);
});

test('the rota repeats, so a long session never drifts', () => {
  for (let n = 0; n < 12; n++) assert.deepEqual(postsAt(n + 6), postsAt(n));
});

test('a first read, a remount or a stall that skipped shifts snaps; only the next shift is whistled', () => {
  assert.equal(shiftChange(null, 4), 'snap');
  assert.equal(shiftChange(4, 4), 'none');
  assert.equal(shiftChange(4, 5), 'whistle');
  assert.equal(shiftChange(4, 6), 'snap');
  assert.equal(shiftChange(4, 3), 'snap');
});

test('the posts, rests and Hooter stand on the yard deck, clear of the tarp and the hammer', () => {
  const h0 = RING_HALT.u0 / 100;
  const tarp = { u0: h0 + 2.6, u1: h0 + 15.4, l0: 7.1, l1: 13.9 };
  const hammer = { u0: h0 + 24 - 1.2, u1: h0 + 24 + 1.2, l0: 11 - 1.2, l1: 11 + 1.2 };
  const inside = (p: UV, r: { u0: number; u1: number; l0: number; l1: number }, m = 0.6) =>
    p.u > r.u0 - m && p.u < r.u1 + m && p.lat > r.l0 - m && p.lat < r.l1 + m;
  for (const p of [...POST_UV, ...REST_UV, HOOTER_UV]) {
    assert.ok(p.lat > 5.4 && p.lat < 15, `on the deck: ${p.u},${p.lat}`);
    assert.ok(!inside(p, tarp) && !inside(p, hammer), `clear of the steel and the anvil: ${p.u},${p.lat}`);
  }
  assert.equal(POST_UV.length, POSTS);
});

test('walkers keep to the lane south of the tarp, then turn in', () => {
  const h0 = RING_HALT.u0 / 100;
  for (let from = 0; from < 2; from++)
    for (let to = 0; to < POSTS; to++) {
      const route = waypoints(REST_UV[from]!, POST_UV[to]!);
      const pts = [REST_UV[from]!, ...route];
      for (let i = 0; i + 1 < pts.length; i++) {
        const a = pts[i]!,
          b = pts[i + 1]!;
        for (let t = 0; t <= 1; t += 0.05) {
          const u = a.u + (b.u - a.u) * t,
            lat = a.lat + (b.lat - a.lat) * t;
          const inTarp = u > h0 + 2.2 && u < h0 + 15.8 && lat > 6.8 && lat < 14.3;
          assert.ok(!inTarp, `${from}->${to} crosses the tarp at ${u},${lat}`);
        }
      }
      assert.deepEqual(route.at(-1), POST_UV[to]);
    }
  // and back
  const back = waypoints(POST_UV[3]!, REST_UV[0]!);
  assert.equal(back[0]!.lat, LANE_LAT);
  assert.deepEqual(back.at(-1), REST_UV[0]);
});

test('a walker covers the route at walking pace and stops on the last point', () => {
  const p: UV = { ...REST_UV[0]! },
    route = waypoints(p, POST_UV[2]!);
  let t = 0;
  while (route.length && t < 60) {
    assert.ok(walkStep(p, route, 0.1) || !route.length);
    t += 0.1;
  }
  assert.deepEqual(p, POST_UV[2]);
  const len = Math.abs(POST_UV[2]!.u - REST_UV[0]!.u) + Math.abs(POST_UV[2]!.lat - LANE_LAT);
  assert.ok(Math.abs(t - len / 1.7) < 0.35, `${t} s for ${len} m`);
  assert.equal(walkStep(p, [], 1), false);
});

test('stations: a post is the post, a rest is a rest spot', () => {
  const s = stationOf(0, 0);
  assert.deepEqual(s, { kind: 'post', slot: 0 });
  assert.deepEqual(standingUV(s), POST_UV[0]);
  assert.deepEqual(stationOf(4, 0), { kind: 'rest', slot: 0 });
  assert.deepEqual(stationOf(5, 0), { kind: 'rest', slot: 1 });
});

test('the folk stand upright and face the shard: no lean and no tipped head in the shape or the kit (owner, 11 November)', async () => {
  const shape = await import('../src/entities/ring-folk/shape.ts');
  assert.ok(!('poseOf' in shape) && !('LEAN_UP' in shape) && !('TIP_UP' in shape), 'no stare pose exists');
  assert.equal(shape.FACE_AT.x, 1340, 'they face the shard (Ring Island\u2019s RING_SHARD, 1340, -1120)');
  assert.equal(shape.FACE_AT.z, -1120);
  const kit = await readFile(new URL('../src/place/folk.ts', import.meta.url), 'utf8');
  assert.ok(!/\btip:|g\.lean|hatGeo|\bhats\b/.test(kit), 'the kit has no head pivot, lean or separate hat');
});

test('each talker says only what the facts allow, in the table order', () => {
  assert.deepEqual(linesFor('rivet', none), [...RIVET.any]);
  assert.deepEqual(linesFor('rivet', { ...none, wet: true }), [...RIVET.any, RIVET.early]);
  assert.deepEqual(linesFor('rivet', { ...none, joined: true }), [...RIVET.any, RIVET.joined]);
  assert.deepEqual(
    linesFor('rivet', { ...none, joined: true, wet: true }),
    [...RIVET.any, RIVET.joined],
    'the early line is only for before the join',
  );
  assert.deepEqual(linesFor('squint', none), [SQUINT.any]);
  assert.deepEqual(linesFor('squint', { ...none, glided: true }), [SQUINT.any, SQUINT.glided]);
  assert.deepEqual(linesFor('squint', { ...none, swam: true }), [SQUINT.any, SQUINT.swamAcross]);
  assert.deepEqual(
    linesFor('squint', { ...none, swam: true, glided: true }),
    [SQUINT.any, SQUINT.glided],
    'swam over and never glided only',
  );
  assert.deepEqual(linesFor('squint', { ...none, rode: true }), [SQUINT.any, SQUINT.firstRide]);
  assert.deepEqual(linesFor('squint', { ...none, joined: true, players: 1 }), [SQUINT.any]);
  assert.deepEqual(linesFor('squint', { ...none, joined: true, players: 2 }), [SQUINT.any, SQUINT.coop]);
  assert.deepEqual(linesFor('squint', { ...none, players: 3 }), [SQUINT.any], 'the co-op line waits for the join');
  assert.deepEqual(linesFor('hooter', none), [...HOOTER]);
  assert.equal(HOOTER.length, 3);
});

test('the copy is the plan’s Copy table, word for word', () => {
  assert.deepEqual(
    [...RIVET.any, RIVET.joined, RIVET.early],
    [
      "Don't look at me. Look up. Thank you. Now you can look at me.",
      'We set every bolt a little wrong. Out of respect.',
      'Your railway bowed on the way in. Good manners.',
      "You're early. The railway isn't. Look up while you drip.",
    ],
  );
  assert.deepEqual(Object.values(SQUINT), [
    "I've watched the south for the whistling thing my whole life. Also I watched you.",
    'You fell out of the sky.',
    'I watched you swim the whole way. Very slowly. Very bravely.',
    "It was bigger in the picture. It's fine. Pictures are always bigger.",
    'Two of you? The picture only had one box.',
  ]);
  assert.deepEqual([...HOOTER], ['Shift change! Eyes up!', 'Nobody blink!', 'Shift change! Same eyes.']);
});

test('swimming to the island and gliding the gap are told apart by place', () => {
  assert.equal(swamToIsland({ u: 300, lat: 5 }), true);
  assert.equal(swamToIsland({ u: 20, lat: 5 }), false, 'the pier end of the line');
  assert.equal(swamToIsland({ u: 300, lat: 400 }), false, 'a different sea');
  assert.equal(glidingTheGap({ u: 270, lat: 0 }), true);
  assert.equal(glidingTheGap({ u: 100, lat: 0 }), false);
});
