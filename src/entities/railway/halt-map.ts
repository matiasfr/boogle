// What the halts' map displays show and which way each faces: the island map's lines and stops, the halts (Place's,
// then line 2's Pier), and every display's facing and "you are here" stops. Pure numbers, so halts-view.ts builds
// from them and a unit test checks every display's names (test/island-map-labels.test.ts).
import { LINE_HALTS, TRAIN_STOPS } from '../../sim/railway-train.ts';
import { MAP_SEA_SCALE, simplify, type MapLine } from '../../render/island-map.ts';
import { line2At, line2World, line2Y } from './line2-path.ts';
import { LINE2, RAIL_LINES, type RailHalt } from '../../sim/railway-lines.ts';

type Layout = typeof import('../../place/layout.ts');
type LinePoint = import('../../place/layout.ts').LinePoint;

/** Each line's colour on the displays' map, track and train: line 1 gold, line 2 teal. */
export const LINE_MARK = ['#ffd23f', '#2ec4b6'] as const;

/** How far line 2 has got, as the map shows it: `open` is how many of its stops trains serve (trainStops' length: 3
 * before the Pier is laid, 4 the Pier laid, 5 with Q7 laid so the Railhead stands, 6 once the rivet is struck, then
 * one more for each section of the stack line laid: 10 with High Gorge open) and `head` the railhead's bent
 * (ringHead; read only from 5 stops). */
export type MapStage = { open: number; head: number };

/** The stack line on the map (docs/plans/greybox-route.md, leg 1 step 4b; the step 4 design review's answer l). Past
 * Ring Island the track is drawn short, about the island's stop: `drawX` of its true run west and `drawZ` of its run
 * north. The leg is 2.0 km of open sea beside an island map 0.9 km long: at true scale every mark would have to
 * halve again (Village and Quarry would stand 16 px apart on a face whose stops need 19). 0.3 west keeps the leg
 * inside the island map's own width and its heads 28 px or more apart; 0.22 north adds 30% to the map's height, not
 * 40%, and draws High Gorge 8 degrees west of its true bearing from the island. The fit is the whole leg's from the
 * rivet on, so the map never rescales at a lay. Placeholder names, not The Boogler's. */
export const STACK_MAP = { drawX: 0.3, drawZ: 0.22, head: 'Stack railhead', halt: 'Stack halt' } as const;
const L2_HALTS = RAIL_LINES[LINE2]!.halts;
/** Ring Island's stop on line 2, and how many stops are open once the rivet is struck. */
const RING_STOP = L2_HALTS.findIndex((h) => h.ring && !h.leg),
  JOINED = RING_STOP + 1;
/** The stack line's head `h` no longer takes trains with `open` stops (its `closesAt`). */
const closed = (h: RailHalt, open: number) => h.closesAt !== undefined && open >= h.closesAt;

/** The island map every display shows, for a stage of line 2 (ring-island-build1, "the halt map at eight stops", calls
 * 66-70). Each line's track from its first stop to its last, every 4 m then simplified to within 1.5 m (every stop
 * kept as a vertex, so a train's marker meets its stop), and its stops named as the halts are ("Village, line 2" is
 * Village).
 * - Until the Pier is laid it is v26's map at today's sizes: line 2 ends at the dim Pier, the stretch past Far Head
 *   dashed.
 * - From the Pier laid it is line 2 whole, out to dim Ring Island, fitted at true scale with every mark at
 *   `MAP_SEA_SCALE` of today's (the 320 x 256 faces cannot name eight stops any bigger once the sea line is on them).
 * - From Q7 laid the Railhead is a lit, named stop at its bent (`head`) and the solid track ends there.
 * - Once joined the track is solid to Ring Island, whose name lights; the Railhead stays at the last bent. The
 *   stack line is on the map from then (STACK_MAP): dashed on to a dim High Gorge, solid to the last section laid,
 *   whose head is a lit stop named `Stack railhead`; a square frame mark leads the name of the stop the building
 *   frame stands at (Ring Island's until a section is laid). The head before it is an unnamed dot while trains
 *   still stop there, and is gone (`hide`) once it closes behind. With High Gorge open its name lights, the frame
 *   mark goes and the third head, the request stop, is `Stack halt`. A stop's index is its line's at every stage. */
