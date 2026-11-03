// Buildings you can walk into in ?proto=place: the house, the shop and the museum (docs/plans/round-4.md, step 6;
// docs/research/town-interiors.md). Each stands in the same world as everything else, with an open door and no loading: a site
// like any other (./sites.ts, its pieces in the town's one instanced mesh), but hollow, with its walls and roof in `ROOM_GROUP`.
//
// Indoors your camera stays yours. The roof lifts off and any wall on the camera's side sinks to its bottom course, for this tab
// alone, while their colliders stay, so a wall that's gone from view is still a wall. A proxy with no colour keeps their shadow,
// so the sun doesn't flood the room. The arm leaves `ROOM_GROUP` out of its mask, so a cut-away wall doesn't push the lens into
// your back; it still minds furniture, the ground and every other building. The pitch eases up a little as you come in, and any
// look of yours ends that at once. Unity's deoccluder, Unreal's spring arm and Godot's SpringArm3D all separate the wanted shot
// from clearance (the research doc's table); so does this, with the cutaway as the shot's half.
//
// Interiors draw only near their building (`near`), so a village you're not in pays for its walls and nothing behind them. Local;
// which rooms exist comes from `roomEnv.up`, read from what's shared.
import * as THREE from 'three/webgpu';
import { vertexColor } from 'three/tsl';
import { reducedMotion } from '../../constants.ts';
import { getMask, removeBody, type Body } from '../../physics/engine.ts';
import { makeCameraArm } from '../../player/camera-arm.ts';
import { cam, me } from '../../player/player.ts';
import { precompile } from '../../render/precompile.ts';
import { camera, scene } from '../../render/scene.ts';
import { merged } from './gifts.ts';
import { H, ROOM_GROUP, addStatic } from './land.ts';
import { ROOM_PLOTS, toWorld, type RoomId } from './layout.ts';
import { paintBoard } from './signs.ts';
import {
  addSite,
  housePlan,
  liftPiece,
  showPiece,
  snapSite,
  startSite,
  type Hull,
  type Plan,
  type Site,
} from './sites.ts';

export const ROOM_CAM = {
  enter: 0.75, // m outside the door where the show starts, and past which it can end
  reveal: 0.24, // s for a wall or the roof to get out of the way
  nearWall: 0.8, // m inside a wall: a camera this close to it, or past it, has it cut away
  farWall: 1.5, // and it comes back only this far inside: no flicker at the line
  pitch: -0.4, // rad: a modest look down, suggested as you come in
  pitchRate: 2.6, // 1/s
  camClear: 1.8, // m the camera has to be outside a building before its walls come back, so they don't rise at the lens
  drawWithin: 34, // m: interiors draw within this of their building
};
export const DOOR = { w: 2.6, rows: 3 };
const FLOOR = 0.14;

/** What rooms are made of: their own colours, a little warm light of their own so a shaded room still reads, one material for
 * all three. */
export const roomMat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.82 });
roomMat.emissiveNode = vertexColor().mul(0.2);
const shadowOnly = new THREE.MeshBasicNodeMaterial({ colorWrite: false, depthWrite: false });

export type Part = Parameters<typeof merged>[0][number];
type Face = 'roof' | 'front' | 'back' | 'left' | 'right';
const WALLS = ['front', 'back', 'left', 'right'] as const;
const FACES = ['roof', ...WALLS] as const;
type Solid = { x: number; y: number; z: number; hx: number; hy: number; hz: number };
export type Room = {
  id: RoomId;
  x: number;
  z: number;
  y: number; // the floor, world
  yaw: number;
  w: number;
  d: number;
  high: number;
  site: Site;
  /** Interiors and anything else only worth drawing close to: room space, floor at y = 0, door on +z. */
  near: THREE.Group;
  /** Over the door and on the roofline: awnings, boards. Goes with the roof. */
  over: THREE.Group;
  /** Low things outside, there whenever the building is. */
  outside: THREE.Group;
  pieces: Record<Face, number[]>;
  corners: { k: number; a: (typeof WALLS)[number]; b: (typeof WALLS)[number]; on: boolean }[];
  t: Record<Face, number>; // 0 there, 1 out of the way
  shown: Record<Face, number>; // what's been written
  proxy: THREE.Mesh;
  solids: Solid[];
  bodies: Body[];
  up: boolean;
  ready: boolean;
};

