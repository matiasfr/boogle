// The whole-map blockout's future lines (src/sim/railway-world-lines.ts): current with the map JSON, and in the sim's own
// shape so the server can take them unchanged (docs/plans/world-blockout.md, "Future lines as data").
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { FORMATION, LIVE_SECOND_TRACK, WORLD_LINES } from '../src/sim/railway-world-lines.ts';
import { TRAIN, TRAIN_STOPS } from '../src/sim/railway-train.ts';
import { LINES, ORIGIN } from '../src/place/layout.ts';
import { layout, parseMapPage } from '../src/sickle/map-data.ts';
import { readFileSync } from 'node:fs';

test('generated world pages emit numbers with at most three decimals', () => {
  for (const name of [
    'map-prototypes',
    'world-blockout',
    'home-layout',
    'home-passenger-bay',
    'rail-map',
    'economy-prototype',
  ]) {
    const file = `docs/world/${name}.html`;
    const html = readFileSync(file, 'utf8');
    const data = [...html.matchAll(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g)].map(
      (m) => m[1]!,
    );
    if (name === 'rail-map') {
      const map = /const D = (\{[^\n]*\});/.exec(html);
      assert.ok(map, `${file}: generated map data exists`);
      data.push(map[1]!);
    }
    if (['map-prototypes', 'home-layout', 'rail-map', 'economy-prototype'].includes(name))
      assert.equal(data.length, 1, `${file}: generated data block exists`);
    const numbers = (value: unknown, path: string): void => {
      if (typeof value === 'number') assert.equal(value, Number(value.toFixed(3)), path);
      else if (Array.isArray(value)) value.forEach((v: unknown, i) => numbers(v, `${path}[${i}]`));
      else if (value && typeof value === 'object')
        for (const [key, v] of Object.entries(value)) numbers(v, `${path}.${key}`);
    };
    for (const block of data) {
      numbers(JSON.parse(block), file);
      // Also cover numbers interpolated into labels before JSON serialization.
      assert.doesNotMatch(block, /\d+\.\d{4,}/, `${file}: generated label precision`);
    }
    // Generated SVG attributes and prose; authored client code (e.g. a loop epsilon) is not emitted geometry.
    const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
    assert.doesNotMatch(markup, /\d+\.\d{4,}/, `${file}: generated markup precision`);
  }
});

test('the catalog and the world-blockout page are current with the map JSON', () => {
  // The generator reads Place's terrain, which needs the dev hooks (import.meta.glob), so it runs in its own process.
  execFileSync(process.execPath, ['--import', './dev/sim/hooks.ts', 'dev/level/world-blockout.ts', '--check'], {
    stdio: 'pipe',
  });
});

test('every future line is integer centimetres, with stops on the line and a halt at each', () => {
  const ids = new Set<string>();
  for (const l of WORLD_LINES) {
    assert.ok(!ids.has(l.id), `${l.id} twice`);
    ids.add(l.id);
    assert.equal(l.speed, TRAIN.speed, `${l.id} cruises at the sim's train speed`);
    assert.equal(l.accel, TRAIN.accel, `${l.id} accelerates like the sim's train`);
    for (const p of l.pts) for (const v of p) assert.ok(Number.isInteger(v), `${l.id} point ${p.join(',')}`);
    let s = l.fromCm;
    for (const leg of l.legs) {
      assert.equal(leg.fromCm, s, `${l.id} ${leg.id} starts where the last leg ended`);
      assert.ok(leg.toCm > leg.fromCm);
      s = leg.toCm;
    }
    assert.equal(s - l.fromCm, l.lengthCm, `${l.id} legs sum to its length`);
    // The vertices' straight spans add up to the length (each span rounded to the centimetre).
    let len = 0;
    for (let i = 1; i < l.pts.length; i++)
      len += Math.round(Math.hypot(l.pts[i]![0] - l.pts[i - 1]![0], l.pts[i]![1] - l.pts[i - 1]![1]));
    assert.equal(len, l.lengthCm, `${l.id} spans sum to its length`);
    assert.equal(l.stops.length, l.halts.length);
    l.halts.forEach((h, i) => {
      assert.equal(h.stop, i);
      assert.ok(l.stops[i]! >= l.fromCm && l.stops[i]! <= l.fromCm + l.lengthCm, `${l.id} ${h.name} on the line`);
      for (const v of [h.x, h.z, h.y, h.reach]) assert.ok(Number.isInteger(v));
    });
  }
});

