// The crossing's finale is heard where the twelfth footing is set (the owner's playtest, 10 November 2026: all twelve
// pier footings set, "never got the rockets"). The whistle plays at the last bent, about 121 m out to sea; the
// machine sounds' 45 m range left it silent on the whole pier.
import test from 'node:test';
import assert from 'node:assert/strict';
import { hearGain, MACHINE_HEAR } from '../src/render/hearing.ts';
import { SHOW_AT, SHOW_FROM_PIER, SHOW_HEAR } from '../src/entities/railway/crossing-show.ts';
import { CROSSING_BENTS, PIER_FRAME, PIER_RACK, PIER_STOP } from '../src/sim/railway-works-layout.ts';

const from = (p: { x: number; z: number }) => Math.hypot(SHOW_AT.x - p.x / 100, SHOW_AT.z - p.z / 100);

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
