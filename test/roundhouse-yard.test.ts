// Home's yard at the Roundhouse, as geometry (review of the 14 November yard tidy): the stall shunter and its wagon
// stand on the rail heads, clear of the ground and the rails, everywhere the shunt takes them; and the garage's jib
// arm stays over a boiler held up for the server's answer, with the garage's furniture standing on the yard's ground.
import test from 'node:test';
import assert from 'node:assert/strict';
import { H } from '../src/place/terrain.ts';
import { LINES, ORIGIN, railY } from '../src/place/layout.ts';
import { BUFFERS, STALLS, TABLE, roadAt, stallFrame } from '../src/place/home-station.ts';
import { RAIL_HEAD, SHUNT, STALL_RAIL, stallRoadY } from '../src/entities/railway/works-shape.ts';
import { PARK, createShuntPath } from '../src/entities/railway/shunt-path.ts';
import { layHomeYard } from '../src/entities/railway/home-yard.ts';
import * as THREE from 'three/webgpu';
import { garageRow, mastFrom, polarAt } from '../src/entities/railway/garage-geo.ts';
import { MOMENT } from '../src/entities/railway/garage-data.ts';
import { ENGINE_BOILER } from '../src/entities/railway/engine.ts';
import { WAGON_S } from '../src/sim/railway-works-layout.ts';
import { sourceFunction } from '../dev/level/source.ts';

const deck = railY(LINES.east, 0);
const ground = (p: { x: number; z: number }) => H(p.x + ORIGIN.x, p.z);

/** The rail height the yard's track is drawn at under a world point (./home-station-view.ts and the lines): the deck
 * on the table, `stallRoadY` along the open stall's road, the line's own on road 2, the deck's along the spur. Not
 * the path's own numbers: what the vehicles are compared with. */
function drawnRail(x: number, z: number) {
  const lx = x - ORIGIN.x - TABLE.x,
    lz = z - TABLE.z;
  if (Math.hypot(lx, lz) <= TABLE.r) return deck;
  const stall = stallFrame(STALLS.open);
  const r = lx * stall.u.x + lz * stall.u.z,
    off = Math.abs(lx * stall.u.z - lz * stall.u.x);
  if (r > 0 && off < 1.6) return stallRoadY(r - TABLE.r, deck);
  let best = Infinity,
    at = 0;
  for (let s = BUFFERS[1] - 2; s <= WAGON_S / 100 + 8; s += 0.25) {
    const q = roadAt(1, s),
      far = Math.hypot(q.x + ORIGIN.x - x, q.z - z);
    if (far < best) [best, at] = [far, s];
  }
  return best < 1.6 ? railY(LINES.east, Math.max(0, at)) : deck;
}
/** The ground a vehicle must clear at a world point: the terrain, or the table's disc (0.02 over the deck's height). */
const under = (x: number, z: number) =>
  Math.hypot(x - ORIGIN.x - TABLE.x, z - TABLE.z) <= TABLE.r ? deck + 0.02 : H(x, z);

test('the stall road ramps from the deck to ground-level rails at the door', () => {
  assert.equal(stallRoadY(0, deck), deck);
  assert.equal(stallRoadY(STALLS.door - TABLE.r, deck), STALL_RAIL);
  assert.equal(stallRoadY(STALLS.door + STALLS.depth - TABLE.r, deck), STALL_RAIL);
  // Its sleepers (0.02 under the rail height) lie on the yard, not in it and not a hand over it.
  const stall = stallFrame(STALLS.open);
  for (const p of [stall.door, stall.centre, stall.back]) {
    const over = STALL_RAIL - 0.02 - ground(p);
    assert.ok(over >= 0 && over < 0.1, `sleeper base ${over.toFixed(3)} m over the ground`);
  }
});

