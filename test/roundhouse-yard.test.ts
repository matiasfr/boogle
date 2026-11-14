// Home's yard at the Roundhouse, as geometry (review of the 14 November yard tidy): the stall shunter and its wagon
// stand on the rail heads, clear of the ground and the rails, everywhere the shunt takes them; and the garage's jib
// arm stays over a boiler held up for the server's answer, with the garage's furniture standing on the yard's ground.
import test from 'node:test';
import assert from 'node:assert/strict';
import { H } from '../src/place/terrain.ts';
import { LINES, ORIGIN, railY } from '../src/place/layout.ts';
import { BUFFERS, STALLS, TABLE, roadAt, spurPoints, stallFrame } from '../src/place/home-station.ts';
import { RAIL_HEAD, SHUNT, STALL_RAIL, stallRoadY } from '../src/entities/railway/works-shape.ts';
import { garageRow, mastFrom, polarAt } from '../src/entities/railway/garage-geo.ts';
import { MOMENT } from '../src/entities/railway/garage-data.ts';
import { ENGINE_BOILER } from '../src/entities/railway/engine.ts';
import { WAGON_S } from '../src/sim/railway-works-layout.ts';
import { sourceFunction } from '../dev/level/source.ts';

const deck = railY(LINES.east, 0);
const ground = (p: { x: number; z: number }) => H(p.x + ORIGIN.x, p.z);

/** Every place the shunt puts a vehicle's centre (Place-local) with the track's rail height there: the open stall's
 * road from its back to the rim, the table, the spur, and road 2 from its buffer out past the wagon's wait. */
function shuntPoses() {
  const out: { x: number; z: number; y: number; where: string }[] = [];
  const stall = stallFrame(STALLS.open);
  for (let l = STALLS.door + STALLS.depth - TABLE.r; l >= 0; l -= 0.25)
    out.push({
      x: stall.rim.x + stall.u.x * l,
      z: stall.rim.z + stall.u.z * l,
      y: stallRoadY(l, deck),
      where: 'stall',
    });
  out.push({ x: TABLE.x, z: TABLE.z, y: deck, where: 'table' });
  for (const p of spurPoints()) out.push({ ...p, y: deck, where: 'spur' });
  for (let s = BUFFERS[1]; s <= WAGON_S / 100 + 3; s += 0.5) {
    const p = roadAt(1, s);
    out.push({ x: p.x, z: p.z, y: railY(LINES.east, Math.max(0, s)), where: 'road 2' });
  }
  return out;
}

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

test('the shunter and the wagon stand on the rail heads, clear of the ground and the rails, at every pose', () => {
  const poses = shuntPoses();
  assert.ok(poses.length > 100);
  for (const [name, v] of [
    ['wagon', SHUNT.wagon],
    ['shunter', SHUNT.shunter],
  ] as const) {
    const wheel = SHUNT.ride + v.wheel.y - v.wheel.h / 2,
      body = SHUNT.ride + v.body;
    // Wheels on the heads (the lower of the two vehicles' wheels exactly; neither sinks into a rail).
    assert.ok(wheel >= RAIL_HEAD - 1e-9 && wheel < RAIL_HEAD + 0.05, `${name} wheel ${wheel} over the rail height`);
    assert.ok(body > RAIL_HEAD + 0.1, `${name} body ${body} clears the rail heads`);
    for (const p of poses) {
      const g = ground(p);
      assert.ok(
        p.y + wheel > g + 0.05,
        `${name} wheel at ${p.where} (${p.x.toFixed(1)}, ${p.z.toFixed(1)}) in the ground`,
      );
      assert.ok(
        p.y + body > g + 0.3,
        `${name} body at ${p.where} (${p.x.toFixed(1)}, ${p.z.toFixed(1)}) near the ground`,
      );
    }
  }
  // The wheels are on the rails: the lines' gauge, a metre between the rails.
  assert.equal(SHUNT.gauge, 0.5);
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