const rowsOf = (high: number) => Math.round((high - FLOOR) / 0.82);
const doorTop = (high: number) => FLOOR + (DOOR.rows * (high - FLOOR)) / rowsOf(high);
function hollow(w: number, d: number, high: number, rise: number): Hull[] {
  const side = (w - DOOR.w) / 2,
    t = 0.14,
    top = doorTop(high);
  const h = (dx: number, dy: number, dz: number, hx: number, hy: number, hz: number): Hull => ({
    dx,
    dy,
    dz,
    hx,
    hy,
    hz,
    room: true,
  });
  return [
    h(0, high / 2, -d / 2, w / 2 + t, high / 2, t),
    h(-w / 2, high / 2, 0, t, high / 2, d / 2 + t),
    h(w / 2, high / 2, 0, t, high / 2, d / 2 + t),
    h(-(DOOR.w + side) / 2, high / 2, d / 2, side / 2, high / 2, t),
    h((DOOR.w + side) / 2, high / 2, d / 2, side / 2, high / 2, t),
    h(0, (top + high) / 2, d / 2, DOOR.w / 2, (high - top) / 2, t),
    h(0, high + 0.2 + rise * 0.3, 0, w / 2 + 0.2, 0.2 + rise * 0.3, d / 2 + 0.2),
    // The slab, plain scenery: it's what you stand on.
    { dx: 0, dy: FLOOR / 2, dz: 0, hx: w / 2 + 0.8, hy: FLOOR / 2, hz: d / 2 + 0.8 },
  ];
}

const LOOKS: Record<RoomId, { wall: string; post: string; roof: string; rise: number; smoke: boolean }> = {
  house: { wall: '#e8dcc0', post: '#7f5630', roof: '#c9a86a', rise: 2.5, smoke: true },
  shop: { wall: '#f0c98a', post: '#8a4a2c', roof: '#c4453a', rise: 2.6, smoke: false },
  museum: { wall: '#c8c3b4', post: '#b2ad9f', roof: '#4d5560', rise: 2.8, smoke: false },
};
function planOf(id: RoomId): Plan {
  const p = ROOM_PLOTS[id],
    look = LOOKS[id];
  const plan = housePlan({
    x: toWorld(p.x),
    z: p.z,
    yaw: p.yaw,
    w: p.w,
    d: p.d,
    high: p.high,
    rise: look.rise,
    wall: look.wall,
    post: look.post,
    roof: look.roof,
    door: DOOR,
    closed: false,
    windows: '#3f4a57',
    floor: FLOOR,
    chimney: look.smoke ? { dx: p.w * 0.38, dz: p.d * 0.2, n: 5, a: '#9a4a3a', b: '#8a4032' } : undefined,
  });
  plan.hulls = hollow(p.w, p.d, p.high, look.rise);
  plan.keepOut = { dx: 0, dy: p.high / 2, dz: 0, hx: p.w / 2 + 0.1, hy: p.high / 2, hz: p.d / 2 + 0.1 };
  return plan;
}

