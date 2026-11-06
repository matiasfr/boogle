// The chop and the back of ?proto=place. The swing starts on the frame you press, the axe meets the bark about 120 ms later,
// the tree answers and accepted logs fly straight to your back. Solo accepts locally; coop.ts serializes shared harvest
// before awarding material. Animation stays Local. docs/research/tree-tiers.md, recommendations 1-7. Your back is the game's bundle,
// drawn from a count kept here through `backSeam`, with rails strapped upright behind it, stone in a sack and a big thing on
// your shoulder.
// Every ordinary tree works; two broad hardwoods need the proper axe. Only rocks keep their bands. The great tree's trunk
// goes on your shoulder with either axe. Trees stay finite. The axe and back are the first two rungs (`AXE2`, `PACK`, ./ladder.ts);
// which rung you're on comes from `job.rung`.
import * as THREE from 'three/webgpu';
import { materialColor } from 'three/tsl';
import { patchNode } from '../../render/material-patch.ts';
import { scene } from '../../render/scene.ts';
import { emit } from '../../render/particles.ts';
import { warmUp } from '../../render/precompile.ts';
import { removeBody, teleport, sweepSphere, type Body } from '../../physics/engine.ts';
import { input } from '../../player/input-state.ts';
import { interactTarget } from '../../player/hands.ts';
import { me } from '../../player/player.ts';
import { addPresenceField, onRemotePresence, remotes } from '../../netplay/net.ts';
import { backSeam, myBundleNext } from '../../features/haul-stack.ts';
import { clank, thump } from '../../render/machine-sfx.ts';
import { placeSound } from '../../render/place-sfx.ts';
import { mulberry32 } from '../../sim/rng.ts';
import { knock, pop } from '../minis/common.ts';
import { flat } from '../flat.ts';
import { H, addStatic } from './land.ts';
import { COOP, count, job, personalSlice, sharedSlice, save } from './job.ts';
import { LOOK, addBlob, selectiveColour } from './look.ts';
import { AXE2, GREAT, GREAT_TREE, GROVES, OAK, ORIGIN, PACK, ROCKS, ROCK_WORK, TUNE } from './layout.ts';
import { chips, dustRing, send } from './pieces.ts';
import { BEAM_CARRY_POSITION, makeCarryModels } from './carry-models.ts';
import { shakeView } from './celebrate.ts';
import { addFoot } from './sites.ts';
import { packFrameMesh } from './gear-models.ts';
import { LAND_TREES, safeTreeFall, shoreTreeCleared } from './tree-catalog.ts';
import { makeAxes } from './axe-models.ts';
import { applyChopPose, CHOP_SIDE } from './chop-motion.ts';
import { sparkleAxe } from './axe-sparkle.ts';
import { readableIntensity } from '../../render/readable-unlit.ts';
import { reducedMotion } from '../../constants.ts';
import { bigCargo, freshCargo, validCargo } from './big-cargo.ts';
import { beginFeelAction, endFeelChop } from '../../player/feel-tuning.ts';
import { CHOP_DURATION } from './chop-timing.ts';

// ---------------------------------------------------------------- your back
/** One big thing on your shoulder: it fills your back, and you can't sprint with it. */
export type BigThing = 'beam' | 'boiler' | null;
export const carryNow = () => (job.rung.pack ? PACK.carry : TUNE.carry);
let harvestReserved = 0;
// Accepted inventory is unchanged; the tag waits for the actual cosmetic landings.
let harvestFlights: (() => boolean)[] = [];
export const reserveHarvest = (n: number) => {
  harvestReserved += n;
};
export const releaseHarvest = (n: number) => {
  harvestReserved = Math.max(0, harvestReserved - n);
};
export const back = {
  logs: 0,
  rails: 0,
  stone: 0,
  beam: 0,
  big: null as BigThing,
  incoming: 0, // pieces in the air on their way here
  room: () => (back.big ? 0 : carryNow() - back.logs - back.rails - back.stone - back.incoming - harvestReserved),
  empty: () => back.logs + back.rails + back.stone + back.incoming === 0 && !back.big,
};
backSeam.flyIns = false;
backSeam.count = () => back.logs;
// Read-only Local presentation: reserved/incoming slots aren't advertised as landed material.
backSeam.carry = () => {
  harvestFlights = harvestFlights.filter((active) => active());
  return {
    logs: back.logs,
    rails: back.rails,
    stone: back.stone,
    big: back.big,
    capacity: carryNow(),
    incoming: back.incoming,
    reserved: harvestReserved,
    flyingLogs: Math.min(back.logs, harvestFlights.length),
    attention: interactTarget()?.blocked === 'Your back is full' || (swing.response === 'full' && swing.t < 0.55),
  };
};
personalSlice('back', {
  get: () => ({ logs: back.logs, rails: back.rails, stone: back.stone, big: back.big }),
  set: (v) => {
    const j = (v ?? {}) as Partial<typeof back>;
    back.logs = count(j.logs, 64) ? j.logs : 0;
    back.rails = count(j.rails, 64) ? j.rails : 0;
    back.stone = count(j.stone, 64) ? j.stone : 0;
    back.big = j.big === 'beam' || j.big === 'boiler' ? j.big : null;
    back.beam = back.big === 'beam' ? 1 : 0;
    back.incoming = 0;
  },
});

type Worn = { inner?: THREE.Object3D; loadFit?: { frame: THREE.Object3D } };
const frameOf = (avatar: THREE.Object3D | null = me.avatar) => {
  const u = avatar?.userData as Worn | undefined;
  return u?.loadFit?.frame ?? u?.inner ?? null;
};
const MAX_WORN = PACK.carry;
const { rails: railsWorn, stone: stoneWorn, beam: beamWorn, boiler: boilerWorn } = makeCarryModels();
/** A boiler to stand by the forge, the shape you'll carry. */
export const boilerShape = () => {
  const g = boilerWorn.clone();
  g.visible = true;
  g.position.set(0, 0.55, 0);
  return g;
};
// An open carrying frame in the same back socket as the load, with a shelf under the bundle.
const packFrame = new THREE.Group();
packFrame.visible = false;

// These meshes attach to the avatar after loading, so the scene warm-up cannot see them.
warmUp(() => {
  const g = new THREE.Group();
  const rails = railsWorn.clone(),
    stone = stoneWorn.clone();
  rails.count = stone.count = 1;
  g.add(rails, stone, beamWorn.clone(), boilerWorn.clone());
  return g;
});

