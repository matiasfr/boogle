// The greybox route's catalog (src/sim/railway-route.ts): pure integers, derived from the generated line catalog.
import test from 'node:test';
import { legBuilt } from '../src/sim/railway-lines.ts';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import {
  RAIL_GATES,
  RAIL_ARRIVAL,
  RAIL_GRANTS,
  RAIL_LEGS,
  RAIL_PLACES,
  RAIL_YARDS,
  ROW_LINE,
  WALL_ISLETS,
  insertedHeadsBefore,
  legFrame,
  legRack,
  pathOf,
  sectionFromCm,
  sectionsOf,
  simHalt,
} from '../src/sim/railway-route.ts';
import { WORLD_LINES, type WorldLine } from '../src/sim/railway-world-lines.ts';
import { CANOPY_CLOTH_POST } from '../src/content/levels/leg3.ts';
import { ORIGIN } from '../src/place/layout.ts';
import { layout, parseMapPage } from '../src/sickle/map-data.ts';
import { standInRoute } from '../dev/loop/standins.ts';

const row = (id: string) => WORLD_LINES.find((l) => l.id === id)!;

test('every construction order has at most one open leg per line', () => {
  const orders: number[][] = [];
  function visit(path: number[]) {
    const open = RAIL_LEGS.flatMap((g, k) => legBuilt(k) && !path.includes(k) &&
      (g.after < 0 || path.includes(g.after)) && (g.alsoAfter === undefined || path.includes(g.alsoAfter)) ? [k] : []);
    const lines = open.map(k => RAIL_LEGS[k]!.line);
    assert.equal(new Set(lines).size, open.length);
    if (!open.length) orders.push(path);
    for (const k of open) visit([...path, k]);
  }
  visit([]);
  assert.deepEqual(orders, [[0,1,2,3,4,5,6,7], [0,1,2,4,3,5,6,7]]);
});

test('sectionsOf cuts a leg into equal sections on whole centimetres', () => {
  assert.deepEqual(sectionsOf({ fromCm: 100, toCm: 500 }, 4), [200, 300, 400, 500]);
  const cuts = sectionsOf({ fromCm: 7, toCm: 1000 }, 3);
  assert.equal(cuts.at(-1), 1000);
  let prev = 7;
  const lens = cuts.map((c) => {
    assert.ok(Number.isInteger(c));
    const l = c - prev;
    prev = c;
    return l;
  });
  assert.ok(Math.max(...lens) - Math.min(...lens) <= 1);
  assert.throws(() => sectionsOf({ fromCm: 0, toCm: 10 }, 0));
  assert.throws(() => sectionsOf({ fromCm: 0, toCm: 2 }, 3));
});

test('pathOf samples every 10 m and ends on the last vertex', () => {
  const p = pathOf([
    [0, 0, 0],
    [3000, 4000, 100], // 50 m long
    [3000, 4000, 100], // a repeated vertex adds nothing
  ]);
  assert.deepEqual(p.slice(0, 6), [0, 0, 0, 600, 800, 20]);
  assert.equal(p.length / 3, 6);
  assert.deepEqual(p.slice(-3), [3000, 4000, 100]);
  assert.ok(p.every(Number.isInteger));
  const bent = pathOf([
    [0, 0, 0],
    [1500, 0, 0],
    [1500, 1500, 0],
  ]);
  assert.deepEqual(bent.slice(3, 9), [1000, 0, 0, 1500, 500, 0]); // arc carries round the corner
  assert.deepEqual(pathOf([]), []);
});

test("every leg's sections run in order along its row and end on its destination halt", () => {
  for (const leg of RAIL_LEGS) {
    const r = row(leg.row);
    assert.equal(leg.line, ROW_LINE[leg.row]);
    assert.ok(r.stops.includes(leg.fromCm), `${leg.id} starts on a halt's stop`);
    let at = leg.fromCm;
    for (const s of leg.sections) {
      assert.ok(Number.isInteger(s.toCm) && s.toCm > at, `${leg.id} sections run forward`);
      at = s.toCm;
    }
    assert.equal(at, r.stops[leg.destRowHalt], `${leg.id} ends on its destination halt`);
  }
});

