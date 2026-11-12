// The greybox route's catalog (src/sim/railway-route.ts): pure integers, derived from the generated line catalog.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RAIL_GATES,
  RAIL_GRANTS,
  RAIL_LEGS,
  RAIL_PLACES,
  RAIL_YARDS,
  ROW_LINE,
  pathOf,
  sectionFromCm,
  sectionsOf,
} from '../src/sim/railway-route.ts';
import { WORLD_LINES } from '../src/sim/railway-world-lines.ts';
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

test("every leg's sections cover its length exactly, in order, inside its row", () => {
  for (const leg of RAIL_LEGS) {
    const r = row(
      Object.keys(ROW_LINE).find(
        (k) => ROW_LINE[k as keyof typeof ROW_LINE] === leg.line && row(k).stops.includes(leg.fromCm),
      )!,
    );
    assert.ok(r, leg.id);
    let at = leg.fromCm;
    let total = 0;
    leg.sections.forEach((s, k) => {
      assert.equal(sectionFromCm(leg, k), at);
      assert.ok(Number.isInteger(s.toCm) && s.toCm > at, `${leg.id} section ${k}`);
      total += s.toCm - at;
      at = s.toCm;
    });
    assert.equal(total, at - leg.fromCm);
    assert.ok(r.stops.includes(at), `${leg.id} ends on a halt's stop`);
    assert.equal(r.stops.indexOf(at), leg.dest, `${leg.id} dest`);
  }
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
