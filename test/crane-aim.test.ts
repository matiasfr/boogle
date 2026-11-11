// The crane's look-at keeps Buddy where we want him on screen (src/render/crane-aim.ts), checked with the numbers the
// look measured on HOTBOX: the follow camera 5.9 m behind Buddy, the apex 11.6 m out at 38 degrees (960x600) and 13.7 m
// out at 53 degrees (390x844), and the camera's fixed vertical field of view of 62 degrees.
import test from 'node:test';
import assert from 'node:assert/strict';
import { craneAim, ndcYOf, type Pt } from '../src/render/crane-aim.ts';

const FOV = 62;
const buddy: Pt = { x: 0, y: 1, z: 0 };
const at = (distance: number, pitchDeg: number): Pt => {
  const p = (pitchDeg * Math.PI) / 180;
  return { x: 0, y: buddy.y + distance * Math.sin(p), z: distance * Math.cos(p) }; // behind Buddy, looking toward -z
};

test('the aim puts Buddy exactly where asked, at any distance, pitch and target', () => {
  for (const [d, pitch] of [
    [5.9, 11],
    [11.6, 38],
    [13.7, 53],
    [14, 29],
    [15, 40],
  ] as const)
    for (const want of [-0.17, 0, 0.3]) {
      const cam = at(d, pitch);
      const aim = craneAim(cam, buddy, FOV, want, 10, { x: 0, y: 0, z: 0 });
      assert.ok(Math.abs(ndcYOf(cam, aim, buddy, FOV) - want) < 1e-9, `${d} m at ${pitch} degrees, ${want}`);
    }
});

test('at the measured apex poses Buddy is inside the middle third (|y| <= 0.2) at 960x600 and 390x844', () => {
  for (const cam of [at(11.6, 38), at(13.7, 53)]) {
    const aim = craneAim(cam, buddy, FOV, -0.17, 10, { x: 0, y: 0, z: 0 });
    assert.ok(Math.abs(ndcYOf(cam, aim, buddy, FOV)) <= 0.2);
  }
});

test('along the real 4.8 s schedule Buddy stays within 0.27 of the middle and inside the middle third at the top', () => {
  // As camera-pull-out.ts does it: weight eases in and out over 1.8 s; the camera rises by the lift times sin(pi t/T)
  // times weight; the follow camera's own aim point stays where it is while the crane's is found from the camera's real
  // position at the same distance, and the two are blended by weight. Buddy is at -0.24 in the follow camera (measured).
  const ease = (u: number) => u * u * (3 - 2 * u);
  const clamp01 = (u: number) => Math.min(1, Math.max(0, u));
  const follow = at(5.9, 11);
  const own = craneAim(follow, buddy, FOV, -0.24, 10, { x: 0, y: 0, z: 0 });
  for (const lift of [
    { back: 6.3, up: 5.7 }, // wide, 960x600
    { back: 5.6, up: 8.5 }, // tall, 390x844
  ]) {
    let top = 0;
    for (let t = 0; t <= 4.8001; t += 0.05) {
      const w = ease(clamp01(t / 1.8)) * (1 - ease(clamp01((t - 3) / 1.8)));
      const rise = Math.sin((Math.PI * t) / 4.8) * w;
      const cam = { x: 0, y: follow.y + lift.up * rise, z: follow.z + lift.back * rise };
      const away = Math.hypot(own.x - cam.x, own.y - cam.y, own.z - cam.z);
      const want = craneAim(cam, buddy, FOV, -0.17, away, { x: 0, y: 0, z: 0 });
      const aim = {
        x: own.x + (want.x - own.x) * w,
        y: own.y + (want.y - own.y) * w,
        z: own.z + (want.z - own.z) * w,
      };
      const y = ndcYOf(cam, aim, buddy, FOV);
      assert.ok(Math.abs(y) <= 0.27, `t ${t.toFixed(2)}: ${y}`);
      if (w > 0.95) top = Math.max(top, Math.abs(y));
    }
    assert.ok(top <= 0.2, `at the top: ${top}`);
  }
});
