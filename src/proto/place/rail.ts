// The rail of ?proto=place: each line's track and trestle as separate pieces that fall into place as the machine passes,
// with colliders that grow with what's down; the machine itself, solid, with its rack and its cradle in plain sight; the
// platforms; and one train per line (one track: the geometry doesn't need two). Trains are the wagon's look on kinematic
// platforms, the crossing's way. docs/proposals/boogle-2.md, "construction is physical" and "what looks solid is solid".
// The machine's rhythm is ?proto=lay's (src/features/track-machine.ts). Local: every tab runs its own.
import * as THREE from 'three/webgpu';
import { onFrame } from '../../loop.ts';
import { scene } from '../../render/scene.ts';
import { emit } from '../../render/particles.ts';
import { registerWaterContact } from '../../render/water/contacts.ts';
import { chuff, clank, thump } from '../../render/machine-sfx.ts';
import { FIXED, PLAYER_R } from '../../constants.ts';
import { background } from '../../async.ts';
import machineUrl from '../../../assets/built/track-layer.glb?url';
import { angleLerp } from '../../math.ts';
import {
  BODY,
  addBody,
  createBody,
  onPreStep,
  removeBody,
  stepAlpha,
  teleport,
  type Body,
} from '../../physics/engine.ts';
import { NOT_SCENERY, GROUP, groundMat } from '../../physics/physics.ts';
import {
  carry,
  CARRY,
  fromPlatform,
  registerPlatform,
  toPlatform,
  yawOf,
  type Platform,
} from '../../physics/platforms.ts';
import { me } from '../../player/player.ts';
import { wagonLook, LOCO, TRAILER, type CarSpec } from '../wagon/look.ts';
import { box, place } from '../net/boxes.ts';
import { deck, type Deck } from '../net/crates.ts';
import { H, addStatic, slab } from './land.ts';
import { ORIGIN, STUB, TUNE, lineAt, railY, type Line, type LinePoint, type LineSpec } from './layout.ts';
import { RAIL_SIZE, dropSet, dustRing, logStackMesh, setStackLog, type DropSet } from './pieces.ts';
import { flat } from '../flat.ts';
import { LOOK, STEEL, paint, rustTrainU, rustU, softGlow } from './look.ts';
import { merged } from './part-geometry.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { kitBatch, lookTrack, machineLook, trainLook } from './look-kit.ts';
import { machineModel, MACHINE_CHAIRS, MACHINE_DECK, MACHINE_GAP } from './machine-model.ts';
import { solidTrainLoad } from './train-load.ts';
import { registerSeat, seatHeight } from './seat.ts';
import { MAX_PANEL_LENGTH, carriedPiece, trackPanels, type TrackPanel } from './track-panels.ts';
import { STACK_PAIRS } from './machine-panels.ts';

const P: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
const lateral = (l: number, out: { x: number; z: number }) => {
  out.x = P.x - P.uz * l + ORIGIN.x;
  out.z = P.z + P.ux * l + ORIGIN.z;
  return out;
};
/** A world point beside the line. */
export function besideLine(line: Line, s: number, l: number) {
  lineAt(line, s, P);
  return lateral(l, { x: 0, z: 0 });
}

// ---------------------------------------------------------------- track: pieces and the solid top
const TOP = 0.1; // the sleepers' top over the rail height
const DECK_W = 3.6,
  BED_W = 2.8;