test('a leg starts where the previous leg on its row ended', () => {
  RAIL_LEGS.forEach((leg, i) => {
    const prev = RAIL_LEGS.slice(0, i).findLast((l) => l.row === leg.row);
    if (prev) assert.equal(leg.fromCm, prev.sections.at(-1)!.toCm, `${prev.id} then ${leg.id}`);
  });
});

test('22 sections: bills are one train load, the ending at 6 + 6', () => {
  const perArea: Record<number, { sections: number; logs: number; rails: number }> = {};
  for (const leg of RAIL_LEGS)
    for (const s of leg.sections) {
      const a = (perArea[leg.area] ??= { sections: 0, logs: 0, rails: 0 });
      a.sections++;
      a.logs += s.logs;
      a.rails += s.rails;
    }
  assert.deepEqual(perArea, {
    4: { sections: 4, logs: 80, rails: 80 },
    5: { sections: 4, logs: 80, rails: 80 },
    6: { sections: 3, logs: 60, rails: 60 },
    7: { sections: 3, logs: 60, rails: 60 },
    8: { sections: 6, logs: 120, rails: 120 },
    9: { sections: 2, logs: 12, rails: 12 },
  });
  assert.equal(RAIL_LEGS.flatMap((l) => l.sections).length, 22);
});

test('each after and needs points backwards', () => {
  RAIL_LEGS.forEach((leg, i) => {
    assert.ok(leg.after >= -1 && leg.after < i, `${leg.id} after`);
    if (typeof leg.kit === 'number') assert.ok(RAIL_YARDS[leg.kit], `${leg.id} kit`);
    for (const s of leg.sections)
      if (s.gate !== undefined) {
        const g = RAIL_GATES[s.gate]!;
        assert.ok(g, `${leg.id} gate`);
        assert.ok(RAIL_GRANTS[g.needs]!.leg < i, `${g.id} needs a grant from an earlier leg`);
      }
  });
  RAIL_GATES.forEach((g, gi) => {
    const holders = RAIL_LEGS.filter((l) => l.sections.some((s) => s.gate === gi));
    assert.equal(holders.length, 1, `${g.id} shuts exactly one section`);
  });
  for (const y of RAIL_YARDS) assert.ok(y.fedBy >= 0 && y.fedBy < RAIL_LEGS.length);
  RAIL_GRANTS.forEach((g) => assert.ok(RAIL_LEGS[g.leg], g.id));
});

test('the remaining stand-in gates match the route catalog', () => {
  const areaOf: Record<string, number> = { cloth: 6 };
  const grantOf: Record<string, string> = { 'glider cloth': 'cloth' };
  const { nodes } = standInRoute();
  let found = 0;
  for (const n of nodes)
    for (const r of n.requires) {
      if (!r.needs) continue;
      found++;
      const legs = RAIL_LEGS.filter((l) => l.area === n.area);
      const gates = legs.flatMap((l) => l.sections.map((s) => s.gate)).filter((g) => g !== undefined);
      const hit = gates.find((g) => RAIL_GATES[g!]!.needs === RAIL_GRANTS.findIndex((x) => x.id === grantOf[r.needs!]));
      assert.ok(hit !== undefined, `${n.id} gate needs ${r.needs}`);
      assert.equal(
        RAIL_LEGS[RAIL_GRANTS[RAIL_GATES[hit!]!.needs]!.leg]!.area,
        areaOf[r.on]!,
        `${r.needs} comes from ${r.on}`,
      );
    }
  assert.equal(found, 1);
});

test('each interchange fits its walking bound', () => {
  for (const p of RAIL_PLACES) {
    const hs = p.halts.map(([id, k]) => row(id).halts[k]!);
    for (const a of hs)
      for (const b of hs)
        assert.ok((a.x - b.x) ** 2 + (a.z - b.z) ** 2 <= (p.boundCm ?? 4000) ** 2, `${p.id}: ${a.name} / ${b.name}`);
  }
});

test('grants and gates stand on integer positions', () => {
  for (const x of [...RAIL_GRANTS, ...RAIL_GATES])
    for (const v of [x.at.x, x.at.z, x.at.y, x.at.reach]) assert.ok(Number.isInteger(v), x.id);
});