test('every wheel stands on the rail head drawn under it, and the slabs clear rails and ground, along the whole shunt', () => {
  const path = createShuntPath();
  // The rails the station lays (./home-yard.ts, the matrices it draws): the top of the laid rail under a world point,
  // if one lies there (a kit rail is 3.05 m along its own z, its head 0.038 m either side, 0.135 m over its foot).
  const laid = layHomeYard(H)
    .rails()
    .map((m) => ({ m, inv: m.clone().invert() }));
  assert.ok(laid.length > 40);
  const local = new THREE.Vector3();
  const laidTop = (x: number, z: number, y: number) => {
    for (const { m, inv } of laid) {
      local.set(x, y, z).applyMatrix4(inv);
      if (Math.abs(local.z) > 3.05 / 2 || Math.abs(local.x) > 0.125 + 0.038 || Math.abs(local.y) > 0.6) continue;
      return local.set(local.x, 0.135, local.z).applyMatrix4(m).y;
    }
    return null;
  };
  let onLaid = 0,
    offLaid = 0;
  const seated = path.TABLE_A + PARK.gap / 2;
  // The wagon's distance and the deck's turn through the roll-out, every 5 cm: out of the stall and onto the deck, the
  // deck's turn with both aboard, then down the spur, back to road 2's buffer stub and out to the wait. The shunter is
  // `PARK.gap` behind throughout; its way home alone retraces the same poses.
  const steps: [a: number, deckK: number | null][] = [];
  for (let a = path.PARKED_A; a < seated; a += 0.05) steps.push([a, null], [a, 0]);
  for (let k = 0; k <= 1.0001; k += 0.02) steps.push([seated, k]);
  for (let a = seated + 1e-6; a <= path.OUT_A; a += 0.05) steps.push([a, 1]);
  steps.push([path.OUT_A, 1]);
  assert.ok(steps.length > 800, `${steps.length} steps`);
  let steepest = 0,
    highest = -Infinity,
    deepest = Infinity,
    nearest = Infinity,
    ends = [Infinity, -Infinity];
  for (const [name, v, shunter] of [
    ['wagon', SHUNT.wagon, false],
    ['shunter', SHUNT.shunter, true],
  ] as const)
    for (const [a, deckK] of steps) {
      const pose = path.poseAt(shunter ? a - PARK.gap : a, shunter, deckK);
      steepest = Math.max(steepest, Math.abs(pose.pitch));
      /** A point of the vehicle's frame in the world, as the view's matrix puts it (yaw, then pitch lifting +z). */
      const at = (lx: number, ly: number, lz: number) => {
        const y = ly * Math.cos(pose.pitch) + lz * Math.sin(pose.pitch),
          ahead = lz * Math.cos(pose.pitch) - ly * Math.sin(pose.pitch);
        return {
          x: pose.x + lx * Math.cos(pose.yaw) + ahead * Math.sin(pose.yaw),
          y: pose.y + y,
          z: pose.z - lx * Math.sin(pose.yaw) + ahead * Math.cos(pose.yaw),
        };
      };
      const where = `${name} at ${a.toFixed(2)} m, deck ${deckK}`;
      for (const side of [-1, 1])
        for (const end of [-1, 1]) {
          // Each wheel block's bottom against the rail head drawn under its track: on it at the block's middle (within
          // a centimetre below, three above), and at its two ends no further in than a flat block half a metre long
          // must be where the grade breaks (6.5% over a quarter metre).
          for (const dz of [-v.wheel.d / 2, 0, v.wheel.d / 2]) {
            const p = at(side * SHUNT.gauge, v.wheel.y - v.wheel.h / 2, end * v.wheel.z + dz),
              mid = at(0, 0, end * v.wheel.z + dz),
              gap = p.y - (drawnRail(mid.x, mid.z) + RAIL_HEAD);
            if (!dz) [highest, deepest] = [Math.max(highest, gap), Math.min(deepest, gap)];
            else ends = [Math.min(ends[0]!, gap), Math.max(ends[1]!, gap)];
            assert.ok(
              gap > (dz ? -0.02 : -0.01) && gap < 0.03,
              `${where}: a wheel is ${gap.toFixed(4)} m over its rail`,
            );
            assert.ok(p.y > under(p.x, p.z) + 0.05, `${where}: a wheel is in the ground`);
            // And against the rail the station actually lays there, where it lays one (the stall road, the spur, road
            // 2's stub): the block is over that rail and on its head. Off the yard's track (the deck's bridge, the
            // line's own rails on road 2) the drawn height above is the check.
            const top = laidTop(p.x, p.z, p.y);
            if (top === null) offLaid++;
            else {
              onLaid++;
              const on = p.y - top;
              assert.ok(
                on > (dz ? -0.02 : -0.01) && on < 0.03,
                `${where}: a wheel is ${on.toFixed(4)} m over the laid rail`,
              );
            }
          }
          // The slab's underside at its four corners, clear of the rail heads beside them and of the ground.
          const corner = at(side * 1.1, v.body.y - v.body.h / 2, (end * v.body.d) / 2),
            mid = at(0, 0, (end * v.body.d) / 2);
          assert.ok(corner.y - (drawnRail(mid.x, mid.z) + RAIL_HEAD) > 0.05, `${where}: the slab is on the rails`);
          nearest = Math.min(nearest, corner.y - under(corner.x, corner.z));
          assert.ok(corner.y - under(corner.x, corner.z) > 0.2, `${where}: the slab is near the ground`);
        }
      // And under its middle, where a crest (the rim) comes nearest.
      const belly = at(0, v.body.y - v.body.h / 2, 0);
      assert.ok(
        belly.y - (drawnRail(belly.x, belly.z) + RAIL_HEAD) > 0.05,
        `${where}: the slab's middle is on the rails`,
      );
    }
  // The ramp is a real grade (this would pass on a level road without it), and the wheels' middles stay within 2 cm.
  assert.ok(steepest > 0.05, `the vehicles pitch ${steepest.toFixed(3)} rad on the ramp`);
  assert.ok(highest < 0.02 && deepest > -0.01, `wheel middles from ${deepest.toFixed(4)} to ${highest.toFixed(4)} m`);
  assert.ok(nearest > 0.2);
  // Most of the shunt is on yard track: most wheel probes found a laid rail under them.
  assert.ok(onLaid > offLaid, `${onLaid} probes on laid rails, ${offLaid} off`);
  console.log(
    `shunt probe: wheel middles ${deepest.toFixed(4)} to ${highest.toFixed(4)} m over their rail heads (block ends ${ends[0]!.toFixed(4)} to ${ends[1]!.toFixed(4)} m); slab corners at least ${nearest.toFixed(3)} m over the ground; steepest pitch ${steepest.toFixed(4)} rad; ${onLaid} wheel probes on laid yard rails, ${offLaid} on the deck or the line`,
  );
  // The wheels are on the rails (the lines' gauge, a metre between them) and the wagon's deck is level with the deck
  // of the train it couples to (railY + 0.5), within a step.
  assert.equal(SHUNT.gauge, 0.5);
  assert.ok(Math.abs(SHUNT.ride + SHUNT.wagon.body.y + SHUNT.wagon.body.h / 2 - 0.5) < 0.05);
});

