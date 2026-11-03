// The rail of ?proto=place: each line's track and trestle as separate pieces that fall into place as the machine passes,
// with colliders that grow with what's down; the machine itself, solid, with its rack and its cradle in plain sight; the
// platforms; and one train per line (one track: the geometry doesn't need two). Trains are the wagon's look on kinematic
// platforms, the crossing's way. docs/proposals/boogle-2.md, "construction is physical" and "what looks solid is solid".
// The machine's rhythm is ?proto=lay's (src/features/track-machine.ts). Local: every tab runs its own.
import * as THREE from 'three/webgpu';
import { onFrame } from '../../loop.ts';
import { scene } from '../../render/scene.ts';
import { emit } from '../../render/particles.ts';
import { chuff, clank, thump } from '../../render/machine-sfx.ts';
import { FIXED } from '../../constants.ts';
import { angleLerp } from '../../math.ts';
import { BODY, addBody, createBody, onPreStep, removeBody, stepAlpha, type Body } from '../../physics/engine.ts';
import { NOT_SCENERY, groundMat } from '../../physics/physics.ts';
import { carry, registerPlatform, yawOf, type Platform } from '../../physics/platforms.ts';
import { me } from '../../player/player.ts';
import { wagonLook, LOCO, TRAILER, type CarSpec } from '../wagon/look.ts';
import { box, place } from '../net/boxes.ts';
import { deck, type Deck } from '../net/crates.ts';
import { H, addStatic, plank, slab } from './land.ts';
import { ORIGIN, STUB, TUNE, lineAt, railY, type Line, type LinePoint, type LineSpec } from './layout.ts';
import { RAIL_SIZE, dropSet, dustRing, logStackMesh, setStackLog, type DropSet } from './pieces.ts';
import { flat } from '../flat.ts';
import { LOOK, STEEL, paint, rustU, softGlow } from './look.ts';
import { merged } from './gifts.ts';
import { kitBatch, lookTrack, machineLook, trainLook } from './look-kit.ts';

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
type Solid = { u: number; add: () => Body | Body[]; on: Body | Body[] | null };
export type Track = {
  spec: LineSpec;
  set: DropSet;
  order: number[]; // piece indices that aren't there at the start, by the metre the machine drops them
  us: Float32Array; // by piece: the head's u when it drops
  heights: Float32Array; // by piece: how far it falls
  next: number;
  solids: Solid[];
  nextSolid: number;
  u: (s: number) => number;
  head: number; // how far along (in u) the track is down
  layTo: (u: number) => void;
  snapTo: (u: number) => void;
  update: (dt: number) => void;
};
type PieceKind = 'sleeper' | 'plank' | 'rail' | 'cap' | 'stringer' | 'leg' | 'brace';
export function buildTrack(
  spec: LineSpec,
  thudAt: (k: number, kind: PieceKind, x: number, y: number, z: number) => void,
) {
  const { line, dir } = spec;
  const u = (s: number) => (dir > 0 ? s : line.len - s);
  const boxes: ReturnType<typeof box>[] = [],
    us: number[] = [],
    falls: number[] = [],
    kinds: PieceKind[] = [],
    pre: boolean[] = [];
  const stubbed = (s: number) =>
    spec.id === 'timber' ? s >= STUB.camp - 0.5 || s <= STUB.village + 0.5 : s <= STUB.east + 0.5;
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
    us.push(u(s) - lead);
    falls.push(fall);
    kinds.push(kind);
    pre.push(stubbed(s));
  };
  const q = { x: 0, z: 0 };
  const bed = (s: number) => {
    lineAt(line, s, P);
    lateral(0, q);
    return railY(line, s) - H(q.x, q.z);
  };
  // Sleepers on the land; on the trestle a plank deck wide enough to walk, nearly closed.
  for (let s = 0.6; s < line.len;) {
    const onDeck = bed(s) > 1;
    const yaw = Math.atan2(P.ux, P.uz),
      y = railY(line, s),
      lean = new THREE.Euler(-Math.atan2(railY(line, s + 1) - railY(line, s - 1), 2), 0, 0);
    if (onDeck) add(s, 'plank', q.x, q.z, y - 0.02, place(0, 0, 0, DECK_W, 0.12, 0.84, yaw, lean), '#a97a45', 0, 1.1);
    else add(s, 'sleeper', q.x, q.z, y - 0.02, place(0, 0, 0, 2.3, 0.12, 0.42, yaw, lean), '#8a6236', 0, 1.1);
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
    dropSet(boxes, (k) => {
      const b = boxes[k]!;
      thudAt(k, kinds[k]!, b.x, b.y, b.z);
    }),
    kinds,
  );
  const order = boxes
    .map((_, k) => k)
    .filter((k) => !pre[k])
    .sort((a, b) => us[a]! - us[b]!);

  // The solid top: 2 m slabs that appear as the machine passes them, wider on the deck, and a body per bent leg.
  const solids: Solid[] = [];
  const a = { x: 0, z: 0 },
    c = { x: 0, z: 0 };
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
      u: stubbed(s + 1) ? -Infinity : u(s + 1),
      add: () => slab(ax, az, cx, cz, ya, yc, wide ? DECK_W : BED_W),
      on: null,
    });
  }
  for (const l of legsAt)
    solids.push({
      u: u(l.s) - 5,
      add: () =>
        addStatic({ kind: 'box', hx: 0.25, hy: (l.top - l.g) / 2, hz: 0.25 }, { x: l.x, y: (l.top + l.g) / 2, z: l.z }),
      on: null,
    });
  solids.sort((p, r) => p.u - r.u);

  const t: Track = {
    spec,
    set,
    order,
    us: Float32Array.from(us),
    heights: Float32Array.from(falls),
    next: 0,
    solids,
    nextSolid: 0,
    u,
    head: 0,
    layTo(to) {
      t.head = to;
      while (t.next < order.length && t.us[order[t.next]!]! <= to) {
        const k = order[t.next++]!;
        set.drop(k, t.heights[k]!);
      }
      growSolids(t, to);
    },
    snapTo(to) {
      t.head = to;
      boxes.forEach((_, k) => set.snap(k, pre[k]! || t.us[k]! <= to));
      t.next = order.findIndex((k) => t.us[k]! > to);
      if (t.next < 0) t.next = order.length;
      for (const so of solids) if (so.on) removeBodies(so);
      t.nextSolid = 0;
      growSolids(t, to);
    },
    update: (dt) => set.update(dt),
  };
  return t;
}
function growSolids(t: Track, to: number) {
  while (t.nextSolid < t.solids.length && t.solids[t.nextSolid]!.u <= to) {
    const so = t.solids[t.nextSolid++]!;
    so.on = so.add();
  }
}
function removeBodies(so: Solid) {
  for (const b of [so.on].flat()) if (b) removeBody(b);
  so.on = null;
}

