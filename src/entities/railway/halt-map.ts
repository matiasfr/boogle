// What the halts' map displays show and which way each faces: the island map's lines and stops, the halts (Place's,
// then line 2's Pier), and every display's facing and "you are here" stops. Pure numbers, so halts-view.ts builds
// from them and a unit test checks every display's names (test/island-map-labels.test.ts).
import { LINE_HALTS, TRAIN_STOPS } from '../../sim/railway-train.ts';
import { RAIL_LINES } from '../../sim/railway-lines.ts';
import { simplify, type MapLine } from '../../render/island-map.ts';

type Layout = typeof import('../../place/layout.ts');
type LinePoint = import('../../place/layout.ts').LinePoint;

/** Each line's colour on the displays' map, track and train: line 1 gold, line 2 teal. */
export const LINE_MARK = ['#ffd23f', '#2ec4b6'] as const;

/** The island map every display shows: each line's track from its first stop to its last, every 4 m then simplified
 * to within 1.5 m, and its stops named as the halts are ("Village, line 2" is Village). */
export function haltMapLines(layout: Layout): MapLine[] {
  const Q: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
  // Place's line and v26's stops: v27's Railhead and Ring Island (past the Pier, off Place's line) join the map with
  // their views (R4a).
  return TRAIN_STOPS.map((all, k) => {
    const cm = all.filter((_c, i) => !RAIL_LINES[k]!.halts[i]!.heads && !RAIL_LINES[k]!.halts[i]!.ring);
    const line = layout.LINKS[k]!.line,
      s0 = cm[0]! / 100,
      s1 = cm[cm.length - 1]! / 100;
    const at = (s: number) => (layout.lineAt(line, s, Q), { x: Q.x + layout.ORIGIN.x, z: Q.z + layout.ORIGIN.z, s });
    const dense = [];
    for (let s = s0; s < s1; s += 4) dense.push(at(s));
    dense.push(at(s1));
    return {
      color: LINE_MARK[k]!,
      path: simplify(dense, 1.5),
      laid: s1,
      stops: cm.map((c, i) => ({
        name: LINE_HALTS.find((h) => h.line === k && h.stop === i)!.name.split(',')[0]!,
        ...at(c / 100),
      })),
    };
  });
}

/** Place's halts, then line 2's Pier halt (LINE_HALTS[5], Place's halt maths at s 719-741 m), which opens with Q6. */
export function haltRows(layout: Layout) {
  // By name: from v27 the Railhead and Ring Island follow it (R4a draws those and moves this one east).
  const pier = LINE_HALTS.find((h) => h.name === 'Pier')!;
  return [
    ...layout.HALTS.map((h) => ({ ...h, island: !!h.island })),
    { name: pier.name, line: 1 as const, s0: 719, s1: 741, lat: -2.9, stop: 3, island: false },
  ];
}

/** A display's face normal as a yaw (normal (sin, cos)) for a halt whose line runs along `lineYaw` with the halt at
 * `lat` from the rails: at a halt it faces the rails; on the Home island it faces the head ramp (back along the line). */
export function displayYaw(lineYaw: number, lat: number, island: boolean) {
  return island ? lineYaw + Math.PI : lineYaw + (lat > 0 ? Math.PI / 2 : -Math.PI / 2);
}

/** Every display in the game: the halt it stands at, its face's yaw, and the stops it rings. The Home island's two
 * edges share one, built with line 1's edge. */
export function haltDisplays(layout: Layout) {
  const rows = haltRows(layout);
  const P: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
  return rows
    .filter((h) => !h.island || h.line === 0)
    .map((h) => {
      layout.lineAt(layout.LINKS[h.line]!.line, (h.s0 + h.s1) / 2, P);
      return {
        name: h.name,
        yaw: displayYaw(Math.atan2(P.ux, P.uz), h.lat, h.island),
        here: h.island
          ? rows.filter((r) => r.island).map((r) => ({ line: r.line, stop: r.stop }))
          : [{ line: h.line, stop: h.stop }],
      };
    });
}
