// Buildings you can walk into in the town: the house, the shop and the museum (docs/plans/round-4.md, step 6;
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
// Interiors draw only with the camera near their building (`near`), so a village you're not in pays for its walls and
// nothing behind them; what's outside and over the door, a little further out. Local; which rooms exist comes from
// `env.up`, read from what's shared. `createRooms` mounts them on the town entity's owner (src/entities/town/).
import * as THREE from 'three/webgpu';
import { registerStepFloor } from '../../render/locomotion-surfaces.ts';
import { vertexColor } from 'three/tsl';
import { reducedMotion } from '../../constants.ts';
import { getMask } from '../../physics/engine.ts';
import { makeCameraArm } from '../../player/camera-arm.ts';
import { cam, camConstraints, me } from '../../player/player.ts';
import { precompile } from '../../render/precompile.ts';
import { camera } from '../../render/scene.ts';
import { createOwnedView, type OwnedView } from '../../render/owned-view.ts';
import { instantiate } from '../../prefab/instantiate.ts';
import { loadLevelArtifact, loadPrefabArtifact } from '../../prefab/validate.ts';
import artifact from '../../../content/built/prefabs.json' with { type: 'json' };
import houseShell from '../../../content/built/levels/room-house.json' with { type: 'json' };
import shopShell from '../../../content/built/levels/room-shop.json' with { type: 'json' };
import museumShell from '../../../content/built/levels/room-museum.json' with { type: 'json' };
import { merged } from '../../render/part-geometry.ts';
import { ROOM_GROUP } from '../../place/land.ts';
import { H } from '../../place/terrain.ts';
import { ROOM_PLOTS, toWorld, type RoomId } from '../../place/layout.ts';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { paintBoard, woodV } from '../../place/signs.ts';
import {
  addSite,
  liftPiece,
  showPiece,
  snapSite,
  startSite,
  type Hull,
  type Plan,
  type Site,
} from '../../place/sites.ts';

const definitions = loadPrefabArtifact(artifact).prefabs;
const shellLevels = { house: houseShell, shop: shopShell, museum: museumShell };

export const ROOM_CAM = {
  enter: 0.75, // m outside the door where the show starts, and past which it can end
  reveal: 0.24, // s for a wall or the roof to get out of the way
  nearWall: 0.8, // m inside a wall: a camera this close to it, or past it, has it cut away
  farWall: 1.5, // and it comes back only this far inside: no flicker at the line
  pitch: -0.4, // rad: a modest look down, suggested as you come in
  pitchRate: 2.6, // 1/s
  camClear: 1.8, // m the camera has to be outside a building before its walls come back, so they don't rise at the lens
  drawWithin: 34, // m: interiors draw while the camera is within this of their building
  dressWithin: 60, // m: and what's outside and over the door (a mat, a window box, a sign) while it's within this
};
export const DOOR = { w: 2.6, rows: 3 };
const FLOOR = 0.14;

/** What rooms are made of: their own colours, a little warm light of their own so a shaded room still reads, one material for
 * all three. */
export const roomMat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.9 });
// A little bounce in the shadow proxy, without washing out the furniture's sunlit edges.
roomMat.emissiveNode = vertexColor().mul(0.12);
const shadowOnly = new THREE.MeshBasicNodeMaterial({ colorWrite: false, depthWrite: false });

export type Part = Parameters<typeof merged>[0][number];
type Face = 'roof' | 'front' | 'back' | 'left' | 'right';
const WALLS = ['front', 'back', 'left', 'right'] as const;
const FACES = ['roof', ...WALLS] as const;
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
  corners: { k: number; a: (typeof WALLS)[number]; b: (typeof WALLS)[number]; shown: number }[];
  t: Record<Face, number>; // 0 there, 1 out of the way
  shown: Record<Face, number>; // what's been written
  proxy: THREE.Mesh;
  /** Record-owned furnishings follow the standing/teardown transition. */
  furnishings: { setEnabled(on: boolean): void }[];
  up: boolean;
  ready: boolean;
};

const rowsOf = (high: number) => Math.round((high - FLOOR) / 0.82);
// ---------------------------------------------------------------- helpers for what goes in them
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
  m.receiveShadow = true;
  m.position.set(x, y, z);
  m.rotation.y = yaw;
  return m;
}

/** A stake board: its paper, frame and post as one mesh in the paper's material, the wood sampled from the strip
 * `paintBoard` paints under the paper. One draw, and no shadow of its own: a plot's board is a small thing at the edge of the
 * village, and its shadow cost two more draws per board (place-retirement T2). */