// ---------------------------------------------------------------- platforms
/** A platform along one side of the track, with a ramp at its far end and one off its side, down to the ground. */
export function buildPlatform(line: Line, s0: number, s1: number, lat: number, rampAt: number, sideAt = (s0 + s1) / 2) {
  const a = { x: 0, z: 0 },
    b = { x: 0, z: 0 };
  lineAt(line, s0, P);
  lateral(lat, a);
  lineAt(line, s1, P);
  lateral(lat, b);
  const low = Math.min(railY(line, s0), railY(line, s1)) + 0.72;
  plank(a.x, a.z, b.x, b.z, low, low, 2.5, '#bdb8ac', 1.2);
  const r = { x: 0, z: 0 };
  lineAt(line, rampAt, P);
  lateral(lat, r);
  const from = rampAt < s0 ? a : b;
  plank(r.x, r.z, from.x, from.z, H(r.x, r.z) + 0.05, low, 2.5, '#bdb8ac', 0.4);
  // Off the side, at the middle: so you can walk up from where you are.
  lineAt(line, sideAt, P);
  const sign = Math.sign(lat);
  const t0 = { x: 0, z: 0 },
    t1 = { x: 0, z: 0 };
  lateral(lat + sign * 1.25, t0);
  lateral(lat + sign * 7, t1);
  plank(t1.x, t1.z, t0.x, t0.z, H(t1.x, t1.z) + 0.05, low, 2.5, '#bdb8ac', 0.4);
}