/** The row's vertex-interpolated point `cm` along the line. */
function rowPoint(r: WorldLine, cm: number) {
  let want = cm - r.fromCm;
  for (let i = 1; i < r.pts.length; i++) {
    const a = r.pts[i - 1]!;
    const b = r.pts[i]!;
    const len = Math.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2);
    if (want <= len) return { x: a[0] + ((b[0] - a[0]) * want) / len, z: a[1] + ((b[1] - a[1]) * want) / len };
    want -= len;
  }
  throw new Error('past the row');
}

test('each gate shuts the section it names and stands at that frame', () => {
  const frames: Record<string, [leg: string, section: number]> = {
    incline: ['incline', 0],
    canopy: ['bell-canopy', 0],
    plug: ['cave', 0],
    'deep-span': ['wall', 5],
    notch: ['notch-tunnel', 0],
    causeway: ['causeway', 0],
  };
  assert.equal(RAIL_GATES.length, Object.keys(frames).length);
  RAIL_GATES.forEach((g, gi) => {
    const [legId, k] = frames[g.id]!;
    const leg = RAIL_LEGS.find((l) => l.id === legId)!;
    leg.sections.forEach((s, j) => assert.equal(s.gate === gi, j === k, `${g.id} on ${legId} section ${j}`));
    assert.deepEqual(g.at, legFrame(leg, k), g.id);
  });
});

test("the grants after the first stand at their leg's destination halt; `pick` on the stack's rim is its own", () => {
  assert.deepEqual(
    RAIL_GRANTS.map((g) => [g.id, RAIL_LEGS[g.leg]!.id]),
    [
      ['pick', 'stack'],
      ['seeds', 'incline'],
      ['cloth', 'bell-canopy'],
      ['lantern', 'notch-tunnel'],
    ],
  );
  // The seeds stand on Bell Rock's lower deck, at the massing's reserved spot, 4 m reach (greybox-leg2.md, step 1).
  const seeds = RAIL_GRANTS[1]!.at,
    bell = row('ns').halts[1]!;
  assert.ok(
    Math.hypot(seeds.x - bell.x, seeds.z - bell.z) < 2000 && seeds.reach === 400,
    'the seeds on the lower deck',
  );
  assert.deepEqual(RAIL_GRANTS[2]!.at, {
    x: Math.round(100 * CANOPY_CLOTH_POST[0]),
    z: Math.round(100 * CANOPY_CLOTH_POST[1]),
    y: 1390,
    reach: 400,
  });
  assert.deepEqual(RAIL_GRANTS[3]!.at, { x: -162000, z: -98600, y: 600, reach: 400 });
  const end = row('ns').pts.at(-1)!;
  assert.ok(Math.abs(Math.hypot(RAIL_ARRIVAL.x - end[0], RAIL_ARRIVAL.z - end[1]) - 1200) < 5);
  for (const leg of RAIL_LEGS.slice(-2)) {
    assert.equal(leg.sections.length, 1);
    assert.ok(leg.sections[0]!.toCm - leg.fromCm < 96000);
  }
});

test('Canopy cuts stand midway across the level strait and 33 m beyond the climb', () => {
  const bay = row('bay'),
    leg = RAIL_LEGS[3]!;
  const marks: { s: number; y: number }[] = [];
  let s = 0;
  bay.pts.forEach((p, i) => {
    const prev = bay.pts[i - 1];
    if (prev) s += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    if (s > leg.fromCm) marks.push({ s, y: p[2] });
  });
  const sea = marks.filter((p) => p.y === 400 && p.s < leg.sections[1]!.toCm);
  assert.ok(Math.abs((sea[0]!.s + sea.at(-1)!.s) / 2 - leg.sections[0]!.toCm) < 100);
  const rim = marks.find((p) => p.s > sea.at(-1)!.s && p.y === 1300)!;
  assert.ok(Math.abs(rim.s + 3300 - leg.sections[1]!.toCm) < 100);
  assert.equal(leg.sections[2]!.toCm, bay.legs[1]!.toCm - 2500);
});