function stakeMesh(lines: Parameters<typeof paintBoard>[0]) {
  const W = 2.2,
    H_ = 1.1;
  const v0 = woodV(H_ / W);
  const paper = new THREE.PlaneGeometry(W, H_).translate(0, 1.5, 0.08);
  const uv = paper.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setY(i, v0 + uv.getY(i) * (1 - v0));
  const wood = (g: THREE.BufferGeometry) => {
    const a = g.getAttribute('uv');
    for (let i = 0; i < a.count; i++) a.setXY(i, 0.5, v0 / 2);
    return g;
  };
  const frame = wood(new THREE.BoxGeometry(2.4, 1.3, 0.12).translate(0, 1.5, 0));
  const post = wood(new THREE.BoxGeometry(0.18, 0.9, 0.18).translate(0, 0.45, 0));
  const m = new THREE.Mesh(mergeGeometries([frame, post, paper]), paintBoard(lines, W, H_, '#7f5630'));
  m.receiveShadow = true;
  return m;
}

function writePiece(k: number, t: number, travel: number) {
  if (t >= 1) showPiece(k, false);
  else if (t <= 0) showPiece(k, true);
  else liftPiece(k, t * t * travel);
}
function write(r: Room, g: Face) {
  const t = r.t[g];
  if (r.shown[g] === t) return;
  r.shown[g] = t;
  const travel = g === 'roof' ? 7 : -(r.high + 0.4);
  for (const k of r.pieces[g]) writePiece(k, t, travel);
}
/** The three buildings, their stake boards, the cutaway and the indoor camera, owned by `owner`. Which rooms stand comes
 * from `env.up`, read from what's shared; the house is there from the start. Call `snap()` once the drop set is built
 * (./sites.ts `buildSites`), and `update(dt)` every frame. */