// ---------------------------------------------------------------- a car: a kinematic body following a planned pose
const BOTTOM = 0.4;
// The deck's edge holds you while you stand. The body is a sphere on a box and counts as standing up to CARRY.edge past the
// box (src/physics/platforms.ts). With its centre past the box, though, the contact's normal leans outward, so a player who
// stopped at the edge crept off at about 0.1 m/s, moving or not, until the deck let go of them over the river. Standing with
// no stick pushed, you're eased back inside instead. Push out and you walk off, and a jump's a jump, so no railing: nothing
// here looks solid that isn't. Serves "you can stand on it", docs/proposals/boogle-2.md.
const HOLD = { inset: 0.04, speed: 1.2 }; // m inside the box's edge you settle; m/s you're eased back
const decks = new Set<Platform>();
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
    const most = HOLD.speed * FIXED,
      overX = Math.abs(lx) - (p.hx - HOLD.inset),
      overZ = Math.abs(lz) - (p.hz - HOLD.inset);
    if (overX <= 0 && overZ <= 0) return;
    const inX = overX > 0 ? -Math.sign(lx) * Math.min(most, overX) : 0,
      inZ = overZ > 0 ? -Math.sign(lz) * Math.min(most, overZ) : 0;
    b.position.set(b.position.x + inX * c + inZ * s, b.position.y, b.position.z - inX * s + inZ * c);
  },
  { order: 20 }, // after the decks move (10), before the player's controller (40)
);
type Car = {
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
  platform: Platform;
};
function makeCar(spec: CarSpec, rock: THREE.Object3D, before: () => void, extra: Parameters<typeof createBody>[0]) {
  const hy = (spec.top - BOTTOM) / 2;
  const body = createBody({
    type: BODY.KINEMATIC,
    material: groundMat,
    mask: NOT_SCENERY,
    position: { x: ORIGIN.x, y: -60, z: ORIGIN.z },
    shapes: [{ kind: 'box', hx: spec.hx, hy, hz: spec.hz }, ...(extra?.shapes ?? [])],
  });
  addBody(body);
  const mesh = new THREE.Group();
  rock.position.y = -(BOTTOM + hy);
  mesh.add(rock);
  mesh.visible = false;
  scene.add(mesh);
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
  registerPlatform(car.platform);
  decks.add(car.platform);
  return car;
}
function moveCar(c: Car, dt: number) {
  const p = c.body;
  c.prevYaw = yawOf(p.quaternion);
  const dx = c.x - p.position.x,
    dy = c.y - p.position.y,
    dz = c.z - p.position.z;
  if (dx * dx + dy * dy + dz * dz > 25) return snapCar(c);
  p.velocity.set(dx / dt, dy / dt, dz / dt);
  p.angularVelocity.set(0, (angleLerp(c.prevYaw, c.yaw, 1) - c.prevYaw) / dt, 0);
}
function snapCar(c: Car) {
  const p = c.body;
  p.position.set(c.x, c.y, c.z);
  p.quaternion.set(0, Math.sin(c.yaw / 2), 0, Math.cos(c.yaw / 2));
  p.velocity.set(0, 0, 0);
  p.angularVelocity.set(0, 0, 0);
  c.prevYaw = c.yaw;
}
function drawCar(c: Car, alpha: number) {
  const ip = c.body.interpolatedPosition;
  c.mesh.position.set(ip.x, ip.y, ip.z);
  c.mesh.rotation.y = angleLerp(c.prevYaw, yawOf(c.body.quaternion), alpha);
  c.rock.rotation.x = -c.pitch;
  c.mesh.visible = true;
}
function poseCarOnLine(c: Car, line: Line, s: number, sign: number) {
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
const RACK_RAILS = 12,
  CRADLE_LOGS = 24;
const F = 2.4, // m from the head (where pieces land) back to the flatbed's middle
  GAP = 3.7; // m between the cars' middles
export type Machine = ReturnType<typeof buildMachine>;
export function buildMachine() {
  const kitLook = LOOK.kit ? machineLook() : null;
  const look = kitLook ?? wagonLook(1, false);
  const flatRock = look.cars[1]!,
    locoRock = look.cars[0]!;
  const pose = { line: null as Line | null, s: 0, sign: 1 };
  const onDeck = TRAILER.top;
  const flatbed = makeCar(TRAILER, flatRock, () => m.onStep(FIXED), {});
  const loco = makeCar(LOCO, locoRock, () => {}, {});
  const box3 = (w: number, h: number, d: number, color: string, x: number, y: number, z: number, rx = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), flat(color, 0.8));
    m.position.set(x, y, z);
    m.rotation.x = rx;
    m.castShadow = true;
    flatRock.add(m);
    return m;
  };
  // Cradle sides, in the flatbed's +z half (its front), open at the top.
  let heldRail: THREE.Object3D;
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
  const rackRails = LOOK.kit
    ? kitBatch('rail', STEEL, RACK_RAILS)
    : new THREE.InstancedMesh(railGeo, LOOK.mats ? paint(STEEL) : flat('#4c5058', 0.6), RACK_RAILS);
  rackRails.castShadow = true;
  rackRails.frustumCulled = false;
  const o = new THREE.Object3D();
  for (let k = 0; k < RACK_RAILS; k++) {
    const side = k % 2 ? 1 : -1,
      layer = Math.floor(k / 4),
      inner = (k >> 1) % 2;
    o.position.set(side * (1.26 + inner * 0.18), onDeck - 0.1 + layer * 0.2, 0);
    o.updateMatrix();
    rackRails.setMatrixAt(k, o.matrix);
  }
  flatRock.add(rackRails);
  const cradle = logStackMesh(CRADLE_LOGS);
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
      cradleAt.set(0, onDeck + 0.14 + row * 0.26, 0.2 + c * 0.25);
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
    flatRock.updateWorldMatrix(true, false);
    return flatRock.localToWorld(out.set(1.3, onDeck + 0.1, 0));
  };

  function setRack(n: number) {
    rackRails.count = Math.max(0, Math.min(RACK_RAILS, n));
    rackRails.visible = rackRails.count > 0;
    rackRails.instanceMatrix.needsUpdate = true;
    heldRail.visible = n > 0;
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
  const fire = new THREE.MeshStandardNodeMaterial({ color: '#1c0d05', emissive: '#ff4a08', emissiveIntensity: 0 });
  const firebox = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.3, 0.04), fire);
  firebox.position.set(0, 1.05, -1.57);
  locoRock.add(firebox);
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
    look,
    flatbed,
    loco,
    onMachine: (p: Platform | null) => p === flatbed.platform || p === loco.platform,
    /** Stands on `line`, the head (where pieces land) at `head` metres along, heading `sign` along the line. */
    at(line: Line, head: number, sign: number) {
      pose.line = line;
      pose.s = head;
      pose.sign = sign;
      poseCarOnLine(flatbed, line, head - sign * F, sign);
      poseCarOnLine(loco, line, head - sign * (F + GAP), sign);
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
    wake(on: boolean) {
      st.awake = on;
      st.shudder = 0;
      rustU.value = on ? 0 : 1;
      setLamps(on);
      fireOn = on ? 1 : 0;
      if (on) for (let k = 0; k < 3; k++) puff(1);
    },
    /** For the waking: how hard it shakes (0 stops), how rusty (1) or clean (0), the fire, the lamps. */
    shudder: (a: number) => void (st.shudder = a),
    setRust: (v: number) => void (rustU.value = v),
    setFire: (v: number) => void (fireOn = v),
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
    setCradle,
    worldCradle,
    worldRack,
    /** Metres from a world point to the machine. */
    distance: (x: number, z: number) => Math.hypot(flatbed.x - x, flatbed.z - z),
    F,
    GAP,
  };
  onFrame(
    ({ dt, now }) => {
      const alpha = stepAlpha();
      drawCar(flatbed, alpha);
      drawCar(loco, alpha);
      fire.emissiveIntensity = fireOn * (1 + Math.sin(now * 0.021) * 0.3 + Math.sin(now * 0.037) * 0.2);
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
    },
    { phase: 'update', order: 7 },
  );
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
const CARS: { spec: CarSpec; off: number }[] = [
  { spec: LOCO, off: 3.7 },
  { spec: TRAILER, off: 0 },
  { spec: TRAILER, off: -3.7 },
];
/** A train's place on its line: `stop` 0 at the village, 1 at the camp, -1 moving. */
export type Train = {
  line: Line;
  s: number;
  v: number;
  stop: -1 | 0 | 1;
  cars: Car[];
  load: Deck;
  lastStop: number;
};