/** Owner cosmetic state; existing placeBack/placeBig keep their wire meanings. */
export type PlaceLoad = { rails: number; stone: number; pack: boolean };
addPresenceField('placeLoad', (): PlaceLoad | null =>
  COOP && (back.rails || back.stone || job.rung.pack)
    ? { rails: back.rails, stone: back.stone, pack: !!job.rung.pack }
    : null,
);
const peerLoads = new Map<string, PlaceLoad & { big: BigThing }>();
onRemotePresence((r, pr) => {
  if (!COOP || !r.entered) return void peerLoads.delete(r.peer);
  const v = pr.placeLoad;
  const load = v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  const rails = count(load.rails, MAX_WORN) ? load.rails : 0;
  const stone = count(load.stone, MAX_WORN) ? load.stone : 0;
  const big = pr.placeBig === 'beam' || pr.placeBig === 'boiler' ? pr.placeBig : null;
  const pack = load.pack === true;
  if (rails || stone || big || pack) peerLoads.set(r.peer, { rails, stone, big, pack });
  else peerLoads.delete(r.peer); // missing/malformed fields are off, including on older builds
});
const peerWorn = new Map<string, ReturnType<typeof makeLoad>>();
/** Local presentation only: one existing beam spans the two supporting shoulders. */
export const greatBeamView: { helper: (owner: string | null) => THREE.Object3D | null } = { helper: () => null };
const support = new THREE.Vector3();
const alongBeam = new THREE.Vector3(0, 0, 1);
function poseCarriedBeam(beam: THREE.Mesh, frame: THREE.Object3D, owner: string | null) {
  beam.position.set(...BEAM_CARRY_POSITION);
  beam.quaternion.identity();
  const other = frameOf(greatBeamView.helper(owner));
  if (!other) return;
  other.updateWorldMatrix(true, false);
  frame.updateWorldMatrix(true, false);
  support.set(...BEAM_CARRY_POSITION);
  other.localToWorld(support);
  frame.worldToLocal(support);
  support.sub(beam.position);
  if (support.lengthSq() < 0.25) return;
  beam.position.addScaledVector(support, 0.5);
  beam.quaternion.setFromUnitVectors(alongBeam, support.normalize());
}
function makeLoad() {
  const root = new THREE.Group();
  root.name = 'place-carried';
  const rails = railsWorn.clone(),
    stone = stoneWorn.clone();
  const beam = beamWorn.clone(),
    boiler = boilerWorn.clone();
  const pack = new THREE.Group();
  pack.position.copy(packFrame.position);
  pack.add(packFrameMesh());
  root.add(rails, stone, beam, boiler, pack);
  return { root, rails, stone, beam, boiler, pack };
}
function updatePartnerLoads() {
  for (const [peer, state] of peerLoads) {
    const r = remotes.get(peer);
    const frame = r?.entered && r.avatar ? frameOf(r.avatar) : null;
    if (!frame) {
      peerLoads.delete(peer);
      continue;
    }
    let view = peerWorn.get(peer);
    if (!view) {
      view = makeLoad();
      peerWorn.set(peer, view);
    }
    if (view.root.parent !== frame) frame.add(view.root);
    view.rails.count = state.rails;
    view.rails.visible = state.rails > 0;
    view.stone.count = state.stone;
    view.stone.visible = state.stone > 0;
    view.beam.visible = state.big === 'beam';
    if (view.beam.visible) poseCarriedBeam(view.beam, frame, peer);
    view.boiler.visible = state.big === 'boiler';
    view.pack.visible = state.pack;
  }
  for (const [peer, view] of peerWorn) {
    if (peerLoads.has(peer)) continue;
    view.root.removeFromParent();
    // Clones share geometry/materials, but own their instance buffers.
    view.rails.dispose();
    view.stone.dispose();
    peerWorn.delete(peer);
  }
}

// ---------------------------------------------------------------- what you can hit
export type Tree = {
  index: number;
  x: number;
  y: number;
  z: number;
  size: number;
  great: boolean;
  hardwood: boolean;
  cleared: boolean; // Local shore clearance only; never written to a save, snapshot or harvest result
  work: number;
  issued: number;
  ceiling: number;
  revision: number;
  collapsed: boolean;
  scuff: boolean;
  hitAt: number;
  cutYaw: number;
  strokes: number;
  shake: number; // 1 on a hit, decaying
  fall: number; // s since it was felled, -1 standing
  fallYaw: number;
  at: THREE.Vector3;
  body: Body | null; // standing: its trunk; felled: the trunk on the ground
  stump: Body | null;
};

const rng = mulberry32(77);
function makeTree(x: number, z: number, size: number, great = false, hardwood = false): Tree {
  const y = H(x, z);
  return {
    index: 0,
    x,
    y,
    z,
    size,
    great,
    hardwood,
    cleared: shoreTreeCleared(x, z, size),
    work: 0,
    issued: 0,
    ceiling: great ? 0 : hardwood ? 15 : 10,
    revision: 0,
    collapsed: false,
    scuff: false,
    hitAt: 0,
    cutYaw: 0,
    strokes: 0,
    shake: 0,
    fall: -1,
    fallYaw: 0,
    at: new THREE.Vector3(x, y + 1.7, z),
    body: null,
    stump: null,
  };
}
export const TREES: Tree[] = GROVES.flatMap((g) => {
  const out: Tree[] = [];
  for (let k = 0; k < g.n; k++) {
    const a = (k / g.n) * Math.PI * 2 + rng() * 0.5,
      r = g.r * (0.35 + rng() * 0.65);
    out.push(makeTree(g.x + Math.cos(a) * r + ORIGIN.x, g.z + Math.sin(a) * r + ORIGIN.z, 0.9 + rng() * 0.3));
  }
  return out;
});
TREES.push(makeTree(OAK.x + ORIGIN.x, OAK.z + ORIGIN.z, 1.1));
export const greatTree = makeTree(GREAT_TREE.x + ORIGIN.x, GREAT_TREE.z + ORIGIN.z, 2.1, true);
TREES.push(greatTree);
TREES.push(
  ...LAND_TREES.map((t) => {
    const tree = makeTree(t.x, t.z, t.size, false, t.hardwood);
    tree.y = t.y;
    tree.at.y = t.y + 1.7;
    return tree;
  }),
);
TREES.forEach((t, k) => (t.index = k));
const strokesFor = (t: Tree) => (t.great ? GREAT.strokes : job.rung.axe ? AXE2.strokes : TUNE.strokes);