type Solid = {
  s?: number; // track surface midpoint; legs have no recovery landing
  u: number;
  add: () => Body | Body[];
  on: Body | Body[] | null;
  water?: () => () => void;
  removeWater?: () => void;
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
  carriedLength: (index: number) => number;
  /** Lays the pending panel piece by piece: each piece falls as the gantry's jaw frame passes its place. */
  presentPanel: (index: number, frame: THREE.Matrix4) => void;
  layTo: (u: number) => void;
  snapTo: (u: number) => void;
  update: (dt: number) => void;
};
type PieceKind = 'sleeper' | 'plank' | 'rail' | 'cap' | 'stringer' | 'leg' | 'brace';
export function buildTrack(
  spec: LineSpec,
  thudAt: (k: number, kind: PieceKind, x: number, y: number, z: number) => void,
  owner?: OwnedView,
  mode: 'panels' | 'continuous' = 'panels',
) {
  const panelled = mode === 'panels';
  const { line, dir } = spec;
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
    pre.push(frontier(s) === -Infinity);
  };
  const q = { x: 0, z: 0 };
  const bed = (s: number) => {
    lineAt(line, s, P);
    lateral(0, q);
    return railY(line, s) - H(q.x, q.z);
  };
  if (!panelled) {
    // Sleepers on the land; on the trestle a plank deck wide enough to walk, nearly closed.
    for (let s = 0.6; s < line.len;) {
      const onDeck = bed(s) > 1;
      const yaw = Math.atan2(P.ux, P.uz),
        y = railY(line, s),
        lean = new THREE.Euler(-Math.atan2(railY(line, s + 1) - railY(line, s - 1), 2), 0, 0);
      if (onDeck) add(s, 'plank', q.x, q.z, y - 0.02, place(0, 0, 0, DECK_W, 0.12, 0.84, yaw, lean), '#a97a45', 0, 1.1);
      else {
        add(s, 'sleeper', q.x, q.z, y - 0.02, place(0, 0, 0, 2.3, 0.12, 0.42, yaw, lean), '#8a6236', 0, 1.1);
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
        const spacing = bed(probe) > 1 ? 1 : 1.2;
        const length = Math.min(spacing, to - at);
        const s = dir > 0 ? at + length / 2 : line.len - at - length / 2;
        const onDeck = bed(s) > 1;
        const yaw = Math.atan2(P.ux, P.uz),
          y = railY(line, s),
          lean = new THREE.Euler(-Math.atan2(railY(line, s + 1) - railY(line, s - 1), 2), 0, 0);
        if (onDeck)
          add(
            s,
            'plank',
            q.x,
            q.z,
            y - 0.02,
            place(0, 0, 0, DECK_W, 0.12, Math.min(0.84, length), yaw, lean),
            '#a97a45',
            0,
            1.1,
          );
        else {
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
    // Split rail pairs at exact panel/closure boundaries, with no former 2.2 m visual lag.
    for (let cut = 1; cut < cuts.length; cut++) {
      const from = cuts[cut - 1]!,
        to = cuts[cut]!;
      for (let at = from; at < to - 1e-7; at += 3) {
        const length = Math.min(3, to - at);
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
  // Bents where the ground has dropped away: they go in ahead of the machine, legs first, then the cap and stringers.
  const legsAt: { s: number; x: number; z: number; g: number; top: number }[] = [];
  for (let s = 3; s < line.len; s += 6.5) {
    const drop = bed(s);
    if (drop < 1.2) continue;
    const y = railY(line, s),
      yaw = Math.atan2(P.ux, P.uz);
    lateral(0, q);
    add(s, 'cap', q.x, q.z, y - 0.97, place(0, 0, 0, 5, 0.55, 1, yaw), '#7f5630', 3, 2.2);
    for (const t of [-1, 1]) {
      lateral(t * 1.2, q);
      add(
        s,
        'stringer',
        q.x,
        q.z,
        y - 0.42,
        place(
          0,
          0,
          0,
          0.8,
          0.4,
          6.6,
          yaw,
          new THREE.Euler(-Math.atan2(railY(line, s + 1) - railY(line, s - 1), 2), 0, 0),
        ),
        '#6e4c2a',
        2,
        1.6,
      );
    }
    for (const l of [-2.1, -0.7, 0.7, 2.1]) {
      lateral(l, q);
      const g = H(q.x, q.z) - 0.4;
      add(s, 'leg', q.x, q.z, g, place(0, 0, 0, 0.5, y - 0.97 - g, 0.5, yaw), '#a2743f', 5, 3.2);
      legsAt.push({ s, x: q.x, z: q.z, g, top: y - 0.97 });
    }
    if (drop > 5)
      for (const t of [-1, 1]) {
        lateral(t * 2.1, q);
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
  );
  const order = boxes
    .map((_, k) => k)
    .filter((k) => !pre[k])
    .sort((a, b) => us[a]! - us[b]!);

  // The solid top: 2 m slabs that appear as the machine passes them, wider on the deck, and a body per bent leg.
  const solids: Solid[] = [];
  const a = { x: 0, z: 0 },
    c = { x: 0, z: 0 };
  if (!panelled) {
    for (let s = 0; s < line.len; s += 2) {
      const s1 = Math.min(line.len, s + 2);
      lineAt(line, s, P);
      lateral(0, a);
      const ya = railY(line, s) + TOP,
        wide = railY(line, s + 1) - H(a.x, a.z) > 1;
      lineAt(line, s1, P);
      lateral(0, c);
      const yc = railY(line, s1) + TOP;
      const ax = a.x,
        az = a.z,
        cx = c.x,
        cz = c.z;
      solids.push({
        s: (s + s1) / 2,
        u: stubbed(s + 1) ? -Infinity : u(s + 1),
        add: () => slab(ax, az, cx, cz, ya, yc, wide ? DECK_W : BED_W, owner),
        on: null,
      });
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
        lineAt(line, s, P);
        lateral(0, a);
        const ya = railY(line, s) + TOP,
          wide = railY(line, s + 1) - H(a.x, a.z) > 1;
        lineAt(line, s1, P);
        lateral(0, c);
        const yc = railY(line, s1) + TOP;
        const ax = a.x,
          az = a.z,
          cx = c.x,
          cz = c.z;
        solids.push({
          s: (s + s1) / 2,
          u: frontier((s + s1) / 2),
          add: () => slab(ax, az, cx, cz, ya, yc, wide ? DECK_W : BED_W, owner, 0),
          on: null,
        });
      }
    }
  }
  for (const l of legsAt)
    solids.push({
      u: panelled ? frontier(l.s) : u(l.s) - 5,
      water:
        l.g < 0 && l.top > 0
          ? () => registerWaterContact({ x: l.x, z: l.z, radius: Math.SQRT2 * 0.25, top: l.top })
          : undefined,
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
  const carriedPair = panels.map((p, index) => {
    const centre = p.from + carriedPiece(p.to - p.from).centre;
    const rails = panelPieces[index]!.filter((k) => kinds[k] === 'rail');
    const near = (k: number) => Math.abs(triggers[k]! - 2.2 - centre);
    return rails.sort((a, b) => near(a) - near(b)).slice(0, 2);
  });
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
      const [a, b] = carriedPair[index]!;
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
    },
    panelStart(index, out) {
      const at = panels[index]!.from + 1.5;
      const s = dir > 0 ? at : line.len - at;
      lineAt(line, s, P);
      lateral(0, probe);
      return out.set(probe.x, railY(line, s) + TOP, probe.z);
    },
    carriedLength: (index) => carriedPiece(panels[index]!.to - panels[index]!.from).length,
    presentPanel(index, frame) {
      if (index < t.cursor) return;
      along.setFromMatrixPosition(frame);
      const reach = Math.min(sweepEnd[index]!, nearestU(index, along.x, along.z));
      const [a, b] = carriedPair[index]!;
      for (const k of t.panelPieces[index] ?? []) {
        if (dropped[k] || k === a || k === b || Math.min(triggers[k]!, sweepEnd[index]!) > reach) continue;
        dropped[k] = 1;
        set.drop(k, t.heights[k]!);
      }
    },
    layTo(to) {
      t.head = to;
      while (t.next < order.length && t.us[order[t.next]!]! <= to) {
        const k = order[t.next++]!;
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
      boxes.forEach((_, k) => set.snap(k, pre[k]! || t.us[k]! <= to));
      t.next = order.findIndex((k) => t.us[k]! > to);
      if (t.next < 0) t.next = order.length;
      for (const so of solids) if (so.on) removeBodies(so, owner);
      t.nextSolid = 0;
      growSolids(t, to);
    },
    update: (dt) => set.update(dt),
  };
  owner?.cleanup(() => {
    for (const solid of solids) removeBodies(solid, owner);
    set.clear();
  });
  return t;
}
function growSolids(t: Track, to: number) {
  while (t.nextSolid < t.solids.length && t.solids[t.nextSolid]!.u <= to) {
    const so = t.solids[t.nextSolid++]!;
    so.on = so.add();
    so.removeWater = so.water?.();
  }
}
function removeBodies(so: Solid, owner?: OwnedView) {
  so.removeWater?.();
  so.removeWater = undefined;
  for (const b of [so.on].flat())
    if (b) {
      if (owner) owner.removeBody(b);
      else removeBody(b);
    }
  so.on = null;
}

// ---------------------------------------------------------------- a car: a kinematic body following a planned pose
const BOTTOM = 0.4;
// The deck's edge holds you while you stand. The body is a sphere on a box and counts as standing up to CARRY.edge past the
// box (src/physics/platforms.ts). With its centre past the box, though, the contact's normal leans outward, so a player who
// stopped at the edge crept off at about 0.1 m/s, moving or not, until the deck let go of them over the river. Standing with
// no stick pushed, you're eased back inside instead. Push out and you walk off, and a jump's a jump, so no railing: nothing
// here looks solid that isn't. Serves "you can stand on it", docs/proposals/boogle-2.md.
const HOLD = { inset: 0.04, speed: 1.2 }; // m inside the box's edge you settle; m/s you're eased back
const decks = new Map<Platform, Car>();
onPreStep(
  () => {
    const b = me.body,
      p = carry.on;
    if (!b || !p || !decks.has(p) || me.wish.lengthSq() > 0.01 || me.jumpQueued > 0) return;
    const q = p.body.position,
      yaw = yawOf(p.body.quaternion),
      c = Math.cos(yaw),
      s = Math.sin(yaw);
    const rx = b.position.x - q.x,
      rz = b.position.z - q.z;
    const lx = rx * c - rz * s,
      lz = rx * s + rz * c;
    // Cargo tops have their own edges inside the flatbed. Holding only the flatbed's outline lets an idle
    // rider creep off a crate's rounded contact and lose the train before reaching that outer guard.
    const support = decks.get(p)?.supportAt?.(lx, lz);
    const dx = lx - (support?.x ?? 0),
      dz = lz - (support?.z ?? 0),
      most = HOLD.speed * FIXED,
      overX = Math.abs(dx) - ((support?.hx ?? p.hx) - HOLD.inset),
      overZ = Math.abs(dz) - ((support?.hz ?? p.hz) - HOLD.inset);
    if (overX <= 0 && overZ <= 0) return;
    const inX = overX > 0 ? -Math.sign(dx) * Math.min(most, overX) : 0,
      inZ = overZ > 0 ? -Math.sign(dz) * Math.min(most, overZ) : 0;
    b.position.set(b.position.x + inX * c + inZ * s, b.position.y, b.position.z - inX * s + inZ * c);
  },
  { order: 20 }, // after the decks move (10), before the player's controller (40)
);
export type Car = {
  spec: CarSpec;
  hy: number;
  body: Body;
  mesh: THREE.Group;
  rock: THREE.Object3D;
  prevYaw: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  speedLimit: number;
  platform: Platform;
  /** Footprint of the cargo surface currently supporting a rider; absent means the flatbed. */
  supportAt?: (x: number, z: number) => { x: number; z: number; hx: number; hz: number } | undefined;
  /** Local presentation odometers must not roll through an explicit physics relocation. */
  onSnap?: () => void;
};
export function makeCar(
  spec: CarSpec,
  rock: THREE.Object3D,
  before: () => void,
  extra: Parameters<typeof createBody>[0],
  owner?: OwnedView,
) {
  const hy = (spec.top - BOTTOM) / 2;
  const body = createBody({
    type: BODY.KINEMATIC,
    material: groundMat,
    mask: NOT_SCENERY,
    position: { x: ORIGIN.x, y: -60, z: ORIGIN.z },
    shapes: [{ kind: 'box', hx: spec.hx, hy, hz: spec.hz }, ...(extra?.shapes ?? [])],
  });
  addBody(body);
  owner?.body(body);
  const mesh = new THREE.Group();
  rock.position.y = -(BOTTOM + hy);
  mesh.add(rock);
  mesh.visible = false;
  if (owner) owner.add(mesh);
  else scene.add(mesh);
  const car: Car = {
    spec,
    hy,
    body,
    mesh,
    rock,
    prevYaw: 0,
    x: ORIGIN.x,
    y: -60,
    z: ORIGIN.z,
    yaw: 0,
    pitch: 0,
    speedLimit: TUNE.cruise * 1.5, // slopes and small reconciliation nudges, never a snapshot's distance / FIXED
    platform: {
      body,
      hx: spec.hx,
      hz: spec.hz,
      top: hy,
      move: (dt) => {
        before();
        moveCar(car, dt);
      },
    },
  };
  const unregister = registerPlatform(car.platform);
  decks.set(car.platform, car);
  owner?.cleanup(() => {
    unregister();
    decks.delete(car.platform);
  });
  return car;
}
function moveCar(c: Car, dt: number) {
  const p = c.body;
  c.prevYaw = yawOf(p.quaternion);
  const dx = c.x - p.position.x,
    dy = c.y - p.position.y,
    dz = c.z - p.position.z;
  const turn = angleLerp(c.prevYaw, c.yaw, 1) - c.prevYaw;
  // A 1.65 m correction used to become ~99 m/s. Position corrections still relocate deck and rider
  // together. A road junction's new heading is ordinary travel: turn towards it at a bounded rate
  // and ease the last part, keeping the collider, drawn deck and rider on the same smooth heading.
  if (Math.hypot(dx, dy, dz) > c.speedLimit * dt) return snapCar(c);
  p.velocity.set(dx / dt, dy / dt, dz / dt);
  p.angularVelocity.set(0, Math.max(-2, Math.min(2, turn * Math.min(8, 1 / dt))), 0);
}
const riderLocal = { x: 0, y: 0, z: 0, yaw: 0 },
  riderWorld = { ...riderLocal };
export function snapCar(c: Car) {
  c.onSnap?.();
  const p = c.body;
  const rider =
    c.y > -30 && carry.on === c.platform && me.body && me.body.velocity.y - carry.y <= CARRY.leaveVy ? me.body : null;
  if (c.y <= -30 && carry.on === c.platform) carry.on = null;
  const turn = angleLerp(yawOf(p.quaternion), c.yaw, 1) - yawOf(p.quaternion);
  if (rider) toPlatform(c.platform, rider.position, me.yaw, riderLocal);
  teleport(p, c.x, c.y, c.z);
  p.quaternion.set(0, Math.sin(c.yaw / 2), 0, Math.cos(c.yaw / 2));
  p.velocity.set(0, 0, 0);
  p.angularVelocity.set(0, 0, 0);
  c.prevYaw = c.yaw;
  if (rider) {
    fromPlatform(c.platform, riderLocal, false, riderWorld);
    teleport(rider, riderWorld.x, riderWorld.y, riderWorld.z);
    const vx = rider.velocity.x - carry.x,
      vz = rider.velocity.z - carry.z;
    rider.velocity.set(
      vx * Math.cos(turn) + vz * Math.sin(turn),
      rider.velocity.y - carry.y,
      -vx * Math.sin(turn) + vz * Math.cos(turn),
    );
    carry.x = carry.y = carry.z = 0;
    carry.spin += turn;
  }
}
export function drawCar(c: Car, alpha: number) {
  const ip = c.body.interpolatedPosition;
  c.mesh.position.set(ip.x, ip.y, ip.z);
  c.mesh.rotation.y = angleLerp(c.prevYaw, yawOf(c.body.quaternion), alpha);
  c.rock.rotation.x = -c.pitch;
  c.mesh.visible = c.y > -30; // a train not yet needed waits under the land: nothing to draw, nor to shadow
}
export function poseCarOnLine(c: Car, line: Line, s: number, sign: number) {
  lineAt(line, s + 1.1, a);
  lineAt(line, s - 1.1, b);
  c.x = (a.x + b.x) / 2 + ORIGIN.x;
  c.z = (a.z + b.z) / 2 + ORIGIN.z;
  c.yaw = Math.atan2((a.x - b.x) * sign, (a.z - b.z) * sign);
  const ya = railY(line, s + 1.1),
    yb = railY(line, s - 1.1);
  c.y = (ya + yb) / 2 + BOTTOM + c.hy;
  c.pitch = Math.atan2((ya - yb) * sign, 2.2);
}
const a = { ...P },
  b = { ...P };

// ---------------------------------------------------------------- the machine
/** What the machine carries, drawn in the flatbed's frame: its rack of rails down each side, its cradle of logs. */
const CRADLE_LOGS = 40;
export type Machine = ReturnType<typeof buildMachine>;
export function buildMachine(owner?: OwnedView, mode: 'panels' | 'continuous' = 'panels') {
  const panelled = mode === 'panels';
  const F = panelled ? MAX_PANEL_LENGTH + 2.4 : 2.4;
  const GAP = panelled ? MACHINE_GAP : 3.7;
  const model = panelled
    ? machineModel(
        kitBatch('rail', STEEL, 1),
        kitBatch('fork', { color: '#f0752c', rough: 0.55 }, 1),
        kitBatch('sleeper', { color: '#8a6236', grain: { axis: 'x', honey: '#c98a3e' } }, 1),
        (n) => {
          // The stack and the carried pair are the committed track's own kit rail; nothing lies flat
          // enough to need a second shadow draw.
          const rails = kitBatch('rail', STEEL, n);
          rails.castShadow = false;
          rails.receiveShadow = true;
          return rails;
        },
      )
    : null;
  const kitLook = !panelled && LOOK.kit ? machineLook(owner) : null;
  const look = model ?? kitLook ?? wagonLook(1, false, owner);
  if (model)
    background(
      import('../../render/assets.ts').then(async ({ loadAsset }) =>
        model.install((await loadAsset(machineUrl)).gltf.scene),
      ),
      'track-layer model',
    );
  const flatRock = look.cars[1]!,
    locoRock = look.cars[0]!;
  const pose = { line: null as Line | null, s: 0, sign: 1 };
  const onDeck = TRAILER.top;
  const step = { hx: 1.4, hz: 0.3, h: 0.16, z: -1.9 };
  const flatbed = makeCar(
    TRAILER,
    flatRock,
    () => m.onStep(FIXED),
    {
      shapes: [
        {
          kind: 'box',
          hx: step.hx,
          hy: step.h / 2,
          hz: step.hz,
          offset: { x: 0, y: (TRAILER.top - BOTTOM) / 2 - step.h / 2, z: step.z },
        },
      ],
    },
    owner,
  );
  flatbed.platform.hx = step.hx;
  flatbed.platform.hz = Math.abs(step.z) + step.hz;
  flatbed.supportAt = (_x, z) =>
    z < -TRAILER.hz ? { x: 0, z: step.z, hx: step.hx, hz: step.hz } : { x: 0, z: 0, hx: TRAILER.hx, hz: TRAILER.hz };
  const loco = makeCar(LOCO, locoRock, () => {}, {}, owner);
  if (owner) {
    flatbed.platform.id = 'railway:T1:flatbed';
    loco.platform.id = 'railway:T1:loco';
    flatbed.platform.shared = loco.platform.shared = true;
  }
  const o = new THREE.Object3D();
  const toRig = new THREE.Matrix4(),
    seatAt = new THREE.Vector3(),
    seatDir = new THREE.Vector3(),
    startAt = new THREE.Vector3();
  let heldRail: THREE.Object3D;
  let rack: THREE.InstancedMesh;
  const rig = model?.panelRig;
  if (model && rig) {
    [loco, flatbed].forEach((car, i) => {
      const gear = model.runningGear[i]!;
      gear.position.y = -(BOTTOM + car.hy);
      car.mesh.add(gear);
      car.onSnap = () => {
        model.resetWheelTravel(i);
      };
    });
    // Match the original chair frame: body-relative, without the deck's pitch or shudder.
    model.chairs.position.y = flatbed.hy - MACHINE_DECK;
    flatbed.mesh.add(model.chairs);
    MACHINE_CHAIRS.forEach((x, i) => {
      // The built machine batches its bevelled chair shells; these gameplay anchors stay unchanged.
      registerSeat({
        id: `machine-deck-${i}`,
        group: 'machine-deck',
        platform: flatbed.platform,
        anchorView: true,
        // Avatars face -Z at zero yaw; the gantry and travel direction are local +Z.
        at: { x, y: flatbed.hy + seatHeight, z: -0.9, yaw: Math.PI },
        exit: { x, y: flatbed.hy + PLAYER_R, z: -1.85, yaw: Math.PI },
        available: () => flatbed.y > -30,
      });
    });
    heldRail = model.heldRail;
    heldRail.visible = false;
    flatbed.mesh.add(rig.root);
    rig.root.position.y = -(BOTTOM + flatbed.hy);
    rack = rig.stack;
  } else {
    const box3 = (w: number, h: number, d: number, color: string, x: number, y: number, z: number, rx = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), flat(color, 0.8));
      m.position.set(x, y, z);
      m.rotation.x = rx;
      m.castShadow = true;
      flatRock.add(m);
      return m;
    };
    box3(step.hx * 2, step.h, step.hz * 2, '#f4d58a', 0, onDeck - step.h / 2, step.z);
    // Cradle sides, in the flatbed's +z half (its front), open at the top.

    if (kitLook) heldRail = kitLook.heldRail;
    else {
      box3(1.5, 0.42, 0.08, '#e8d3a2', 0, onDeck + 0.21, 1.45);
      box3(1.5, 0.42, 0.08, '#e8d3a2', 0, onDeck + 0.21, -0.05);
      box3(0.08, 0.42, 1.5, '#e8d3a2', -0.75, onDeck + 0.21, 0.7);
      box3(0.08, 0.42, 1.5, '#e8d3a2', 0.75, onDeck + 0.21, 0.7);
      // The sleeper chute off the front and the orange arm that holds the next rail out over the head.
      box3(1.3, 0.05, 0.9, '#e8d3a2', 0, onDeck - 0.3, 1.95, 0.5);
      box3(0.08, 0.08, 1.2, '#f0752c', 0.62, onDeck + 0.5, 1.9, 0.25);
      heldRail = box3(RAIL_SIZE.x, RAIL_SIZE.y, 1.9, '#4c5058', 0.62, onDeck + 0.28, 2.1);
    }

    const railGeo = new THREE.BoxGeometry(RAIL_SIZE.x, RAIL_SIZE.y, RAIL_SIZE.z);
    rack = LOOK.kit
      ? kitBatch('rail', STEEL, 12, owner)
      : new THREE.InstancedMesh(railGeo, LOOK.mats ? paint(STEEL) : flat('#4c5058', 0.6), 12);
    rack.castShadow = true;
    rack.frustumCulled = false;

    for (let k = 0; k < 12; k++) {
      const side = k % 2 ? 1 : -1,
        layer = Math.floor(k / 4),
        inner = (k >> 1) % 2;
      o.position.set(side * (1.26 + inner * 0.18), onDeck - 0.1 + layer * 0.2, 0);
      o.updateMatrix();
      rack.setMatrixAt(k, o.matrix);
    }
    flatRock.add(rack);
  }
  let rackCount = 0,
    rackLengths: number[] = [],
    rackKey = '',
    selecting = false;
  const drawPanelRack = () => rig?.drawStack(rackCount, rackLengths, selecting);
  const cradle = logStackMesh(CRADLE_LOGS, owner);
  cradle.removeFromParent();
  flatRock.add(cradle);
  const cradleAt = new THREE.Vector3(),
    cradleN = { n: -1 };
  function setCradle(n: number) {
    n = Math.min(CRADLE_LOGS, n);
    if (cradleN.n === n) return;
    cradleN.n = n;
    for (let k = 0; k < n; k++) {
      const row = Math.floor(k / 5),
        c = k % 5;
      cradleAt.set(0, onDeck + 0.14 + row * 0.2, 0.2 + c * 0.25);
      setStackLog(cradle, k, cradleAt, 0);
    }
    cradle.count = n;
    cradle.visible = n > 0;
    cradle.instanceMatrix.needsUpdate = true;
    if (cradle.instanceColor) cradle.instanceColor.needsUpdate = true;
  }
  /** World point of the middle of the cradle, for what rolls in. */
  const worldCradle = (out: THREE.Vector3) => {
    flatRock.updateWorldMatrix(true, false);
    return flatRock.localToWorld(out.set(0, onDeck + 0.3, 0.7));
  };
  const worldRack = (out: THREE.Vector3) => {
    if (rig) {
      rig.root.updateWorldMatrix(true, false);
      return rig.root.localToWorld(rig.nextSlot(out));
    }
    flatRock.updateWorldMatrix(true, false);
    return flatRock.localToWorld(out.set(1.3, onDeck + 0.1, 0));
  };

  function setRack(n: number) {
    rackCount = Math.max(0, Math.min(panelled ? STACK_PAIRS : 12, n));
    if (panelled) drawPanelRack();
    else {
      rack.count = rackCount;
      rack.visible = rackCount > 0;
      // Continuous rack transforms were written once at construction; count does not change them.
      heldRail.visible = n > 0;
    }
  }

  // Headlamps, a beam each, and the fire in the cab: all dark until the boiler catches.
  const lampSpots = [
    [flatRock, [-0.72, onDeck + 0.5, 1.6]],
    [flatRock, [0.72, onDeck + 0.5, 1.6]],
    [locoRock, [0, 1.75, 1.62]],
  ] as const;
  const glass = new THREE.MeshStandardNodeMaterial({ color: '#59584e', roughness: 0.35 });
  const shine = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(3.2, 2.7, 1.5) });
  const beamMat = softGlow('#ffe4a0', 0.3, true).mat;
  const beamGeo = new THREE.ConeGeometry(0.85, 6.5, 14, 1, true).rotateX(-Math.PI / 2).translate(0, 0, 3.25);
  const lamps = lampSpots.map(([parent, at]) => {
    const lamp = new THREE.Mesh<THREE.BufferGeometry, THREE.Material>(
      merged([
        ['c', 0, 0, -0.07, 0.15, 0.14, 0.15, '#24262c', Math.PI / 2],
        ['s', 0, 0, 0, 0.14, 0.14, 0.07, '#ffffff'],
      ]),
      glass,
    );
    lamp.position.set(at[0], at[1], at[2]);
    parent.add(lamp);
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.copy(lamp.position);
    beam.visible = false;
    parent.add(beam);
    return { lamp, beam };
  });
  const fire = new THREE.MeshStandardNodeMaterial({ color: '#96360c', emissive: '#ff8a23', emissiveIntensity: 0 });
  const firebox = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.3, 0.04), fire);
  firebox.position.set(0, 1.05, -1.57);
  locoRock.add(firebox);
  const grate = new THREE.Mesh(
    merged([
      ['b', 0, 0.87, -1.6, 0.56, 0.06, 0.05, '#24262c'],
      ['b', 0, 1.23, -1.6, 0.56, 0.06, 0.05, '#24262c'],
      ['b', -0.25, 1.05, -1.6, 0.06, 0.3, 0.05, '#24262c'],
      ['b', 0.25, 1.05, -1.6, 0.06, 0.3, 0.05, '#24262c'],
      ['b', -0.08, 1.05, -1.6, 0.035, 0.3, 0.05, '#24262c'],
      ['b', 0.08, 1.05, -1.6, 0.035, 0.3, 0.05, '#24262c'],
    ]),
    new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.9 }),
  );
  locoRock.add(grate);
  let fireOn = 0;
  const setLamps = (on: boolean) => {
    for (const l of lamps) {
      l.lamp.material = on ? shine : glass;
      l.beam.visible = on;
    }
  };

  const st = { awake: false, moved: 0, bump: 0, idle: 0, shudder: 0, was: false };
  const smoke = new THREE.Color('#ece8e0'),
    v = new THREE.Vector3();
  const flatY = flatRock.position.y;
  function puff(heavy: number) {
    look.chimneyTop.getWorldPosition(v);
    chuff(v.x, v.z, heavy);
    for (let n = 0; n < 2 + heavy * 3; n++)
      emit({
        x: v.x,
        y: v.y,
        z: v.z,
        vx: (Math.random() - 0.5) * 0.6,
        vy: 2.2 + heavy,
        vz: (Math.random() - 0.5) * 0.6,
        life: 2.2,
        size: 0.5,
        color: smoke,
        alpha: 0.6,
        grow: [1, 3],
        fade: 0.5,
      });
  }
  const m = {
    /** Called once per physics step, before the cars move: the run advances the machine here. */
    onStep: (() => {}) as (dt: number) => void,
    onPanelFrame: (() => {}) as (dt: number) => void,
    look,
    get panel() {
      if (!model) throw new Error('continuous railway has no panel mechanism');
      return model;
    },
    flatbed,
    loco,
    onMachine: (p: Platform | null) => p === flatbed.platform || p === loco.platform,
    /** Stands on `line`, the head (where pieces land) at `head` metres along, heading `sign` along the line. */
    at(line: Line, head: number, sign: number, setback = F) {
      pose.line = line;
      pose.s = head;
      pose.sign = sign;
      poseCarOnLine(flatbed, line, head - sign * setback, sign);
      poseCarOnLine(loco, line, head - sign * (setback + GAP), sign);
    },
    /** On the turntable, centred on (x, z) in world metres, turned to `yaw`. */
    turn(x: number, y: number, z: number, yaw: number) {
      const hx = Math.sin(yaw),
        hz = Math.cos(yaw);
      for (const [c, off] of [
        [flatbed, GAP / 2],
        [loco, -GAP / 2],
      ] as const) {
        c.x = x + hx * off;
        c.z = z + hz * off;
        c.y = y + BOTTOM + c.hy;
        c.yaw = yaw;
        c.pitch = 0;
      }
    },
    snap() {
      snapCar(flatbed);
      snapCar(loco);
    },
    wake(on: boolean, silent = false) {
      st.awake = on;
      st.shudder = 0;
      rustU.value = on ? 0 : 1;
      setLamps(on);
      fireOn = on ? 1 : 0;
      if (on && !silent) for (let k = 0; k < 3; k++) puff(1);
    },
    /** For the waking: how hard it shakes (0 stops), how rusty (1) or clean (0), the fire, the lamps. */
    shudder: (a: number) => void (st.shudder = a),
    setRust: (v: number) => void (rustU.value = v),
    setFire: (v: number) => void (fireOn = v),
    /** Rad/s the wheels slip with no ground going by. */
    setSlip: (rate: number) => {
      const l = look as { slip?: { rate: number } };
      if (l.slip) l.slip.rate = rate;
    },
    setLamps,
    moved(d: number) {
      st.moved += d;
      if (st.moved > 2.4) {
        st.moved = 0;
        puff(0.2);
      }
    },
    bump() {
      st.bump = 1;
    },
    setRack,
    panelRack(lengths: number[], selected: boolean) {
      const key = lengths.join(',');
      if (rackKey === key && selecting === selected) return;
      rackKey = key;
      rackLengths = lengths;
      selecting = selected;
      drawPanelRack();
    },
    /** One panel cycle: pose the gantry for `phase` and lay what it has passed. Both railway views use this. */
    layPanel(track: Track, index: number, phase: number, stock: number) {
      if (!rig) return;
      rig.root.updateWorldMatrix(true, false);
      toRig.copy(rig.root.matrixWorld).invert();
      track.seat(index, seatAt, seatDir);
      seatAt.applyMatrix4(toRig);
      seatDir.transformDirection(toRig);
      track.panelStart(index, startAt).applyMatrix4(toRig);
      const frame = rig.pose(
        phase,
        stock,
        seatAt,
        Math.atan2(seatDir.x, seatDir.z),
        Math.asin(Math.max(-1, Math.min(1, seatDir.y))),
        startAt,
        track.carriedLength(index),
      );
      track.presentPanel(index, frame);
    },
    /** Not laying: the gantry goes home over the stack on local time (0..1). */
    layHome(t: number, stock: number) {
      rig?.home(t, stock);
    },
    setCradle,
    worldCradle,
    worldRack,
    /** Metres from a world point to the machine. */
    distance: (x: number, z: number) => Math.hypot(flatbed.x - x, flatbed.z - z),
    F,
    GAP,
  };
  const animate = ({ dt, now }: { dt: number; now: number }) => {
    const alpha = stepAlpha();
    drawCar(flatbed, alpha);
    drawCar(loco, alpha);
    model?.update(rustU.value);
    fire.emissiveIntensity = fireOn * (1 + Math.sin(now * 0.0025) * 0.05 + Math.sin(now * 0.0047) * 0.03);
    if (st.shudder > 0 || st.was) {
      st.was = st.shudder > 0;
      for (const [rock, phase] of [
        [flatRock, 0],
        [locoRock, 1.3],
      ] as const) {
        rock.rotation.z = Math.sin(now * 0.073 + phase) * 0.018 * st.shudder;
        rock.position.x = Math.sin(now * 0.097 + phase) * 0.035 * st.shudder;
      }
    }
    if (st.bump > 0) {
      st.bump = Math.max(0, st.bump - dt * 7);
      flatRock.position.y = flatY - st.bump * 0.04;
      flatbed.mesh.scale.set(1 + st.bump * 0.02, 1 - st.bump * 0.04, 1 + st.bump * 0.02);
    }
    if (st.awake) {
      st.idle += dt;
      if (st.idle > 1.4) {
        st.idle = 0;
        look.chimneyTop.getWorldPosition(v);
        emit({
          x: v.x,
          y: v.y,
          z: v.z,
          vx: 0.2,
          vy: 1.6,
          vz: 0,
          life: 2,
          size: 0.35,
          color: smoke,
          alpha: 0.4,
          grow: [1, 3],
          fade: 0.6,
        });
      }
    }
    if (model && rig) {
      // Cancel shell squash outside the rigid bogie frame.
      const gear = model.runningGear[1]!;
      const scale = flatbed.mesh.scale;
      gear.scale.set(1 / scale.x, 1 / scale.y, 1 / scale.z);
      gear.position.y = -(BOTTOM + flatbed.hy) / scale.y;
      rig.root.scale.set(1 / scale.x, 1 / scale.y, 1 / scale.z);
      rig.root.position.y = -(BOTTOM + flatbed.hy) / scale.y;
      m.onPanelFrame(dt);
    }
  };
  if (owner) {
    // Revisit the completed groups: some attached details were made after makeCar mounted their roots.
    owner.add(flatbed.mesh, loco.mesh);
    owner.animate(animate, 7);
    owner.cleanup(() => {
      glass.dispose();
      shine.dispose();
      beamMat.dispose();
      fire.dispose();
    });
  } else onFrame(animate, { phase: 'update', order: 7 });
  return m;
}

