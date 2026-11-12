// The greybox route's catalog (src/sim/railway-route.ts): pure integers, derived from the generated line catalog.
import test from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import {
  RAIL_GATES,
  RAIL_GRANTS,
  RAIL_LEGS,
  RAIL_PLACES,
  RAIL_YARDS,
  ROW_LINE,
  WALL_ISLETS,
  pathOf,
  sectionFromCm,
  sectionsOf,
} from '../src/sim/railway-route.ts';
import { WORLD_LINES, type WorldLine } from '../src/sim/railway-world-lines.ts';
import { ORIGIN } from '../src/place/layout.ts';
import { layout, parseMapPage } from '../src/sickle/map-data.ts';
import { standInRoute } from '../dev/loop/standins.ts';

const row = (id: string) => WORLD_LINES.find((l) => l.id === id)!;

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

test("the three long-range gates equal standins.ts's GATES", () => {
  const areaOf: Record<string, number> = { gorge: 4, bell: 5, canopy: 6, port: 7, wall: 8, ending: 9 };
  const grantOf: Record<string, string> = { 'powered pick': 'pick', 'crystal seeds': 'seeds', 'glider cloth': 'cloth' };
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
  assert.equal(found, 3);
});

test('a place drawn on two rows is one place: its halts are within 40 m', () => {
  for (const p of RAIL_PLACES) {
    const hs = p.halts.map(([id, k]) => row(id).halts[k]!);
    for (const a of hs)
      for (const b of hs) assert.ok((a.x - b.x) ** 2 + (a.z - b.z) ** 2 <= 4000 ** 2, `${p.id}: ${a.name} / ${b.name}`);
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
    const p = rowPoint(row(leg.row), sectionFromCm(leg, k));
    assert.ok(Math.hypot(g.at.x - p.x, g.at.z - p.z) <= 5, `${g.id} stands at its frame`);
  });
});

test("the four grants stand at their leg's destination halt", () => {
  assert.deepEqual(
    RAIL_GRANTS.map((g) => [g.id, RAIL_LEGS[g.leg]!.id]),
    [['pick', 'stack'], ['seeds', 'incline'], ['cloth', 'bell-canopy'], ['lantern', 'notch-tunnel']],
  );
  for (const g of RAIL_GRANTS) {
    const leg = RAIL_LEGS[g.leg]!;
    const h = row(leg.row).halts[leg.destRowHalt]!;
    assert.deepEqual(g.at, { x: h.x, z: h.z, y: h.y, reach: h.reach }, g.id);
  }
});

test('the Wall cuts are the islets\' true closest passes to the cave row, within 1 m', () => {
  const land = layout(parseMapPage(readFileSync(new URL('../docs/world/map-prototypes.html', import.meta.url), 'utf8')), 'sickle', 'A').land;
  const cave = row('cave');
  for (const [id, cm] of Object.entries(WALL_ISLETS)) {
    const c = land.find((l) => l.id === id)!.c!;
    const cx = (c[0] + ORIGIN.x) * 100;
    const cz = (c[1] + ORIGIN.z) * 100;
    let best = Infinity;
    let at = 0;
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
    assert.ok(Math.abs(at - cm) <= 100, `${id}: closest pass at ${Math.round(at)}, catalog has ${cm}`);
  }
});