export function haltMap(layout: Layout, stage: MapStage = { open: 3, head: 0 }): { lines: MapLine[]; scale: number } {
  const Q: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
  const sea = stage.open >= 4;
  const leg = stage.open >= JOINED,
    last = L2_HALTS.length - 1;
  // Lines 1 and 2; the greybox route's other rows (every halt shut) are their own legs' to map.
  const lines = RAIL_LINES.slice(0, 2).map((def, k): MapLine => {
    // Line 2's halts in order: Village, Quarry, Far Head, Pier, Railhead (it moves with `head`), Ring Island; then,
    // once joined, the stack line's open heads and High Gorge (a head not yet laid to is not on the map).
    const picks = def.halts
      .map((h, i) => ({ h, i }))
      .filter(({ h }) => !h.shut)
      .filter(({ h, i }) => {
        if (h.leg) return k === 1 && leg && (i < stage.open || i === last);
        return k === 0 ? !h.heads && !h.ring : h.ring ? sea : h.heads ? stage.open >= 5 : true;
      });
    const stops = picks.map(({ h, i }) => {
      const s = (h.heads ? h.heads[Math.max(0, Math.min(h.heads.length - 1, stage.head))]! : TRAIN_STOPS[k]![i]!) / 100,
        head = i === stage.open - 1 && i < last;
      // The stop the building frame stands at: the line's end from the rivet until High Gorge opens.
      const mark = leg && k === 1 && head ? { frame: true as const } : {};
      if (!h.leg) return { name: LINE_HALTS.find((x) => x.line === k && x.stop === i)!.name.split(',')[0]!, s, ...mark };
      if (i === last) return { name: h.name, s };
      if (closed(h, stage.open)) return { name: '', s, hide: true as const };
      return { name: head ? STACK_MAP.head : stage.open > last && h.closesAt === undefined ? STACK_MAP.halt : '', s, ...mark };
    });
    const ring = { x: 0, z: 0 },
      ringS = L2_HALTS[RING_STOP]!.s / 100;
    if (k === 1 && leg) {
      line2At(ringS, Q);
      ring.x = Q.x;
      ring.z = Q.z;
    }
    const at = (s: number) => {
      if (k === 1) line2At(s, Q);
      else layout.lineAt(layout.LINKS[k]!.line, s, Q);
      if (k === 1 && s > ringS) {
        Q.x = ring.x + (Q.x - ring.x) * STACK_MAP.drawX;
        Q.z = ring.z + (Q.z - ring.z) * STACK_MAP.drawZ;
      }
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
    const end = stops[stops.length - 1]!.s;
    const laid = k === 0 ? end : stops[leg ? stage.open - 1 : stage.open >= 5 ? 4 : sea ? 3 : 2]!.s;
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

const STANDS: (open: number) => boolean = () => false;

/** A display's face normal as a yaw (normal (sin, cos)) for a halt whose line runs along `lineYaw` with the halt at
 * `lat` from the rails: at a halt it faces the rails; on the Home island it faces the head ramp (back along the line). */
export function displayYaw(lineYaw: number, lat: number, island: boolean) {
  return island ? lineYaw + Math.PI : lineYaw + (lat > 0 ? Math.PI / 2 : -Math.PI / 2);
}

/** The stack line's departure boards (the step 4 design review's answer g: the boards are the halt map's displays): one
 * on each head's platform and one on High Gorge's north platform, at the platform's back (lat +5.8 of its +1.8 to
 * +6.3), facing the rails. A head's stands 13 m short of its section's end (3 m short of the stop), between the rack
 * (18 m short) and the frame (8 m short); the Gorge's 10 m short of its stop. `at` is the deck under it (world
 * metres); `shut(open)` is whether it is down with `open` stops on the line (not yet laid to, or closed behind). */
export function stackDisplays() {
  const LAT = 5.8,
    p = { x: 0, z: 0 },
    ahead = { x: 0, z: 0 };
  return L2_HALTS.flatMap((h, stop) => {
    if (!h.leg) return [];
    const s = h.s / 100 - (h.end?.kind === 'stub' ? 3 : 10);
    line2World(s, LAT, p);
    line2World(s + 1, LAT, ahead);
    return [
      {
        name: h.name,
        stop,
        yaw: displayYaw(Math.atan2(ahead.x - p.x, ahead.z - p.z), LAT, false),
        here: [{ line: LINE2, stop }],
        at: { x: p.x, y: line2Y(s) + 0.9, z: p.z },
        shut: (open: number) => stop >= open || closed(h, open),
      },
    ];
  });
}

/** Every display in the game: the halt it stands at, its face's yaw, and the stops it rings. The Home island's two
 * edges share one, built with line 1's edge; the stack line's (stackDisplays) follow Place's. */
export function haltDisplays(layout: Layout) {
  const rows = haltRows(layout);
  const P: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
  return [
    ...rows
      .filter((h) => !h.island || h.line === 0)
      .map((h) => {
        layout.lineAt(layout.LINKS[h.line]!.line, (h.s0 + h.s1) / 2, P);
        return {
          name: h.name,
          yaw: displayYaw(Math.atan2(P.ux, P.uz), h.lat, h.island),
          /** Place's halts are never down for a stage of the stack line (stackDisplays' are). */
          shut: STANDS,
          here: h.island
            ? rows.filter((r) => r.island).map((r) => ({ line: r.line, stop: r.stop }))
            : [{ line: h.line, stop: h.stop }],
        };
      }),
    ...stackDisplays().map(({ name, yaw, here, shut }) => ({ name, yaw, here, shut })),
  ];
}