/** Accepted finite harvest, separate from local animation and the owner's back. */
export type TreeHarvest = {
  work: number;
  issued: number;
  ceiling: number;
  revision: number;
  fallYaw: number;
  collapsed: boolean;
  fell: boolean;
};
export type HarvestResult = { state: TreeHarvest; logs: number; outcome: 'bite' | 'rebound' | 'full' | 'gone' };
export const readTreeHarvest = (t: Tree): TreeHarvest => ({
  work: t.work,
  issued: t.issued,
  ceiling: t.ceiling,
  revision: t.revision,
  fallYaw: t.fallYaw,
  collapsed: t.collapsed,
  fell: t.fall >= 0,
});
export function validTreeHarvest(v: unknown): v is TreeHarvest {
  const s = v as TreeHarvest | null;
  return (
    !!s &&
    count(s.work, 15) &&
    count(s.issued, 15) &&
    [0, 10, 15].includes(s.ceiling) &&
    s.issued <= s.ceiling &&
    count(s.revision) &&
    typeof s.fallYaw === 'number' &&
    Number.isFinite(s.fallYaw) &&
    Math.abs(s.fallYaw) <= Math.PI * 2 &&
    typeof s.collapsed === 'boolean' &&
    typeof s.fell === 'boolean'
  );
}
/** Computes one authority-ordered result; no inventory, animation or sound here. */
export function harvestTree(t: Tree, room: number, axe: number, yaw: number): HarvestResult {
  const state = readTreeHarvest(t);
  if (state.fell) return { state, logs: 0, outcome: 'gone' };
  if (t.great && (!axe || !chopHooks.greatReady())) return { state, logs: 0, outcome: 'rebound' };
  if (!t.great && room <= 0) return { state, logs: 0, outcome: 'full' };
  if (t.hardwood && !axe) return { state, logs: 0, outcome: 'rebound' };
  const maxWork = t.great ? GREAT.strokes : 15;
  state.ceiling = t.great ? 0 : Math.max(state.ceiling, axe ? 15 : 10);
  const logs = t.great
    ? 0
    : Math.min(room, axe ? AXE2.logsPerStroke : TUNE.logsPerStroke, state.ceiling - state.issued);
  state.issued += logs;
  state.work = Math.min(maxWork, state.work + (t.great ? 1 : axe ? 5 : 3));
  state.revision++;
  // A clipped payout remains on the standing tree. The last unclaimed log is never thrown away.
  state.fell = state.work >= maxWork && state.issued === state.ceiling;
  if (state.fell) {
    const safe = safeTreeFall(t.x, t.z, t.size, yaw, t.great);
    state.fallYaw = safe.yaw;
    state.collapsed = safe.collapsed;
  }
  return { state, logs, outcome: 'bite' };
}
export function applyTreeHarvest(t: Tree, state: TreeHarvest): boolean {
  if (!validTreeHarvest(state) || state.revision < t.revision) return false;
  if (t.great ? state.ceiling !== 0 || state.work > GREAT.strokes : state.ceiling === 0) return false;
  if (state.fell && (state.work < (t.great ? GREAT.strokes : 15) || state.issued !== state.ceiling)) return false;
  const falling = state.fell && t.fall < 0;
  t.work = state.work;
  t.issued = state.issued;
  t.ceiling = state.ceiling;
  t.revision = state.revision;
  t.strokes = t.great ? state.work : Math.ceil(state.work / (job.rung.axe ? 5 : 3));
  t.fallYaw = state.fallYaw;
  t.collapsed = state.collapsed;
  if (falling) {
    t.fall = t.cleared ? 1 : 0;
    if (t.body) removeBody(t.body);
    t.body = null;
  }
  pose(t, 0);
  return true;
}

// ---------------------------------------------------------------- solid: standing, and where it lies
/** The great tree's trunk has been shouldered. */
const trunk = { taken: false };
const AXIS_Y = new THREE.Vector3(0, 1, 0),
  lie = new THREE.Quaternion();
function solidTree(t: Tree) {
  if (t.body) removeBody(t.body);
  if (t.stump) removeBody(t.stump);
  t.body = t.stump = null;
  if (t.cleared) return;
  const h = (t.collapsed ? 0.8 : 5) * t.size;
  if (t.fall < 0) {
    t.body = addStatic(
      {
        kind: 'cylinder',
        rTop: (t.hardwood ? 0.8 : 0.38) * t.size,
        rBottom: (t.hardwood ? 0.8 : 0.38) * t.size,
        h,
        segments: 6,
      },
      { x: t.x, y: t.y + h / 2, z: t.z },
    );
    return;
  }
  t.stump = addStatic(
    { kind: 'cylinder', rTop: 0.46 * t.size, rBottom: 0.46 * t.size, h: 0.6, segments: 6 },
    { x: t.x, y: t.y + 0.3, z: t.z },
  );
  // The great tree's trunk goes on your shoulder; it isn't in the way after that.
  if (t.great && trunk.taken) return;
  const ground = t.great ? bigCargo.beam.ground : null;
  if (ground) {
    lie.setFromAxisAngle(AXIS_Y, ground.yaw);
    t.body = addStatic(
      { kind: 'box', hx: 0.3 * t.size, hy: 0.3 * t.size, hz: h / 2 },
      { x: ground.x, y: ground.y + 0.3 * t.size, z: ground.z },
      lie,
    );
    return;
  }
  // A settled log must never appear around the local player's capsule. Move only the intersecting player,
  // sideways off the new footprint, before adding its static solid; every peer performs this for itself.
  const player = me.body;
  if (player) {
    const p = player.position,
      dx = p.x - t.x,
      dz = p.z - t.z;
    const along = dx * Math.sin(t.fallYaw) + dz * Math.cos(t.fallYaw);
    const across = dx * Math.cos(t.fallYaw) - dz * Math.sin(t.fallYaw);
    if (along > -0.8 && along < h + 1 && Math.abs(across) < 0.3 * t.size + 0.65 && Math.abs(p.y - t.y) < 2) {
      let clear: { x: number; y: number; z: number } | null = null;
      for (let attempt = 0; attempt < 64 && !clear; attempt++) {
        const angle = t.fallYaw + ((attempt % 16) * Math.PI) / 8,
          radius = 2 + Math.floor(attempt / 16) * 2,
          x = p.x + Math.cos(angle) * radius,
          z = p.z - Math.sin(angle) * radius,
          y = H(x, z);
        if (y < 3 || Math.abs(y - t.y) > 1.2) continue;
        const ax = x - t.x,
          az = z - t.z;
        const on = ax * Math.sin(t.fallYaw) + az * Math.cos(t.fallYaw),
          side = ax * Math.cos(t.fallYaw) - az * Math.sin(t.fallYaw);
        if (on > -1 && on < h + 1 && Math.abs(side) < t.size + 0.8) continue;
        if (TREES.some((other) => standing(other) && Math.hypot(x - other.x, z - other.z) < other.size + 0.8)) continue;
        if (sweepSphere({ x, y: y + 128, z }, { x, y: y + 1.1, z }, 0.6, { mask: 0xffff, thin: 'skip' }) >= 0) continue;
        clear = { x, y: y + 1.1, z };
      }
      // If every side is occupied, stand above the low log, never inside it; walking/jumping remains available.
      teleport(player, clear?.x ?? p.x, clear?.y ?? Math.max(p.y, t.y + 2.5), clear?.z ?? p.z);
      player.velocity.set(0, 0, 0);
    }
  }
  if (t.collapsed) return; // the compact fall leaves exactly the visible, low stump
  lie.setFromAxisAngle(AXIS_Y, t.fallYaw);
  t.body = addStatic(
    { kind: 'box', hx: 0.3 * t.size, hy: 0.3 * t.size, hz: h / 2 },
    {
      x: t.x + Math.sin(t.fallYaw) * (h / 2 + 0.2),
      y: H(t.x + Math.sin(t.fallYaw) * h * 0.5, t.z + Math.cos(t.fallYaw) * h * 0.5) + 0.3 * t.size,
      z: t.z + Math.cos(t.fallYaw) * (h / 2 + 0.2),
    },
    lie,
  );
}
const leaf = new THREE.Color('#4f9c44'),
  leaf2 = new THREE.Color('#3f8a3a');
