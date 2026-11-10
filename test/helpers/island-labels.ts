// Every halt display's map names, for the layout this process loads (BOOGLE_HOME picks it): no two names' boxes
// touch, none leaves the face, and none sits on a stop's ring or a train standing there. With the pier stretch laid
// and unlaid (its names dim but still placed). Pure numbers: the same boxes the game draws.
import assert from 'node:assert/strict';
import { fitMap, mapLabels, mapPx, stopClear, type MapLabel } from '../../src/render/island-map.ts';
import { haltDisplays, haltMapLines } from '../../src/entities/railway/halt-map.ts';

// The displays' atlas cell and padding (src/entities/railway/island-boards.ts).
const CW = 320,
  CH = 256;

export async function checkHaltLabels() {
  const layout = await import('../../src/proto/place/layout.ts');
  const lines = haltMapLines(layout);
  const displays = haltDisplays(layout);
  assert.ok(displays.length >= 5);
  const clear = stopClear(CH);
  const laidFull = lines.map((l) => l.laid);
  for (const pierLaid of [true, false]) {
    // Unlaid: line 2 laid up to its third stop (the pier stretch beyond is dashed).
    lines.forEach((l, k) => (l.laid = pierLaid || k === 0 ? laidFull[k]! : l.stops[2]!.s));
    for (const d of displays) {
      const n = { x: Math.sin(d.yaw), z: Math.cos(d.yaw) };
      const v = fitMap(lines, { x: -n.x, z: -n.z }, CW, CH, CH * 0.11);
      const labels = mapLabels(lines, v, CW, CH, d.here);
      const at = `${d.name}${pierLaid ? '' : ' (pier unlaid)'}`;
      const names = new Set(lines.flatMap((l) => l.stops.map((s) => s.name)));
      assert.equal(labels.length, names.size, `${at}: every name placed`);
      const inside = (b: MapLabel) => b.x >= 0 && b.y >= 0 && b.x + b.w <= CW && b.y + b.h <= CH;
      for (const b of labels) assert.ok(inside(b), `${at}: "${b.name}" stays on the face`);
      for (let i = 0; i < labels.length; i++)
        for (let j = i + 1; j < labels.length; j++) {
          const a = labels[i]!,
            b = labels[j]!;
          const clash = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
          assert.ok(!clash, `${at}: "${a.name}" and "${b.name}" overlap`);
        }
      for (const l of lines)
        for (const s of l.stops) {
          const [x, y] = mapPx(v, s.x, s.z);
          for (const b of labels) {
            const dx = x - Math.max(b.x, Math.min(x, b.x + b.w)),
              dy = y - Math.max(b.y, Math.min(y, b.y + b.h));
            assert.ok(Math.hypot(dx, dy) >= clear - 1e-6, `${at}: "${b.name}" covers ${s.name}'s ring or train`);
          }
        }
    }
  }
  lines.forEach((l, k) => (l.laid = laidFull[k]!));
  return displays.length;
}
