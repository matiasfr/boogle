// R4d, the Meet and the first crossing (docs/plans/ring-island-build1.md, step 4d): the pure decisions in
// src/entities/ring-meet/shape.ts. The Meet is offered by an accepted rivet and never by a restore; a page that joins
// after the join plays no shot and is owed the Meet's framing on its first ride over the joint; a player who saw the
// Meet gets the 5 s pull-out there, once; the rivet's prompt and glint windows. The camera shot itself (uninterruptible
// but for the one skip) is createCameraPullOut's and needs a browser: the two-page look covers it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RING_END, RING_FORMATION, RING_HALT, RING_RIVET, ringAt, ringDeckY } from '../src/sim/railway-ring-layout.ts';
import { createLeafMotion, leafLanded, SWING_S } from '../src/entities/railway/leaf-shape.ts';
import { aperture } from '../src/sim/railway-rows.ts';
import { railwayAtRing } from '../src/sim/railway-seed-ring.ts';
import {
  CROSSING_SHOT,
  JOINT_U,
  MEET_REPLAY,
  MEET_SHOT,
  crossedJoint,
  crossingShot,
  glintShown,
  peakSpeed,
  meetKept,
  meetOffered,
  ringUV,
  strikeOffered,
} from '../src/entities/ring-meet/shape.ts';

test("the joint is the rivet's u, and ringUV inverts ringAt", () => {
  const p = ringAt(JOINT_U, RING_FORMATION.mid);
  assert.deepEqual(p, { x: RING_RIVET.x, z: RING_RIVET.z });
  for (const [u, lat] of [
    [0, 0],
    [JOINT_U, -200],
    [45000, 300],
  ] as const) {
    const w = ringAt(u, lat),
      r = ringUV(w.x / 100, w.z / 100);
    assert.ok(Math.abs(r.u - u) < 2 && Math.abs(r.lat - lat) < 2, `${u},${lat} -> ${r.u},${r.lat}`);
  }
});

test('the Meet is offered by an accepted rivet only', () => {
  assert.equal(meetOffered({ op: 'rail.strike', id: 2, accepted: 1 }), true);
  assert.equal(meetOffered({ op: 'rail.strike', id: 2, accepted: 0 }), false, 'a strike that moved nothing');
  assert.equal(meetOffered({ op: 'rail.strike', id: 0, accepted: 1 }), false, 'the stall slab');
  assert.equal(meetOffered({ op: 'rail.strike', id: 1, accepted: 1 }), false, 'the throat');
  assert.equal(meetOffered({ op: 'rail.brace', accepted: 1 }), false);
});

test('a refused prediction takes the shot back unless the rivet is struck anyway (a same-moment race)', () => {
  assert.equal(meetKept(false), false);
  assert.equal(meetKept(true), true);
});

test('the joint is crossed toward the island once, from the mainland side', () => {
  assert.equal(crossedJoint(null, JOINT_U + 5), false, 'first frame of the ride');
  assert.equal(crossedJoint(JOINT_U - 0.1, JOINT_U), true);
  assert.equal(crossedJoint(JOINT_U + 1, JOINT_U + 2), false, 'already past');
  assert.equal(crossedJoint(JOINT_U + 1, JOINT_U - 1), false, 'riding home');
});

test('a crossing earns the pull-out if you saw the Meet, the Meet framing if you missed it, and then never again', () => {
  const base = { joined: true, riding: true, crossed: true, pulledOut: false, sawMeet: true };
  assert.equal(crossingShot(base), 'pull-out');
  assert.equal(crossingShot({ ...base, sawMeet: false }), 'meet', 'a late joiner');
  assert.equal(crossingShot({ ...base, pulledOut: true }), null);
  assert.equal(crossingShot({ ...base, sawMeet: false, pulledOut: true }), null);
  assert.equal(crossingShot({ ...base, joined: false }), null, 'before the rivet');
  assert.equal(crossingShot({ ...base, riding: false }), null, 'on foot');
  assert.equal(crossingShot({ ...base, crossed: false }), null);
});

test('a page that joins after the join: the seed is joined, nothing is offered, the first crossing gets the framing', () => {
  const a = aperture(railwayAtRing('ring-joined').w);
  assert.ok(a.joined >= 0);
  // Nothing in a restore is an accepted rivet: there is no event to offer.
  assert.equal(meetOffered({ op: 'rail.wake', accepted: 1 }), false);
  assert.equal(
    crossingShot({ joined: a.joined >= 0, riding: true, crossed: true, pulledOut: false, sawMeet: false }),
    'meet',
  );
});

test('the strike prompt: the leaf down, the rivet unstruck, the room has the breaker, no boiler on the shoulders', () => {
  const ok = { breaker: 2, brace: 0, joined: -1, hauling: false, landed: true };
  assert.equal(strikeOffered({ ...ok, landed: false }), false, 'brace is 0 but the plate has not landed');
  assert.equal(strikeOffered(ok), true);
  assert.equal(strikeOffered({ ...ok, brace: 1 }), false, 'leaf raised');
  assert.equal(strikeOffered({ ...ok, brace: 2 }), false, 'braced, not down');
  assert.equal(strikeOffered({ ...ok, joined: 100 }), false, 'struck');
  assert.equal(strikeOffered({ ...ok, breaker: 1 }), false, 'breaker on its pedestal');
  assert.equal(strikeOffered({ ...ok, hauling: true }), false);
  for (const seed of ['leaf-raised', 'ring-joined'] as const) {
    const a = aperture(railwayAtRing(seed).w);
    assert.equal(
      strikeOffered({ breaker: 2, brace: a.brace, joined: a.joined, hauling: false, landed: true }),
      false,
      seed,
    );
  }
});