test('the Wall has six sections, each under 960 m', () => {
  const leg = RAIL_LEGS[5]!;
  assert.equal(leg.sections.length, 6);
  for (const [k, section] of leg.sections.entries()) {
    const length = section.toCm - sectionFromCm(leg, k);
    assert.ok(length < 96000, `Wall section ${k + 1}: ${length / 100} m`);
  }
});

test('Canopy head serves its catalog halt on a 50 m straight', () => {
  const cave = row('cave'),
    stop = cave.stops[3]!;
  assert.equal(RAIL_LEGS[5]!.sections[2]!.toCm, stop + 1000);
  const a = rowPoint(cave, stop - 2500),
    b = rowPoint(cave, stop + 2500);
  for (let offset = -2500; offset <= 2500; offset += 100) {
    const p = rowPoint(cave, stop + offset),
      t = (offset + 2500) / 5000;
    assert.ok(Math.hypot(p.x - a.x - (b.x - a.x) * t, p.z - a.z - (b.z - a.z) * t) < 2);
  }
});

test("the Wall cuts are the islets' true closest passes to the cave row, within 1 m", () => {
  const land = layout(
    parseMapPage(readFileSync(new URL('../docs/world/map-prototypes.html', import.meta.url), 'utf8')),
    'sickle',
    'A',
  ).land;
  const cave = row('cave');
  for (const [id, cm] of Object.entries(WALL_ISLETS)) {
    const isle = land.find((l) => l.id === id)!;
    const targets = id === 'wall-n1' ? isle.outline : [isle.c!];
    let best = Infinity;
    let at = 0;
    for (const c of targets) {
      const cx = (c[0] + ORIGIN.x) * 100;
      const cz = (c[1] + ORIGIN.z) * 100;
      let arc = 0;
      for (let i = 1; i < cave.pts.length; i++) {
        const a = cave.pts[i - 1]!;
        const b = cave.pts[i]!;
        const dx = b[0] - a[0];
        const dz = b[1] - a[1];
        const len = Math.sqrt(dx * dx + dz * dz);
        const t = Math.max(0, Math.min(1, ((cx - a[0]) * dx + (cz - a[1]) * dz) / (len * len)));
        const d = Math.hypot(a[0] + dx * t - cx, a[1] + dz * t - cz);
        if (d < best) {
          best = d;
          at = cave.fromCm + arc + t * len;
        }
        arc += len;
      }
    }
    assert.ok(Math.abs(at - cm) <= 100, `${id}: closest pass at ${Math.round(at)}, catalog has ${cm}`);
  }
});

// Greybox leg 2's catalog (docs/plans/greybox-leg2.md, step 1).
test("leg 2's legs: the incline s 36 to 1156 in two sections of 560 m, the bay cut s 20 to 1217 in two of 598.5 m", () => {
  const incline = RAIL_LEGS.find((l) => l.id === 'incline')!,
    bay = RAIL_LEGS.find((l) => l.id === 'bay-cut')!;
  assert.deepEqual([incline.fromCm, ...incline.sections.map((s) => s.toCm)], [3600, 59600, 115600]);
  assert.deepEqual([bay.fromCm, ...bay.sections.map((s) => s.toCm)], [2000, 61850, 121700]);
  // The ns start crossover inside the bore (s 70 to 90); Bell Rock now stands on the eased track.
  assert.equal(row('ns').ends.find((e) => e.at === 'start')!.sCm, 8000);
  const stop = row('bay').halts[1]!;
  assert.ok(stop.y === 1500 && stop.x > -5000, 'Bell Rock stands on the upper deck before the arc midpoint');
});