export function createRooms(owner: OwnedView, env: { up(id: RoomId): boolean }) {
  function makeRoom(id: RoomId): Room {
    const p = ROOM_PLOTS[id],
      x = toWorld(p.x),
      y0 = H(x, p.z);
    const shellOwner = createOwnedView();
    shellOwner.root.position.set(x, y0, p.z);
    shellOwner.root.rotation.y = p.yaw;
    owner.add(shellOwner.root);
    owner.cleanup(shellOwner.dispose);
    const records = loadLevelArtifact(shellLevels[id], definitions).placements.map((placement) => ({
      placement,
      instance: instantiate(
        placement.prefab,
        { ...placement, params: { x, y: y0, z: p.z, yaw: p.yaw } },
        { owner: shellOwner },
      ),
    }));
    const phase = (name: string) => records.filter(({ placement }) => placement.id.startsWith(`room-${id}-${name}-`));
    const construction = records.flatMap(({ instance }) => instance.construction);
    if (!construction.length) throw new Error('rooms: missing shell construction');
    const hulls = (name: string): Hull[] =>
      phase(name).flatMap(({ placement }) =>
        definitions[placement.prefab]!.colliders.map((c) => {
          if (c.shape !== 'box') throw new Error('rooms: expected shell box');
          return {
            dx: c.at[0],
            dy: c.at[1],
            dz: c.at[2],
            hx: c.half[0],
            hy: c.half[1],
            hz: c.half[2],
            ...(c.group === 'room' ? { room: true } : {}),
          };
        }),
      );
    const plan: Plan = {
      ...construction[0]!.plan,
      pieces: construction.filter((c) => c.phase === 'pieces').flatMap((c) => c.parts),
      scaffold: construction.filter((c) => c.phase === 'scaffold').flatMap((c) => c.parts),
      hulls: hulls('hulls'),
      poles: hulls('poles'),
    };
    const site = addSite(`room-${id}`, plan, id === 'museum' ? 1.6 : 1, {
      hulls: phase('hulls').map((r) => r.instance),
      poles: phase('poles').map((r) => r.instance),
    });
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
      if (other) corners.push({ k, a: best, b: other, shown: 0 });
      else pieces[best].push(k);
    });
    const y = plan.y + FLOOR;
    const group = () => {
      const g = new THREE.Group();
      g.position.set(plan.x, y, plan.z);
      g.rotation.y = p.yaw;
      g.visible = false;
      owner.add(g);
      return g;
    };
    const proxy = new THREE.Mesh(merged(phase('proxy').flatMap(({ instance }) => instance.parts)), shadowOnly);
    proxy.castShadow = true;
    proxy.position.set(plan.x, y, plan.z);
    proxy.rotation.y = p.yaw;
    proxy.visible = false;
    proxy.frustumCulled = false;
    owner.add(proxy);
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
      furnishings: [],
      up: false,
      ready: false,
    };
  }
  const rooms: Record<RoomId, Room> = {
    house: makeRoom('house'),
    shop: makeRoom('shop'),
    museum: makeRoom('museum'),
  };
  const LIST = Object.values(rooms);
  for (const r of LIST) {
    owner.cleanup(
      registerStepFloor((x, z) => {
        if (!r.up || !r.ready) return null;
        const p = worldToRoom(r, x, z);
        return Math.abs(p.x) <= r.w / 2 && Math.abs(p.z) <= r.d / 2 ? { top: r.y, surface: 'wood' } : null;
      }),
    );
  }
  /** `room`: the show is on for this one. `inside`: you're over its threshold. */
  const indoors = { room: null as Room | null, inside: null as Room | null };
  const enterFns: ((r: Room, inside: boolean) => void)[] = [];
  /** You've come in, or gone out: fn(room, true or false). */
  const onRoom = (fn: (r: Room, inside: boolean) => void) => void enterFns.push(fn);

  function setSolid(r: Room, on: boolean) {
    for (const piece of r.furnishings) piece.setEnabled(on);
  }
  // ---------------------------------------------------------------- the plots before they're built
  const stakes = new Map<Room, ReturnType<typeof instantiate>>();
  /** A board on the empty plot, saying something's coming. It goes when the building starts. */
  function stakeBoard(r: Room, lines: Parameters<typeof paintBoard>[0]) {
    const out = r.d / 2 + 2;
    const wx = r.x + out * Math.sin(r.yaw),
      wz = r.z + out * Math.cos(r.yaw);
    const stakeOwner = createOwnedView();
    stakeOwner.root.position.set(wx, H(wx, wz), wz);
    stakeOwner.root.rotation.y = r.yaw;
    owner.add(stakeOwner.root);
    owner.cleanup(stakeOwner.dispose);
    const board = instantiate(
      'town.room-plot-board',
      { id: `room-${r.id}-plot`, prefab: 'town.room-plot-board', pos: [0, 0, 0], labels: { sign: r.id } },
      {
        owner: stakeOwner,
        makeLabel: () => stakeMesh(lines),
      },
    );
    stakes.set(r, board);
  }
  function setStake(r: Room, on: boolean) {
    stakes.get(r)?.setEnabled(on);
  }

  // ---------------------------------------------------------------- standing, or not
  /** Start over, a reload or a co-op snapshot: each as the state says, with no show, and every piece back in its place. */
  function snap() {
    for (const r of LIST) {
      const up = env.up(r.id);
      r.up = up;
      snapSite(r.site, up);
      setStake(r, !up);
      for (const g of FACES) r.t[g] = r.shown[g] = 0;
      for (const c of r.corners) c.shown = 0;
    }
  }
  /** Warm the rooms' shaders while nobody's waiting on them: docs/research/town-interiors.md, "Doors with no load screen". */
  const warm = () => {
    for (const r of LIST) void precompile(r.near);
  };

  // ---------------------------------------------------------------- the frame
  const arm = makeCameraArm();
  const from = new THREE.Vector3();
  /** A camera constraint, registered with the rooms, so one pushed earlier comes first. Indoors, the clearance here is the
   * camera's: everything but the walls that are out of the way. */
  function indoorCamera(look: THREE.Vector3, pos: THREE.Vector3) {
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
  function update(dt: number) {
    for (const r of LIST) {
      const want = env.up(r.id);
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
        if (!ready) r.outside.visible = r.over.visible = false;
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
        const t = Math.max(r.t[q.a], r.t[q.b]);
        if (t === q.shown) continue;
        q.shown = t;
        writePiece(q.k, t, -(r.high + 0.4));
      }
      r.proxy.visible = any;
    }
  }
  /** What's drawn near the camera that's about to render: interiors within `drawWithin` (or the one you're in), and
   * what's outside and over the door within `dressWithin`, so a far view of the village pays for none of it
   * (place-retirement T2's draw budget). Call after anything that moves the camera this frame, after `update`. */
  function cull() {
    const cx = camera.position.x,
      cz = camera.position.z;
    for (const r of LIST) {
      const fromCam = Math.hypot(cx - r.x, cz - r.z);
      const near = r.ready && (r === indoors.room || fromCam < ROOM_CAM.drawWithin);
      if (r.near.visible !== near) r.near.visible = near;
      if (!r.ready) continue;
      const dressed = fromCam < ROOM_CAM.dressWithin;
      r.outside.visible = dressed;
      r.over.visible = dressed && r.t.roof < 1;
    }
  }
  camConstraints.push(indoorCamera);
  owner.cleanup(() => {
    const k = camConstraints.indexOf(indoorCamera);
    if (k >= 0) camConstraints.splice(k, 1);
  });
  return { rooms, indoors, onRoom, update, cull, warm, snap, stakeBoard };
}
export type Rooms = ReturnType<typeof createRooms>;
