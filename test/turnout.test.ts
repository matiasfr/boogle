// The junction list (src/place/junctions.ts; docs/plans/turnouts.md, steps 2 and 6): the list, its line ends against
// the sim's catalog, the J3 and J4 cluster's shared timbers, which side each lever stands, and which road the points
// lie for (routeOf). Each junction's frog, clear and radius are `npm run level-check`'s table; the parts' geometry is
// seen in a look.
import test from 'node:test';
import assert from 'node:assert/strict';
import { junctions } from '../src/place/junctions.ts';
import { KIT, turnout } from '../src/place/turnout.ts';
import { FORMATION, LINKS, offsetLat } from '../src/place/layout.ts';
import { LINE2, RAIL_LINES } from '../src/sim/railway-lines.ts';
import { sleeperStations } from '../src/entities/railway/track-panels.ts';
import { line2Lat } from '../src/entities/railway/line2-path.ts';
import { routeOf, type PointsTrain, type RouteRows } from '../src/entities/railway/turnout-route.ts';

const all = junctions();

test('the list is J1 to J9, each once', () => {
  assert.deepEqual(
    all.map((j) => j.id),
    ['J1', 'J2', 'J3', 'J4', 'J5', 'J6', 'J7', 'J8', 'J9'],
  );
});

test('every line end the layout draws has a junction', () => {
  // Lines 1 and 2's ends that the formation draws (its stub turnouts and Far Head's crossover); the railhead's, Ring
  // Island's and the greybox stack's are drawn by their own views and come with step 7.
  for (const [k, id] of [
    [0, 'timber'],
    [1, 'quarry'],
  ] as const) {
    const f = FORMATION[id],
      drawn = [f.from, f.to, ...(f.crossover ? [f.crossover[0]] : [])];
    const ends = RAIL_LINES[k]!.halts.flatMap((h) => (h.end ? [h.end.mergeCm / 100] : [])).filter((s) =>
      drawn.includes(s),
    );
    assert.equal(ends.length, drawn.length, `${id}: the catalog has an end at each of ${drawn.join(', ')}`);
    for (const s of ends)
      assert.ok(
        all.some((j) => j.line === id && j.s === s && j.kind !== 'spur'),
        `${id}: no junction at the end merging at s ${s}`,
      );
  }
});

test('one timber per station in a cluster (J3 with J4)', () => {
  const j3 = all.find((j) => j.id === 'J3')!,
    j4 = all.find((j) => j.id === 'J4')!;
  const t3 = turnout(j3.through, j3.diverging, j3.lever),
    t4 = turnout(j4.through, j4.diverging, j4.lever);
  // Both stand on line 1: J4 runs with its s from s 36, J3 against it from s 54, so J3's right is line 1's left.
  let shared = 0;
  for (const { s } of sleeperStations(LINKS[0]!, 30, 60)) {
    const a = t4.span(s - j4.s),
      b3 = t3.span(j3.s - s),
      b = b3 && ([-b3[1], -b3[0]] as const);
    if (!a || !b) continue;
    shared++;
    // The two spans meet under the through road, so one timber, their union, carries all six rails.
    assert.ok(a[0] <= b[1] && b[0] <= a[1], `s ${s.toFixed(1)}: spans ${a} and ${b} do not meet`);
    const len = Math.max(a[1], b[1]) - Math.min(a[0], b[0]),
      steps = (len - KIT.sleeper) / KIT.step;
    assert.ok(Math.abs(steps - Math.round(steps)) < 1e-6, `s ${s.toFixed(1)}: one timber of ${len.toFixed(3)} m`);
  }
  assert.ok(shared >= 3, `the zones share ${shared} stations`);
});

test('J2 to J9: the lever stands away from the road that leaves (designer call 3)', () => {
  // J3's lever box already stands on line 1's west, away from the leg (home-station-view.ts, LEG.from + 1.5 at -2.4).
  for (const j of all.filter((x) => x.id !== 'J1')) {
    const tj = turnout(j.through, j.diverging, j.lever);
    assert.equal(j.lever, -tj.hand, `${j.id}: lever ${j.lever} on the diverging road's side (hand ${tj.hand})`);
  }
});

// Which road the points lie for (src/entities/railway/turnout-route.ts `routeOf`; docs/plans/turnouts.md, step 6).
const points = (id: string) => {
  const j = all.find((x) => x.id === id)!;
  return { j, t: turnout(j.through, j.diverging, j.lever) };
};
const homeward1 = (s: number): PointsTrain => ({
  line: 0,
  s,
  dir: -1,
  lat: (x) => offsetLat(FORMATION.timber, x) ?? 0,
});
const outward = (line: number, s: number): PointsTrain => ({ line, s, dir: 1, lat: () => 0 });
const rows = (trains: PointsTrain[]): RouteRows => ({ trains, shunt: false, cart: null });

test('a homeward train within 60 m sets the stub for the offset track', () => {
  // J4, Home's points on line 1 (toe s 36, clear of the through road by s 47): a train coming home on the offset
  // track, its front 30 m short of them, and then one 80 m off.
  assert.equal(routeOf(points('J4'), rows([homeward1(47 + 13 + 30)])), 1);
  assert.equal(routeOf(points('J4'), rows([homeward1(47 + 13 + 80)])), 0);
});

test('no train rests it for the through road', () => {
  for (const id of ['J1', 'J2', 'J3', 'J4', 'J5', 'J6', 'J7', 'J8', 'J9'])
    assert.equal(routeOf(points(id), rows([])), 0, id);
});

test('an outward train trailing through sets it back', () => {
  // J5, the Camp's points on line 1 (toe s 182, against s): an outward train coming through from the frog's side
  // takes them over a homeward train still 55 m off, which would set them for the offset track.
  const home = homeward1(182 + 13 + 55);
  assert.equal(routeOf(points('J5'), rows([home])), 1);
  assert.equal(routeOf(points('J5'), rows([home, outward(0, 165)])), 0);
});

test("Far Head's crossover follows crossing()", () => {
  // A homeward train leaving Far Head (s 515, its tail over both toes): it crosses while Far Head is line 2's end, or
  // when it left from there (its origin) after the line grew; otherwise it runs home on the up track, so J7 rests for
  // the up track and J8 (on the down track) is not its road at all.
  const halts = RAIL_LINES[LINE2]!.halts.map((h) => h.s);
  const train = (stops: number[], origin: number): PointsTrain => ({
    line: LINE2,
    s: 515,
    dir: -1,
    lat: (x) => line2Lat({ track: 1, origin }, x, stops),
  });
  const farHead = halts.slice(0, 3),
    pier = halts.slice(0, 4);
  for (const [stops, origin, crosses] of [
    [farHead, 0, 1],
    [pier, 0, 0],
    [pier, halts[2]!, 1],
  ] as const) {
    const r = rows([train([...stops], origin)]);
    assert.deepEqual([routeOf(points('J7'), r), routeOf(points('J8'), r)], [crosses, crosses], `${stops.length} stops`);
  }
});
