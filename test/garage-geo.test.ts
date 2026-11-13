// Where the garage's fixed pieces stand at today's table (docs/plans/garage-install-moment.md, G2 and its design
// review): inside the server's reach for the install, off the turning deck, off both lines and off the jump-in landing.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DECK_R,
  GARAGE_GEO,
  STAND_LEGS,
  STAND_PART,
  installHere,
  polarAt,
  standEnds,
  type XZ,
} from '../src/entities/railway/garage-geo.ts';
import { SHED_TABLE } from '../src/sim/railway-works-layout.ts';

import { LINES, ORIGIN, lineAt } from '../src/place/layout.ts';
import { TABLE } from '../src/place/home-station.ts';
import { jumpOf } from '../src/world/railway-jump.ts';

const centre = { x: SHED_TABLE.x / 100, z: SHED_TABLE.z / 100 };
const a = GARAGE_GEO.a;
const dist = (p: XZ, q: XZ) => Math.hypot(p.x - q.x, p.z - q.z);
/** Half a sleeper (track.ts lays them 2.3 m wide). */
const SLEEPER = 1.15;
/** The nearest a point comes to either line's centre over its first 16 m. */
function offLines(p: XZ) {
  const lp = { x: 0, z: 0, ux: 0, uz: 0 };
  let best = Infinity;
  for (const l of [LINES.north, LINES.east])
    for (let s = 0; s <= 16; s += 0.1) {
      lineAt(l, s, lp);
      best = Math.min(best, dist(p, { x: lp.x + ORIGIN.x, z: lp.z }));
    }
  return best;
}
/** Points along the stand's part, end to end. */
const standAxis = () => {
  const [inner, outer] = standEnds(centre, a);
  return Array.from({ length: 33 }, (_, k) => ({
    x: inner.x + ((outer.x - inner.x) * k) / 32,
    z: inner.z + ((outer.z - inner.z) * k) / 32,
  }));
};

test('a hold at today’s post reaches the install; layout B’s post does not until the flip moves the table', () => {
  assert.ok(installHere(polarAt(centre, a.post)));
  const tableB = { x: TABLE.x + ORIGIN.x, z: TABLE.z };
  assert.ok(!installHere(polarAt(tableB, GARAGE_GEO.b.post)));
});

test('nothing fixed stands within the deck’s 4.8 m: the copy sweeps it', () => {
  // The rule's own number, not whatever the constant says (design review, call 24).
  assert.equal(DECK_R, 4.8);
  for (const p of [a.post, a.jib, ...a.crew]) assert.ok(p.r >= 5.0, `${p.bearing}° at ${p.r} m`);
  for (const p of standAxis()) assert.ok(dist(p, centre) >= 4.8, 'the part on its stand');
  const [inner] = standEnds(centre, a);
  assert.ok(dist(inner, centre) >= 4.8, 'the stand’s inner end');
  // The empty stand clears a car on line 2 (design ruling on G2, R2): legs 6 m or further out, no wider than the barrel.
  assert.ok(Math.min(...STAND_LEGS.at) >= 6.0 && STAND_LEGS.half <= 0.5);
  for (const r of STAND_LEGS.at) assert.ok(Math.abs(r - a.stand.r) <= STAND_PART.half, 'a leg under the barrel');
  // The jib's arm reaches the engine's seat wherever the table has turned it (1.9 m past the centre).
  assert.ok(a.arm >= a.jib.r + 1.9);
});

test('every piece is off both lines’ sleepers and off the jump-in landing, which has not moved', () => {
  const land = jumpOf('steel-home')!.land!;
  // TABLE_LAND (src/world/railway-jump.ts): 5.2 m east and 1.7 m south of the table's centre, on 18.1 m. The owner's.
  assert.deepEqual({ x: land.x, y: land.y, z: land.z }, { x: centre.x + 5.2, y: 18.1, z: centre.z + 1.7 });
  const points = [a.post, a.jib, ...a.crew].map((p) => polarAt(centre, p));
  for (const p of points) {
    assert.ok(offLines(p) > SLEEPER + 0.2, `a piece ${offLines(p).toFixed(2)} m from a line`);
    assert.ok(dist(p, land) >= 0.9, `a piece ${dist(p, land).toFixed(2)} m from the landing`);
  }
  // The stand's middle is off the sleepers. The 3.15 m barrel lying on it does not fit the wedge between line 2 and
  // the landing with its inner end off the deck: as built its side overhangs line 2's sleeper ends by 0.34 m (clear of
  // the rail, on track no train stands on: the tails stop at s 8.0) and passes 0.316 m from the landing point. Both are
  // pinned here so a move re-measures them; the plan's section 5 carries the finding for the designer.
  assert.ok(offLines(polarAt(centre, a.stand)) > SLEEPER + 0.2);
  const barrel = standAxis();
  const toLine = Math.min(...barrel.map((p) => offLines(p) - STAND_PART.r)),
    toLand = Math.min(...barrel.map((p) => dist(p, land) - STAND_PART.r));
  assert.ok(toLine >= 0.8, `the barrel's side ${toLine.toFixed(2)} m from line 2's centre (the rail is at 0.68 m)`);
  assert.ok(toLand >= 0.3, `the barrel's side ${toLand.toFixed(2)} m from the landing`);
});