/** The crown comes apart as it lands: what stays is a bare trunk, solid, and you can see how much you've cut. */
function shedCrown(t: Tree) {
  for (let k = 0; k < (t.great ? 90 : 36); k++) {
    const along = (t.collapsed ? 0.5 : 5 + Math.random() * 7) * t.size,
      a = Math.random() * Math.PI * 2,
      sp = 1 + Math.random() * 3;
    emit({
      x: t.x + Math.sin(t.fallYaw) * along + Math.cos(a) * Math.random() * 1.8,
      y: t.y + 0.4 + Math.random() * 2,
      z: t.z + Math.cos(t.fallYaw) * along + Math.sin(a) * Math.random() * 1.8,
      vx: Math.cos(a) * sp,
      vy: 1.5 + Math.random() * 3,
      vz: Math.sin(a) * sp,
      life: 0.9 + Math.random() * 0.8,
      size: 0.18 + Math.random() * 0.16,
      color: k % 2 ? leaf : leaf2,
      gravity: 4,
      drag: 1.4,
      shrink: 0.5,
    });
  }
}

const n = TREES.length;
const hardwoodIndices = new Map(TREES.filter((t) => t.hardwood).map((t, k) => [t.index, k]));
const hardwoodCount = hardwoodIndices.size;
const greatGeo = new THREE.CylinderGeometry(0.3, 0.46, 5, 16, 1);
const greatVertices = greatGeo.getAttribute('position');
for (let k = 0; k < greatVertices.count; k++) {
  const x = greatVertices.getX(k),
    z = greatVertices.getZ(k);
  const ridge = 1 + 0.18 * Math.cos(Math.atan2(z, x) * 8);
  greatVertices.setXYZ(k, x * ridge, greatVertices.getY(k), z * ridge);
}
greatGeo.computeVertexNormals();
const rootGeo = new THREE.CylinderGeometry(0.45, 1.5, 0.6, 16);
const rootVertices = rootGeo.getAttribute('position');
for (let k = 0; k < rootVertices.count; k++) {
  const x = rootVertices.getX(k),
    z = rootVertices.getZ(k);
  const ridge = 0.7 + 0.3 * Math.cos(Math.atan2(z, x) * 8);
  rootVertices.setXYZ(k, x * ridge, rootVertices.getY(k), z * ridge);
}
rootGeo.computeVertexNormals();
const solidRoots = rootGeo.clone().translate(0, 0.3, 0).scale(greatTree.size, greatTree.size, greatTree.size);
addStatic(
  { kind: 'trimesh', vertices: solidRoots.getAttribute('position').array, indices: solidRoots.index!.array },
  greatTree,
);
// Alternating radial ridges give hardwood actual bark relief and a flared root base, even in grayscale.
const hardwoodGeo = new THREE.CylinderGeometry(0.52, 0.95, 5, 12, 1);
const barkVertices = hardwoodGeo.getAttribute('position');
for (let k = 0; k < barkVertices.count; k++) {
  const x = barkVertices.getX(k),
    z = barkVertices.getZ(k);
  const ridge = 1 + 0.13 * Math.cos(Math.atan2(z, x) * 6);
  barkVertices.setXYZ(k, x * ridge, barkVertices.getY(k), z * ridge);
}
hardwoodGeo.computeVertexNormals();
const parts = {
  trunk: new THREE.InstancedMesh(new THREE.CylinderGeometry(0.28, 0.46, 5, 6), flat('#7a5430'), n),
  crown: new THREE.InstancedMesh(new THREE.ConeGeometry(2.6, 6.5, 6), flat('#3f8a3a'), n),
  crown2: new THREE.InstancedMesh(new THREE.ConeGeometry(1.9, 4.6, 6), flat('#4f9c44'), n),
  stump: new THREE.InstancedMesh(new THREE.CylinderGeometry(0.44, 0.5, 0.6, 6), flat('#c9a06a'), n),
  notch: new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0).scale(0.25, 0.08, 0.055), flat('#c9a06a'), n),
  hardwood: new THREE.InstancedMesh(hardwoodGeo, flat('#686359'), hardwoodCount),
  forks: new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.42, 3.5, 8), flat('#686359'), hardwoodCount * 2),
  broad: new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), flat('#657a37'), hardwoodCount * 3),
  branch: new THREE.InstancedMesh(new THREE.CylinderGeometry(0.17, 0.21, 1.5, 8), flat('#686359'), hardwoodCount),
  cutEnd: new THREE.InstancedMesh(new THREE.CircleGeometry(0.17, 8), flat('#ddc89b'), hardwoodCount),
  great: new THREE.InstancedMesh(greatGeo, flat('#c7c2aa'), 1),
  roots: new THREE.InstancedMesh(rootGeo, flat('#c7c2aa'), 1),
  split: new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.28, 3.5, 8), flat('#c7c2aa'), 2),
  greatCrown: new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), flat('#4f7941'), 2),
};
for (const [name, m] of Object.entries(parts)) {
  if (['crown', 'crown2', 'broad', 'trunk', 'stump'].includes(name)) {
    m.material = m.material.clone(); // flat() is shared; this tree owns its pigment patch.
    patchNode(m.material, 'colorNode', (previous) =>
      selectiveColour(previous ?? materialColor, ['crown', 'crown2', 'broad'].includes(name) ? 'green' : 'timber'),
    );
  }
  m.castShadow = true;
  m.frustumCulled = false;
  scene.add(m);
}
const base = new THREE.Matrix4(),
  turn = new THREE.Matrix4(),
  local = new THREE.Matrix4(),
  out4 = new THREE.Matrix4(),
  e = new THREE.Euler(),
  sv = new THREE.Vector3();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const Q0 = new THREE.Quaternion(),
  S1 = new THREE.Vector3(),
  P1 = new THREE.Vector3();
