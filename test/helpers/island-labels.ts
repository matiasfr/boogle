// Every halt display's map names, for the layout this process loads (BOOGLE_HOME picks it): no two names' boxes
// touch, none leaves the face, and none sits on a stop's ring or a train standing there. At every stage line 2 has
// (src/entities/railway/halt-map.ts): the Pier unlaid (five names, today's sizes), the Pier laid (six, the sea line
// and Ring Island dim), Q7 laid at each of the eight railheads (seven) and joined. Pure numbers: the same boxes, sizes
// and fit the game draws.
import assert from 'node:assert/strict';
import { fitMap, MAP_CELL, mapLabels, mapPx, mapSizes, stopClear, type MapLabel } from '../../src/render/island-map.ts';
import { haltDisplays, haltMap, type MapStage } from '../../src/entities/railway/halt-map.ts';

const CW = MAP_CELL.w,
  CH = MAP_CELL.h;

/** Every stage of line 2's map, with the names it shows. */
export const MAP_STAGES: readonly { at: string; stage: MapStage; names: number }[] = [
  { at: 'Pier unlaid', stage: { open: 3, head: 0 }, names: 5 },
  { at: 'Pier laid', stage: { open: 4, head: 0 }, names: 6 },
  ...Array.from({ length: 8 }, (_, head) => ({ at: `railhead ${head}`, stage: { open: 5, head }, names: 7 })),
  { at: 'joined', stage: { open: 6, head: 7 }, names: 7 },
];

export async function checkHaltLabels() {
  const layout = await import('../../src/place/layout.ts');
  const displays = haltDisplays(layout);
  assert.ok(displays.length >= 5);
  for (const { at: stageAt, stage, names: count } of MAP_STAGES) {
    const { lines, scale } = haltMap(layout, stage);
    const S = mapSizes(CH, scale),
      clear = stopClear(CH, scale);
    assert.equal(scale, stage.open >= 4 ? 0.7 : 1, `${stageAt}: marks at 0.7 once the sea line is on the map`);
    for (const d of displays) {
      const n = { x: Math.sin(d.yaw), z: Math.cos(d.yaw) };
      const v = fitMap(lines, { x: -n.x, z: -n.z }, CW, CH, CH * MAP_CELL.pad);
      const labels = mapLabels(lines, v, CW, CH, d.here, scale);
      const at = `${d.name} (${stageAt})`;
      const names = new Set(lines.flatMap((l) => l.stops.map((s) => s.name)));
      assert.equal(names.size, count, `${at}: ${count} names on the map`);
      assert.equal(labels.length, names.size, `${at}: every name placed once`);
      assert.equal(new Set(labels.map((b) => b.name)).size, names.size, `${at}: no name twice`);
      const inside = (b: MapLabel) => b.x >= 0 && b.y >= 0 && b.x + b.w <= CW && b.y + b.h <= CH;
      for (const b of labels) assert.ok(inside(b), `${at}: "${b.name}" stays on the face`);
      for (let i = 0; i < labels.length; i++)
        for (let j = i + 1; j < labels.length; j++) {
          const a = labels[i]!,
            b = labels[j]!;
          const clash = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
          assert.ok(!clash, `${at}: "${a.name}" and "${b.name}" overlap`);
        }
      const stops = lines.flatMap((l) => l.stops.map((s) => ({ s, p: mapPx(v, s.x, s.z) })));
      for (const { s, p } of stops) {
        for (const b of labels) {
          const dx = p[0] - Math.max(b.x, Math.min(p[0], b.x + b.w)),
            dy = p[1] - Math.max(b.y, Math.min(p[1], b.y + b.h));
          assert.ok(Math.hypot(dx, dy) >= clear - 1e-6, `${at}: "${b.name}" covers ${s.name}'s ring or train`);
        }
      }
      // Two stops of different names keep a ring and a dot between their centres.
      for (let i = 0; i < stops.length; i++)
        for (let j = i + 1; j < stops.length; j++) {
          const a = stops[i]!,
            b = stops[j]!;
          if (a.s.name === b.s.name) continue;
          const gap = Math.hypot(a.p[0] - b.p[0], a.p[1] - b.p[1]);
          assert.ok(gap >= S.ring + S.dot, `${at}: ${a.s.name} and ${b.s.name} are ${gap.toFixed(1)} px apart`);
        }
    }
  }
  return displays.length;
}