test('the glint runs from the leaf down until the rivet is struck', () => {
  assert.equal(glintShown(1, -1, true), false);
  assert.equal(glintShown(2, -1, true), false);
  assert.equal(glintShown(0, -1, true), true);
  assert.equal(glintShown(0, -1, false), false, 'the sim flips brace to 0 as the swing starts');
  assert.equal(glintShown(0, 50, true), false);
});

test("the shots: the Meet is 6 s along the joined line to the halt's board; the late framing and the crossing are 5 s", () => {
  assert.equal(MEET_SHOT.seconds, 6);
  assert.equal(MEET_REPLAY.seconds, 5);
  assert.deepEqual({ ...MEET_REPLAY.from }, { ...MEET_SHOT.from }, 'the same start');
  assert.deepEqual(MEET_REPLAY.at, MEET_SHOT.at);
  assert.equal(CROSSING_SHOT.seconds, 5);
  const metres = (v: { x: number; z: number }) => ringUV(v.x, v.z);
  assert.ok(metres(MEET_SHOT.from).u < JOINT_U - 800, 'starts back along the bents, before the leaf');
  assert.ok(
    metres(MEET_SHOT.to).u > JOINT_U + 4000 && metres(MEET_SHOT.to).u < RING_HALT.u0,
    'runs on over the leaf toward the halt',
  );
  assert.ok(
    Math.abs(MEET_SHOT.at.x * 100 - RING_END.board.x) < 1 && Math.abs(MEET_SHOT.at.z * 100 - RING_END.board.z) < 1,
  );
  assert.ok(MEET_SHOT.from.y > ringDeckY(24700) / 100 + 4, 'above the deck');
  assert.ok(Math.abs(metres(CROSSING_SHOT.at).u - JOINT_U) < 2, 'the crossing looks at the joint');
});

test('the gate waits for the visible landing: offered only after the swing ends, never during it', () => {
  const m = createLeafMotion();
  m.aim(0); // brace flips to 0 here in the sim
  let offeredDuring = 0,
    t = 0;
  for (; t < SWING_S - 0.01; t += 1 / 60) {
    m.step(1 / 60);
    if (leafLanded(m.deg, m.moving)) offeredDuring++;
  }
  assert.equal(offeredDuring, 0, 'not while the plate is tilted, even though brace is 0');
  for (; t < SWING_S + 0.1; t += 1 / 60) m.step(1 / 60);
  assert.equal(leafLanded(m.deg, m.moving), true);
  assert.equal(leafLanded(78, false), false, 'raised');
  const joinedLate = createLeafMotion();
  joinedLate.snap(0);
  assert.equal(leafLanded(joinedLate.deg, joinedLate.moving), true, 'a page that joins after: flat at once');
});

test('the shots never move the camera faster than 25 m/s at their peak, and hold on the rivet first and the board last', () => {
  for (const s of [MEET_SHOT, MEET_REPLAY, CROSSING_SHOT]) assert.ok(peakSpeed(s) <= 25, `${peakSpeed(s)}`);
  assert.equal(MEET_SHOT.lead, 1, 'a second on the rivet before it travels');
  assert.ok(
    MEET_SHOT.seconds - MEET_SHOT.lead - MEET_SHOT.drift >= 1.5 - 1e-9,
    'a second and a half held on the board',
  );
  assert.equal(MEET_SHOT.cutIn && MEET_REPLAY.cutIn, true, 'opens with a cut, not a blend through the train');
  assert.equal(CROSSING_SHOT.cutIn, false, 'the first-crossing pull-out blends from the rider');
  assert.ok(MEET_REPLAY.seconds - MEET_REPLAY.lead - MEET_REPLAY.drift >= 1.2 - 1e-9);
  assert.ok(MEET_SHOT.back < 0.2, 'the hand-back is a deliberate cut');
  assert.ok(
    MEET_SHOT.atFrom && Math.abs(ringUV(MEET_SHOT.atFrom.x, MEET_SHOT.atFrom.z).u - JOINT_U) < 2,
    'looks at the stud first',
  );
});

test('the end frame is a close cut on the RINGWORKS board, east platform u 448 m lat +5, with the buffers down the line', () => {
  const end = MEET_SHOT.end!;
  assert.ok(end, 'the Meet ends on a held frame');
  assert.deepEqual(MEET_REPLAY.end, end);
  assert.equal(CROSSING_SHOT.end, null);
  const board = ringAt(44800, 500),
    d = Math.hypot(end.pos.x - board.x / 100, end.pos.z - board.z / 100);
  assert.ok(d > 8 && d < 18, `${d} m from the board: close enough to read it at 960`);
  const cam = ringUV(end.pos.x, end.pos.z);
  assert.ok(cam.u < 44800 - 1000 && cam.u > RING_HALT.u0, 'on the halt, short of the board, facing down the line');
});