function pose(t: Tree, now: number) {
  const hardwoodIndex = hardwoodIndices.get(t.index);
  if (t.cleared) {
    for (const m of [parts.trunk, parts.crown, parts.crown2, parts.stump, parts.notch]) m.setMatrixAt(t.index, ZERO);
    if (hardwoodIndex !== undefined) {
      for (const m of [parts.hardwood, parts.branch, parts.cutEnd]) m.setMatrixAt(hardwoodIndex, ZERO);
      for (let k = 0; k < 2; k++) parts.forks.setMatrixAt(hardwoodIndex * 2 + k, ZERO);
      for (let k = 0; k < 3; k++) parts.broad.setMatrixAt(hardwoodIndex * 3 + k, ZERO);
    }
    for (const m of Object.values(parts)) m.instanceMatrix.needsUpdate = true;
    return;
  }
  let a = 0,
    b = 0;
  if (t.fall >= 0) {
    const u = Math.min(1, t.fall / 0.75);
    a = t.collapsed ? 0 : (u * u * Math.PI) / 2 - 0.04 * u;
  } else if (t.shake > 0) {
    const age = Math.max(0, now - t.hitAt);
    a = Math.sin(age * 0.028) * t.shake * 0.052;
    b = Math.sin(age * 0.022) * t.shake * 0.018;
  }
  const drop = t.collapsed && t.fall >= 0 ? Math.min(1, t.fall / 0.75) ** 2 * 12 * t.size : 0;
  base.makeTranslation(t.x, t.y - drop, t.z);
  turn.makeRotationY(t.fallYaw).multiply(local.makeRotationFromEuler(e.set(a, 0, b)));
  base.multiply(turn);
  sv.setScalar(t.size);
  const at = (y: number) =>
    out4
      .copy(base)
      .multiply(local.makeTranslation(0, y * t.size, 0))
      .scale(sv);
  const taken = t.great && trunk.taken;
  const bare = t.fall >= 0.75;
  const compact = bare && t.collapsed;
  parts.trunk.setMatrixAt(t.index, taken || t.hardwood || t.great || compact ? ZERO : at(2.5));
  if (t.great) parts.great.setMatrixAt(0, taken || compact ? ZERO : at(2.5));
  const ground = t.great && !taken ? bigCargo.beam.ground : null;
  if (ground) {
    // Cylinder's Y axis lies along the dropped trunk's local Z axis.
    Q0.setFromEuler(e.set(Math.PI / 2, ground.yaw, 0, 'YXZ'));
    parts.great.setMatrixAt(0, out4.compose(P1.set(ground.x, ground.y + 0.63, ground.z), Q0, sv));
  }
  if (hardwoodIndex !== undefined) parts.hardwood.setMatrixAt(hardwoodIndex, taken || compact ? ZERO : at(2.5));
  // A crown follows the trunk's contact by 80 ms rather than twitching as one rigid stick.
  if (t.fall < 0 && t.shake > 0 && now - t.hitAt < 80) base.makeTranslation(t.x, t.y, t.z);
  parts.crown.setMatrixAt(t.index, bare || t.hardwood || t.great ? ZERO : at(7.2));
  parts.crown2.setMatrixAt(t.index, bare || t.hardwood || t.great ? ZERO : at(10));
  if (t.great) {
    parts.roots.setMatrixAt(0, local.compose(P1.set(t.x, t.y + 0.3 * t.size, t.z), Q0.identity(), sv));
    for (let k = 0; k < 2; k++) {
      const side = k ? 1 : -1;
      out4
        .copy(base)
        .multiply(local.makeTranslation(side * 0.7 * t.size, 5 * t.size, 0))
        .multiply(turn.makeRotationZ(-side * 0.45))
        .scale(sv);
      parts.split.setMatrixAt(k, bare ? ZERO : out4);
      out4
        .copy(base)
        .multiply(local.makeTranslation(side * 2 * t.size, (k ? 8 : 7.3) * t.size, 0))
        .scale(S1.set(1.8 * t.size, 2.4 * t.size, 2 * t.size));
      parts.greatCrown.setMatrixAt(k, bare ? ZERO : out4);
    }
  }
  for (let k = 0; hardwoodIndex !== undefined && k < 2; k++) {
    out4
      .copy(base)
      .multiply(local.makeTranslation((k ? 1 : -1) * 0.7 * t.size, 4.5 * t.size, 0))
      .multiply(turn.makeRotationZ((k ? -1 : 1) * 0.45))
      .scale(sv);
    parts.forks.setMatrixAt(hardwoodIndex * 2 + k, !bare ? out4 : ZERO);
  }
  for (let k = 0; hardwoodIndex !== undefined && k < 3; k++) {
    const dx = (k - 1) * 2.1;
    out4
      .copy(base)
      .multiply(local.makeTranslation(dx * t.size, (k === 1 ? 7.2 : 6.3) * t.size, (k === 1 ? 0.8 : 0) * t.size))
      .scale(S1.set(2.8 * t.size, 2.3 * t.size, 2.6 * t.size));
    parts.broad.setMatrixAt(hardwoodIndex * 3 + k, !bare ? out4 : ZERO);
  }
  // A pale, tapered wood bite sits partly in the bark. Accepted work widens it; refusal leaves one shallow scuff.
  const cut = t.work / (t.great ? GREAT.strokes : 15);
  const cutYaw = t.cutYaw;
  local.compose(
    P1.set(
      t.x + Math.sin(cutYaw) * (t.hardwood ? 0.7 : 0.4) * t.size,
      t.y + 1.1,
      t.z + Math.cos(cutYaw) * (t.hardwood ? 0.7 : 0.4) * t.size,
    ),
    Q0.setFromAxisAngle(AXIS_Y, cutYaw),
    S1.set(t.size * (t.scuff && !cut ? 0.35 : 0.5 + cut), t.scuff && !cut ? 0.2 : 0.5 + cut, 1),
  );
  parts.notch.setMatrixAt(t.index, t.fall >= 0 || (!cut && !t.scuff) ? ZERO : local);
  parts.stump.setMatrixAt(
    t.index,
    t.fall >= 0
      ? local.compose(
          P1.set(t.x, t.y + 0.3, t.z),
          Q0.identity(),
          S1.set(t.size * (t.hardwood ? 1.8 : 1), 1, t.size * (t.hardwood ? 1.8 : 1)),
        )
      : ZERO,
  );
  // A naturally fallen branch with a pale end shows what this dense wood is good for before the axe upgrade.
  if (hardwoodIndex !== undefined) {
    const branchX = t.x + 1.5 * t.size,
      branchZ = t.z + 1.1 * t.size;
    local.compose(
      P1.set(branchX, H(branchX, branchZ) + 0.22, branchZ),
      Q0.setFromEuler(e.set(Math.PI / 2, 0, -0.6)),
      S1.setScalar(1),
    );
    parts.branch.setMatrixAt(hardwoodIndex, local);
    local.compose(
      P1.set(branchX + Math.sin(0.6) * 0.755, H(branchX, branchZ) + 0.22, branchZ + Math.cos(0.6) * 0.755),
      Q0.setFromAxisAngle(AXIS_Y, 0.6),
      S1.setScalar(1),
    );
    parts.cutEnd.setMatrixAt(hardwoodIndex, local);
  }
  for (const m of Object.values(parts)) m.instanceMatrix.needsUpdate = true;
}
export const trunkDown = () => greatTree.fall >= 0.75 && !trunk.taken;
export const trunkAt = () => {
  const ground = bigCargo.beam.ground;
  if (ground) return new THREE.Vector3(ground.x, ground.y + 1.4, ground.z);
  const h = 5 * greatTree.size * 0.5;
  return new THREE.Vector3(
    greatTree.x + Math.sin(greatTree.fallYaw) * h,
    greatTree.y + 1.4,
    greatTree.z + Math.cos(greatTree.fallYaw) * h,
  );
};
export function resetTrees() {
  trunk.taken = false;
  harvestReserved = 0;
  for (const t of TREES) {
    t.strokes = 0;
    t.shake = 0;
    t.fall = -1;
    t.work = t.issued = t.revision = 0;
    t.ceiling = t.great ? 0 : t.hardwood ? 15 : 10;
    t.collapsed = t.scuff = false;
    t.fallYaw = 0;
    pose(t, 0);
    solidTree(t);
  }
}
/** Trees already down, by index: what a reload keeps. */
const fellenList = () => TREES.filter((t) => t.fall >= 0).map((t) => t.index);
function restoreFellen(list: number[]) {
  for (const k of list) {
    const t = TREES[k];
    if (!t || t.fall >= 0) continue;
    t.fall = 1;
    t.strokes = strokesFor(t);
    t.work = t.great ? GREAT.strokes : 15;
    t.issued = t.ceiling;
    t.revision = Math.max(1, t.revision);
    if (!t.fallYaw) t.fallYaw = (k * 2.4) % 6.28;
    pose(t, 0);
    solidTree(t);
  }
}
export const standing = (t: Tree) => !t.cleared && t.fall < 0;