test("every leg's railhead halt is its from halt's sim index + 1 (simHalt counts the built legs' heads)", () => {
  for (const leg of RAIL_LEGS) assert.equal(leg.railheadHalt, simHalt(leg.row, fromHalt(leg)) + 1, leg.id);
  // Line 2: Ring Island is its sixth halt and the stack's heads follow; the new rows start at 0.
  assert.deepEqual(
    RAIL_LEGS.map((l) => [l.id, l.railheadHalt]),
    [
      ['stack', 6],
      ['incline', 1],
      ['bay-cut', 1],
      ['bell-canopy', 3],
      ['cave', 1],
      ['wall', 4],
      ['notch-tunnel', 6],
      ['causeway', 3],
    ],
  );
  assert.equal(simHalt('ring', 1), 9, "line 2's High Gorge after its three stack heads");
  assert.equal(simHalt('ns', 1), 2, "the ns line's Bell Rock after incline head 1");
  assert.equal(simHalt('bay', 2), 5, 'Canopy Town after both Canopy heads');
  assert.deepEqual(
    row('cave').halts.map((_, i) => simHalt('cave', i)),
    [0, 2, 3, 6, 9],
  );
  // Two intermediate named halts, with a new head before each. Neither named head adds a duplicate slot.
  const stops = [0, 10000, 20000, 30000],
    cuts = [6000, 11000, 16000, 21000, 30000];
  assert.deepEqual(
    stops.map((_, i) => i + insertedHeadsBefore(stops, cuts, i)),
    [0, 2, 4, 5],
  );
});

test('cave cuts put head 2 at Saltpan and the quay stop 25 m before the Wall turn', () => {
  const cave = row('cave'),
    leg = RAIL_LEGS[4]!;
  const [west, salt, quay] = cave.stops;
  assert.deepEqual(
    leg.sections.map((s) => s.toCm),
    [Math.floor((west! + salt!) / 2), salt! + 1000, quay],
  );
  assert.equal(quay, cave.legs[1]!.toCm - 2500);
  for (const [i, section] of leg.sections.entries()) assert.ok(section.toCm - sectionFromCm(leg, i) < 90000);
  for (const [i, [fx, fz, rx, rz]] of [
    [809.7, 22.9, 810.2, 16.9],
    [651.2, 345.9, 654.1, 336.3],
    [540.5, 694.5, 546.2, 687.4],
  ].entries()) {
    const f = legFrame(leg, i),
      r = legRack(leg, i);
    assert.ok(Math.hypot(f.x / 100 - fx!, f.z / 100 - fz!) < 1);
    assert.ok(Math.hypot(r.x / 100 - rx!, r.z / 100 - rz!) < 1);
  }
});
/** A leg's from halt on its row: the halt whose stop is its fromCm. */
function fromHalt(leg: (typeof RAIL_LEGS)[number]) {
  return row(leg.row).stops.indexOf(leg.fromCm);
}

test("leg 2's points stand within 1 m of the plan's table (route-leg2.ts checks them against the level's reserves)", () => {
  const near = (p: { x: number; z: number; y: number }, x: number, z: number, y: number, what: string) =>
    assert.ok(
      Math.hypot(p.x / 100 - x, p.z / 100 - z) <= 1 && Math.abs(p.y / 100 - y) <= 0.01,
      `${what}: (${p.x / 100}, ${p.z / 100}, ${p.y / 100})`,
    );
  const incline = RAIL_LEGS.find((l) => l.id === 'incline')!,
    bay = RAIL_LEGS.find((l) => l.id === 'bay-cut')!;
  near(legFrame(incline, 0), -91.5, -1966.4, 3.9, 'incline frame 1');
  near(RAIL_GATES.find((g) => g.id === 'incline')!.at, -91.5, -1966.4, 3.9, 'the incline barrier');
  near(legFrame(incline, 1), -14, -1417, 4.9, 'incline frame 2');
  near(legFrame(bay, 0), 801.3, -5.5, 4.9, 'bay frame 1');
  near(legRack(bay, 0), 805.0, -0.8, 4.9, 'bay rack 1');
  near(legFrame(bay, 1), 429, -474, 4.9, 'bay frame 2');
  near(RAIL_GRANTS.find((g) => g.id === 'seeds')!.at, -64.7, -854.9, 4.9, 'the seeds');
  near(RAIL_GATES.find((g) => g.id === 'canopy')!.at, -54.1, -848.2, 15.9, 'the Canopy barrier');
  // Incline rack 1: within 15 m of frame 1 (straight line; on foot is step 4's still), on line 2's south platform.
  const f = legFrame(incline, 0),
    r = legRack(incline, 0);
  assert.ok(Math.hypot(f.x - r.x, f.z - r.z) < 1500, 'incline rack 1 within 15 m of frame 1');
});