/** Rides between stops, for the report and the card. */
export const runSeconds = (line: Line) => (line.len - TUNE.stopIn * 2) / TUNE.cruise + TUNE.cruise / TUNE.accel;
export const cycleOf = (line: Line) => 2 * (TUNE.dwell + runSeconds(line));
/** The moment in a cycle just before a train leaves the far end. */
const leavingFar = (line: Line) => 2 * TUNE.dwell + runSeconds(line) - 0.6;

function trainAt(tr: Train, t: number) {
  const { line } = tr;
  const RUN = runSeconds(line),
    C = cycleOf(line),
    LEN = line.len - TUNE.stopIn * 2,
    ta = TUNE.cruise / TUNE.accel;
  const along = (u: number) =>
    u < ta
      ? 0.5 * TUNE.accel * u * u
      : u < RUN - ta
        ? TUNE.cruise * (u - ta / 2)
        : LEN - 0.5 * TUNE.accel * (RUN - u) ** 2;
  const speed = (u: number) => Math.min(TUNE.cruise, TUNE.accel * u, TUNE.accel * (RUN - u));
  const c = ((t % C) + C) % C;
  if (c < TUNE.dwell) {
    tr.s = TUNE.stopIn;
    tr.v = 0;
    tr.stop = 0;
  } else if (c < TUNE.dwell + RUN) {
    tr.s = TUNE.stopIn + along(c - TUNE.dwell);
    tr.v = speed(c - TUNE.dwell);
    tr.stop = -1;
  } else if (c < 2 * TUNE.dwell + RUN) {
    tr.s = line.len - TUNE.stopIn;
    tr.v = 0;
    tr.stop = 1;
  } else {
    const r = c - 2 * TUNE.dwell - RUN;
    tr.s = line.len - TUNE.stopIn - along(r);
    tr.v = -speed(r);
    tr.stop = -1;
  }
}