// ---------------------------------------------------------------- rocks
export type Rock = {
  index: number;
  x: number;
  y: number;
  z: number;
  r: number;
  strokes: number;
  shake: number;
  at: THREE.Vector3;
  body: Body | null;
};
export const ROCK_LIST: Rock[] = ROCKS.map((q, k) => {
  const x = q.x + ORIGIN.x,
    z = q.z + ORIGIN.z,
    y = H(x, z);
  return { index: k, x, y, z, r: q.r, strokes: 0, shake: 0, at: new THREE.Vector3(x, y + 1, z), body: null };
});
const LUMPS = 5; // what a rock's made of: each stroke takes one off
const lumpGeo = new THREE.DodecahedronGeometry(1, 0);
const lumpMesh = new THREE.InstancedMesh(
  lumpGeo,
  new THREE.MeshStandardNodeMaterial({ color: '#b0ab9d', roughness: 0.95, flatShading: true }),
  ROCK_LIST.length * LUMPS,
);
const bandMesh = new THREE.InstancedMesh(
  new THREE.TorusGeometry(1, 0.1, 5, 14).rotateX(Math.PI / 2),
  flat('#f0752c'),
  ROCK_LIST.length,
);
lumpMesh.castShadow = bandMesh.castShadow = true;
lumpMesh.frustumCulled = bandMesh.frustumCulled = false;
scene.add(lumpMesh, bandMesh);
const lp = new THREE.Vector3(),
  lq = new THREE.Quaternion(),
  ls = new THREE.Vector3(),
  le = new THREE.Euler();
function poseRock(q: Rock) {
  const left = LUMPS - Math.ceil((q.strokes / ROCK_WORK.strokes) * LUMPS);
  const sh = q.shake * 0.05;
  for (let k = 0; k < LUMPS; k++) {
    const a = (k / LUMPS) * Math.PI * 2 + q.index,
      top = k === 0,
      s = q.r * (top ? 0.62 : 0.55);
    lp.set(
      q.x + (top ? 0 : Math.cos(a) * q.r * 0.55) + (Math.random() - 0.5) * sh,
      q.y + (top ? q.r * 0.95 : q.r * 0.35),
      q.z + (top ? 0 : Math.sin(a) * q.r * 0.55) + (Math.random() - 0.5) * sh,
    );
    lq.setFromEuler(le.set(k, k * 1.7, k * 0.5));
    // The top lump goes first, then round the bottom.
    const gone = k < LUMPS - left;
    lumpMesh.setMatrixAt(q.index * LUMPS + k, gone ? ZERO : local.compose(lp, lq, ls.setScalar(s)));
  }
  const unbroken = q.strokes < ROCK_WORK.strokes;
  bandMesh.setMatrixAt(
    q.index,
    unbroken ? local.compose(lp.set(q.x, q.y + q.r * 0.5, q.z), lq.identity(), ls.setScalar(q.r * 1.02)) : ZERO,
  );
  lumpMesh.instanceMatrix.needsUpdate = bandMesh.instanceMatrix.needsUpdate = true;
}
function solidRock(q: Rock) {
  if (q.body) removeBody(q.body);
  q.body = null;
  if (q.strokes >= ROCK_WORK.strokes) return;
  q.body = addStatic(
    { kind: 'cylinder', rTop: q.r * 0.8, rBottom: q.r * 0.8, h: q.r * 1.4, segments: 7 },
    { x: q.x, y: q.y + q.r * 0.7, z: q.z },
  );
}
for (const q of ROCK_LIST) {
  poseRock(q);
  solidRock(q);
  addFoot(q.x, q.z, 0, q.r, q.r);
}
export const whole = (q: Rock) => q.strokes < ROCK_WORK.strokes;
export function resetRocks() {
  for (const q of ROCK_LIST) {
    q.strokes = 0;
    poseRock(q);
    solidRock(q);
  }
}

// ---------------------------------------------------------------- the axes
const axes = makeAxes();
const axe = axes.root;
axe.visible = false;

const swing = {
  t: 99,
  target: null as Tree | null,
  rock: null as Rock | null,
  hit: true,
  response: 'bite' as HarvestResult['outcome'],
  contact: new THREE.Vector3(),
};
const contactRay = new THREE.Raycaster();
const contactDirection = new THREE.Vector3();
const bundleTo = new THREE.Vector3(),
  bundleRot = new THREE.Quaternion(),
  popOut = new THREE.Vector3();
let logsLanded = 0;

