// The cab cutaway's "inside" test (src/entities/railway/engine.ts, inEngineCab; drawn by train-view.ts cutCab).
// Owner, 14 November: jumping close to the cab, not in it, took its roof off. The old test also counted a box 0.7 m
// out from each doorway, from 0.35 m under the step to 0.5 m over the floor: the halt deck beside the door was in it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { PLAYER_R } from '../src/constants.ts';
import { CAB_KEEP, ENGINE, ENGINE_CAB as c, inEngineCab } from '../src/entities/railway/engine.ts';
import spec from '../assets/src/engine.json' with { type: 'json' };

const haltDeck = spec.cab.haltDeck * spec.scale,
  doorMid = (c.door.z[0] + c.door.z[1]) / 2,
  cabMid = (c.zBack + c.zFront) / 2,
  touching = c.hx + PLAYER_R; // a body against the outside of a side wall

test('standing or jumping beside the cab, on the platform at its doorway, is out', () => {
  for (const side of [-1, 1])
    for (const out of [0, 0.1, 0.25, 0.7])
      for (let up = 0; up <= 2.6; up += 0.1) {
        assert.equal(inEngineCab(side * (touching + out), haltDeck + up, doorMid), false, `out ${out}, up ${up}`);
        assert.equal(inEngineCab(side * (touching + out), haltDeck + up, doorMid, true), false, `kept: ${out}, ${up}`);
      }
});

test('on the step, half through the doorway, is out until the middle is past the wall', () => {
  assert.equal(inEngineCab(c.hx + 0.1, c.step, doorMid), false);
  assert.equal(inEngineCab(c.hx - c.wall + 0.01, c.floor, doorMid), false);
  assert.equal(inEngineCab(c.hx - c.wall - 0.01, c.floor, doorMid), true);
});

test('inside the cab, standing and at the top of a jump under the roof, is in', () => {
  for (const [x, z] of [
    [0, cabMid],
    [c.hx - c.wall - PLAYER_R, c.zBack + c.wall + PLAYER_R],
    [-(c.hx - c.wall - PLAYER_R), c.zFront - c.wall - PLAYER_R],
  ] as const) {
    assert.equal(inEngineCab(x, c.floor, z), true);
    assert.equal(inEngineCab(x, c.floor + 0.2, z), true);
  }
});

test('on the roof, over it, on the coupling, the next car and the footplate ahead are out', () => {
  assert.equal(inEngineCab(0, c.roofTop, cabMid), false);
  assert.equal(inEngineCab(0, c.roofTop + 1, cabMid), false);
  assert.equal(inEngineCab(0, c.roofTop, cabMid, true), false);
  assert.equal(inEngineCab(0, c.floor, -ENGINE.hz - 0.3), false); // the coupling
  assert.equal(inEngineCab(0, c.floor + 0.9, c.zBack - PLAYER_R), false); // jumping in from the next car
  assert.equal(inEngineCab(0, c.floor, c.zFront + PLAYER_R), false);
  assert.equal(inEngineCab(0, 0, cabMid), false); // on the ground under it
});

test('a step back into the doorway keeps it, a step off the train lets it go', () => {
  const x = c.hx - c.wall + CAB_KEEP - 0.01;
  assert.equal(inEngineCab(x, c.floor, doorMid), false);
  assert.equal(inEngineCab(x, c.floor, doorMid, true), true);
  assert.equal(inEngineCab(x, c.step, doorMid, true), true);
  assert.equal(inEngineCab(x + 0.02, c.step, doorMid, true), false);
  assert.ok(c.hx - c.wall + CAB_KEEP < touching, 'the kept band ends short of a body standing outside the wall');
});

test('on a curve and a grade the test follows the car, not the world axes', () => {
  // The car at (40, 12, -7), yawed 50° and pitched 4° (train-view.ts hands the test the inverse of this pose).
  const yaw = (50 * Math.PI) / 180,
    pitch = (4 * Math.PI) / 180;
  const toWorld = (x: number, y: number, z: number) => {
    const y1 = y * Math.cos(pitch) - z * Math.sin(pitch),
      z1 = y * Math.sin(pitch) + z * Math.cos(pitch);
    return [40 + x * Math.cos(yaw) + z1 * Math.sin(yaw), 12 + y1, -7 - x * Math.sin(yaw) + z1 * Math.cos(yaw)] as const;
  };
  const toCar = (wx: number, wy: number, wz: number) => {
    const dx = wx - 40,
      dy = wy - 12,
      dz = wz + 7;
    const x = dx * Math.cos(yaw) - dz * Math.sin(yaw),
      z1 = dx * Math.sin(yaw) + dz * Math.cos(yaw);
    return [x, dy * Math.cos(pitch) + z1 * Math.sin(pitch), -dy * Math.sin(pitch) + z1 * Math.cos(pitch)] as const;
  };
  const at = (x: number, y: number, z: number) => {
    const [lx, ly, lz] = toCar(...toWorld(x, y, z));
    return inEngineCab(lx, ly, lz);
  };
  assert.equal(at(0, c.floor, cabMid), true);
  assert.equal(at(touching, haltDeck + 0.5, doorMid), false);
  assert.equal(at(0, c.roofTop, cabMid), false);
  // 1.1 m along the world x and z from the cab middle is through the yawed cab side wall, though a box on the world axes
  // round the cab would hold it.
  const [wx, wy, wz] = toWorld(0, c.floor, cabMid);
  const [lx, ly, lz] = toCar(wx + 1.1, wy, wz + 1.1);
  assert.equal(inEngineCab(lx, ly, lz), false);
});