/** One train on a line. It stands at the far end with its load until `start`. */
export function buildTrain(line: Line) {
  const clock = { t: 0, running: false };
  const look = LOOK.kit ? trainLook(CARS.length - 1) : wagonLook(CARS.length - 1, false);
  const tr: Train = {
    line,
    s: line.len - TUNE.stopIn,
    v: 0,
    stop: 1,
    cars: [],
    load: null as unknown as Deck,
    lastStop: -1,
  };
  const plan = () => {
    trainAt(tr, clock.t);
    tr.cars.forEach((c, k) => poseCarOnLine(c, line, tr.s + CARS[k]!.off, 1));
  };
  CARS.forEach(({ spec }, k) => {
    tr.cars.push(
      makeCar(
        spec,
        look.cars[k]!,
        () => {
          if (k === 0 && clock.running) {
            clock.t += FIXED;
            plan();
          }
        },
        {},
      ),
    );
  });
  tr.load = deck(tr.cars[tr.cars.length - 1]!.rock.children[0]!, () => {});
  const smoke = new THREE.Color('#ece8e0'),
    chimney = new THREE.Vector3();
  let puffs = 0;
  onFrame(
    ({ dt }) => {
      const alpha = stepAlpha();
      for (const c of tr.cars) drawCar(c, alpha);
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
  const parked = leavingFar(line) - TUNE.dwell;
  return {
    tr,
    clock,
    /** Runs. From the far end, just pulling out; or from `at` in the cycle (just leaving the village, say). */
    start(fromFar = true, at = 0) {
      clock.running = true;
      clock.t = fromFar ? leavingFar(line) : at;
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
    /** Stands at the far end, waiting. */
    park() {
      clock.running = false;
      clock.t = parked;
      plan();
      for (const c of tr.cars) snapCar(c);
    },
    /** Reloading into an open line: somewhere mid-cycle, not jumping anybody. */
    resume(at: number) {
      clock.running = true;
      clock.t = at;
      plan();
      for (const c of tr.cars) snapCar(c);
    },
    onTrain: (p: Platform | null) => tr.cars.some((c) => c.platform === p),
    look,
    clockRunning: () => clock.running,
  };
}
export type TrainRun = ReturnType<typeof buildTrain>;