function makeRoom(id: RoomId): Room {
  const p = ROOM_PLOTS[id],
    plan = planOf(id);
  const site = addSite(`room-${id}`, plan, id === 'museum' ? 1.6 : 1);
  const cos = Math.cos(p.yaw),
    sin = Math.sin(p.yaw);
  const pieces: Record<Face, number[]> = { roof: [], front: [], back: [], left: [], right: [] };
  const corners: Room['corners'] = [];
  const rowTop = FLOOR + (p.high - FLOOR) / rowsOf(p.high) + 0.02;
  plan.pieces.forEach((b, i) => {
    const k = site.pole1 + i;
    if (i >= plan.WALLS) return void pieces.roof.push(k);
    const ax = b.x - plan.x,
      az = b.z - plan.z,
      lx = ax * cos - az * sin,
      lz = ax * sin + az * cos;
    const e = b.local.elements;
    // The bottom course stays: it says there's a wall here, and you can see the floor over it.
    if (e[13]! + e[5]! <= rowTop) return;
    const dist = {
      front: Math.abs(lz - p.d / 2),
      back: Math.abs(lz + p.d / 2),
      left: Math.abs(lx + p.w / 2),
      right: Math.abs(lx - p.w / 2),
    };
    let best: (typeof WALLS)[number] = 'front';
    for (const w of WALLS) if (dist[w] < dist[best]) best = w;
    // A post on a corner belongs to both its walls: it goes when either does, or it stands right in front of the lens.
    const other = WALLS.find((w) => w !== best && dist[w] < 0.35);
    if (other) corners.push({ k, a: best, b: other, on: true });
    else pieces[best].push(k);
  });
  const y = plan.y + FLOOR;
  const group = () => {
    const g = new THREE.Group();
    g.position.set(plan.x, y, plan.z);
    g.rotation.y = p.yaw;
    g.visible = false;
    scene.add(g);
    return g;
  };
  const top = doorTop(p.high) - FLOOR;
  const side = (p.w - DOOR.w) / 2,
    hh = p.high - FLOOR,
    t = 0.2;
  const B = (x: number, yy: number, z: number, sx: number, sy: number, sz: number): Part => [
    'b',
    x,
    yy,
    z,
    sx,
    sy,
    sz,
    '#000000',
  ];
  const proxy = new THREE.Mesh(
    merged([
      B(0, hh + 0.2, 0, p.w + 1, 0.4, p.d + 1),
      B(0, hh / 2, -p.d / 2, p.w, hh, t),
      B(-p.w / 2, hh / 2, 0, t, hh, p.d),
      B(p.w / 2, hh / 2, 0, t, hh, p.d),
      B(-(DOOR.w + side) / 2, hh / 2, p.d / 2, side, hh, t),
      B((DOOR.w + side) / 2, hh / 2, p.d / 2, side, hh, t),
      B(0, (top + hh) / 2, p.d / 2, DOOR.w, hh - top, t),
    ]),
    shadowOnly,
  );
  proxy.castShadow = true;
  proxy.position.set(plan.x, y, plan.z);
  proxy.rotation.y = p.yaw;
  proxy.visible = false;
  proxy.frustumCulled = false;
  scene.add(proxy);
  return {
    id,
    x: plan.x,
    z: plan.z,
    y,
    yaw: p.yaw,
    w: p.w,
    d: p.d,
    high: p.high,
    site,
    near: group(),
    over: group(),
    outside: group(),
    pieces,
    corners,
    t: { roof: 0, front: 0, back: 0, left: 0, right: 0 },
    shown: { roof: 0, front: 0, back: 0, left: 0, right: 0 },
    proxy,
    solids: [],
    bodies: [],
    up: false,
    ready: false,
  };
}
export const rooms: Record<RoomId, Room> = {
  house: makeRoom('house'),
  shop: makeRoom('shop'),
  museum: makeRoom('museum'),
};
const LIST = Object.values(rooms);
/** Which rooms stand. Set by ./town-life.ts from what's shared; the house is there from the start. */
export const roomEnv: { up: (id: RoomId) => boolean } = { up: (id) => id === 'house' };
/** `room`: the show is on for this one. `inside`: you're over its threshold. */
export const indoors = { room: null as Room | null, inside: null as Room | null };
const enterFns: ((r: Room, inside: boolean) => void)[] = [];
/** You've come in, or gone out: fn(room, true or false). */
export const onRoom = (fn: (r: Room, inside: boolean) => void) => void enterFns.push(fn);