/** Sleepers thud, rails clank, the trestle's big pieces shake the ground. */
export function thud(machine: Machine, kind: string, x: number, y: number, z: number) {
  if (kind === 'sleeper' || kind === 'plank') {
    thump(x, z);
    dustRing(x, y, z, 7, 1.6, 0.22);
    machine.bump();
  } else if (kind === 'rail') {
    clank(x, z);
    dustRing(x, y + 0.1, z, 2, 0.8, 0.1);
  } else if (kind === 'leg' || kind === 'cap') {
    thump(x, z);
    if (kind === 'leg') dustRing(x, y + 0.2, z, 12, 3, 0.6);
    machine.bump();
  }
}

// ---------------------------------------------------------------- trains
// Not a timetable: the owner felt "at the whims of if a train happened to show up". A train shuttles along its stops with its
// cargo, and stepping onto a platform calls it straight there (./cargo.ts). It knows how long that'll be.
const CARS: { spec: CarSpec; off: number }[] = [
  { spec: LOCO, off: 3.7 },
  { spec: TRAILER, off: 0 },
  { spec: TRAILER, off: -3.7 },
];
export type Train = {
  line: Line;
  stops: number[];
  s: number;
  v: number; // m/s along the line, signed
  stop: number; // the stop it's standing at, -1 moving
  target: number;
  sweep: 1 | -1; // which way it's working along the stops
  dwell: number; // s left at this stop
  express: boolean; // someone's aboard: straight to the end of the line, past the stops between
  cars: Car[];
  load: Deck;
  lastStop: number;
};
function stepTrain(tr: Train, dt: number) {
  if (tr.dwell > 0) {
    tr.dwell -= dt;
    if (tr.dwell > 0) return;
    // On to the next stop along, turning at the ends.
    if (tr.target + tr.sweep < 0 || tr.target + tr.sweep >= tr.stops.length) tr.sweep = -tr.sweep as 1 | -1;
    tr.target = tr.express ? (tr.sweep > 0 ? tr.stops.length - 1 : 0) : tr.target + tr.sweep;
    tr.express = false;
    tr.stop = -1;
  }
  const to = tr.stops[tr.target]!,
    d = to - tr.s,
    want = Math.sign(d) * Math.min(TUNE.cruise, Math.sqrt(2 * TUNE.accel * Math.abs(d))),
    most = TUNE.accel * dt;
  tr.v += Math.max(-most, Math.min(most, want - tr.v));
  tr.s += tr.v * dt;
  if (Math.abs(to - tr.s) < 0.04 && Math.abs(tr.v) < 0.4) {
    tr.s = to;
    tr.v = 0;
    tr.stop = tr.target;
    tr.dwell = TUNE.dwell;
    tr.express = false;
  }
}
/** Seconds until it can be standing at `stop`, if it goes there now. */
export function trainEta(tr: Train, stop: number) {
  if (tr.stop === stop) return 0;
  const a = TUNE.accel,
    c = TUNE.cruise;
  let d = tr.stops[stop]! - tr.s,
    v = tr.v * Math.sign(d) || 0,
    t = 0;
  d = Math.abs(d);
  if (v < 0) {
    // Going the other way: it stops first, and that's further to come back.
    t += -v / a;
    d += (v * v) / (2 * a);
    v = 0;
  }
  const up = (c * c - v * v) / (2 * a),
    down = (c * c) / (2 * a);
  if (up + down <= d) t += (c - v) / a + (d - up - down) / c + c / a;
  else t += (2 * Math.sqrt(a * d + (v * v) / 2) - v) / a;
  return Math.ceil(t);
}
/** Straight there. If it's already heading the other way it brakes and comes back. */
export function callTrain(tr: Train, stop: number) {
  if (tr.stop === stop) {
    tr.dwell = Math.max(tr.dwell, TUNE.dwell);
    return;
  }
  tr.target = stop;
  tr.dwell = 0;
  tr.stop = -1;
  tr.sweep = stop === 0 ? 1 : stop === tr.stops.length - 1 ? -1 : tr.sweep;
}

