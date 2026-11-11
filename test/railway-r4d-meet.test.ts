// R4d, the Meet and the first crossing (docs/plans/ring-island-build1.md, step 4d): the pure decisions in
// src/entities/ring-meet/shape.ts. The Meet is offered by an accepted rivet and never by a restore; a page that joins
// after the join plays no shot and is owed the Meet's framing on its first ride over the joint; a player who saw the
// Meet gets the 5 s pull-out there, once; the rivet's prompt and glint windows. The camera shot itself (uninterruptible
// but for the one skip) is createCameraPullOut's and needs a browser: the two-page look covers it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RING_END, RING_FORMATION, RING_HALT, RING_RIVET, ringAt, ringDeckY } from '../src/sim/railway-ring-layout.ts';
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

test('the strike prompt: the leaf down, the rivet unstruck, the breaker in hand, no boiler on the shoulders', () => {
  const ok = { breaker: 2, brace: 0, joined: -1, hauling: false };
  assert.equal(strikeOffered(ok), true);
  assert.equal(strikeOffered({ ...ok, brace: 1 }), false, 'leaf raised');
  assert.equal(strikeOffered({ ...ok, brace: 2 }), false, 'braced, not down');
  assert.equal(strikeOffered({ ...ok, joined: 100 }), false, 'struck');
  assert.equal(strikeOffered({ ...ok, breaker: 1 }), false, 'breaker on its pedestal');
  assert.equal(strikeOffered({ ...ok, hauling: true }), false);
  for (const seed of ['leaf-raised', 'ring-joined'] as const) {
    const a = aperture(railwayAtRing(seed).w);
    assert.equal(strikeOffered({ breaker: 2, brace: a.brace, joined: a.joined, hauling: false }), false, seed);
  }
});

test('the glint runs from the leaf down until the rivet is struck', () => {
  assert.equal(glintShown(1, -1), false);
  assert.equal(glintShown(2, -1), false);
  assert.equal(glintShown(0, -1), true);
  assert.equal(glintShown(0, 50), false);
});

test("the shots: the Meet is 6 s along the joined line to the halt's board; the late framing and the crossing are 5 s", () => {
  assert.equal(MEET_SHOT.seconds, 6);
  assert.equal(MEET_REPLAY.seconds, 5);
  assert.deepEqual({ ...MEET_REPLAY, seconds: 6 }, MEET_SHOT, 'the same framing');
  assert.equal(CROSSING_SHOT.seconds, 5);
  const metres = (v: { x: number; z: number }) => ringUV(v.x, v.z);
  assert.ok(metres(MEET_SHOT.from).u < JOINT_U - 2000, 'starts back along the bents, before the leaf');
  assert.ok(metres(MEET_SHOT.to).u > RING_HALT.u0 - 3000 && metres(MEET_SHOT.to).u < RING_HALT.u0, 'runs to the halt');
  assert.ok(
    Math.abs(MEET_SHOT.at.x * 100 - RING_END.board.x) < 1 && Math.abs(MEET_SHOT.at.z * 100 - RING_END.board.z) < 1,
  );
  assert.ok(MEET_SHOT.from.y > ringDeckY(22500) / 100 + 5, 'above the deck');
  assert.ok(Math.abs(metres(CROSSING_SHOT.at).u - JOINT_U) < 2, 'the crossing looks at the joint');
});