// ---------------------------------------------------------------- helpers for what goes in them
/** Eight alternating planks, shared by the house and shop; sizes stay in room space. */
export function plankFloor({ w, d }: Room, even: string, odd: string): Part[] {
  return Array.from({ length: 8 }, (_, k) => [
    'b',
    0,
    0.015,
    -d / 2 + (k + 0.5) * (d / 8),
    w - 0.3,
    0.03,
    d / 8 - 0.03,
    k % 2 ? odd : even,
  ]);
}
/** Room space to world. */
export function roomToWorld(r: Room, lx: number, ly: number, lz: number, out: THREE.Vector3) {
  const c = Math.cos(r.yaw),
    s = Math.sin(r.yaw);
  return out.set(r.x + lx * c + lz * s, r.y + ly, r.z - lx * s + lz * c);
}
export function worldToRoom(r: Room, x: number, z: number) {
  const c = Math.cos(r.yaw),
    s = Math.sin(r.yaw),
    ax = x - r.x,
    az = z - r.z;
  return { x: ax * c - az * s, z: ax * s + az * c };
}
/** A piece of furniture is solid while its building stands: a box in room space, on the floor unless `y` says. */
export function addSolid(r: Room, lx: number, lz: number, hx: number, hz: number, height: number, y = 0) {
  r.solids.push({ x: lx, y: y + height / 2, z: lz, hx, hy: height / 2, hz });
}
const q_ = new THREE.Quaternion(),
  v_ = new THREE.Vector3();
function setSolid(r: Room, on: boolean) {
  for (const b of r.bodies) removeBody(b);
  r.bodies.length = 0;
  if (!on) return;
  q_.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, r.yaw);
  for (const s of r.solids) {
    roomToWorld(r, s.x, s.y, s.z, v_);
    r.bodies.push(addStatic({ kind: 'box', hx: s.hx, hy: s.hy, hz: s.hz }, { x: v_.x, y: v_.y, z: v_.z }, q_));
  }
}
/** One merged mesh of parts in room space, in the rooms' material. */
export function roomMesh(parts: Part[], shadow = true) {
  const m = new THREE.Mesh(parts.length ? merged(parts) : new THREE.BufferGeometry(), roomMat);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}
/** A painted board, in room space, facing `yaw` (0 faces the door). */
export function plate(
  lines: Parameters<typeof paintBoard>[0],
  w: number,
  h: number,
  x: number,
  y: number,
  z: number,
  yaw = 0,
) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), paintBoard(lines, w, h));
  m.position.set(x, y, z);
  m.rotation.y = yaw;
  return m;
}

// ---------------------------------------------------------------- the plots before they're built
const stakes = new Map<Room, { g: THREE.Group; body: Body | null; lines: Parameters<typeof paintBoard>[0] }>();
function stakeSolid(r: Room, st: { g: THREE.Group; body: Body | null }) {
  q_.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, r.yaw);
  st.body = addStatic(
    { kind: 'box', hx: 1.2, hy: 1.1, hz: 0.1 },
    { x: st.g.position.x, y: st.g.position.y + 1.1, z: st.g.position.z },
    q_,
  );
}
/** A board on the empty plot, saying something's coming. It goes when the building starts. */
export function stakeBoard(r: Room, lines: Parameters<typeof paintBoard>[0]) {
  const g = new THREE.Group();
  const out = r.d / 2 + 2;
  const wx = r.x + out * Math.sin(r.yaw),
    wz = r.z + out * Math.cos(r.yaw);
  g.position.set(wx, H(wx, wz), wz);
  g.rotation.y = r.yaw;
  g.add(plate(lines, 2.2, 1.1, 0, 1.5, 0.08));
  g.add(
    roomMesh([
      ['b', 0, 1.5, 0, 2.4, 1.3, 0.12, '#7f5630'],
      ['b', 0, 0.45, 0, 0.18, 0.9, 0.18, '#7f5630'],
    ]),
  );
  g.visible = false;
  scene.add(g);
  stakes.set(r, { g, body: null, lines });
}
function setStake(r: Room, on: boolean) {
  const st = stakes.get(r);
  if (!st || st.g.visible === on) return;
  st.g.visible = on;
  if (on) stakeSolid(r, st);
  else if (st.body) {
    removeBody(st.body);
    st.body = null;
  }
}