/** One train on a line. It stands where it's told until `start`. */
export function buildTrain(line: Line, stops: number[], id: string) {
  const clock = { running: false };
  const look = LOOK.kit ? trainLook(CARS.length - 1) : wagonLook(CARS.length - 1, false);
  const tr: Train = {
    line,
    stops,
    s: stops[stops.length - 1]!,
    v: 0,
    stop: stops.length - 1,
    target: stops.length - 1,
    sweep: -1,
    dwell: 0,
    express: false,
    cars: [],
    load: null as unknown as Deck,
    lastStop: -1,
  };
  const plan = () => tr.cars.forEach((c, k) => poseCarOnLine(c, line, tr.s + CARS[k]!.off, 1));
  let updateLoad = () => {};
  CARS.forEach(({ spec }, k) => {
    tr.cars.push(
      makeCar(
        spec,
        look.cars[k]!,
        () => {
          if (k === CARS.length - 1) updateLoad();
          if (k === 0 && clock.running) {
            stepTrain(tr, FIXED);
            plan();
          }
        },
        {},
      ),
    );
  });
  tr.load = deck(tr.cars[tr.cars.length - 1]!.rock.children[0]!, () => {});
  // The empty car's two resting places sit directly on its deck; keep the aisle and exits clear.
  const passenger = tr.cars[1]!;
  const group = `train-${id}`;
  [-0.8, 0.8].forEach((z, i) => {
    registerSeat({
      id: `${group}-${i}`,
      group,
      platform: passenger.platform,
      at: { x: passenger.spec.hx - 0.2, y: passenger.hy + PLAYER_R, z, yaw: Math.PI / 2 },
      exit: { x: 0.65, y: passenger.hy + 0.46, z, yaw: Math.PI / 2 },
      available: () => passenger.y > -30,
    });
  });
  updateLoad = solidTrainLoad(tr.cars[tr.cars.length - 1]!, tr.load);
  const smoke = new THREE.Color('#ece8e0'),
    chimney = new THREE.Vector3();
  let puffs = 0,
    shudder = 0;
  const rocks = tr.cars.map((c) => c.rock);
  onFrame(
    ({ dt, now }) => {
      const alpha = stepAlpha();
      for (const c of tr.cars) drawCar(c, alpha);
      if (shudder > 0)
        rocks.forEach((r, n) => {
          r.rotation.z = Math.sin(now * 0.073 + n * 1.3) * 0.018 * shudder;
          r.position.x = Math.sin(now * 0.097 + n * 1.3) * 0.035 * shudder;
        });
      if (!clock.running) return;
      const speed = Math.abs(tr.v);
      puffs += speed * dt * 0.25 + (speed < 0.1 ? dt / 2 : 0);
      if (puffs < 1) return;
      look.chimneyTop.getWorldPosition(chimney);
      for (; puffs >= 1; puffs--)
        emit({
          x: chimney.x,
          y: chimney.y,
          z: chimney.z,
          vx: 1.2 + (Math.random() - 0.5) * 0.6,
          vy: 1.5 + Math.random() * 0.8,
          vz: (Math.random() - 0.5) * 0.6,
          life: 2.4,
          size: 0.3,
          color: smoke,
          alpha: 0.35,
          drag: 0.6,
          grow: [1, 3.2],
          fade: 0.6,
        });
    },
    { phase: 'update', order: 6 },
  );
  const run = {
    tr,
    clock,
    /** Runs, from wherever it's standing. */
    start() {
      clock.running = true;
      tr.dwell = Math.max(tr.dwell, 1.5);
      tr.stop = tr.target;
      plan();
      for (const c of tr.cars) c.mesh.visible = true;
    },
    /** Under the land until it's needed. */
    hide() {
      clock.running = false;
      for (const c of tr.cars) {
        c.x = ORIGIN.x;
        c.y = -60;
        c.z = ORIGIN.z;
        snapCar(c);
      }
    },
    /** Stands at a stop, waiting. */
    park(stop = stops.length - 1) {
      clock.running = false;
      tr.s = stops[stop]!;
      tr.v = 0;
      tr.stop = tr.target = stop;
      tr.sweep = stop === 0 ? 1 : -1;
      tr.dwell = 0;
      plan();
      for (const c of tr.cars) snapCar(c);
    },
    /** Running, from a saved or shared place. */
    put(s: number, v: number, target: number, sweep: 1 | -1, dwell: number, express = false) {
      clock.running = true;
      tr.s = s;
      tr.v = v;
      tr.target = target;
      tr.sweep = sweep;
      tr.dwell = dwell;
      tr.express = express;
      tr.stop = dwell > 0 ? target : -1;
      plan();
      for (const c of tr.cars) snapCar(c);
    },
    onTrain: (p: Platform | null) => tr.cars.some((c) => c.platform === p),
    look,
    clockRunning: () => clock.running,
    /** For the wake: what ./celebrate.ts's wakeShow asks of a machine. */
    waker: {
      flatbed: tr.cars[1]!,
      loco: tr.cars[0]!,
      look,
      shudder: (a: number) => {
        shudder = a;
        if (!a) for (const r of rocks) r.rotation.z = r.position.x = 0;
      },
      setRust: (v: number) => void (rustTrainU.value = v),
      setFire: () => {},
      setLamps: () => {},
      setSlip: (rate: number) => {
        const l = look as { slip?: { rate: number } };
        if (l.slip) l.slip.rate = rate;
      },
      distance: (x: number, z: number) => Math.hypot(tr.cars[1]!.x - x, tr.cars[1]!.z - z),
    },
  };
  return run;
}
export type TrainRun = ReturnType<typeof buildTrain>;