const inner = () => (me.avatar?.userData as Worn | undefined)?.inner;
function startSwing(x: number, z: number) {
  beginFeelAction('chop');
  swing.t = 0;
  swing.hit = false;
  swing.response = 'bite';
  // Square up to it: you hit what you meant to.
  const p = me.body!.position;
  me.yaw = Math.atan2(-(x - p.x), -(z - p.z));
  contactDirection.set(x - p.x, 0, z - p.z).normalize();
  swing.contact.set(x - contactDirection.x * 0.4, p.y + 0.55, z - contactDirection.z * 0.4);
}
/** Press: the swing starts now. False while the last one is still going. */
export function chop(t: Tree) {
  if (swing.t < TUNE.swingS || !me.body) return false;
  swing.target = t;
  swing.rock = null;
  startSwing(t.x, t.z);
  // Aim at the actual faceted bark from this approach, rather than a fixed-radius point inside every tree.
  contactRay.set(
    new THREE.Vector3(
      me.body.position.x - contactDirection.z * CHOP_SIDE,
      me.body.position.y + 0.55,
      me.body.position.z + contactDirection.x * CHOP_SIDE,
    ),
    contactDirection,
  );
  const trunk = t.great ? parts.great : t.hardwood ? parts.hardwood : parts.trunk;
  const index = t.great ? 0 : t.hardwood ? hardwoodIndices.get(t.index) : t.index;
  trunk.updateMatrixWorld(true);
  const contact = contactRay.intersectObject(trunk, false).find((hit) => hit.instanceId === index);
  if (contact) swing.contact.copy(contact.point);
  return true;
}
export function breakRock(q: Rock) {
  if (swing.t < TUNE.swingS || !me.body) return false;
  swing.target = null;
  swing.rock = q;
  startSwing(q.x, q.z);
  return true;
}
/** Under `&coop=1`, ./coop.ts accepts tree work before the local award; rock messages retain their existing meaning. */
export const chopHooks = {
  greatReady: () => false,
  harvest: null as ((t: Tree, room: number, axe: number, yaw: number) => void) | null,
  rock: null as ((q: Rock) => void) | null,
};
function contact(t: Tree) {
  if (!me.body || t.fall >= 0) return; // someone else's stroke can fell it mid-swing
  const p = me.body.position;
  const room = Math.max(0, Math.min(back.room(), job.rung.axe ? AXE2.logsPerStroke : TUNE.logsPerStroke));
  const yaw = Math.atan2(t.x - p.x, t.z - p.z);
  // Refusal changes no shared work: answer at contact even before a co-op receipt can make the round trip.
  if (
    (t.great && (!job.rung.axe || !chopHooks.greatReady())) ||
    (!t.great && room === 0) ||
    (t.hardwood && !job.rung.axe)
  ) {
    receiveHarvest(t, harvestTree(t, room, job.rung.axe, yaw), true);
    return;
  }
  if (chopHooks.harvest) chopHooks.harvest(t, room, job.rung.axe, yaw);
  else receiveHarvest(t, harvestTree(t, room, job.rung.axe, yaw), true);
}
/** Accepted output belongs to the back immediately; flights are only its presentation, including across saves. */
export function receiveHarvest(t: Tree, result: HarvestResult, localPlayer: boolean) {
  const s = result.state;
  if (
    !validTreeHarvest(s) ||
    !count(result.logs, 5) ||
    (t.great ? s.ceiling !== 0 || s.work > GREAT.strokes : s.ceiling === 0) ||
    (s.fell && (s.work < (t.great ? GREAT.strokes : 15) || s.issued !== s.ceiling))
  )
    return;
  const wasStanding = t.fall < 0;
  applyTreeHarvest(t, result.state);
  if (localPlayer) swing.response = result.outcome;
  if (t.cleared) {
    // An old tab can still harvest this ID. Keep the accepted result, without a phantom local tree or its effects.
    if (localPlayer && result.outcome === 'bite') back.logs += result.logs;
    save();
    return;
  }
  if (result.outcome === 'gone') return;
  const p = me.body?.position ?? t;
  const dx = t.x - p.x,
    dz = t.z - p.z,
    d = Math.hypot(dx, dz) || 1;
  const bark =
    localPlayer && swing.target === t
      ? popOut.copy(swing.contact)
      : popOut.set(t.x - (dx / d) * 0.4, t.y + 1.1, t.z - (dz / d) * 0.4);
  t.cutYaw = Math.atan2(-dx, -dz);
  const good = !!job.rung.axe;
  if (result.outcome === 'full') {
    if (localPlayer) placeSound('bagFull', p.x, p.z);
    return;
  }
  if (result.outcome === 'rebound') {
    t.shake = 0.1;
    t.scuff = true;
    t.hitAt = performance.now();
    chips(bark.x, bark.y, bark.z, 2);
    placeSound('treeRebound', t.x, t.z);
    pose(t, performance.now());
    return;
  }
  t.shake = 1;
  t.hitAt = performance.now();
  placeSound(t.hardwood ? 'hardwoodBite' : 'treeBite', t.x, t.z);
  chips(bark.x, bark.y, bark.z, good ? 18 : 9);
  const yields = localPlayer ? result.logs : 0;
  back.logs += yields;
  for (let k = 0; k < yields; k++) {
    harvestFlights.push(
      send('log', bark, bark, {
        dur: TUNE.flyS + k * 0.03,
        apex: 1.1 + k * 0.15,
        aim: (to) => {
          if (myBundleNext(back.logs, bundleTo, bundleRot)) to.copy(bundleTo);
        },
        land: () => {
          pop(Math.min(7, logsLanded++ % 8), 0.5);
        },
      }),
    );
  }
  if (wasStanding && t.fall >= 0) {
    logsLanded = 0;
    if (t.great) placeSound('treeFall', t.x, t.z);
    else thump(t.x, t.z);
  }
  save();
}
const spark = new THREE.Color('#ffe2a0');
function contactRock(q: Rock) {
  if (!me.body || !whole(q)) return;
  q.strokes++;
  q.shake = 1;
  knock(1.4, 1.2);
  clank(q.x, q.z);
  chips(q.x, q.y + q.r, q.z, 8);
  for (let k = 0; k < 10; k++) {
    const a = Math.random() * Math.PI * 2;
    emit({
      x: q.x,
      y: q.y + q.r,
      z: q.z,
      vx: Math.cos(a) * 3,
      vy: 2 + Math.random() * 3,
      vz: Math.sin(a) * 3,
      life: 0.4,
      size: 0.07,
      color: spark,
      gravity: 10,
    });
  }
  const i = inner();
  if (i) i.rotation.x = -0.5;
  const yields = Math.min(ROCK_WORK.stonePerStroke, back.room());
  popOut.set(q.x, q.y + q.r, q.z);
  for (let k = 0; k < yields; k++) {
    back.incoming++;
    send('stone', popOut, popOut, {
      dur: TUNE.flyS + k * 0.04,
      apex: 1.2,
      aim: (to) => {
        if (me.body) to.set(me.body.position.x, me.body.position.y + 0.7, me.body.position.z);
      },
      land: () => {
        back.incoming--;
        back.stone++;
        pop(3, 0.5);
      },
    });
  }
  poseRock(q);
  if (!whole(q)) {
    dustRing(q.x, q.y + 0.2, q.z, 10, 2.4, 0.4);
    placeSound('rockBreak', q.x, q.z);
    solidRock(q);
  }
  chopHooks.rock?.(q);
}
/** From another tab: a rock hit there. */
export function rockStruck(q: Rock, strokes: number) {
  q.strokes = Math.max(q.strokes, strokes);
  chips(q.x, q.y + q.r, q.z, 6);
  poseRock(q);
  solidRock(q);
}
/** Trade whatever's on your back for the one big thing. */
export function shoulder(what: Exclude<BigThing, null>) {
  back.logs = back.rails = back.stone = 0;
  back.big = what;
  back.beam = what === 'beam' ? 1 : 0;
  if (what === 'beam') {
    setTrunkTaken(true);
    const p = me.body?.position;
    if (p) placeSound('shoulder', p.x, p.z);
  }
}
export function setTrunkTaken(v: boolean) {
  trunk.taken = v;
  solidTree(greatTree);
  pose(greatTree, 0);
}
export const trunkTaken = () => trunk.taken;
export const putDownBig = () => {
  back.big = null;
  back.beam = 0;
};

