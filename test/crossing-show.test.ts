// The crossing's finale is heard where the twelfth footing is set (the owner's playtest, 10 November 2026: all twelve
// pier footings set, "never got the rockets"). The whistle plays at the last bent, about 121 m out to sea; the
// machine sounds' 45 m range left it silent on the whole pier.
import test from 'node:test';
import assert from 'node:assert/strict';
import { hearGain, MACHINE_HEAR } from '../src/render/hearing.ts';
import {
  CROSSING_SPAN,
  FINALE_ROCKETS,
  FINALE_SHOT,
  RING_SHARD,
  SHOW_AT,
  SHOW_FROM_PIER,
  SHOW_HEAR,
  onCrossing,
  towardRing,
} from '../src/entities/railway/crossing-show.ts';
import { CROSSING_BENTS, CROSSING_DECK_Y, PIER_FRAME, PIER_RACK, PIER_STOP } from '../src/sim/railway-works-layout.ts';

const from = (p: { x: number; z: number }) => Math.hypot(SHOW_AT.x - p.x / 100, SHOW_AT.z - p.z / 100);
const along = { x: onCrossing(1, 0, 0).x - onCrossing(0, 0, 0).x, z: onCrossing(1, 0, 0).z - onCrossing(0, 0, 0).z };

test('the finale plays at the last bent, beyond the machine sounds’ range from anywhere on the pier', () => {
  assert.deepEqual(SHOW_AT, { x: CROSSING_BENTS.at(-1)!.x / 100, z: CROSSING_BENTS.at(-1)!.z / 100 });
  assert.ok(SHOW_FROM_PIER > 115 && SHOW_FROM_PIER < 125, `${SHOW_FROM_PIER} m from the jib`);
  // The bug: with the default range nobody where footings are set or racked hears it.
  for (const p of [PIER_FRAME, PIER_RACK, PIER_STOP]) assert.equal(hearGain(from(p), MACHINE_HEAR), 0);
});

test('the finale whistle is heard at about half its gain where the twelfth footing is set, and on the halt', () => {
  assert.ok(Math.abs(hearGain(from(PIER_FRAME), SHOW_HEAR) - 0.51) < 0.01);
  // machine-sfx drops a sound under 0.003 of gain; the whistle's own gain is 0.18 at 0 dB.
  for (const p of [PIER_FRAME, PIER_RACK, PIER_STOP])
    assert.ok(0.18 * hearGain(from(p), SHOW_HEAR) > 0.06, `${from(p)} m`);
});

test('the finale shot travels the bents and ends on Ring Island, with the far end and the shard in frame', async () => {
  const { FAR, ORIGIN } = await import('../src/place/layout.ts');
  assert.deepEqual(RING_SHARD, { x: FAR.x + ORIGIN.x + 10, y: 140, z: FAR.z + ORIGIN.z });
  const { from: start, to, at, seconds } = FINALE_SHOT;
  assert.ok(seconds >= 6 && seconds <= 8);
  // Along the bents, from before the first to short of the last.
  const o = onCrossing(0, 0, 0);
  const s = (p: { x: number; z: number }) => (p.x - o.x) * along.x + (p.z - o.z) * along.z;
  assert.ok(s(start) < 0 && s(to) > CROSSING_SPAN * 0.7 && s(to) < CROSSING_SPAN);
  // From the shot's end, the shard and the last bent's deck sit inside the 62° vertical view around the aim.
  const pitch = (p: { x: number; y: number; z: number }) =>
    (Math.atan2(p.y - to.y, Math.hypot(p.x - to.x, p.z - to.z)) * 180) / Math.PI;
  const aim = pitch(at);
  // The last bent's deck is 20.3 m up, on the bow (CROSSING_DECK_Y); the shot ends above it, looking out over it.
  const deck = CROSSING_DECK_Y.at(-1)! / 100;
  assert.ok(to.y > deck + 3, `the shot ends ${(to.y - deck).toFixed(1)} m over the last deck`);
  for (const p of [RING_SHARD, onCrossing(CROSSING_SPAN, 0, deck)])
    assert.ok(Math.abs(pitch(p) - aim) < 28, `${pitch(p).toFixed(1)}° against ${aim.toFixed(1)}°`);
});

test('ten rockets launch past the last bent and lean toward Ring Island', () => {
  assert.equal(FINALE_ROCKETS.count, 10);
  const r = towardRing();
  assert.ok(Math.abs(Math.hypot(r.x, r.z) - 1) < 1e-9);
  assert.ok(r.x * along.x + r.z * along.z > 0.95, 'the island lies on along the bents');
  assert.ok(FINALE_ROCKETS.beyond[0] > 0 && FINALE_ROCKETS.lean > 0);
  // The last launch bursts (0.9 s after it) before the shot blends home (0.55 s from its end).
  const last = FINALE_ROCKETS.first + (FINALE_ROCKETS.count - 1) * FINALE_ROCKETS.gap + 0.9;
  assert.ok(last < FINALE_SHOT.seconds - 0.55, `${last} s`);
});