test('every corridor is double track, and every terminus turns a train back', () => {
  assert.equal(FORMATION.tracks, 2);
  assert.ok(FORMATION.centresCm >= 400, 'track centres about 4 m apart');
  // a 4 m platform's inner edge clears its track's 3.6 m deck
  assert.ok(FORMATION.platformCm - 200 >= FORMATION.centresCm / 2 + 180);
  for (const l of WORLD_LINES) {
    const want = l.extends === null ? ['start', 'end'] : ['end'];
    assert.deepEqual(
      l.ends.map((e) => e.at),
      want,
      `${l.id} turns back at each terminus`,
    );
    for (const e of l.ends) {
      assert.ok(e.sCm >= l.fromCm && e.sCm <= l.fromCm + l.lengthCm, `${l.id} ${e.at} on the line`);
      if (e.kind === 'crossover')
        for (const s of l.stops)
          assert.ok(Math.abs(e.sCm - s) >= 2000 + 1200, `${l.id}'s crossover clears its platforms and their approach`);
    }
  }
  assert.deepEqual(
    LIVE_SECOND_TRACK.map((t) => t.line),
    [0, 1],
  );
});

test("line 2's extension starts at line 2's rail end and counts on from it", () => {
  const ring = WORLD_LINES.find((l) => l.extends === 1);
  assert.ok(ring);
  const E = LINES.east;
  const end = [Math.round((E.xs.at(-1)! + ORIGIN.x) * 100), Math.round((E.zs.at(-1)! + ORIGIN.z) * 100)];
  assert.ok(Math.hypot(ring.pts[0]![0] - end[0]!, ring.pts[0]![1] - end[1]!) < 150, 'first point at the rails end');
  assert.ok(Math.abs(ring.fromCm - Math.round(E.len * 100)) <= 1);
  // Ring Island's stop (halt 5): the line's last before the greybox route's own halts, which the ring row's stops make.
  assert.ok(ring.stops[0]! > TRAIN_STOPS[1]![5]!, 'its stops come after the pier stop');
});

test('no future span is steeper than the 4% ruling grade, and the Gorge halts stand low in the split', () => {
  for (const l of WORLD_LINES)
    for (let i = 1; i < l.pts.length; i++) {
      const a = l.pts[i - 1]!,
        b = l.pts[i]!;
      const run = Math.hypot(b[0] - a[0], b[1] - a[1]);
      assert.ok(run > 0 && Math.abs(b[2] - a[2]) <= 0.04 * run, `${l.id} span ${i} is steeper than 4%`);
    }
  const gorge = WORLD_LINES.flatMap((l) => l.halts).filter((h) => h.name === 'High Gorge');
  assert.equal(gorge.length, 3, 'line 2, the north-south line and the White Wall each end there');
  for (const h of gorge) assert.equal(h.y, 300);
  for (const l of WORLD_LINES)
    assert.ok(
      !l.halts.some((h) => h.name === 'Ring top' || h.name === 'High Port'),
      `${l.id} has no Ring top or High Port`,
    );
});

test("the map JSON's rails agree with the catalog's decks at every vertex and halt", () => {
  // The blockout draws platforms and crossovers from the catalog and rails from the map JSON: they must meet. The
  // generator writes the JSON's rails from the catalog; this fails when they drift (or the JSON is hand-edited).
  const TOL_M = 0.25; // height: the JSON's centimetre rounding, with slack
  const NEAR_M = 1; // and the rail must run within a metre of the vertex
  const page = readFileSync(new URL('../docs/world/map-prototypes.html', import.meta.url), 'utf8');
  const map = layout(parseMapPage(page), 'sickle', 'A');
  for (const l of WORLD_LINES) {
    const rails = l.legs.map((g) => {
      const line = map.lines.find((x) => x.id === g.id);
      assert.ok(line?.heights, `${l.id}: map line ${g.id} has heights`);
      assert.equal(line.heights.length, line.pts.length);
      return line.pts.map((p, i) => ({ x: p[0] + ORIGIN.x, z: p[1] + ORIGIN.z, y: line.heights![i]! }));
    });
    /** The rail's height (m) at the point of any leg nearest (x, z) metres, and how far that point is. */
    const railAt = (x: number, z: number) => {
      let best = { d: Infinity, y: 0 };
      for (const r of rails)
        for (let i = 1; i < r.length; i++) {
          const a = r[i - 1]!,
            b = r[i]!;
          const vx = b.x - a.x,
            vz = b.z - a.z;
          const t = Math.max(0, Math.min(1, ((x - a.x) * vx + (z - a.z) * vz) / (vx * vx + vz * vz || 1)));
          const d = Math.hypot(x - (a.x + vx * t), z - (a.z + vz * t));
          if (d < best.d) best = { d, y: a.y + (b.y - a.y) * t };
        }
      return best;
    };
    const meets = (what: string, x: number, z: number, y: number) => {
      const r = railAt(x / 100, z / 100);
      assert.ok(r.d <= NEAR_M, `${l.id} ${what}: the map rail is ${r.d.toFixed(1)} m off the catalog`);
      assert.ok(
        Math.abs(r.y - y / 100) <= TOL_M,
        `${l.id} ${what}: map rail ${r.y.toFixed(2)} m, catalog ${(y / 100).toFixed(2)} m`,
      );
    };
    l.pts.forEach((p, i) => meets(`vertex ${i}`, p[0], p[1], p[2]));
    for (const h of l.halts) meets(h.name, h.x, h.z, h.y);
  }
});
