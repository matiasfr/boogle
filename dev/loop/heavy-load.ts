// Reproducible geometric comparison for docs/plans/heavy-load.md. No invented turnaround delay:
// start at the source, finish at the frame, return empty only between carries of the SAME bill.
// Sources use the loop graph's nearest bill-sized set; depot/shelf positions use the rendered layout.
// This is a walking lower bound, not a terrain/pathfinding or human-feel measurement.
import { NODES, grindOf } from './graph.ts';
import { HEAVY_LOAD, RAILWAY_T1 } from '../../src/sim/railway-layout.ts';
import { LINE2_PACK, LINE2_STATIONS, depotOffset, depotShelfSide } from '../../src/sim/railway-line2-layout.ts';
import { LINKS, lineAt } from '../../src/place/layout.ts';
import { frameBesideLine } from '../../src/place/spatial-station.ts';
import { H } from '../../src/place/terrain.ts';

const walk = 5.6;
const speed = (n: number, comfort: number, floor: number) => {
  const fraction = Math.max(0, n - comfort) / (comfort * HEAVY_LOAD.extra);
  return walk * (1 - fraction + fraction * floor);
};
const seconds = (bill: number, cap: number, comfort: number, metres: number, floor: number) => {
  let t = 0;
  for (let left = bill; left > 0;) {
    const n = Math.min(left, cap);
    t += metres / speed(n, comfort, floor);
    left -= n;
    if (left) t += metres / walk;
  }
  return t;
};
console.log('| Haul (bill) | Source–frame m | One trip, comfort / extra s | Equal bill, comfort / extra s | Better |');
console.log('| --- | ---: | ---: | ---: | --- |');
for (const n of NODES.filter((n) => ['T1', 'T2', 'T3', 'forge', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5'].includes(n.id))) {
  const comfort = n.id.startsWith('Q') ? LINE2_PACK.carry : RAILWAY_T1.carry;
  const max = comfort * (1 + HEAVY_LOAD.extra);
  for (const g of grindOf(n, comfort === LINE2_PACK.carry)) {
    const bill = n.bill[g.material]!;
    let distance = g.metres;
    if (g.by === 'cart') {
      const k = LINE2_STATIONS.findIndex((s) => s.id === n.id);
      const spec = LINE2_STATIONS[k]!;
      const link = LINKS[1]!;
      const frame = frameBesideLine(link.stations[k]!, link.line, link.dir);
      let x = frame.x - (Math.sin(frame.yaw) * depotOffset(spec)) / 100;
      let z = frame.z - (Math.cos(frame.yaw) * depotOffset(spec)) / 100;
      if (spec.id === 'Q2') {
        const side = link.stations[k]!.side;
        x = frame.x - Math.sin(frame.yaw) * 6 - Math.cos(frame.yaw) * side * 8;
        z = frame.z - Math.cos(frame.yaw) * 6 + Math.sin(frame.yaw) * side * 8;
      }
      if (g.material === 'rails') {
        const p = lineAt(link.line, spec.fromCm / 100 - 1.5, { x: 0, z: 0, ux: 0, uz: 1 });
        const side = link.stations[k]!.side;
        const along = spec.id === 'Q5' ? -depotOffset(spec) / 100 : 3;
        x = spec.x / 100 + p.ux * along - (p.uz * side * depotShelfSide(spec)) / 100;
        z = spec.z / 100 + p.uz * along + (p.ux * side * depotShelfSide(spec)) / 100;
      }
      distance = Math.hypot(x - frame.x, z - frame.z);
      // Sample the actual ground along the short walk (not the frame's raised base).
      let groundMetres = 0;
      let y = H(x, z);
      for (let i = 1; i <= 100; i++) {
        const next = H(x + ((frame.x - x) * i) / 100, z + ((frame.z - z) * i) / 100);
        groundMetres += Math.hypot(distance / 100, next - y);
        y = next;
      }
      distance = groundMetres;
    }
    const c = Math.min(bill, comfort),
      h = Math.min(bill, max);
    const light = seconds(bill, comfort, comfort, distance, HEAVY_LOAD.minSpeed);
    const heavy = seconds(bill, max, comfort, distance, HEAVY_LOAD.minSpeed);
    console.log(
      `| ${n.id} ${g.material} (${bill}) | ${distance.toFixed(2)} | ${(distance / speed(c, comfort, HEAVY_LOAD.minSpeed)).toFixed(2)} / ${(distance / speed(h, comfort, HEAVY_LOAD.minSpeed)).toFixed(2)} | ${light.toFixed(2)} / ${heavy.toFixed(2)} | ${h <= comfort ? 'same; no extra needed' : heavy < light ? 'extra' : 'comfort'} |`,
    );
  }
}
