// Each line's track and trestle as separate pieces that fall into place as the machine passes, with colliders that grow with what's down (moved from the rail of ?proto=place).
import { P, lateral } from './line-geometry.ts';
import * as THREE from 'three/webgpu';
import type { Body } from '../../physics/engine.ts';
import { GROUP } from '../../physics/physics.ts';
import { box, place } from '../../render/boxes.ts';
import { H, addStatic, slab } from '../../place/land.ts';
import {
  FORMATION,
  ORIGIN,
  STUB,
  OFFSET_LAT,
  crossLat,
  lineAt,
  railY,
  offsetLat,
  type LineSpec,
} from '../../place/layout.ts';
import { dropSet, type DropSet } from '../../place/pieces.ts';
import { junctions, spanAcross } from '../../place/junctions.ts';
import { KIT, turnout } from '../../place/turnout.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { chunkOf } from './track-chunks.ts';
import { lookTrack } from '../../place/look-kit.ts';
import { carriedPiece, sleeperStations, trackPanels, type TrackPanel } from './track-panels.ts';

// ---------------------------------------------------------------- track: pieces and the solid top
const TOP = 0.1; // the sleepers' top over the rail height
const DECK_W = 3.6,
  BED_W = 2.8;
type Solid = {
  s?: number; // track surface midpoint; legs have no recovery landing
  u: number;
  add: () => Body | Body[];
  on: Body | Body[] | null;
};
export type Track = {
  spec: LineSpec;
  set: DropSet;
  order: number[]; // piece indices that aren't there at the start, by the metre the machine drops them
  us: Float32Array | Float64Array; // Panel frontiers retain full precision; continuous track keeps its original rounding.
  heights: Float32Array; // by piece: how far it falls
  next: number;
  solids: Solid[];
  nextSolid: number;
  u: (s: number) => number;
  head: number; // how far along (in u) the track is down
  panels: TrackPanel[];
  cursor: number;
  panelPieces: number[][];
  kinds: PieceKind[];
  panelFrame: (index: number, out: THREE.Matrix4) => THREE.Matrix4;
  /** Rest midpoint (rail bases) and travel direction of the pair the gantry carries for this panel. */
  seat: (index: number, mid: THREE.Vector3, dir: THREE.Vector3) => void;
  /** Rail-level world point the gantry's sweep starts from. */
  panelStart: (index: number, out: THREE.Vector3) => THREE.Vector3;
  /** `panelStart` for the up track's pair (?layer=wing: the second hand sweeps from here). */
  panelStartUp: (index: number, out: THREE.Vector3) => THREE.Vector3;
  carriedLength: (index: number) => number;
  /** The up track's carried pair for this panel, as `seat`; false where the panel has no up track. */
  seatUp: (index: number, mid: THREE.Vector3, dir: THREE.Vector3) => boolean;
  /** Rail pairs the gantry lays for this panel: 2 where it has up track, else 1 (the magazine empties by this). */
  pairs: (index: number) => number;
  /** Lays the pending panel piece by piece: each piece falls as the gantry's jaw frame passes its place.
   * `firstSeated`: a two-pair panel's first pair has been let go and lies in its seat. */
  presentPanel: (index: number, frame: THREE.Matrix4, firstSeated?: boolean) => void;
  layTo: (u: number) => void;
  snapTo: (u: number) => void;
  update: (dt: number) => void;
  /** Takes the up track's old merge (the 20 m turnout before the pier stub's merge, FORMATION.to) out of the picture
   * for good, or puts it back: Q7 relays the pier as plain double track (ring-island-build1, call 61). Returns the
   * metres along the line where the first retired rail piece starts (the relay's own rails begin there). */
  retire: (on: boolean) => number;
  /** The deck's plank pieces as drawn (boxes.ts: a place and a local matrix over the unit box), for what stands on
   * them (path-refuge.ts plankTops). */
  planks: () => { x: number; y: number; z: number; local: THREE.Matrix4 }[];
};
/** A `timber` is a turnout's long sleeper (the kit's sleeper stretched, without tie plates), under one of the line's. */
type PieceKind = 'sleeper' | 'timber' | 'plank' | 'rail' | 'cap' | 'stringer' | 'leg' | 'brace';
export function buildTrack(
  spec: LineSpec,
  thudAt: (k: number, kind: PieceKind, x: number, y: number, z: number) => void,
  owner: OwnedView,
  mode: 'panels' | 'continuous' = 'panels',
) {
  const panelled = mode === 'panels';
  const { line, dir } = spec;
  const formation = FORMATION[spec.id];
  const ulOf = (s: number) => offsetLat(formation, s) ?? 0;
  const u = (s: number) => (dir > 0 ? s : line.len - s);
  const panels = panelled ? trackPanels(spec) : [];
  const stubbed = (s: number) =>
    spec.id === 'timber' ? s >= STUB.camp - 0.5 || s <= STUB.village + 0.5 : s <= STUB.east + 0.5;
  const panelOf = (at: number) => panels.findIndex((p) => at >= p.from - 1e-7 && at < p.to - 1e-7);
  const frontier = (s: number) => {
    if (!panelled) return stubbed(s) ? -Infinity : u(s);
    if (spec.id === 'quarry' && u(s) > panels.at(-1)!.to) return Infinity;
    const index = panelOf(u(s));
    return index < 0 ? -Infinity : panels[index]!.to;
  };
  const cuts = panelled
    ? [0, ...panels.map((p) => p.from), panels.at(-1)!.to, line.len].sort((a, b) => a - b)
    : [0, line.len];
  const boxes: ReturnType<typeof box>[] = [],
    us: number[] = [],
    triggers: number[] = [],
    falls: number[] = [],
    kinds: PieceKind[] = [],
    chunks: number[] = [],
    pre: boolean[] = [];
  const add = (
    s: number,
    kind: PieceKind,
    x: number,
    z: number,
    y: number,
    local: THREE.Matrix4,
    color: string,
    lead: number,
    fall: number,
  ) => {
    const b = box(x, z, local, color);
    b.y = y;
    boxes.push(b);
    us.push(panelled ? frontier(s) : u(s) - lead);
    // The original continuous order: each piece goes down when laying reaches u(s) - lead.
    triggers.push(u(s) - lead);
    falls.push(fall);
    kinds.push(kind);
    chunks.push(chunkOf(u(s), kind));
    pre.push(frontier(s) === -Infinity);
  };
  const q = { x: 0, z: 0 };
  const bed = (s: number) => {
    lineAt(line, s, P);
    lateral(0, q);
    return railY(line, s) - H(q.x, q.z);
  };
  const qUp = { x: 0, z: 0 };
  /** The deck runs where either track's bed is over a metre above the ground, so the formation's planks start and stop
   * together across both tracks (leaves P at `s` and q on today's track, as `bed`). */
  const deck = (s: number) => {
    const centre = bed(s),
      ul = ulOf(s);
    if (centre > 1 || ul > -0.5) return centre > 1;
    lateral(ul, qUp);
    return railY(line, s) - H(qUp.x, qUp.z) > 1;
  };
  /** Today's track's sleepers on the land, as laid: a turnout's timbers go under them (`zones`, below). */
  const stations: { s: number; depth: number; yaw: number; y: number; lean: THREE.Euler }[] = [];
  if (!panelled) {
    // Sleepers on the land; on the trestle a plank deck wide enough to walk, nearly closed.
    for (let s = 0.6; s < line.len;) {
      const onDeck = deck(s);
      const yaw = Math.atan2(P.ux, P.uz),
        y = railY(line, s),
        lean = new THREE.Euler(-Math.atan2(railY(line, s + 1) - railY(line, s - 1), 2), 0, 0);
      // Where the up track runs the deck is the whole formation, both tracks' width.
      const ul = ulOf(s);
      lateral(ul / 2, q);
      if (onDeck)
        add(s, 'plank', q.x, q.z, y - 0.02, place(0, 0, 0, DECK_W - ul, 0.12, 0.84, yaw, lean), '#a97a45', 0, 1.1);
      else {
        lateral(0, q);
        add(s, 'sleeper', q.x, q.z, y - 0.02, place(0, 0, 0, 2.3, 0.12, 0.42, yaw, lean), '#8a6236', 0, 1.1);
        stations.push({ s, depth: 0.42, yaw, y, lean });
        // Low sleepers need support too: the tall trestle bents only start beyond a metre of clearance.
        for (const side of [-0.75, 0.75]) {
          lateral(side, q);
          const foot = H(q.x, q.z) - 0.08;
          const height = y - 0.02 - foot;
          if (height > 0.18)
            add(s, 'leg', q.x, q.z, foot, place(0, 0, 0, 0.35, height, 0.35, yaw), '#a2743f', 0.4, 0.5);
        }
      }
      s += onDeck ? 1 : 1.2;
    }
    // Rails: fixed lengths, one pair after another, a little behind the head (they lie on sleepers that are down).
    for (let s = 1.5; s < line.len; s += 3) {
      lineAt(line, s, P);
      const yaw = Math.atan2(P.ux, P.uz),
        y = railY(line, s),
        pitch = Math.atan2(railY(line, s + 1) - railY(line, s - 1), 2);
      for (const r of [-0.5, 0.5]) {
        lateral(r, q);
        add(
          s,
          'rail',
          q.x,
          q.z,
          y + TOP,
          place(0, 0, 0, 0.1, 0.12, 3.05, yaw, new THREE.Euler(-pitch, 0, 0)),
          '#4c5058',
          -2.2,
          0.8,
        );
      }
    }
  } else {
    // Sleepers on the land; on the trestle a plank deck wide enough to walk, nearly closed.
    for (let cut = 1; cut < cuts.length; cut++) {
      const from = cuts[cut - 1]!,
        to = cuts[cut]!;
      for (let at = from; at < to - 1e-7;) {
        const probe = dir > 0 ? at + 0.5 : line.len - at - 0.5;
        const spacing = deck(probe) ? 1 : 1.2;
        const length = Math.min(spacing, to - at);
        const s = dir > 0 ? at + length / 2 : line.len - at - length / 2;
        const onDeck = deck(s);
        const yaw = Math.atan2(P.ux, P.uz),
          y = railY(line, s),
          lean = new THREE.Euler(-Math.atan2(railY(line, s + 1) - railY(line, s - 1), 2), 0, 0);
        const ul = ulOf(s);
        lateral(ul / 2, q);
        if (onDeck)
          add(
            s,
            'plank',
            q.x,
            q.z,
            y - 0.02,
            place(0, 0, 0, DECK_W - ul, 0.12, Math.min(0.84, length), yaw, lean),
            '#a97a45',
            0,
            1.1,
          );
        else {
          lateral(0, q);
          add(
            s,
            'sleeper',
            q.x,
            q.z,
            y - 0.02,
            place(0, 0, 0, 2.3, 0.12, Math.min(0.42, length), yaw, lean),
            '#8a6236',
            0,
            1.1,
          );
          stations.push({ s, depth: Math.min(0.42, length), yaw, y, lean });
          // Low sleepers need support too: the tall trestle bents only start beyond a metre of clearance.
          for (const side of [-0.75, 0.75]) {
            lateral(side, q);
            const foot = H(q.x, q.z) - 0.08;
            const height = y - 0.02 - foot;
            if (height > 0.18)
              add(s, 'leg', q.x, q.z, foot, place(0, 0, 0, 0.35, height, 0.35, yaw), '#a2743f', 0.4, 0.5);
          }
        }
        at += length;
      }
    }
    // Split rail pairs at exact panel/closure boundaries, with no former 2.2 m visual lag. A panel's rails are equal
    // pieces of about 3 m (carriedPiece), so a one-pair panel is one rail a side; the pre-laid stubs keep 3 m cuts.
    for (let cut = 1; cut < cuts.length; cut++) {
      const from = cuts[cut - 1]!,
        to = cuts[cut]!;
      const piece = panelOf(from) >= 0 ? carriedPiece(to - from).length : 3;
      for (let at = from; at < to - 1e-7; at += piece) {
        const length = Math.min(piece, to - at);
        const centre = at + length / 2;
        const s = dir > 0 ? centre : line.len - centre;
        lineAt(line, s, P);
        const yaw = Math.atan2(P.ux, P.uz),
          y = railY(line, s),
          pitch = Math.atan2(railY(line, s + 1) - railY(line, s - 1), 2);
        for (const r of [-0.5, 0.5]) {
          lateral(r, q);
          add(
            s,
            'rail',
            q.x,
            q.z,
            y + TOP,
            place(0, 0, 0, 0.1, 0.12, length, yaw, new THREE.Euler(-pitch, 0, 0)),
            '#4c5058',
            -2.2,
            0.8,
          );
        }
      }
    }
  }
  // The up track (generic-lines step 2, drawn only): its sleepers on the land (the deck above already spans it), its
  // rails in the same cuts as today's so each panel lays both tracks, and Far Head's crossover. Its pieces go down with
  // the panel at their place; `upRails` marks the up track's rails, of which the gantry carries a pair a panel.
  const upRails = new Set<number>(),
    crossRails = new Set<number>();
  /** The up track's rails and sleepers on the merge turnout's curve, which Q7's relay retires. */
  const merge: { k: number; from: number }[] = [],
    retired = new Set<number>();
  const wa = { x: 0, z: 0 },
    wb = { x: 0, z: 0 };
  const offsetAt = (s: number, l: number, out: { x: number; z: number }) => {
    lineAt(line, s, P);
    return lateral(l, out);
  };
  /** A box from world point `a` to `b` (`y` their rail heights) along its own heading, `dy` over them, placed in
   * the laying order at the line's `s`; `d` its length if not theirs. */
  const boxBetween = (
    kind: PieceKind,
    s: number,
    a: { x: number; z: number; y: number },
    b: { x: number; z: number; y: number },
    w: number,
    h: number,
    dy: number,
    color: string,
    lead: number,
    fall: number,
    d?: number,
  ) => {
    const dx = b.x - a.x,
      dz = b.z - a.z,
      len = Math.hypot(dx, dz);
    const local = place(
      0,
      0,
      0,
      w,
      h,
      d ?? len,
      Math.atan2(dx, dz),
      new THREE.Euler(-Math.atan2(b.y - a.y, len), 0, 0),
    );
    add(s, kind, (a.x + b.x) / 2, (a.z + b.z) / 2, (a.y + b.y) / 2 + dy, local, color, lead, fall);
  };
  /** A box from (sa, la) to (sb, lb) along its own heading: a rail or a sleeper on a turnout's curve. */
  const offsetBox = (
    kind: PieceKind,
    sa: number,
    la: number,
    sb: number,
    lb: number,
    w: number,
    h: number,
    dy: number,
    color: string,
    lead: number,
    fall: number,
    d?: number,
  ) => {
    offsetAt(sa, la, wa);
    offsetAt(sb, lb, wb);
    boxBetween(
      kind,
      (sa + sb) / 2,
      { ...wa, y: railY(line, sa) },
      { ...wb, y: railY(line, sb) },
      w,
      h,
      dy,
      color,
      lead,
      fall,
      d,
    );
  };
  const upAt = (s: number) => offsetLat(formation, s);
  // The up track's rails come in the same cuts as today's, so each panel lays both tracks.
  const pieces: [number, number][] = [];
  if (panelled)
    for (let cut = 1; cut < cuts.length; cut++) {
      const from = cuts[cut - 1]!,
        to = cuts[cut]!;
      const piece = panelOf(from) >= 0 ? carriedPiece(to - from).length : 3;
      for (let at = from; at < to - 1e-7; at += piece) {
        const a = dir > 0 ? at : line.len - at,
          b = dir > 0 ? Math.min(to, at + piece) : line.len - Math.min(to, at + piece);
        pieces.push([Math.min(a, b), Math.max(a, b)]);
      }
    }
  else for (let s = 0; s < line.len; s += 3) pieces.push([s, Math.min(line.len, s + 3)]);
  /** The stretch of a rail piece the up track has its own rails on: where it is off today's track by over 0.12 m. */
  const upSpan = (s0: number, s1: number) => {
    const a = Math.max(s0, formation.from),
      b = Math.min(s1, formation.to);
    if (b - a <= 0.2) return null;
    const la = upAt(a)!,
      lb = upAt(b)!;
    return la < -0.12 || lb < -0.12 ? { a, b, la, lb } : null;
  };
  // The turnouts where the up track leaves this line (docs/plans/turnouts.md, steps 3 and 4), from the one list. The
  // up track's plain rails stay whole through the frog (the gantry carries them), so each turnout adds its open blade,
  // wing and check rails up to and round them, and a long timber under each of today's sleepers in its zone, where the
  // up track lays none of its own.
  const DRAWN = new Set(['J4', 'J5', 'J6', 'J7', 'J8', 'J9']);
  const zones = junctions()
    .filter((j) => j.line === spec.id && DRAWN.has(j.id))
    .map((j) => {
      // Where the up track's own rails begin, metres from the toe: the end of each of its rail pieces nearer the toe.
      // The crossover's rails run from its toes (Far Head, J7 and J8).
      const first =
        j.kind === 'crossover'
          ? 0
          : Math.min(
              ...pieces
                .map(([s0, s1]) => {
                  const up = upSpan(s0, s1);
                  return up ? ((j.dir > 0 ? up.a : up.b) - j.s) * j.dir : Infinity;
                })
                .filter((d) => d >= -1),
            );
      return { j, t: turnout(j.through, j.diverging, j.lever, first) };
    });
  /** The timber across today's track at `s`: its two ends, metres to the line's right (as `lateral`), the union where
   * zones overlap; null outside every zone. */
  const timberAt = (s: number) => {
    let lo = Infinity,
      hi = -Infinity;
    for (const { j, t } of zones) {
      const span = spanAcross(j, t, s);
      if (!span) continue;
      lo = Math.min(lo, span[0]);
      hi = Math.max(hi, span[1]);
    }
    if (hi <= lo) return null;
    // A timber that reaches part way under the up track's sleeper (Far Head's crossover, past J8's frog, where the up
    // track is not one of its roads) runs on in whole steps to carry the up track too, so the two never overlap.
    const ul = upAt(s);
    if (ul !== null && lo > ul - 1.15 && lo < ul + 1.15)
      lo = hi - KIT.sleeper - Math.ceil((hi - (ul - KIT.sleeper / 2) - KIT.sleeper) / KIT.step - 1e-9) * KIT.step;
    return [lo, hi] as const;
  };
  /** Whether a timber lies under a sleeper centred `l` to the line's right at `s` and square to a track whose
   * lateral changes by `slope` a metre: then that sleeper is not drawn (the timber carries its track there). */
  const under = (s: number, l: number, slope: number) => {
    const across = (span: readonly [number, number] | null) =>
      span && ([Math.max(span[0], l - KIT.sleeper / 2), Math.min(span[1], l + KIT.sleeper / 2)] as const);
    const own = across(timberAt(s));
    if (own && own[0] < own[1]) return true;
    // Past a zone's end a timber on one of today's stations can still lie across it: where the sleeper's centre line
    // crosses the timber's reach, along the line, against the timber's own depth.
    return stations.some((st) => {
      const a = across(timberAt(st.s));
      if (!a || a[0] >= a[1]) return false;
      const s0 = s - slope * (a[0] - l),
        s1 = s - slope * (a[1] - l);
      return Math.max(s0, s1) + half > st.s - st.depth / 2 && Math.min(s0, s1) - half < st.s + st.depth / 2;
    });
  };
  /** How fast a lateral `lat` changes along the line at `s`, metres a metre. */
  const slopeOf = (lat: (s: number) => number | null, s: number) => ((lat(s + 0.1) ?? 0) - (lat(s - 0.1) ?? 0)) / 0.2;
  const crossZones = zones.filter(({ j }) => j.kind === 'crossover');
  /** The crossover's inner rail at each toe is its open blade, a throw off the through road's far rail at the tip:
   * its rails are not the gantry's, so the rail itself is set over (`r`: the rail's side, as `lateral`). */
  const bladeAt = (s: number, r: number) => {
    let lat = 0;
    for (const { j, t } of crossZones) {
      const d = (s - j.s) * j.dir;
      if (r === (-j.dir * t.hand * KIT.gauge) / 2 && d >= 0 && d < t.bladeLen)
        lat += j.dir * t.hand * KIT.throw * (1 - d / t.bladeLen);
    }
    return lat;
  };
  // Sleepers. On a turnout the two tracks share them (one set through the overlap, not two interleaved): the up track
  // has none of its own while today's reach under both its rails (0.65 m apart or less); from there until it is clear
  // of today's (2.4 m), one beside each of today's and in line with it, a centimetre under it so neither flickers
  // through the other and the pair reads as one long timber. Clear of today's, its own, square to itself.
  const COVERED = -0.65,
    CLEAR = -2.4;
  const half = 0.21;
  const beside = (
    panelled
      ? sleeperStations(spec, formation.from, formation.to)
          .filter((t) => t.depth >= 2 * half)
          .map((t) => t.s)
      : Array.from({ length: Math.ceil(line.len / 1.2) }, (_, k) => 0.6 + k * 1.2)
  ).filter((s) => {
    const l = upAt(s);
    return l !== null && l <= COVERED && l > CLEAR && !deck(s) && !under(s, l, 0);
  });
  const own: number[] = [];
  for (let s = formation.from + 0.6; s < formation.to; s += 1.2) {
    const l = upAt(s);
    if (
      l !== null &&
      l <= CLEAR &&
      !deck(s) &&
      !under(s, l, slopeOf(upAt, s)) &&
      !beside.some((t) => Math.abs(t - s) < 0.6)
    )
      own.push(s);
  }
  const ups = [...beside.map((t) => [t, true] as const), ...own.map((t) => [t, false] as const)];
  for (const [s, shared] of ups.sort((a, b) => a[0] - b[0])) {
    const l = upAt(s)!;
    offsetBox(
      'sleeper',
      s - half,
      shared ? l : (upAt(s - half) ?? l),
      s + half,
      shared ? l : (upAt(s + half) ?? l),
      2.3,
      0.12,
      -0.03,
      '#8a6236',
      0,
      1.1,
    );
    // A sleeper (and its legs) on the curve of the merge turnout goes with the rails when Q7 relays it.
    const inMerge = s > formation.to - 60 && l > OFFSET_LAT + 0.01;
    if (inMerge) merge.push({ k: boxes.length - 1, from: s - half });
    // Low sleepers need support too, as today's (the trestle's bents only start beyond a metre of clearance).
    const y = railY(line, s) - 0.03;
    for (const side of [-0.75, 0.75]) {
      offsetAt(s, l + side, wa);
      const foot = H(wa.x, wa.z) - 0.08;
      if (y - foot > 0.18) {
        lineAt(line, s, P);
        add(
          s,
          'leg',
          wa.x,
          wa.z,
          foot,
          place(0, 0, 0, 0.35, y - foot, 0.35, Math.atan2(P.ux, P.uz)),
          '#a2743f',
          0.4,
          0.5,
        );
        if (inMerge) merge.push({ k: boxes.length - 1, from: s - half });
      }
    }
  }
  if (formation.crossover) {
    const [c0, c1] = formation.crossover;
    // Long timbers under the crossover where it crosses the gap between the tracks.
    for (let s = c0 + 0.6; s < c1; s += 1.2) {
      const l = crossLat(formation, s)!;
      if (
        l > -1.2 ||
        l < OFFSET_LAT + 1.2 ||
        under(
          s,
          l,
          slopeOf((at) => crossLat(formation, at), s),
        )
      )
        continue;
      offsetBox(
        'sleeper',
        s - 0.21,
        crossLat(formation, s - 0.21)!,
        s + 0.21,
        crossLat(formation, s + 0.21)!,
        2.3,
        0.12,
        -0.03,
        '#8a6236',
        0,
        1.1,
      );
    }
  }
  for (const [s0, s1] of pieces) {
    const up = upSpan(s0, s1);
    if (up) {
      const { a, b, la, lb } = up;
      for (const r of [-0.5, 0.5]) {
        offsetBox('rail', a, la + r, b, lb + r, 0.1, 0.12, TOP, '#4c5058', -2.2, 0.8);
        upRails.add(boxes.length - 1);
        // A rail piece that is not on the straight up track (OFFSET_LAT) at one end is in the merge turnout.
        if (a > formation.to - 60 && (la > OFFSET_LAT + 0.01 || lb > OFFSET_LAT + 0.01))
          merge.push({ k: boxes.length - 1, from: a });
      }
    }
    const c = formation.crossover;
    if (!c) continue;
    const ca = Math.max(s0, c[0]),
      cb = Math.min(s1, c[1]);
    if (cb - ca > 0.2)
      for (const r of [-0.5, 0.5]) {
        offsetBox(
          'rail',
          ca,
          crossLat(formation, ca)! + r + bladeAt(ca, r),
          cb,
          crossLat(formation, cb)! + r + bladeAt(cb, r),
          0.1,
          0.12,
          TOP + 0.005,
          '#4c5058',
          -2.2,
          0.8,
        );
        crossRails.add(boxes.length - 1);
      }
  }

  // Bents where the ground has dropped away: they go in ahead of the machine, legs first, then the cap and stringers.
  // Under the formation a bent spans both tracks: its cap, stringers and legs reach out under the up track too.
  const legsAt: { s: number; x: number; z: number; g: number; top: number }[] = [];
  for (let s = 3; s < line.len; s += 6.5) {
    const drop = bed(s);
    if (drop < 1.2) continue;
    const y = railY(line, s),
      yaw = Math.atan2(P.ux, P.uz),
      ul = ulOf(s),
      wide = ul < -0.5;
    lateral(ul / 2, q);
    add(s, 'cap', q.x, q.z, y - 0.97, place(0, 0, 0, 5 - ul, 0.55, 1, yaw), '#7f5630', 3, 2.2);
    // Span bent to bent. Trim 6 cm at each end: the joint's 12 cm gap is
    // over the metre-wide cap, never halfway across an unsupported span.
    const nextS = Math.min(s + 6.5, line.len);
    const nextUl = ulOf(nextS);
    const nextBent = nextS < line.len && bed(nextS) >= 1.2;
    for (const side of nextBent ? (wide ? [-1, 1, -2, -3] : [-1, 1]) : []) {
      const l0 = side === -2 ? ul - 1.2 : side === -3 ? ul + 1.2 : side * 1.2;
      const l1 = side === -2 ? nextUl - 1.2 : side === -3 ? nextUl + 1.2 : side * 1.2;
      offsetAt(s, l0, wa);
      offsetAt(nextS, l1, wb);
      const length = Math.hypot(wb.x - wa.x, wb.z - wa.z, railY(line, nextS) - y);
      offsetBox('stringer', s, l0, nextS, l1, 0.8, 0.4, -0.42, '#6e4c2a', 2, 1.6, length - 0.12);
    }
    // Endpoint sampling above uses the shared line pose; restore it for this bent's legs.
    bed(s);
    for (const l of wide ? [-2.1, -0.7, 0.7, 2.1, ul + 0.7, ul - 0.7, ul - 2.1] : [-2.1, -0.7, 0.7, 2.1]) {
      lateral(l, q);
      const g = H(q.x, q.z) - 0.4;
      add(s, 'leg', q.x, q.z, g, place(0, 0, 0, 0.5, y - 0.97 - g, 0.5, yaw), '#a2743f', 5, 3.2);
      legsAt.push({ s, x: q.x, z: q.z, g, top: y - 0.97 });
    }
    if (drop > 5)
      for (const t of [-1, 1]) {
        lateral(t < 0 && wide ? ul - 2.1 : t * 2.1, q);
        const g = H(q.x, q.z);
        const span = y - 1 - g,
          across = t * -1.4;
        add(
          s,
          'brace',
          q.x,
          q.z,
          g,
          place(0, 0, 0, 0.26, Math.hypot(span, across), 0.26, yaw, new THREE.Euler(0, 0, -Math.atan2(across, span))),
          '#8a6236',
          4,
          2.6,
        );
      }
  }

  // The turnouts' pieces come after every other, so no piece's index changes; each lands with the panel at its place.
  // A timber lies a centimetre under today's sleeper and is thinner, so the sleeper and its tie plates stay on top; it
  // runs a centimetre past each end, so an end that comes out at the sleeper's end never shares its face.
  // The turnout at the up track's old merge (line 2's J9, at the pier's root) goes with it when Q7 relays the pier.
  const turnoutRails = new Set<number>();
  const merged = zones.filter(({ j }) => j.s === formation.to);
  for (const st of stations) {
    const span = timberAt(st.s);
    if (!span) continue;
    lineAt(line, st.s, P);
    lateral((span[0] + span[1]) / 2, q);
    const local = place(0, 0, 0, span[1] - span[0] + 0.02, 0.12, st.depth - 0.02, st.yaw, st.lean);
    add(st.s, 'timber', q.x, q.z, st.y - 0.03, local, '#8a6236', 0, 1.1);
    if (merged.some(({ j, t }) => spanAcross(j, t, st.s)))
      merge.push({ k: boxes.length - 1, from: st.s - st.depth / 2 });
  }
  for (const { j, t } of zones)
    for (const r of t.rails) {
      const s = j.s + j.dir * r.d;
      boxBetween('rail', s, r.a, r.b, 0.1 * r.w, 0.12, TOP, '#4c5058', -2.2, 0.8);
      turnoutRails.add(boxes.length - 1);
      if (j.s === formation.to) merge.push({ k: boxes.length - 1, from: s - 1.5 });
    }
  const set = lookTrack(
    dropSet(
      boxes,
      (k) => {
        const b = boxes[k]!;
        thudAt(k, kinds[k]!, b.x, b.y, b.z);
      },
      owner,
    ),
    kinds,
    owner,
    chunks,
  );
  const order = boxes
    .map((_, k) => k)
    .filter((k) => !pre[k])
    .sort((a, b) => us[a]! - us[b]!);

  // The solid top: 2 m slabs that appear as the machine passes them, wider on the deck, and a body per bent leg.
  const solids: Solid[] = [];
  const a = { x: 0, z: 0 },
    c = { x: 0, z: 0 };
  /** The walkable top from `s` to `s1`: on the deck the whole formation's width; on the land today's bed and, where the
   * up track has left it, the up track's bed. */
  const bedSlabs = (s: number, s1: number, at: number, overlap: number) => {
    const ul = ulOf((s + s1) / 2),
      la = ulOf(s),
      lc = ulOf(s1);
    lineAt(line, s, P);
    lateral(0, a);
    const ya = railY(line, s) + TOP,
      wide = deck(s + 1);
    const yc = railY(line, s1) + TOP;
    const push = (l0: number, l1: number, width: number) => {
      offsetAt(s, l0, a);
      offsetAt(s1, l1, c);
      const ax = a.x,
        az = a.z,
        cx = c.x,
        cz = c.z;
      solids.push({ s: (s + s1) / 2, u: at, add: () => slab(ax, az, cx, cz, ya, yc, width, owner, overlap), on: null });
    };
    if (wide) push(ul / 2, ul / 2, DECK_W - ul);
    else {
      push(0, 0, BED_W);
      if (ul < -0.6) push(la, lc, BED_W);
    }
  };
  if (!panelled) {
    for (let s = 0; s < line.len; s += 2) {
      const s1 = Math.min(line.len, s + 2);
      bedSlabs(s, s1, stubbed(s + 1) ? -Infinity : u(s + 1), 0.05);
    }
  } else {
    for (let cut = 1; cut < cuts.length; cut++) {
      const start = cuts[cut - 1]!,
        end = cuts[cut]!;
      for (let at = start; at < end - 1e-7; at += 2) {
        const lo = at,
          hi = Math.min(end, at + 2);
        const s = dir > 0 ? lo : line.len - hi;
        const s1 = dir > 0 ? hi : line.len - lo;
        bedSlabs(s, s1, frontier((s + s1) / 2), 0);
      }
    }
  }
  for (const l of legsAt)
    solids.push({
      u: panelled ? frontier(l.s) : u(l.s) - 5,

      add: () =>
        addStatic(
          { kind: 'box', hx: 0.25, hy: (l.top - l.g) / 2, hz: 0.25 },
          { x: l.x, y: (l.top + l.g) / 2, z: l.z },
          undefined,
          GROUP.SCENERY,
          owner,
        ),
      on: null,
    });
  solids.sort((p, r) => p.u - r.u);
  const panelPieces = panels.map((p) => boxes.map((_, i) => i).filter((i) => !pre[i] && us[i] === p.to));
  // The gantry carries one rail pair per panel: the pair nearest the schedule's carried piece.
  const nearestPair = (index: number, of: (k: number) => boolean) => {
    const p = panels[index]!;
    const centre = p.from + carriedPiece(p.to - p.from).centre;
    const rails = panelPieces[index]!.filter((k) => kinds[k] === 'rail' && of(k));
    const near = (k: number) => Math.abs(triggers[k]! - 2.2 - centre);
    return rails.sort((a, b) => near(a) - near(b)).slice(0, 2);
  };
  const carriedPair = panels.map((_, index) =>
    nearestPair(index, (k) => !upRails.has(k) && !crossRails.has(k) && !turnoutRails.has(k)),
  );
  // Where the panel has up track the gantry carries its pair too, a second pair in the jaws, seated after the first.
  const carriedUp = panels.map((_, index) => {
    const pair = nearestPair(index, (k) => upRails.has(k) && !turnoutRails.has(k));
    return pair.length === 2 ? pair : [];
  });
  const pairMid = (pair: number[], mid: THREE.Vector3, dirOut: THREE.Vector3, index: number) => {
    const [a, b] = pair;
    mid.set(0, 0, 0);
    for (const k of [a, b]) {
      const box = boxes[k!]!;
      mid.x += box.x / 2;
      mid.y += box.y / 2;
      mid.z += box.z / 2;
    }
    const local = boxes[a!]!.local.elements;
    dirOut.set(local[8]!, local[9]!, local[10]!).normalize();
    const panel = panels[index]!;
    lineAt(line, dir > 0 ? panel.from : line.len - panel.from, P);
    if (dirOut.x * P.ux * dir + dirOut.z * P.uz * dir < 0) dirOut.negate();
  };
  const sweepEnd = panels.map((p) => p.from + carriedPiece(p.to - p.from).centre);
  const dropped = new Uint8Array(boxes.length);
  const along = new THREE.Vector3(),
    probe = { x: 0, z: 0 };
  /** Line metres (in u) nearest a world point, searched over one panel. */
  const nearestU = (index: number, x: number, z: number) => {
    const panel = panels[index]!;
    let best = panel.from - 6,
      bestD = Infinity;
    for (let at = panel.from - 6; at <= panel.to + 3; at += 0.25) {
      lineAt(line, dir > 0 ? at : line.len - at, P);
      lateral(0, probe);
      const d = (probe.x - x) ** 2 + (probe.z - z) ** 2;
      if (d < bestD) {
        bestD = d;
        best = at;
      }
    }
    return bestD < 36 ? best : panel.from - 6;
  };

  const t: Track = {
    spec,
    set,
    order,
    us: panelled ? Float64Array.from(us) : Float32Array.from(us),
    heights: Float32Array.from(falls),
    next: 0,
    solids,
    nextSolid: 0,
    u,
    head: 0,
    panels,
    cursor: 0,
    kinds,
    panelPieces,
    panelFrame(index, out) {
      const panel = panels[index]!;
      const centre = (panel.from + panel.to) / 2;
      const s = dir > 0 ? centre : line.len - centre;
      lineAt(line, s, P);
      return out
        .makeRotationY(Math.atan2(P.ux * dir, P.uz * dir))
        .setPosition(P.x + ORIGIN.x, railY(line, s), P.z + ORIGIN.z);
    },
    seat(index, mid, dirOut) {
      pairMid(carriedPair[index]!, mid, dirOut, index);
    },
    seatUp(index, mid, dirOut) {
      if (!carriedUp[index]!.length) return false;
      pairMid(carriedUp[index]!, mid, dirOut, index);
      return true;
    },
    pairs: (index) => (carriedUp[index]!.length ? 2 : 1),
    panelStart(index, out) {
      // The sweep runs in from the pair's near quarter to its seat, so its sleepers go down under the jaws.
      const at = panels[index]!.from + Math.min(1.5, (panels[index]!.to - panels[index]!.from) / 4);
      const s = dir > 0 ? at : line.len - at;
      lineAt(line, s, P);
      lateral(0, probe);
      return out.set(probe.x, railY(line, s) + TOP, probe.z);
    },
    panelStartUp(index, out) {
      const at = panels[index]!.from + Math.min(1.5, (panels[index]!.to - panels[index]!.from) / 4);
      const s = dir > 0 ? at : line.len - at;
      offsetAt(s, upAt(s) ?? 0, probe);
      return out.set(probe.x, railY(line, s) + TOP, probe.z);
    },
    carriedLength: (index) => carriedPiece(panels[index]!.to - panels[index]!.from).length,
    presentPanel(index, frame, firstSeated = false) {
      if (index < t.cursor) return;
      along.setFromMatrixPosition(frame);
      const reach = Math.min(sweepEnd[index]!, nearestU(index, along.x, along.z));
      const [a, b] = carriedPair[index]!;
      const [c, d] = carriedUp[index]!;
      // Once the gantry has let go of the first pair (a two-pair panel), it lies where it was seated.
      if (firstSeated && c !== undefined)
        for (const k of [a!, b!])
          if (!dropped[k]) {
            dropped[k] = 1;
            set.snap(k, true);
          }
      for (const k of t.panelPieces[index] ?? []) {
        if (dropped[k] || retired.has(k) || k === a || k === b || k === c || k === d) continue;
        if (Math.min(triggers[k]!, sweepEnd[index]!) > reach) continue;
        dropped[k] = 1;
        set.drop(k, t.heights[k]!);
      }
    },
    layTo(to) {
      t.head = to;
      while (t.next < order.length && t.us[order[t.next]!]! <= to) {
        const k = order[t.next++]!;
        if (retired.has(k)) continue;
        if (panelled) set.snap(k, true);
        else set.drop(k, t.heights[k]!);
      }
      t.cursor = panels.filter((p) => p.to <= to + 1e-7).length;
      growSolids(t, to);
    },
    snapTo(to) {
      if (panelled) set.clear();
      dropped.fill(0);
      t.head = to;
      t.cursor = panels.filter((p) => p.to <= to + 1e-7).length;
      boxes.forEach((_, k) => set.snap(k, !retired.has(k) && (pre[k]! || t.us[k]! <= to)));
      t.next = order.findIndex((k) => t.us[k]! > to);
      if (t.next < 0) t.next = order.length;
      for (const so of solids) if (so.on) removeBodies(so, owner);
      t.nextSolid = 0;
      growSolids(t, to);
    },
    update: (dt) => set.update(dt),
    planks: () => boxes.filter((_, k) => kinds[k] === 'plank'),
    retire(on) {
      for (const { k } of merge) {
        if (on) {
          retired.add(k);
          set.snap(k, false);
        } else if (retired.delete(k)) set.snap(k, t.us[k]! <= t.head);
      }
      return merge.length ? Math.min(...merge.map((m) => m.from)) : formation.to;
    },
  };
  owner.cleanup(() => {
    for (const solid of solids) removeBodies(solid, owner);
    set.clear();
  });
  return t;
}
function growSolids(t: Track, to: number) {
  while (t.nextSolid < t.solids.length && t.solids[t.nextSolid]!.u <= to) {
    const so = t.solids[t.nextSolid++]!;
    so.on = so.add();
  }
}
function removeBodies(so: Solid, owner: OwnedView) {
  for (const b of [so.on].flat()) if (b) owner.removeBody(b);
  so.on = null;
}
