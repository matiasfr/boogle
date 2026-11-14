// Far Head's shot is valid where the line runs today (the owner's report, 14 November 2026: "For Act 2, the cinematic
// didn't do the aerial camera pan"). The cause was the seat (dev/look/evals/far-head-seated.ts holds that), but a path
// authored against a moved layout would fail the same way for the player: this holds the points to the land as built.
import test from 'node:test';
import assert from 'node:assert/strict';
import { H } from '../src/place/terrain.ts';
import { SEA } from '../src/constants.ts';
import {
  FAR_HEAD_S,
  FAR_HEAD_SHOT,
  alongFarHead,
  farHeadEnd,
  farHeadShot,
} from '../src/entities/railway/far-head-show.ts';

type Point = { x: number; y: number; z: number };
const mix = (a: Point, b: Point, u: number): Point => ({
  x: a.x + (b.x - a.x) * u,
  y: a.y + (b.y - a.y) * u,
  z: a.z + (b.z - a.z) * u,
});
const floor = (p: Point) => Math.max(H(p.x, p.z), SEA);
const far = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

test('Far Head’s shot travels: a real move, for a few seconds, looking somewhere else than where it stands', () => {
  const { from, to, at, seconds } = farHeadShot();
  for (const p of [from, to, at]) assert.ok([p.x, p.y, p.z].every(Number.isFinite), JSON.stringify(p));
  assert.ok(seconds >= 4 && seconds <= 7, `${seconds} s`);
  assert.ok(far(from, to) > 8, `the camera moves ${far(from, to).toFixed(1)} m`);
  assert.ok(far(from, at) > 40 && far(to, at) > 40, 'the aim is well ahead of the camera');
});

test('the camera stays in the open air all the way: over the land and the sea, beside the trestle’s deck', () => {
  const { from, to } = farHeadShot();
  for (let k = 0; k <= 10; k++) {
    const p = mix(from, to, k / 10);
    assert.ok(p.y > floor(p) + 5, `${(p.y - floor(p)).toFixed(1)} m over the ground at ${k / 10}`);
  }
  // Beside the deck, not over it, and well above the rail: the trestle never fills the frame.
  for (const p of [FAR_HEAD_SHOT.from, FAR_HEAD_SHOT.to]) assert.ok(p.side > 10 && p.up > 15);
});

test('the shot looks down the trestle to the rail’s end, with nothing but air between', () => {
  const { from, to, at } = farHeadShot();
  const end = farHeadEnd();
  assert.deepEqual(end, alongFarHead(FAR_HEAD_S, 0, 0));
  // The aim is straight over the rail's end, where the rockets burst (24 to 40 m up from 6 m over the rail).
  assert.ok(Math.abs(at.x - end.x) < 1e-9 && Math.abs(at.z - end.z) < 1e-9 && at.y > end.y + 20 && at.y < end.y + 46);
  // The shot starts back along the line from the end and ends further back still (it drifts out).
  assert.ok(FAR_HEAD_SHOT.from.s < FAR_HEAD_S && FAR_HEAD_SHOT.to.s < FAR_HEAD_SHOT.from.s);
  // The sight line to the rail's end clears the land from both ends of the move.
  for (const eye of [from, to])
    for (let k = 1; k < 20; k++) {
      const p = mix(eye, { ...end, y: end.y + 2 }, k / 20);
      assert.ok(p.y > floor(p) + 0.5, `the land hides the rail's end ${k / 20} of the way`);
    }
});
