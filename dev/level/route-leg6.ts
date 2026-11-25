import { readFileSync } from 'node:fs';
import { island } from '../../src/island/index.ts';
import { CANOPY_TRUNKS } from '../../src/content/levels/leg3.ts';
import { layout, parseMapPage } from '../../src/sickle/map-data.ts';
import {
  legFrame,
  legRack,
  rowPoint,
  rowSide,
  RAIL_ARRIVAL,
  RAIL_GRANTS,
  RAIL_LEGS,
} from '../../src/sim/railway-route.ts';
import { tracks } from './rail-network.ts';
import { shoreDistance } from './route-leg4.ts';
import { circumradius, measure } from './track-continuity.ts';

export function checkLeg6() {
  const entries: { message: string; passed: boolean }[] = [];
  const check = (message: string, passed: boolean) => entries.push({ message, passed });
  const land = layout(parseMapPage(readFileSync('docs/world/map-prototypes.html', 'utf8')), 'sickle', 'A').land;
  const network = tracks();
  for (const leg of RAIL_LEGS.slice(-2)) {
    const track = network.find((t) => t.id === leg.row + '-centre')!;
    const pts = track.pts.slice(track.pts.findIndex((p) => p.s >= leg.fromCm / 100) - 1);
    const end = leg.sections[0]!.toCm;
    const report = measure({ ...track, pts }).row;
    const radius = Math.min(...pts.slice(1, -1).map((b, i) => circumradius(pts[i]!, b, pts[i + 2]!)));
    const largestTurn = Math.max(
      ...pts.slice(1, -1).map((b, i) => {
        const a = pts[i]!,
          c = pts[i + 2]!,
          dx = b.x - a.x,
          dz = b.z - a.z,
          ex = c.x - b.x,
          ez = c.z - b.z;
        return (Math.abs(Math.atan2(dx * ez - dz * ex, dx * ex + dz * ez)) * 180) / Math.PI;
      }),
    );
    check(
      `${leg.id} kink ${report.maxKink.toFixed(2)} degrees, chord turn ${largestTurn.toFixed(3)} degrees, chord radius ${radius.toFixed(2)} m`,
      report.kinksOver === 0 && report.under40 === 0 && radius >= 40 && largestTurn <= 2,
    );
    const frame = legFrame(leg, 0),
      rack = legRack(leg, 0);
    const gap = Math.hypot(frame.x - rack.x, frame.z - rack.z) / 100;
    check(
      `${leg.id} section ${(end - leg.fromCm) / 100} m, rack to frame ${gap.toFixed(2)} m`,
      end - leg.fromCm < 96000 && gap < 15,
    );
    const y = rowPoint(leg.row, end).y;
    check(
      `${leg.id} platform level at ${y / 100} m`,
      [-2000, -1000, 1000, 2000].every((d) => rowPoint(leg.row, end + d).y === y),
    );
    const samples = [];
    const bay = leg.row === 'bay';
    // The two existing station approaches are measured by legs 2 and 3.
    for (let s = bay ? leg.fromCm + 2500 : 118500; s <= end + 2000; s += 50) samples.push(rowPoint(leg.row, s));
    for (const id of bay ? ['wall-cn', 'wall-cs'] : ['bell-w']) {
      const shore = land.find((l) => l.id === id)!.outline;
      const clear = Math.min(...samples.map((p) => -shoreDistance([p.x / 100 - 1000, p.z / 100], shore)));
      check(
        `${leg.id} to ${id} ${clear.toFixed(2)} m`,
        clear >= (id === 'wall-cn' ? 38 : id === 'wall-cs' ? 51 : 9.75),
      );
    }
    if (!bay) continue;
    const reef = land.find((l) => l.id === 'notch-isle')!.outline;
    let shore = end;
    for (; shore > leg.fromCm; shore -= 10) {
      const p = rowPoint(leg.row, shore);
      if (shoreDistance([p.x / 100 - 1000, p.z / 100], reef) <= 0) break;
    }
    const inland = (end - shore) / 100;
    check(`Notch halt ${inland.toFixed(1)} m along the row from the reef shore`, Math.abs(inland - 61) < 1);
    for (const [id, x, z, w] of CANOPY_TRUNKS) {
      const clear = Math.min(
        ...samples.map((p) =>
          Math.hypot(Math.max(0, Math.abs(p.x / 100 - x) - w / 2), Math.max(0, Math.abs(p.z / 100 - z) - w / 2)),
        ),
      );
      const minimum = id === 'mother-4' ? 10.6 : id === 'mother-3' ? 34.6 : id === 'trunk-8' ? 12.2 : 10;
      check(`Notch to ${id} ${clear.toFixed(2)} m`, clear >= minimum);
    }
    let archGap = Infinity;
    for (let s = end - 2000; s <= end + 2000; s += 50)
      for (const side of [-1, 1]) {
        const p = rowSide(leg.row, s, side * 780, 90, 400);
        for (const z of [-972, -1028])
          archGap = Math.min(
            archGap,
            Math.hypot(Math.max(0, Math.abs(p.x / 100 + 1620) - 13), Math.max(0, Math.abs(p.z / 100 - z) - 11)),
          );
      }
    check(`Notch platforms to arch ${archGap.toFixed(2)} m`, archGap >= 10);
  }
  const lantern = RAIL_GRANTS[3]!.at;
  check('Lantern inside arch opening', Math.abs(lantern.x / 100 + 1620) < 13 && Math.abs(lantern.z / 100 + 1000) < 17);
  const x = RAIL_ARRIVAL.x / 100,
    z = RAIL_ARRIVAL.z / 100,
    y = island.heightAt(x, z);
  check(
    `Meeting marker on beach at ${y.toFixed(2)} m outside keep-outs`,
    Math.abs(y - RAIL_ARRIVAL.y / 100) < 0.1 && !island.keptOut(x, z),
  );
  return { level: 'route leg 6', entries, failures: entries.filter((e) => !e.passed).length };
}