test("the jib's arm stays over a part held up for the server's answer, with the jib on the yard's ground", () => {
  const { table, geo } = garageRow();
  const HANG_CLEAR = sourceFunction<number>('src/entities/railway/garage-view.ts', 'HANG_CLEAR', {});
  const LEG = sourceFunction<{ h: number }>('src/entities/railway/garage-view.ts', 'LEG', {});
  const stand = polarAt(table, geo.stand),
    jib = polarAt(table, geo.jib);
  const yard = H(stand.x, stand.z);
  // The furniture stands on the ground under it, which lies under the deck.
  assert.ok(yard < deck - 0.2, 'the yard lies under the deck');
  assert.ok(Math.abs(H(jib.x, jib.z) - yard) < 0.05, "the jib's foot is on the stand's ground");
  // garage-view.ts: the arm is a 0.2 m beam centred 0.1 m under the mast's top.
  const armUnder = yard + mastFrom(geo, deck, yard) - 0.2;
  assert.ok(Math.abs(armUnder - (deck + geo.mast - 0.2)) < 1e-9, 'the arm is where it was over the deck');
  // The part's origin through the lift (garage-view.ts placePart): from the stand, up and over, to its hang over the
  // seat; then held for the answer, HANG_CLEAR higher. Its top is the fitted boiler's top over that (the longer boiler
  // has the same barrel).
  const tableTop = deck + 0.02,
    rest = yard + LEG.h - (ENGINE_BOILER.y - ENGINE_BOILER.r);
  let top = -Infinity;
  for (let u = 0; u <= 1.0001; u += 0.01) {
    const y = rest + (tableTop - rest) * u + Math.sin(u * Math.PI) * 0.9 + u * MOMENT.hang;
    top = Math.max(top, y + ENGINE_BOILER.top);
  }
  const held = tableTop + MOMENT.hang + 0.06 + HANG_CLEAR + ENGINE_BOILER.top;
  top = Math.max(top, held);
  assert.ok(
    armUnder - top > 0.1,
    `the arm is ${(armUnder - top).toFixed(3)} m over the part's top (${top.toFixed(2)} m)`,
  );
});