// ---------------------------------------------------------------- standing, or not
/** Start over, a reload or a co-op snapshot: each as the state says, with no show, and every piece back in its place. */
export function snapRooms() {
  for (const r of LIST) {
    const up = roomEnv.up(r.id);
    r.up = up;
    snapSite(r.site, up);
    setStake(r, !up);
    for (const g of FACES) r.t[g] = r.shown[g] = 0;
    for (const c of r.corners) c.on = true;
  }
}
/** Warm the rooms' shaders while nobody's waiting on them: docs/research/town-interiors.md, "Doors with no load screen". */
export const warmRooms = () => {
  for (const r of LIST) void precompile(r.near);
};

// ---------------------------------------------------------------- the frame
const arm = makeCameraArm();
const from = new THREE.Vector3();
/** A camera constraint, registered last (./town-life.ts), so a pull-out or the telescope comes first. Indoors, the clearance
 * here is the camera's: everything but the walls that are out of the way. */
export function indoorCamera(look: THREE.Vector3, pos: THREE.Vector3) {
  const r = indoors.room,
    b = me.body;
  if (!r || !b) return false;
  const ip = b.interpolatedPosition;
  const floor = r.y + 0.5;
  pos.y = Math.max(pos.y, floor, H(pos.x, pos.z) + 0.5);
  // From your head, not from `look`: a talk tilts that down through the floor, and the arm would come in with it.
  arm.solve(from.set(ip.x, ip.y + 1.35, ip.z), pos, getMask(b) & ~ROOM_GROUP);
  pos.y = Math.max(pos.y, floor, H(pos.x, pos.z) + 0.5);
  return true;
}
const hint = { on: false, to: 0, was: 0, lastPitch: 0, lastYaw: 0, touched: false };
function suggestPitch(dt: number) {
  if (!hint.on) return;
  if (Math.abs(cam.pitch - hint.lastPitch) > 1e-4 || Math.abs(cam.yaw - hint.lastYaw) > 1e-4) {
    hint.on = false;
    hint.touched = true;
    return;
  }
  cam.pitch += (hint.to - cam.pitch) * (1 - Math.exp(-dt * ROOM_CAM.pitchRate));
  hint.lastPitch = cam.pitch;
  hint.lastYaw = cam.yaw;
  if (Math.abs(cam.pitch - hint.to) < 0.003) hint.on = false;
}
function suggest(to: number) {
  hint.on = true;
  hint.to = to;
  hint.lastPitch = cam.pitch;
  hint.lastYaw = cam.yaw;
}
function write(r: Room, g: Face) {
  const t = r.t[g];
  if (r.shown[g] === t) return;
  r.shown[g] = t;
  const list = r.pieces[g];
  if (t >= 1) for (const k of list) showPiece(k, false);
  else if (t <= 0) for (const k of list) showPiece(k, true);
  else {
    const y = g === 'roof' ? t * t * 7 : -t * t * (r.high + 0.4);
    for (const k of list) liftPiece(k, y);
  }
}
export function updateRooms(dt: number) {
  for (const r of LIST) {
    const want = roomEnv.up(r.id);
    if (want && !r.up) {
      r.up = true;
      setStake(r, false);
      startSite(r.site, r.id === 'museum' ? 3 : 1.2);
    } else if (!want && r.up) {
      r.up = false;
      snapSite(r.site, false);
      setStake(r, true);
    }
    const ready = r.site.state === 'done';
    if (ready !== r.ready) {
      r.ready = ready;
      setSolid(r, ready);
      r.outside.visible = r.over.visible = ready;
    }
  }
  const p = me.body?.interpolatedPosition;
  if (!p) return;
  // Are you in one?
  let room = indoors.room;
  const cx = camera.position.x,
    cz = camera.position.z;
  if (room) {
    const l = worldToRoom(room, p.x, p.z);
    const stillIn = Math.abs(l.x) < room.w / 2 + 0.2 && l.z < room.d / 2 + ROOM_CAM.enter && l.z > -room.d / 2 - 0.2;
    if (indoors.inside !== room && stillIn && l.z < room.d / 2) {
      indoors.inside = room;
      for (const fn of enterFns) fn(room, true);
    } else if (indoors.inside === room && !stillIn) {
      indoors.inside = null;
      for (const fn of enterFns) fn(room, false);
    }
    // Out: it comes back once the camera's out as well, so it never comes down on the lens.
    if (!stillIn) {
      const c = worldToRoom(room, cx, cz);
      const clear = ROOM_CAM.camClear;
      const camIn = Math.abs(c.x) < room.w / 2 + clear && Math.abs(c.z) < room.d / 2 + clear;
      const far = Math.hypot(l.x, l.z) > Math.max(room.w, room.d) / 2 + 9;
      if (!camIn || far || !room.ready) {
        room = indoors.room = null;
        arm.reset();
        // Your view's your own: it goes back only if you never touched it.
        if (!hint.touched) suggest(hint.was);
      }
    }
  } else {
    for (const r of LIST) {
      if (!r.ready) continue;
      const l = worldToRoom(r, p.x, p.z);
      const atDoor = Math.abs(l.x) < DOOR.w / 2 + 0.7 && l.z < r.d / 2 + ROOM_CAM.enter + 0.2 && l.z > r.d / 2 - 0.4;
      const inside = Math.abs(l.x) < r.w / 2 && Math.abs(l.z) < r.d / 2;
      if ((atDoor || inside) && p.y < r.y + r.high) {
        room = indoors.room = r;
        hint.was = cam.pitch;
        hint.touched = false;
        if (cam.pitch > ROOM_CAM.pitch) suggest(ROOM_CAM.pitch);
        arm.reset();
        break;
      }
    }
  }
  suggestPitch(dt);
  // What's in the way of this tab's view.
  const step = reducedMotion ? 1 : dt / ROOM_CAM.reveal;
  for (const r of LIST) {
    const on = r === room;
    const near = r.ready && (on || Math.hypot(p.x - r.x, p.z - r.z) < ROOM_CAM.drawWithin);
    if (r.near.visible !== near) r.near.visible = near;
    if (!r.ready) continue;
    let any = false;
    const c = on ? worldToRoom(r, cx, cz) : null;
    r.t.roof = on ? Math.min(1, r.t.roof + step) : Math.max(0, r.t.roof - step);
    for (const w of WALLS) {
      let hide = false;
      if (c) {
        const gap = r.t[w] > 0 ? ROOM_CAM.farWall : ROOM_CAM.nearWall;
        const toWall =
          w === 'front' ? r.d / 2 - c.z : w === 'back' ? r.d / 2 + c.z : w === 'left' ? r.w / 2 + c.x : r.w / 2 - c.x;
        // Past the door with the camera still in the room: the front wall stays down, or it's between you and yourself.
        hide = toWall < gap || (w === 'front' && indoors.inside !== r);
      }
      r.t[w] = hide ? Math.min(1, r.t[w] + step) : Math.max(0, r.t[w] - step);
    }
    for (const g of FACES) {
      write(r, g);
      if (r.t[g] > 0) any = true;
    }
    for (const q of r.corners) {
      const on = r.t[q.a] <= 0 && r.t[q.b] <= 0;
      if (on !== q.on) showPiece(q.k, (q.on = on));
    }
    r.proxy.visible = any;
    r.over.visible = r.t.roof < 1;
  }
}