sharedSlice('bigCargoV1', {
  get: () => structuredClone(bigCargo),
  set: (v) => {
    const j = v as Partial<typeof bigCargo> | null;
    for (const kind of ['beam', 'boiler'] as const)
      bigCargo[kind] = validCargo(j?.[kind]) ? structuredClone(j[kind]) : freshCargo();
  },
});

sharedSlice('felled', {
  get: () => ({
    trees: fellenList(),
    yaw: TREES.filter((t) => t.fall >= 0).map((t) => +t.fallYaw.toFixed(3)),
    rocks: ROCK_LIST.map((q) => q.strokes),
    trunk: trunk.taken,
  }),
  set: (v) => {
    const j = (v ?? {}) as { trees?: unknown; yaw?: unknown; rocks?: unknown; trunk?: unknown };
    resetTrees();
    resetRocks();
    trunk.taken = j.trunk === true;
    if (Array.isArray(j.trees))
      j.trees.forEach((k, m) => {
        if (!count(k, TREES.length - 1)) return;
        const y = Array.isArray(j.yaw) ? (j.yaw[m] as unknown) : 0;
        TREES[k]!.fallYaw = typeof y === 'number' && Number.isFinite(y) ? y : 0;
        restoreFellen([k]);
      });
    if (Array.isArray(j.rocks))
      j.rocks.forEach((s, k) => {
        const q = ROCK_LIST[k];
        if (!q || !count(s, ROCK_WORK.strokes)) return;
        q.strokes = s;
        poseRock(q);
        solidRock(q);
      });
  },
});

// Appended after legacy felled data: old IDs retain their meaning, partial work overlays their safe defaults.
sharedSlice('treeHarvestV1', {
  get: () => TREES.filter((t) => t.revision > 0).map((t) => [t.index, readTreeHarvest(t)]),
  set: (v) => {
    if (!Array.isArray(v)) return;
    for (const row of v) {
      if (!Array.isArray(row) || !count(row[0], TREES.length - 1) || !validTreeHarvest(row[1])) continue;
      const t = TREES[row[0]]!;
      if (applyTreeHarvest(t, row[1])) {
        if (row[1].fell) t.fall = 1;
        pose(t, 0);
        solidTree(t);
      }
    }
  },
});

export const felled = { n: 0 };
/** Each frame. */
export function updateChop(dt: number, now: number) {
  const f = frameOf();
  if (f && packFrame.parent !== f) {
    // Build after the prototype's modules have loaded; gifts and the carry view share the frame parts.
    if (!packFrame.children.length) {
      const pack = packFrameMesh();
      pack.castShadow = pack.receiveShadow = true;
      packFrame.add(pack);
    }
    f.add(railsWorn, stoneWorn, beamWorn, boilerWorn, packFrame);
  }
  railsWorn.count = Math.max(0, Math.min(railsWorn.instanceMatrix.count, back.rails));
  railsWorn.visible = back.rails > 0;
  stoneWorn.count = Math.max(0, Math.min(stoneWorn.instanceMatrix.count, back.stone));
  stoneWorn.visible = back.stone > 0;
  beamWorn.visible = back.big === 'beam';
  if (beamWorn.visible && f) poseCarriedBeam(beamWorn, f, null);
  boilerWorn.visible = back.big === 'boiler';
  packFrame.visible = !!job.rung.pack;
  updatePartnerLoads();
  if (back.big) input.sprint = false; // you can't run with that
  axes.setTier(job.rung.axe ? (job.rung.multi ? 'proper-multi' : 'proper') : job.rung.multi ? 'multi' : 'starter');
  swing.t += dt;
  if (swing.t >= CHOP_DURATION) endFeelChop();
  const c = TUNE.contactS;
  if (!swing.hit && swing.t >= c) {
    swing.hit = true;
    if (swing.target) contact(swing.target);
    else if (swing.rock) contactRock(swing.rock);
  }
  const body = inner();
  if (body) {
    const wasVisible = axe.visible;
    applyChopPose(body, axe, swing.t, swing.response, { reducedMotion, target: swing.contact, frame: f ?? body });
    sparkleAxe(axe, wasVisible, reducedMotion, emit, readableIntensity());
  }
  for (const t of TREES) {
    if (t.shake > 0) {
      t.shake = Math.max(0, t.shake - dt * 3.2);
      pose(t, now);
    }
    if (t.fall >= 0 && t.fall < 0.8) {
      t.fall += dt / (t.great ? 1.7 : 1);
      pose(t, now);
      if (t.fall >= 0.75) {
        t.fall = 1;
        felled.n++;
        if (t.great) placeSound('treeLand', t.x, t.z);
        else thump(t.x, t.z);
        dustRing(
          t.x + Math.sin(t.fallYaw) * (t.collapsed ? 0 : 5),
          t.y + 0.2,
          t.z + Math.cos(t.fallYaw) * (t.collapsed ? 0 : 5),
          t.great ? 40 : 16,
          t.great ? 6 : 3.4,
          t.great ? 1 : 0.6,
        );
        shedCrown(t);
        if (t.great) {
          shakeView(0.3);
        }
        pose(t, now);
        solidTree(t);
      }
    }
  }
  for (const q of ROCK_LIST)
    if (q.shake > 0) {
      q.shake = Math.max(0, q.shake - dt * 5);
      if (whole(q)) poseRock(q);
    }
}
for (const t of TREES) {
  pose(t, 0);
  solidTree(t);
  if (LOOK.contact && !t.cleared)
    addBlob(t.x, t.y, t.z, t.size * (t.hardwood ? 0.9 : 0.5), t.size * (t.hardwood ? 0.9 : 0.5));
}
