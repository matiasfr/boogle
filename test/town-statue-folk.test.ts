// The little guys cross the green with the monument on it (review, 14 November): the real steering from
// src/place/folk.ts, run headless on every wander route against the blockout's avoidance footprints. Two overlapping
// footprints at G (the footing's and a rotated one for the statue) left a villager pacing between their corners;
// the monument has one enclosing footprint.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import blockoutLevel from '../content/built/levels/town-blockout.json' with { type: 'json' };
import { blockoutFeet, standBlockout } from '../src/place/town-blockout.ts';
import { ORIGIN } from '../src/place/layout.ts';
import { H } from '../src/place/terrain.ts';
import { TOWN_CENTRE, slotPoint } from '../src/place/town-plan.ts';

// The steering as written: `outOf` from sites.ts and folk.ts from `WALL` to the brains, in one sandbox.
const sites = fs.readFileSync('src/place/sites.ts', 'utf8'),
  folk = fs.readFileSync('src/place/folk.ts', 'utf8');
const cut = (source: string, from: string, to: string) => {
  const a = source.indexOf(from),
    b = source.indexOf(to);
  assert.ok(a >= 0 && b > a, `the steering's source still has "${from}"`);
  return source.slice(a, b);
};
const context = vm.createContext({ H, feet: [] as object[], g: null as object | null });
vm.runInContext(
  stripTypeScriptTypes(
    cut(
      sites,
      'export function outOf(',
      '// ---------------------------------------------------------------- building',
    ).replace('export ', '') +
      '\n' +
      cut(folk, 'const WALL =', '// ---------------------------------------------------------------- their brains'),
  ),
  context,
);
const SPEED = 1.7,
  DT = 1 / 60;
context.feet = blockoutFeet(standBlockout(blockoutLevel.placements, H)).map((f) => ({
  ...f,
  c: Math.cos(f.yaw),
  s: Math.sin(f.yaw),
}));

/** folk.ts's `WANDER`: the ring road every 45 degrees and the four points 6 m either way from G. */
const WANDER = [
  ...Array.from({ length: 8 }, (_, i) => slotPoint(i * 45, 17)),
  ...[-6, 6].flatMap((x) => [-6, 6].map((z) => ({ x: TOWN_CENTRE.x + x, z: TOWN_CENTRE.z + z }))),
].map(({ x, z }) => ({ x: x + ORIGIN.x, z }));

/** Walk one villager from `a` to `b`; how long it took and how far short it stopped. */
function walk(a: { x: number; z: number }, b: { x: number; z: number }) {
  const g = { x: a.x, z: a.z, y: H(a.x, a.z), yaw: 0, tx: b.x, tz: b.z, route: { left: -1 } };
  context.g = g;
  let ticks = 0;
  while (ticks < 6000) {
    ticks++;
    if (vm.runInContext(`steer(g, ${DT}, ${SPEED})`, context)) break;
  }
  return { ticks, short: Math.hypot(g.x - b.x, g.z - b.z) };
}

test('folk.ts still wanders the routes this test walks', () => {
  assert.match(folk, /\.\.\.Array\.from\(\{ length: 8 \}, \(_, i\) => slotPoint\(i \* 45, 17\)\),/);
  assert.match(
    folk,
    /\[-6, 6\]\.flatMap\(\(x\) => \[-6, 6\]\.map\(\(z\) => \(\{ x: TOWN_CENTRE\.x \+ x, z: TOWN_CENTRE\.z \+ z \}\)\)\)/,
  );
});

test('a little guy crossing the green from G-(6,6) to G+(6,6) walks round the monument and arrives', () => {
  // Round the footing alone this takes 684 ticks (the straight line is 599); the bound is close to that.
  const { ticks, short } = walk(WANDER[8]!, WANDER[11]!);
  assert.ok(short < 0.25, `stopped ${short.toFixed(2)} m short after ${ticks} ticks`);
  assert.ok(ticks <= 720, `took ${ticks} ticks`);
});

test('no wander route is stranded: every pair arrives, in at most half as long again as the straight walk', () => {
  for (const a of WANDER)
    for (const b of WANDER) {
      if (a === b) continue;
      const { ticks, short } = walk(a, b),
        straight = Math.hypot(b.x - a.x, b.z - a.z) / SPEED / DT,
        route = `(${a.x.toFixed(1)}, ${a.z.toFixed(1)}) to (${b.x.toFixed(1)}, ${b.z.toFixed(1)})`;
      assert.ok(short < 0.25, `${route}: stopped ${short.toFixed(2)} m short after ${ticks} ticks`);
      assert.ok(ticks <= straight * 1.5 + 60, `${route}: ${ticks} ticks against ${straight.toFixed(0)} straight`);
    }
});
