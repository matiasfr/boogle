// What the halts' map displays show and which way each faces: the island map's lines and stops, the halts (Place's,
// then line 2's Pier), and every display's facing and "you are here" stops. Pure numbers, so halts-view.ts builds
// from them and a unit test checks every display's names (test/island-map-labels.test.ts).
import { LINE_HALTS, TRAIN_STOPS } from '../../sim/railway-train.ts';
import { MAP_SEA_SCALE, simplify, type MapLine } from '../../render/island-map.ts';
import { line2At } from './line2-path.ts';
import { RAIL_LINES } from '../../sim/railway-lines.ts';

type Layout = typeof import('../../place/layout.ts');
type LinePoint = import('../../place/layout.ts').LinePoint;

/** Each line's colour on the displays' map, track and train: line 1 gold, line 2 teal. */
export const LINE_MARK = ['#ffd23f', '#2ec4b6'] as const;

/** How far line 2 has got, as the map shows it: `open` is how many of its stops trains serve (trainStops' length: 3
 * before the Pier is laid, 4 the Pier laid, 5 with Q7 laid so the Railhead stands, 6 once the rivet is struck) and
 * `head` the railhead's bent (ringHead; read only from 5 stops). */
export type MapStage = { open: number; head: number };

/** The island map every display shows, for a stage of line 2 (ring-island-build1, "the halt map at eight stops", calls
 * 66-70). Each line's track from its first stop to its last, every 4 m then simplified to within 1.5 m (every stop
 * kept as a vertex, so a train's marker meets its stop), and its stops named as the halts are ("Village, line 2" is
 * Village).
 * - Until the Pier is laid it is v26's map at today's sizes: line 2 ends at the dim Pier, the stretch past Far Head
 *   dashed.
 * - From the Pier laid it is line 2 whole, out to dim Ring Island, fitted at true scale with every mark at
 *   `MAP_SEA_SCALE` of today's (the 320 x 256 faces cannot name eight stops any bigger once the sea line is on them).
 * - From Q7 laid the Railhead is a lit, named stop at its bent (`head`) and the solid track ends there.
 * - Once joined the track is solid to Ring Island, whose name lights; the Railhead stays at the last bent. */
export function haltMap(layout: Layout, stage: MapStage = { open: 3, head: 0 }): { lines: MapLine[]; scale: number } {
  const Q: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
  const sea = stage.open >= 4;
  // Lines 1 and 2 as far as Ring Island: the greybox route's halts (a leg's, a shut row's) are step 4's to map.
  const lines = RAIL_LINES.slice(0, 2).map((def, k): MapLine => {
    // Line 2's halts in order: Village, Quarry, Far Head, Pier, Railhead (it moves with `head`), Ring Island.
    const picks = def.halts
      .map((h, i) => ({ h, i }))
      .filter(({ h }) => !h.leg && !h.shut)
      .filter(({ h }) => (k === 0 ? !h.heads && !h.ring : h.ring ? sea : h.heads ? stage.open >= 5 : true));
    const stops = picks.map(({ h, i }) => ({
      name: LINE_HALTS.find((x) => x.line === k && x.stop === i)!.name.split(',')[0]!,
      s: (h.heads ? h.heads[Math.max(0, Math.min(h.heads.length - 1, stage.head))]! : TRAIN_STOPS[k]![i]!) / 100,
    }));
    const at = (s: number) => {
      if (k === 1) line2At(s, Q);
      else layout.lineAt(layout.LINKS[k]!.line, s, Q);
      return { x: Q.x + layout.ORIGIN.x, z: Q.z + layout.ORIGIN.z, s };
    };
    // Between each pair of stops: a point every 4 m, simplified; the stops themselves stay vertices.
    const path = [at(stops[0]!.s)];
    for (let j = 1; j < stops.length; j++) {
      const a = stops[j - 1]!.s,
        b = stops[j]!.s,
        dense = [at(a)];
      for (let s = a + 4; s < b; s += 4) dense.push(at(s));
      dense.push(at(b));
      path.push(...simplify(dense, 1.5).slice(1));
    }
    const last = stops[stops.length - 1]!.s;
    const laid = k === 0 ? last : stage.open >= 6 ? last : stops[stage.open >= 5 ? 4 : sea ? 3 : 2]!.s;
    return { color: LINE_MARK[k]!, path, laid, stops: stops.map((x) => ({ ...x, ...at(x.s) })) };
  });
  return { lines, scale: sea ? MAP_SEA_SCALE : 1 };
}

/** Place's halts, then line 2's Pier halt (s 719-741 m, 2.9 m east of the down track: ring-island-build1, call 53),
 * which opens with Q6. Found by name: from v27 the Railhead and Ring Island follow it in LINE_HALTS, but they have no
 * Place platform (the railhead's and the island's are drawn by their own views). */
export function haltRows(layout: Layout) {
  const pier = LINE_HALTS.find((h) => h.name === 'Pier')!;
  return [
    ...layout.HALTS.map((h) => ({ ...h, island: !!h.island })),
    { name: pier.name, line: pier.line as 1, s0: 719, s1: 741, lat: 2.9, stop: pier.stop, island: false },
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
