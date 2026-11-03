// A real place, third round (docs/plans/find-the-fun.md, step 10; loaded by src/features/proto-place.ts behind ?proto=place).
// A slice of Threefold Reach with the crossing's sea. You walk the long way round to a stranded track layer, wake it, chop
// timber and carry it to auto-paver stations along the route. The machine takes those same logs and lays the line home
// piece by piece, trestle and all, and you can stand on any of it. The first train's cargo is craned straight into a forge
// in town, the lit forge pours rails on a rack, and those rails, with timber from the village's heap, build line 2 out from
// home to the quarry. This round adds motivation and life around that job: every stretch delivers a crate with a gift in it,
// a curio shelf and empty mounts on the train promise more from the start, little guys work the place and crystals hide
// along the way. Past it all, something strange across the sea.
// Gut question: did the crates and the little guys give you a reason to keep carrying?
// Serves DESIGN.md 1 (Toys before chores), 7 (Telegraph everything) and 9 (Leave something for the next visitor).
// Research: docs/research/construction-you-can-watch.md, docs/research/harvest-feel.md, docs/research/maximal-rewards.md;
// Death Stranding's auto-pavers; the decision log's 2 November entries.
//
// Sync: Local, all of it, kept in localStorage per room. The back bundle's count is here too (`backSeam`, ./chop.ts), so
// chopping never waits on the host.
import './place.css';
import './ambience.ts';
import * as THREE from 'three/webgpu';
import { flat } from '../flat.ts';
import { onFrame } from '../../loop.ts';
import { worldStatus, world, onApplied, submitEdit } from '../../world/sync.ts';
import { getRoomId } from '../../netplay/net.ts';
import { PLAYER_R, FOG_FAR } from '../../constants.ts';
import { me, cam, camConstraints } from '../../player/player.ts';
import { registerInteractable, NO_TARGETS, type Interactable } from '../../player/hands.ts';
import { myBundleNext } from '../../features/haul-stack.ts';
import { haulHooks } from '../../player/haul-variant.ts';
import { setCcd, teleport } from '../../physics/engine.ts';
import { softWall } from '../../entities/player/state.ts';
import { carry } from '../../physics/platforms.ts';
import { scene } from '../../render/scene.ts';
import { emit } from '../../render/particles.ts';
import { clank, thump, whistle } from '../../render/machine-sfx.ts';
import { dressSea } from '../crossing/sea.ts';
import { extendSky } from '../crossing/sky.ts';
import { fanfare, knock, label, pop } from '../minis/common.ts';
import { draw } from '../net/boxes.ts';
import {
  clearCrates,
  deckFree,
  drawHeaps,
  heap,
  hopOff,
  hopOn,
  hopTo,
  nextSlot,
  topSlot,
  updateCrates,
  type Heap,
  type Kind,
} from '../net/crates.ts';
import { playPanel } from '../flags.ts';
import { protoCount } from '../count.ts';
import { protoMark } from '../mark.ts';
import { H, PATH_SAMPLES, addStatic, buildLand, insidePlace } from './land.ts';
import {
  after,
  clearMoments,
  firstLineShow,
  nextLineShow,
  pullOn,
  showBanner,
  updateMoments,
  wakeShow,
} from './celebrate.ts';
import { CRYSTALS, crystalAt, crystals, onCrystal, snapCrystals, updateCrystals } from './crystals.ts';
import {
  cheerAround,
  folk,
  pourOut,
  resetFolk,
  setCamp,
  setFolkEnv,
  setPopulation,
  setRiders,
  updateFolk,
} from './folk.ts';
import {
  deliver,
  fitMounts,
  giftState,
  nearestCrate,
  onGiftSaved,
  openCrate,
  showing,
  snapGifts,
  updateGifts,
  type GiftId,
} from './gifts.ts';
import { addFoot, clearDrops } from './sites.ts';
import { LOOK, installLight } from './look.ts';
import { installContact } from './look-kit.ts';
import {
  CRANE,
  DOCK,
  FORGE,
  HEAP,
  LINKS,
  ORIGIN,
  RACK,
  SHELF,
  SPAWN,
  STUB,
  TURNTABLE,
  TUNE,
  VILLAGE,
  YARD,
  lineAt,
  railY,
  toWorld,
  type LinePoint,
} from './layout.ts';
import { clearTrips, send, updatePieces, dustRing } from './pieces.ts';
import {
  besideLine,
  buildMachine,
  buildPlatform,
  buildTrack,
  buildTrain,
  cycleOf,
  runSeconds,
  thud,
  type Track,
  type TrainRun,
} from './rail.ts';
import { seated, sitDown, standUp } from './seat.ts';
import { buildStation, type StationRun } from './stations.ts';
import {
  TREES,
  back,
  chop,
  felled,
  fellenList,
  resetTrees,
  restoreFellen,
  standing,
  updateChop,
  type Tree,
} from './chop.ts';
import {
  craneBusy,
  craneClear,
  craneLift,
  crateIn,
  forge,
  forgePhase,
  nextDrop,
  rackFrom,
  rackTop,
  resetForge,
  snapForge,
  takeRail,
  updateForge,
} from './forge.ts';
import { buildSigns, setBeacon, setNumbers, setObjective } from './signs.ts';
import { campSmoke, onStepUp, snapCamp, snapTown, staticPart, updateTown, wakeCamp } from './town.ts';

// A clean view for someone playing it cold (the tester's link, `&fresh=1`): place.css hides the bar, the panel and the numbers.
if (new URLSearchParams(location.search).get('fresh') === '1') document.body.classList.add('place-fresh');

buildLand();
dressSea();
extendSky();
buildSigns();
haulHooks.moved = () => true; // today's island's bundles aren't in this world

// ---------------------------------------------------------------- the far distance, and past the edge of the map
// Hazier than the crossing: the place is the view, and today's island behind you should be a far shape.
onFrame(
  () => {
    const fog = scene.fog as THREE.Fog;
    if (fog.near === 180 || fog.far === FOG_FAR) {
      fog.near = 320;
      fog.far = 1700;
    }
  },
  { phase: 'update', order: -3 },
);
softWall.at = Infinity; // this world runs well past the 510 m square the player's soft wall guards
camConstraints.push((_, pos) => {
  if (insidePlace(pos.x, pos.z)) pos.y = Math.max(pos.y, H(pos.x, pos.z) + 0.5);
  return false;
});

// ---------------------------------------------------------------- the two lines and what stands on them
const P: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
const FLAT = (color: string) => flat(color, 0.9);

const machine = buildMachine();
fitMounts(machine.look.cars);
if (LOOK.light) installLight();
if (LOOK.contact) installContact([machine.flatbed, machine.loco], TREES);
if (LOOK.gtao) void import('./look-gtao.ts');
const thudAt = (_k: number, kind: string, x: number, y: number, z: number) => thud(machine, kind, x, y, z);
type LineRun = {
  k: number;
  spec: (typeof LINKS)[number];
  track: Track;
  stations: StationRun[];
  stage: number; // the station whose turn it is; stations.length once the line's done
  open: boolean;
  train: TrainRun;
  pile: Heap;
  smoke: { x: number; y: number; z: number };
  madeAt: number;
};
const lines: LineRun[] = LINKS.map((spec, k) => {
  const { line } = spec;
  // Survey stakes beside the line: where it'll go.
  const stakes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 1.5, 0.14), FLAT('#f0752c'), 30);
  const o = new THREE.Object3D();
  let n = 0;
  for (let s = 22; s < line.len - 8 && n < 30; s += 11) {
    const q = besideLine(line, s, 5.5),
      y = H(q.x, q.z);
    if (railY(line, s) - y > 2) continue; // over the gorge
    o.position.set(q.x, y + 0.75, q.z);
    o.updateMatrix();
    stakes.setMatrixAt(n++, o.matrix);
  }
  stakes.count = n;
  stakes.frustumCulled = false;
  scene.add(stakes);
  // Platforms: at the village, and at the far end.
  // Line 1's stands on the village's side, facing the forge.
  const [s0, s1, lat] = k === 0 ? [8, 30, -2.9] : [6, 28, 2.9];
  if (k === 0) buildPlatform(line, s0, s1, lat, 36, 24);
  else buildPlatform(line, s0, s1, lat, 34);
  lineAt(line, (s0 + s1) / 2, P);
  const mid = besideLine(line, (s0 + s1) / 2, lat);
  addFoot(mid.x, mid.z, Math.atan2(P.ux, P.uz), 1.4, (s1 - s0) / 2 + 0.3);
  buildPlatform(line, line.len - 26, line.len - 2, 2.9, line.len + 5);
  const pileAt = besideLine(line, line.len - TUNE.stopIn - 3.7, -5);
  return {
    k,
    spec,
    track: buildTrack(spec, thudAt),
    stations: spec.stations.map((q) => buildStation(q, line, spec.dir)),
    stage: 0,
    open: false,
    train: buildTrain(line),
    pile: heap(pileAt.x, pileAt.z, 3, H(pileAt.x, pileAt.z)),
    smoke: campSmoke(k),
    madeAt: 0,
  };
});
const [L1, L2] = lines as [LineRun, LineRun];
for (const l of lines) fitMounts(l.train.look.cars);

// The turntable where line 1 ends and line 2 begins: a low disc that turns with the machine.
const TX = toWorld(TURNTABLE.x),
  TZ = TURNTABLE.z,
  TY = railY(L1.spec.line, 0);
const disc = new THREE.Group();
disc.position.set(TX, H(TX, TZ), TZ);
const discBase = new THREE.Mesh(new THREE.CylinderGeometry(TURNTABLE.r, TURNTABLE.r, 0.24, 20), FLAT('#7f7a70'));
discBase.position.y = TY + 0.0 - disc.position.y;
discBase.receiveShadow = true;
disc.add(discBase);
const discBars = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, TURNTABLE.r * 2 - 0.3), FLAT('#5c5046'));
discBars.position.y = TY + 0.13 - disc.position.y;
disc.add(discBars);
scene.add(disc);
addStatic(
  { kind: 'cylinder', rTop: TURNTABLE.r, rBottom: TURNTABLE.r, h: 0.24, segments: 12 },
  { x: TX, y: TY, z: TZ },
);
addFoot(TX, TZ, 0, TURNTABLE.r * 0.8, TURNTABLE.r * 0.8);

// The little guys' idea of the place.
const platformAt = (() => {
  lineAt(L1.spec.line, 19, P);
  const q = besideLine(L1.spec.line, 19, -2.9);
  return { x: q.x, y: railY(L1.spec.line, 19) + 0.72, z: q.z, ux: P.ux, uz: P.uz };
})();
const gatherFrom = besideLine(L1.spec.line, 6, -4.6);
setFolkEnv({
  station: () => {
    const st = stationOf(run.line);
    return s.awake && st && (run.mode === 'idle' || run.mode === 'feeding') ? { x: st.x, y: st.y, z: st.z } : null;
  },
  machineBusy: () =>
    run.mode === 'laying' || run.mode === 'running' || run.mode === 'shunting' || run.mode === 'turning',
  machine: () => ({ mesh: machine.flatbed.mesh, top: 0.15 }),
  trainCar: (k) => {
    const l = lines[k]!;
    return l.open ? { mesh: l.train.tr.cars[0]!.mesh, top: 0.97 } : null; // up on the cab's roof
  },
  gather: {
    x: gatherFrom.x,
    z: gatherFrom.z,
    ux: platformAt.ux,
    uz: platformAt.uz,
    lx: platformAt.uz,
    lz: -platformAt.ux,
    len: 28,
  },
  platform: platformAt,
  forgeLit: () => forge.lit,
  hush: () => !!showing(),
});
function folkState() {
  setCamp(0, s.awake);
  setCamp(1, L2.open);
  setRiders(0, L1.open);
  setRiders(1, L2.open);
}

// ---------------------------------------------------------------- the village's heaps
const dock = heap(toWorld(DOCK.x), DOCK.z, 3, VILLAGE.y);
const hub = heap(toWorld(HEAP.x), HEAP.z, 4, VILLAGE.y);
const yard = heap(toWorld(YARD.x), YARD.z, 4, VILLAGE.y);
const allHeaps: Heap[] = [dock, hub, yard, L1.pile, L2.pile];
addFoot(dock.x, dock.z, 0, 1.8, 1.8);
addFoot(hub.x, hub.z, 0, 2.2, 2.2);
addFoot(yard.x, yard.z, 0, 2.2, 2.2);
const heapBoard = label(3, 1.5);
heapBoard.sprite.position.set(toWorld(HEAP.x), VILLAGE.y + 3, HEAP.z);
scene.add(heapBoard.sprite);
const rackBoard = label(3, 1.5);
rackBoard.sprite.position.set(toWorld(RACK.x), VILLAGE.y + 4.6, RACK.z);
scene.add(rackBoard.sprite);
const forgeBoard = label(5.6, 2.8);
forgeBoard.sprite.position.set(toWorld(FORGE.x), VILLAGE.y + 9, FORGE.z + 4.6);
scene.add(forgeBoard.sprite);

// ---------------------------------------------------------------- local state, kept per room
const KEY = `boogle-place-v3:${getRoomId()}`; // a new key each round: an older save's shape can't break this one
const s = {
  awake: false,
  turned: false, // the machine has gone over to line 2
  wood: 0,
  stone: 0,
  people: TUNE.people,
  loose: 0, // logs out of an opened crate at the heap, not yet taken
  finds: [] as number[],
};
const stepsOf = (n: number) => (n >= TUNE.stepAt[1]! ? 2 : n >= TUNE.stepAt[0]! ? 1 : 0);
function save() {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        s,
        back: { logs: back.logs, rails: back.rails },
        forge: { crates: forge.crates, rails: forge.rails, made: forge.made },
        hub: hub.list,
        dock: dock.list,
        yard: yard.list,
        fellen: fellenList(),
        gifts: { got: giftState.got, order: giftState.order, crates: giftState.crates() },
        crystals: crystals.found,
        lines: lines.map((l) => ({
          stage: l.stage,
          open: l.open,
          pile: l.pile.list,
          have: l.stations.map((q) => q.have),
        })),
      }),
    );
  } catch {
    // private mode: a reload starts over
  }
}
let gifts0: { got: GiftId[]; order: GiftId[]; crates: { x: number; y: number; z: number }[] } = {
  got: [],
  order: [],
  crates: [],
};
let crystals0: number[] = [];
function restore() {
  try {
    const j = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!j) return;
    Object.assign(s, j.s);
    back.logs = j.back?.logs ?? 0;
    back.rails = j.back?.rails ?? 0;
    Object.assign(forge, j.forge ?? {});
    hub.list = j.hub ?? [];
    dock.list = j.dock ?? [];
    yard.list = j.yard ?? [];
    restoreFellen(j.fellen ?? []);
    gifts0 = {
      got: (j.gifts?.got ?? []) as GiftId[],
      order: (j.gifts?.order ?? []) as GiftId[],
      crates: j.gifts?.crates ?? [],
    };
    crystals0 = j.crystals ?? [];
    j.lines?.forEach(
      (q: { stage: number; open: boolean; pile: Kind[]; have: { logs: number; rails: number }[] }, k: number) => {
        const l = lines[k];
        if (!l) return;
        l.stage = q.stage;
        l.open = q.open;
        l.pile.list = q.pile ?? [];
        l.stations.forEach((st, n) => Object.assign(st.have, q.have?.[n] ?? {}));
      },
    );
  } catch {
    // an old shape: start fresh
  }
}

// ---------------------------------------------------------------- the machine's run
type Mode =
  'asleep' | 'waking' | 'idle' | 'feeding' | 'laying' | 'running' | 'waiting' | 'turning' | 'shunting' | 'done';
const run = {
  mode: 'asleep' as Mode,
  head: 0, // metres along the machine's line where pieces land
  line: L1,
  feedT: 0,
  feedLeft: 0, // pieces yet to leave the frame
  feedAir: 0,
  cradle: 0, // logs in it
  rack: TUNE.rackStart,
  cradle0: 0,
  rack0: 0,
  stretch0: 0,
  turnT: 0,
};
const headAtTurntable = () => -machine.GAP / 2 - machine.F; // on line 1's far side of s=0, the machine centred on the disc
const heading = { line1: 0, line2: 0 };
lineAt(L1.spec.line, 0, P);
heading.line1 = Math.atan2(-P.ux, -P.uz);
lineAt(L2.spec.line, 0, P);
heading.line2 = Math.atan2(P.ux, P.uz);

const scratch = new THREE.Vector3(),
  scratch2 = new THREE.Vector3(),
  bundleRot = new THREE.Quaternion();

function stationOf(l: LineRun) {
  return l.stations[l.stage] ?? null;
}
function beginFeed(l: LineRun, st: StationRun) {
  run.mode = 'feeding';
  run.line = l;
  run.feedT = 0;
  run.feedLeft = st.shown.logs + st.shown.rails;
  run.feedAir = 0;
  whistle(st.x, st.z);
}
function stepFeed(dt: number) {
  const l = run.line,
    st = stationOf(l);
  if (!st) return;
  run.feedT -= dt;
  while (run.feedLeft > 0 && run.feedT <= 0) {
    run.feedT += TUNE.feedS;
    run.feedLeft--;
    run.feedAir++;
    if (st.shown.logs > 0) {
      const n = st.shown.logs - 1;
      const from = st.logSlot(n, new THREE.Vector3());
      st.drawStock({ logs: n, rails: st.shown.rails });
      send('log', from, st.feederEnd, {
        dur: 0.55,
        apex: 0.15,
        size: [2.2, 2.2],
        aim: (to) => void machine.worldCradle(to),
        land: () => {
          run.feedAir--;
          run.cradle++;
          machine.setCradle(run.cradle);
          clank(st.x, st.z);
        },
      });
    } else {
      const n = st.shown.rails - 1;
      const from = st.railSlot(n, new THREE.Vector3());
      st.drawStock({ logs: 0, rails: n });
      send('rail', from, st.feederEnd, {
        dur: 0.6,
        apex: 0.5,
        aim: (to) => void machine.worldRack(to),
        land: () => {
          run.feedAir--;
          run.rack++;
          machine.setRack(run.rack);
          clank(st.x, st.z);
        },
      });
    }
  }
  if (run.feedLeft <= 0 && run.feedAir <= 0) {
    run.mode = 'laying';
    run.cradle0 = run.cradle;
    run.rack0 = run.rack;
    run.stretch0 = run.head;
    protoCount('stretches');
    mark(`lay ${st.spec.label}`);
    setStationTags();
  }
}
function stepLay(dt: number) {
  const l = run.line,
    st = stationOf(l)!;
  const { dir, line } = l.spec;
  const to = st.spec.to;
  const left = (to - run.head) * dir;
  const step = Math.min(left, TUNE.laySpeed * dt);
  run.head += dir * step;
  l.track.layTo(l.track.u(run.head));
  machine.at(line, run.head, dir);
  machine.moved(step);
  const span = (to - run.stretch0) * dir,
    done = span > 0 ? ((run.head - run.stretch0) * dir) / span : 1;
  const cradleNow = Math.ceil(run.cradle0 * (1 - done)),
    rackNow = l === L1 ? rackForLine1(run.head) : Math.ceil(run.rack0 * (1 - done));
  if (cradleNow !== run.cradle) machine.setCradle((run.cradle = cradleNow));
  if (rackNow !== run.rack) machine.setRack((run.rack = rackNow));
  if (left - step <= 0.001) finishStretch(l);
}
/** Line 1's rails come off the machine's own rack: it's empty when the line is done. */
const rackForLine1 = (head: number) => {
  const total = STUB.camp - STUB.village;
  return Math.ceil(TUNE.rackStart * Math.max(0, (head - STUB.village) / total));
};
// The machine hands a crate down beside where it stopped, on ground you can stand on, on the side you came from if it can.
function handCrate(l: LineRun, to: number, side: number) {
  const { line, dir } = l.spec;
  // Right by the next frame, on the side you'll come from: the beacon brings you here anyway and unloading your logs is
  // within Interact's reach of it, so there's no walking past it. (The frame's middle is 1.5 m along from its s, ./stations.ts.)
  const next = l.stations[l.stations.findIndex((st) => st.spec.to === to) + 1];
  if (next)
    for (const along of [-dir * 3.4, dir * 3.4]) {
      const at = next.spec.s - dir * 1.5 + along;
      const q = besideLine(line, at, next.spec.side * 5.4);
      // Solid ground all round: nobody should go over a rim for it.
      const ground = (x: number, z: number) => Math.abs(H(x, z) - next.y) <= 1;
      if (
        ![0, 3.5].every(
          (r) => ground(q.x + r, q.z) && ground(q.x - r, q.z) && ground(q.x, q.z + r) && ground(q.x, q.z - r),
        )
      )
        continue;
      scratch.set(machine.flatbed.x, machine.flatbed.y + 0.5, machine.flatbed.z);
      deliver(q.x, H(q.x, q.z), q.z, scratch);
      return;
    }
  const options: [number, number][] = [
    [7, side * 3.2],
    [3, side * 3.2],
    [-3, side * 3.2],
    [-6, side * 3.2],
    [7, -side * 3.6],
    [-6, -side * 3.6],
  ];
  for (const [back, lat] of options) {
    const at = to - dir * back;
    const q = besideLine(line, at, lat);
    if (Math.abs(H(q.x, q.z) - railY(line, at)) > 1.4) continue;
    scratch.set(machine.flatbed.x, machine.flatbed.y + 0.5, machine.flatbed.z);
    deliver(q.x, H(q.x, q.z), q.z, scratch);
    return;
  }
  const q = besideLine(line, to, side * 3.2);
  deliver(q.x, H(q.x, q.z), q.z, null);
}
function finishStretch(l: LineRun) {
  const st = stationOf(l)!;
  whistle(st.x, st.z);
  dustRing(st.x, st.y, st.z, 8, 2, 0.3);
  handCrate(l, st.spec.to, st.spec.side);
  cheerAround(st.x, st.z, 26, 3);
  l.stage++;
  mark(`laid ${st.spec.label}`);
  if (l.stage < l.stations.length) run.mode = 'idle';
  else {
    openLine(l);
    run.mode = l === L1 ? 'running' : 'done';
  }
  setStationTags();
  save();
}
function stepRunIn(dt: number) {
  const to = headAtTurntable();
  const step = Math.min(run.head - to, TUNE.runSpeed * dt);
  run.head -= step;
  machine.at(L1.spec.line, run.head, -1);
  machine.moved(step);
  if (run.head - to < 0.001) run.mode = 'waiting';
}
const eased = (u: number) => u * u * (3 - 2 * u);
function stepTurn(dt: number) {
  run.turnT += dt / TUNE.turnS;
  const u = Math.min(1, run.turnT);
  let d = heading.line2 - heading.line1;
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  const yaw = heading.line1 + d * eased(u);
  machine.turn(TX, TY, TZ, yaw);
  disc.rotation.y = yaw;
  if (u >= 1) {
    run.mode = 'shunting';
    run.line = L2;
    run.head = machine.GAP / 2 + machine.F;
    machine.at(L2.spec.line, run.head, 1);
    whistle(TX, TZ);
  }
}
function stepShunt(dt: number) {
  const to = STUB.east;
  const step = Math.min(to - run.head, TUNE.laySpeed * 0.6 * dt);
  run.head += step;
  machine.at(L2.spec.line, run.head, 1);
  machine.moved(step);
  if (to - run.head < 0.001) {
    run.mode = 'idle';
    setStationTags();
  }
}
machine.onStep = (dt) => {
  if (!ready) return;
  if (run.mode === 'laying') stepLay(dt);
  else if (run.mode === 'running') stepRunIn(dt);
  else if (run.mode === 'turning') stepTurn(dt);
  else if (run.mode === 'shunting') stepShunt(dt);
};

function setStationTags() {
  for (const l of lines)
    l.stations.forEach((st, n) => {
      const mine =
        l === run.line && run.mode !== 'asleep' && n === l.stage && (run.mode === 'idle' || run.mode === 'feeding');
      st.setTag(mine);
    });
}

function wake() {
  s.awake = true;
  run.mode = 'waking';
  protoMark('verb');
  mark('woke');
  wakeShow(
    machine,
    () => cheerAround(machine.flatbed.x, machine.flatbed.z, 34, 4),
    () => {
      run.mode = 'idle';
      machine.wake(true);
      setCamp(0, true);
      mark('awake');
      setStationTags();
      save();
    },
  );
  save();
}
/** The skips: awake now, with no show. */
function wakeNow() {
  clearMoments();
  s.awake = true;
  run.mode = 'idle';
  machine.wake(true);
  setCamp(0, true);
  mark('woke');
  setStationTags();
}

function openLine(l: LineRun) {
  l.open = true;
  l.madeAt = performance.now() + 2000;
  if (l === L1) l.train.start(true);
  else l.train.start(false, TUNE.dwell - 0.5);
  wakeCamp(l.k);
  s.people += 8;
  setRiders(l.k, true);
  if (l === L1) {
    // The one camera move in the run: out and up, over the village's shoulder, along everything you just built.
    firstLineShow({
      village: new THREE.Vector3(TX - 4, VILLAGE.y, TZ - 4),
      gorge: new THREE.Vector3(toWorld(-34), 24, -82),
      shot: new THREE.Vector3(toWorld(-142), 78, -116),
      shotTo: new THREE.Vector3(toWorld(-148), 84, -124),
      at: new THREE.Vector3(toWorld(-36), 16, -74),
    });
    pourOut(10);
  } else {
    const end = besideLine(l.spec.line, l.spec.line.len - 6, 0);
    nextLineShow(new THREE.Vector3(end.x, VILLAGE.y + 6, end.z), new THREE.Vector3(TX - 4, VILLAGE.y, TZ + 8));
    pourOut(6);
    setCamp(1, true);
    cheerAround(end.x, end.z, 40, 6);
  }
  protoCount('links');
  mark(`open ${l.spec.id}`);
}

// ---------------------------------------------------------------- delivering: your back into the frame
let unloadT = 0;
function unload(dt: number) {
  unloadT -= dt;
  if (unloadT > 0 || !me.body) return;
  const l = run.line,
    st = stationOf(l);
  if (!st || run.mode !== 'idle') return;
  const p = me.body.position;
  if (Math.hypot(p.x - st.x, p.z - st.z) > TUNE.reachStation) return;
  const kind =
    back.logs > 0 && st.wants('logs') > 0 ? 'logs' : back.rails > 0 && st.wants('rails') > 0 ? 'rails' : null;
  if (!kind) return;
  unloadT = TUNE.unloadS;
  st.coming[kind]++;
  if (kind === 'logs') {
    myBundleNext(Math.max(0, back.logs - 1), scratch, bundleRot);
    back.logs--;
    const to = st.logSlot(st.have.logs + st.coming.logs - 1, new THREE.Vector3());
    send('log', scratch, to, {
      dur: 0.32,
      apex: 0.9,
      size: [1, 2.2],
      land: () => landAtStation(l, st, 'logs'),
    });
  } else {
    scratch.set(p.x, p.y + 0.9, p.z);
    back.rails--;
    const to = st.railSlot(st.have.rails + st.coming.rails - 1, new THREE.Vector3());
    send('rail', scratch, to, {
      dur: 0.36,
      apex: 0.9,
      land: () => landAtStation(l, st, 'rails'),
    });
  }
}
function landAtStation(l: LineRun, st: StationRun, kind: 'logs' | 'rails') {
  st.coming[kind]--;
  st.have[kind]++;
  st.drawStock({ logs: st.have.logs, rails: st.have.rails });
  st.setTag(true);
  if (kind === 'logs') knock(0.7, 1);
  else clank(st.x, st.z);
  thump(st.x, st.z);
  dustRing(st.x, st.y + 0.4, st.z, 2, 0.8, 0.14);
  if (st.full() && run.mode === 'idle' && stationOf(l) === st) beginFeed(l, st);
  save();
}

// ---------------------------------------------------------------- the verbs
const log: [string, number][] = [];
const mark = (name: string) => void log.push([name, performance.now()]);
const atPrompt = new THREE.Vector3();
const prompts = new Map<string, THREE.Vector3>();
const promptAt = (id: string, x: number, y: number, z: number) => {
  let v = prompts.get(id);
  if (!v) prompts.set(id, (v = new THREE.Vector3()));
  return v.set(x, y, z);
};
const nearestSample = (x: number, z: number) => {
  let bd = Infinity,
    best: [number, number, number] = [SPAWN.x, SPAWN.z, VILLAGE.y];
  for (const path of PATH_SAMPLES)
    for (let n = 0; n < path.length; n += 2) {
      const q = path[n]!;
      const d = (q[0] + ORIGIN.x - x) ** 2 + (q[1] - z) ** 2;
      if (d < bd && q[2] > 1.6) {
        bd = d;
        best = q;
      }
    }
  return best;
};
function backUp() {
  const b = me.body;
  if (!b) return;
  const q = nearestSample(b.position.x, b.position.z);
  teleport(b, q[0] + ORIGIN.x, Math.max(H(q[0] + ORIGIN.x, q[1]), q[2] + 0.12) + PLAYER_R + 0.4, q[1]); // a bridge's samples are over water
  b.velocity.set(0, 0, 0);
  carry.x = carry.z = 0;
}
function takeRails(st: StationRun) {
  const want = Math.min(st.wants('rails') - back.rails - railsIncoming, back.room(), forge.rails);
  for (let k = 0; k < want; k++) {
    rackTop(forge.rails, scratch);
    takeRail();
    back.incoming++;
    railsIncoming++;
    send('rail', scratch, scratch, {
      dur: 0.3 + k * 0.05,
      apex: 1,
      aim: (to) => {
        if (me.body) to.set(me.body.position.x, me.body.position.y + 0.8, me.body.position.z);
      },
      land: () => {
        back.incoming--;
        railsIncoming--;
        back.rails++;
        clank(rackFrom.x, rackFrom.z);
      },
    });
  }
  if (want > 0) mark('took rails');
  save();
}
let railsIncoming = 0;
function takeTimber(st: StationRun) {
  const want = Math.min(st.wants('logs') - back.logs - logsIncoming, back.room());
  let sent = 0;
  for (let k = 0; k < want; k++) {
    if (s.loose <= 0) {
      if (!hub.list.length) break;
      topSlot(hub, scratch2);
      hub.list.pop();
      s.loose += TUNE.crateLogs;
      drawHeaps(allHeaps);
    } else topSlot(hub, scratch2);
    s.loose--;
    sent++;
    back.incoming++;
    logsIncoming++;
    send('log', scratch2, scratch2, {
      dur: 0.3 + k * 0.04,
      apex: 1,
      aim: (to) => {
        if (myBundleNext(back.logs, scratch, bundleRot)) to.copy(scratch);
      },
      land: () => {
        back.incoming--;
        logsIncoming--;
        back.logs++;
        pop(k, 0.45);
      },
    });
  }
  if (sent) {
    knock(0.6, 0.8);
    save();
  }
}
let logsIncoming = 0;
const hasTimber = () => hub.list.length > 0 || s.loose > 0;
const sitAt = new THREE.Vector3();
registerInteractable(() => {
  if (!me.body) return NO_TARGETS;
  const p = me.body.interpolatedPosition;
  let out: Interactable[] | null = null;
  // Sitting, the one thing the button does is stand you up.
  if (seated()) {
    sitAt.set(p.x, p.y + 1.1, p.z);
    return [{ id: 'place-stand', verb: 'Stand up', at: sitAt, r: 100, run: standUp }];
  }
  if (me.swimming) {
    atPrompt.set(p.x, p.y + 1.2, p.z);
    return [{ id: 'place-back', verb: 'Back up the path', at: atPrompt, run: backUp }];
  }
  const crate = nearestCrate(p.x, p.z, 3.4);
  if (crate && !showing())
    (out ??= []).push({
      id: 'place-crate',
      verb: 'Open the crate',
      at: crate.at,
      run: () => {
        openCrate(crate.c);
        protoCount('gifts');
      },
    });
  if (run.mode === 'asleep' && machine.distance(p.x, p.z) < 6)
    (out ??= []).push({
      id: 'place-wake',
      verb: 'Wake the track layer',
      at: promptAt('wake', machine.flatbed.x, machine.flatbed.y + 2.4, machine.flatbed.z),
      run: wake,
    });
  if (s.awake)
    for (const t of TREES) {
      if (!standing(t)) continue;
      if (Math.hypot(p.x - t.x, p.z - t.z) > 3.2) continue;
      const room = back.room();
      (out ??= []).push(
        room <= 0
          ? { id: `place-tree${t.index}`, verb: 'Chop', at: t.at, blocked: 'Full' }
          : { id: `place-tree${t.index}`, verb: 'Chop', at: t.at, run: () => void chopTree(t) },
      );
    }
  if (s.turned) {
    const st = stationOf(L2);
    if (Math.hypot(p.x - rackFrom.x, p.z - rackFrom.z) < 4)
      (out ??= []).push(
        !st || st.wants('rails') - back.rails - railsIncoming <= 0
          ? { id: 'place-rack', verb: 'Take rails', at: rackFrom, blocked: 'Station has enough' }
          : back.room() <= 0
            ? { id: 'place-rack', verb: 'Take rails', at: rackFrom, blocked: 'Full' }
            : forge.rails <= 0
              ? { id: 'place-rack', verb: 'Take rails', at: rackFrom, blocked: 'Forge is pouring' }
              : { id: 'place-rack', verb: 'Take rails', at: rackFrom, run: () => takeRails(st) },
      );
    if (Math.hypot(p.x - hub.x, p.z - hub.z) < 4.2) {
      const at = promptAt('heap', hub.x, VILLAGE.y + 2, hub.z);
      (out ??= []).push(
        !st || st.wants('logs') - back.logs - logsIncoming <= 0
          ? { id: 'place-heap', verb: 'Take timber', at, blocked: 'Station has enough' }
          : back.room() <= 0
            ? { id: 'place-heap', verb: 'Take timber', at, blocked: 'Full' }
            : !hasTimber()
              ? { id: 'place-heap', verb: 'Take timber', at, blocked: 'The train is bringing more' }
              : { id: 'place-heap', verb: 'Take timber', at, run: () => takeTimber(st) },
      );
    }
  }
  // On a deck, with nothing else to press for: sit. Far down the pick's order (r), so anything nearer that acts wins.
  if (onDeck() && !out?.some((t) => t.run)) {
    sitAt.set(p.x, p.y + 1.1, p.z);
    (out ??= []).push({ id: 'place-sit', verb: 'Sit', at: sitAt, r: -100, run: sitDown });
  }
  return out ?? NO_TARGETS;
});
const onDeck = () => machine.onMachine(carry.on) || lines.some((l) => l.train.onTrain(carry.on));
function chopTree(t: Tree) {
  if (!chop(t)) return;
  if (t.strokes === 0) protoCount('chops');
}

// ---------------------------------------------------------------- crates
const scr = new THREE.Vector3();
function make(l: LineRun, now: number) {
  if (!l.open || now < l.madeAt || l.pile.list.length >= TUNE.pileMax) return;
  l.madeAt = now + TUNE.pileEvery * 1000;
  const kind = l.spec.kind as Kind;
  scr.set(l.pile.x, (l.pile.y ?? 0) + 3, l.pile.z);
  const to = nextSlot(l.pile, new THREE.Vector3());
  hopTo(kind, scr, to, 0, () => {
    l.pile.list.push(kind);
    drawHeaps(allHeaps);
    save();
  });
}
function arrive(l: LineRun, stop: number) {
  const { tr } = l.train;
  if (stop === 0) {
    whistle(tr.cars[0]!.x, tr.cars[0]!.z);
    if (giftState.got.includes('bell')) after(0.2, () => clank(tr.cars[0]!.x, tr.cars[0]!.z));
    cheerAround(platformAt.x, platformAt.z, 16, 2.5);
    const onto = l === L1 ? dock : yard;
    let n = 0;
    tr.load.held.forEach((c, k) => {
      if (!c) return;
      const kind = c.kind;
      const to = nextSlot(onto, new THREE.Vector3());
      // Reserves its slot by landing in order: the heap draws what's landed.
      to.y += 0;
      const delay = 0.4 + n++ * 0.22;
      hopOff(tr.load, k, to, delay, () => {
        onto.list.push(kind);
        thump(to.x, to.z);
        knock(0.5, 0.65);
        dustRing(to.x, to.y - 0.3, to.z, 6, 1.8, 0.3);
        if (onto === yard) {
          s.stone++;
          s.people++;
        }
        drawHeaps(allHeaps);
        save();
      });
    });
  } else {
    let n = 0;
    while (l.pile.list.length && deckFree(tr.load) >= 0) {
      const from = topSlot(l.pile, new THREE.Vector3());
      hopOn(tr.load, l.pile.list.pop()!, from, 0.4 + n++ * 0.14);
    }
    if (n) {
      drawHeaps(allHeaps);
      save();
    }
  }
}
function feedCrane() {
  if (craneBusy() || !dock.list.length) return;
  const from = topSlot(dock, new THREE.Vector3());
  const wantForge = forge.crates < TUNE.forgeCost;
  dock.list.pop();
  drawHeaps(allHeaps);
  if (wantForge)
    craneLift(from, nextDrop(new THREE.Vector3()), () => {
      crateIn();
      s.people++;
      save();
    });
  else
    craneLift(from, nextSlot(hub, new THREE.Vector3()), () => {
      hub.list.push('wood');
      if (hub.list.length > 60) hub.list.splice(0, hub.list.length - 60);
      s.wood++;
      s.people++;
      drawHeaps(allHeaps);
      thump(hub.x, hub.z);
      save();
    });
}

// ---------------------------------------------------------------- small finds on the way
const FIND_SPOTS = PATH_SAMPLES.flatMap((path, n) =>
  [0.2, 0.47, 0.82].map((f, k) => {
    const q = path[Math.floor(path.length * f)]!,
      side = k % 2 ? 4.5 : -4.5;
    const x = toWorld(q[0] + side),
      z = q[1] + (k % 2 ? 1 : -1);
    return { id: n * 10 + k, x, z, y: H(x, z) + 1 };
  }),
);
const findGeo = new THREE.OctahedronGeometry(0.42);
const findMat = new THREE.MeshStandardNodeMaterial({
  color: '#ffcf33',
  roughness: 0.35,
  metalness: 0.4,
  emissive: '#7a5a08',
});
const findMeshes = FIND_SPOTS.map((f) => {
  const m = new THREE.Mesh(findGeo, findMat);
  m.position.set(f.x, f.y, f.z);
  m.castShadow = true;
  scene.add(m);
  return m;
});
const sparkle = new THREE.Color('#ffe08a');
function updateFinds(dt: number) {
  const b = me.body;
  FIND_SPOTS.forEach((f, k) => {
    const m = findMeshes[k]!;
    if (s.finds.includes(f.id)) return void (m.visible = false);
    m.visible = true;
    m.rotation.y += dt * 2;
    if (!b || Math.hypot(b.position.x - f.x, b.position.z - f.z) > 2.2) return;
    if (Math.abs(b.position.y - f.y) > 3) return;
    s.finds.push(f.id);
    pop(5, 0.6);
    protoCount('finds');
    for (let n = 0; n < 14; n++) {
      const a = (n / 14) * Math.PI * 2;
      emit({
        x: f.x,
        y: f.y,
        z: f.z,
        vx: Math.cos(a) * 3.2,
        vy: 3 + (n % 3),
        vz: Math.sin(a) * 3.2,
        life: 0.8,
        size: 0.3,
        color: sparkle,
        gravity: 7,
        shrink: 0.4,
      });
    }
    save();
  });
}
// A few places to stop at, greybox: a lookout over the gorge, an old cart, a rock arch the path goes through.
function buildStops() {
  const rock = '#9a9184',
    wood = '#7f5630';
  const row = (x: number, z: number, w: number, h: number, d: number, color: string, y = 0, yaw = 0) => ({
    kind: 'stop',
    x: toWorld(x),
    z,
    y,
    w,
    h,
    d,
    yaw,
    color,
  });
  const rows = [
    // an arch on the commons, north path
    row(-146.5, -70, 3, 6.5, 3.4, rock),
    row(-137.5, -70, 3, 7.2, 3.4, rock),
    row(-142, -70, 13, 2.2, 4, rock, 6.5, 0.05),
    // a lookout on the rim
    row(-104, -122, 5, 0.3, 2.2, wood, 0.6),
    row(-106, -122, 0.3, 0.6, 2, wood),
    row(-102, -122, 0.3, 0.6, 2, wood),
    row(-110, -128, 0.25, 6, 0.25, wood),
    row(-109.1, -128, 1.6, 0.9, 0.08, '#f0752c', 5),
    // an old cart at the bank, south path
    row(-68, 150, 2.4, 1, 4, wood, 0.5, 0.5),
    row(-69.5, 148, 0.3, 1.2, 1.2, '#3a302c'),
    row(-66.5, 152, 0.3, 1.2, 1.2, '#3a302c'),
    // an arch at the far shoulder, east path
    row(16, 156, 3, 6, 3.2, rock),
    row(25, 164, 3, 7, 3.2, rock),
    row(20.5, 160, 13.5, 2.2, 3.8, rock, 6.2, -0.72),
  ];
  const part = staticPart(rows);
  draw(part, () => 1);
  // What looks solid is solid, all of it: the arches' legs (the path threads them) and what's on them, the lookout, the cart.
  for (const r of rows) {
    const q = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, r.yaw);
    addStatic(
      { kind: 'box', hx: r.w / 2, hy: r.h / 2, hz: r.d / 2 },
      { x: r.x, y: H(r.x, r.z) + r.y + r.h / 2, z: r.z },
      q,
    );
    addFoot(r.x, r.z, r.yaw, r.w / 2 + 0.2, r.d / 2 + 0.2);
  }
}
buildStops();

// ---------------------------------------------------------------- the objective: one line, and a beacon over it
const nearestTree = () => {
  const b = me.body;
  if (!b) return null;
  let best: Tree | null = null,
    bd = Infinity;
  for (const t of TREES) {
    if (!standing(t)) continue;
    const d = Math.hypot(b.position.x - t.x, b.position.z - t.z);
    if (d < bd) {
      bd = d;
      best = t;
    }
  }
  return best;
};
function objective(now: number) {
  const b = me.body;
  const beam = (x: number, y: number, z: number) => setBeacon({ x, y, z }, now);
  if (run.mode === 'waking') {
    setBeacon(null, now);
    return 'The boiler is catching...';
  }
  if (run.mode === 'asleep') {
    beam(machine.flatbed.x, machine.flatbed.y + 2, machine.flatbed.z);
    return b && machine.distance(b.position.x, b.position.z) < 25
      ? 'Wake the track layer.'
      : 'Follow the path across the gorge. Wake the track layer at the timber camp.';
  }
  const carried = back.logs + back.rails + back.incoming;
  if (run.mode === 'feeding') {
    setBeacon(null, now);
    return 'The machine is taking your logs.';
  }
  if (run.mode === 'laying') {
    setBeacon(null, now);
    return 'Laying track. Ride the machine, or walk on the fresh track.';
  }
  if (run.mode === 'running') {
    setBeacon(null, now);
    return 'The line is through! The first train is on its way.';
  }
  if (run.mode === 'turning' || run.mode === 'shunting') {
    setBeacon(rackFrom, now);
    return 'The forge is lit. The track layer turns for line 2.';
  }
  if (run.mode === 'waiting') {
    if (b && Math.hypot(b.position.x - TX, b.position.z - TZ) > 90)
      return 'Ride the train home. Its cargo is building the forge.';
    beam(toWorld(FORGE.x), VILLAGE.y + 8, FORGE.z);
    return `Hop on the train and ride your line. Its timber builds the forge: ${forge.crates}/${TUNE.forgeCost}.`;
  }
  if (run.mode === 'done') {
    setBeacon(null, now);
    return L2.open && s.stone > 0
      ? 'Stone is reaching the village. And what is that, far across the sea?'
      : 'Line 2 is through! Ride the first stone home. Then look across the sea.';
  }
  // Idle at a station: what's next depends on what it wants and what you carry.
  const st = stationOf(run.line);
  if (!st) return '';
  const name = st.spec.label;
  const counts =
    st.spec.logs && st.spec.rails
      ? `rails ${st.have.rails}/${st.spec.rails}, logs ${st.have.logs}/${st.spec.logs}`
      : `${st.have.logs}/${st.spec.logs}`;
  if (run.line === L1) {
    const stillNeeds = st.wants('logs') - carried;
    if (stillNeeds > 0 && back.room() > 0) {
      const t = nearestTree();
      if (t) beam(t.x, t.y + 9, t.z);
      return carried
        ? `Chop more, or carry what you have to ${name}: ${counts}.`
        : `Chop trees for timber. ${name} needs logs: ${counts}.`;
    }
    beam(st.x, st.y + 2, st.z);
    if (run.line.stage === 2) return `Carry your logs over the trestle to ${name}: ${counts}.`;
    return `Carry your logs to ${name}: ${counts}.`;
  }
  // Line 2: rails from the rack, timber from the heap.
  const needR = st.wants('rails') - back.rails - railsIncoming,
    needL = st.wants('logs') - back.logs - logsIncoming;
  if (b && Math.hypot(b.position.x - TX, b.position.z - TZ) > 120 && back.rails + back.logs === 0) {
    beam(rackFrom.x, rackFrom.y + 1, rackFrom.z);
    return 'Rails are ready at home. Ride the train home.';
  }
  if (back.room() > 0 && needR > 0) {
    beam(rackFrom.x, rackFrom.y + 1, rackFrom.z);
    return `Take rails from the forge rack for ${name}: ${counts}.`;
  }
  if (back.room() > 0 && needL > 0) {
    beam(hub.x, VILLAGE.y + 3, hub.z);
    return hasTimber()
      ? `Take timber from the heap for ${name}: ${counts}.`
      : `The train brings timber to the heap. ${name} needs: ${counts}.`;
  }
  beam(st.x, st.y + 2, st.z);
  return `Carry it out to ${name}: ${counts}.`;
}

// ---------------------------------------------------------------- start over and the frame
function placeMachine() {
  const l = !s.turned ? L1 : L2;
  run.line = l;
  if (l === L1 && L1.open) {
    run.head = headAtTurntable();
    machine.at(L1.spec.line, run.head, -1);
    run.mode = 'waiting';
  } else {
    const st = stationOf(l);
    run.head = st ? st.spec.s : l.spec.line.len - 1;
    machine.at(l.spec.line, run.head, l.spec.dir);
    if (!s.awake) run.mode = 'asleep';
    else run.mode = st ? 'idle' : 'done';
  }
  machine.snap();
  machine.wake(s.awake);
  disc.rotation.y = s.turned ? heading.line2 : heading.line1;
  run.cradle = 0;
  machine.setCradle(0);
  run.rack = l === L1 && !L1.open ? rackForLine1(run.head) : 0;
  machine.setRack(run.rack);
  for (const q of lines) {
    const end = q.stations[q.stage];
    const head = end ? end.spec.s : q.spec.dir > 0 ? q.spec.line.len : STUB.village;
    q.track.snapTo(q.track.u(head));
    q.stations.forEach((st, n) => st.drawStock(n === q.stage ? st.have : { logs: 0, rails: 0 }));
  }
  setStationTags();
  if (run.mode === 'idle') {
    const st = stationOf(l);
    if (st?.full()) beginFeed(l, st);
  }
}
function snapLines() {
  for (const l of lines) {
    snapCamp(l.k, l.open);
    if (l.open) l.train.resume(cycleOf(l.spec.line) / 2);
    else if (l === L1) l.train.park();
    else l.train.hide();
    clearCrates(l.train.tr.load);
    l.train.tr.lastStop = -1;
  }
}
function fillPiles() {
  L1.pile.list = Array.from({ length: TUNE.deckCrates + 2 }, () => 'wood');
  L2.pile.list = Array.from({ length: TUNE.deckCrates + 2 }, () => 'stone');
}
function startOver() {
  for (const l of lines) {
    l.stage = 0;
    l.open = false;
    l.madeAt = 0;
    for (const st of l.stations) {
      st.have.logs = st.have.rails = 0;
      st.coming.logs = st.coming.rails = 0;
    }
  }
  fillPiles();
  clearMoments();
  clearDrops();
  resetFolk();
  s.awake = s.turned = false;
  s.wood = s.stone = 0;
  s.people = TUNE.people;
  s.loose = 0;
  s.finds = [];
  back.logs = back.rails = back.incoming = 0;
  railsIncoming = logsIncoming = 0;
  hub.list = [];
  dock.list = [];
  yard.list = [];
  clearTrips();
  craneClear();
  resetTrees();
  felled.n = 0;
  resetForge();
  run.mode = 'asleep';
  snapLines();
  placeMachine();
  drawHeaps(allHeaps);
  snapTown(0, 0);
  folkState();
  snapGifts([], [], []);
  snapCrystals([]);
  log.length = 0;
  atSpawn();
  save();
}
onApplied((e: { op: string }) => e.op === 'tune.reset' && startOver());
onGiftSaved(save);
// A step-up: a crate off the heap sails over to the first new plot, so you can see which cargo built what.
onStepUp.fn = (kind, first) => {
  const from = topSlot(kind === 'wood' ? hub : yard, new THREE.Vector3());
  const to = new THREE.Vector3(first.plan.x, first.plan.y + 1, first.plan.z);
  hopTo(kind, from, to, 0, () => {
    thump(to.x, to.z);
    dustRing(to.x, to.y - 0.4, to.z, 10, 3, 0.5);
  });
};
onCrystal((n) => {
  save();
  if (n === 1) showBanner('A crystal', 'It went to the shelf at the station. No idea what it does.', 2.6);
});
function atSpawn() {
  const b = me.body;
  if (!b) return;
  teleport(b, toWorld(SPAWN.x), H(toWorld(SPAWN.x), SPAWN.z) + PLAYER_R + 0.4, SPAWN.z);
  b.velocity.set(0, 0, 0);
  cam.yaw = me.yaw = SPAWN.yaw;
  cam.pitch = -0.14;
}

let ready = false,
  placed = false,
  wasRiding = false;
const smokeCol = new THREE.Color('#f2efe8');
let smokeAcc = 0,
  lastWas = '';
onFrame(
  ({ dt, now }) => {
    const b = me.body;
    if (b && !placed) {
      placed = true;
      // Above a falling deck at train speed, the player body's CCD stops whole steps (src/proto/crossing/index.ts).
      setCcd(b, false);
      atSpawn();
    }
    // A spawn or a teleport lands by the old island's ground height, and that's under this land: lift it onto the top.
    if (b && insidePlace(b.position.x, b.position.z)) {
      const h = H(b.position.x, b.position.z);
      if (b.position.y < h - 0.8) {
        teleport(b, b.position.x, h + PLAYER_R + 0.3, b.position.z);
        b.velocity.set(0, 0, 0);
      }
    }
    if (!ready) {
      if (!worldStatus().ready || world.tick <= 0) return;
      ready = true;
      fillPiles();
      restore();
      snapLines();
      placeMachine();
      snapForge();
      drawHeaps(allHeaps);
      snapTown(stepsOf(s.wood), stepsOf(s.stone));
      folkState();
      snapGifts(gifts0.got, gifts0.order, gifts0.crates);
      snapCrystals(crystals0);
      if (s.awake) setCamp(0, true);
    }
    if (run.mode === 'feeding') stepFeed(dt);
    if (run.mode === 'waiting' && forge.lit) {
      // The forge can light while line 1 is the machine's: that's when it turns for line 2.
      s.turned = true;
      run.mode = 'turning';
      run.turnT = 0;
      whistle(TX, TZ);
    }
    unload(dt);
    for (const l of lines) {
      l.track.update(dt);
      make(l, now);
      const { tr } = l.train;
      if (tr.stop !== tr.lastStop) {
        if (tr.stop >= 0 && (l.open || (l === L1 && tr.stop === 1))) arrive(l, tr.stop);
        tr.lastStop = tr.stop;
      }
    }
    feedCrane();
    updateForge(dt, () => {
      mark('forge lit');
      protoCount('forge');
      fanfare(true);
      showBanner('The forge is lit', 'Your timber built that. Rails are pouring.');
      save();
    });
    updatePieces(dt);
    updateMoments(dt);
    updateGifts(dt, now);
    updateCrystals(dt, now);
    setPopulation(s.people);
    updateFolk(dt);
    if (b) {
      const bumped = nearestCrate(b.position.x, b.position.z, 1.25);
      if (bumped && !showing()) {
        openCrate(bumped.c);
        protoCount('gifts');
      }
    }
    updateChop(dt, now);
    updateCrates(dt);
    updateTown(stepsOf(s.wood), stepsOf(s.stone), dt);
    updateFinds(dt);
    // The two smoke columns: tall, slow and white, the first thing you read across the gorge.
    smokeAcc += dt * 3;
    for (; smokeAcc >= 1; smokeAcc--)
      for (const l of lines) {
        const c = l.smoke;
        emit({
          x: c.x + (Math.random() - 0.5),
          y: c.y,
          z: c.z + (Math.random() - 0.5),
          vx: 0.5 + Math.random() * 0.5,
          vy: 6 + Math.random() * 1.6,
          vz: (Math.random() - 0.5) * 0.6,
          life: 11,
          size: 3.4,
          grow: [1, 3.6],
          alpha: 0.8,
          fade: 0.55,
          color: smokeCol,
          drag: 0.02,
        });
      }
    // What's on screen.
    setObjective(objective(now));
    setNumbers(L1.open ? TUNE.deckCrates : null, s.people);
    forgeBoard.set(
      forge.lit ? 'Forge lit' : `Forge: timber ${forge.crates}/${TUNE.forgeCost}`,
      forge.lit ? `${forge.made} rails poured` : forgePhase(),
    );
    forgeBoard.sprite.visible = true;
    heapBoard.sprite.visible = s.turned || hub.list.length > 0;
    heapBoard.set('Timber', `${hub.list.length} crates`);
    rackBoard.sprite.visible = forge.lit;
    rackBoard.set('Rails', `${forge.rails} on the rack`);
    // What the owner does.
    const was = run.mode;
    if (was !== lastWas) {
      lastWas = was;
      if (was === 'turning') mark('turning');
    }
    const riding_ = lines.some((l) => l.train.onTrain(carry.on));
    if (riding_ && !wasRiding) {
      protoCount('rides');
      mark('ride');
    }
    if (!riding_ && wasRiding) mark('off');
    wasRiding = riding_;
  },
  { phase: 'update', order: 10 },
);

// ---------------------------------------------------------------- the panel
const box = document.createElement('div');
box.className = 'place-proto';
const btn = (text: string, fn: () => void) => {
  const e = document.createElement('button');
  e.type = 'button';
  e.textContent = text;
  e.addEventListener('click', fn);
  box.append(e);
};
btn('Start over', () => {
  if (!submitEdit({ op: 'tune.reset', i: 0, j: 0 })) startOver();
});
const hop = (x: number, z: number, yaw: number) => {
  const b = me.body;
  if (!b) return;
  teleport(b, x, H(x, z) + PLAYER_R + 0.4, z);
  b.velocity.set(0, 0, 0);
  carry.x = carry.z = 0;
  cam.yaw = me.yaw = yaw;
};
function skipWalk() {
  if (run.mode === 'asleep') {
    lineAt(L1.spec.line, run.head + 2, P);
    return hop(machine.flatbed.x - P.uz * -3.4, machine.flatbed.z + P.ux * -3.4, 0);
  }
  const st = stationOf(run.line);
  if (st) hop(st.x, st.z, 0);
}
/** The chop and the carry: the current station has what it needs, and the machine starts. */
function skipDelivery() {
  if (run.mode === 'asleep' || run.mode === 'waking') wakeNow();
  if (run.mode !== 'idle') return;
  const st = stationOf(run.line);
  if (!st) return;
  st.have.logs = st.spec.logs;
  st.have.rails = st.spec.rails;
  st.coming.logs = st.coming.rails = 0;
  st.drawStock(st.have);
  st.setTag(true);
  beginFeed(run.line, st);
  save();
}
/** Line 1 finished, the train running and the forge waiting on its timber. */
function skipForge() {
  if (L1.open) return hop(toWorld(-68), 2, -2.3);
  clearMoments();
  L1.stage = L1.stations.length;
  L1.open = true;
  s.awake = true;
  s.people += 8;
  snapCamp(0, true);
  folkState();
  L1.madeAt = performance.now();
  L1.train.start(true);
  L1.track.snapTo(L1.track.u(STUB.village));
  L1.stations.forEach((st) => st.drawStock({ logs: 0, rails: 0 }));
  run.line = L1;
  placeMachine();
  hop(toWorld(-68), 2, -2.3);
  save();
}
/** The forge lit, its rack full, a heap of timber: line 2's first station is next. */
function skipLine2() {
  if (!L1.open) skipForge();
  forge.crates = TUNE.forgeCost;
  forge.rails = forge.made = TUNE.rackMax;
  snapForge();
  s.turned = true;
  hub.list = Array.from({ length: 12 }, () => 'wood');
  s.wood = 12;
  run.line = L2;
  placeMachine();
  drawHeaps(allHeaps);
  hop(toWorld(RACK.x + 1), RACK.z + 3.4, 0.2);
  save();
}
btn('Skip the walk', skipWalk);
btn('Skip chop and carry', skipDelivery);
btn('Skip to the forge', skipForge);
btn('Skip to line 2', skipLine2);
(document.querySelector('.hud') ?? document.body).append(box);
playPanel('place', box);

// For the look evals (dev/look/evals/place.ts).
window.__place = {
  lines,
  machine,
  run,
  s,
  back,
  forge,
  hub,
  dock,
  yard,
  log,
  TREES,
  TUNE,
  CRANE,
  PATH_SAMPLES,
  ORIGIN,
  H,
  rideSeconds: runSeconds,
  cycleOf,
  skipWalk,
  skipDelivery,
  skipForge,
  skipLine2,
  startOver,
  wake,
  backUp,
  seat: { seated, sitDown, standUp },
  giftState,
  openCrate,
  nearestCrate,
  crystals,
  crystalAt,
  CRYSTALS,
  folk,
  pullOn,
  openLine: () => openLine(L1),
  /** The first n gifts in their order, with no show. */
  give: (n: number) => {
    const all: GiftId[] = ['hat', 'flag', 'critter', 'cap', 'bunting', 'bell', 'lantern', 'scarf'];
    snapGifts(all.slice(0, n), all, []);
  },
  setForge: (n: number) => {
    forge.crates = n;
    snapForge();
  },
  snapCrystals,
  RACK: { x: toWorld(RACK.x), z: RACK.z },
  SHELF: { x: toWorld(SHELF.x), z: SHELF.z, yaw: SHELF.yaw },
  handCrate: () => handCrate(run.line, stationOf(run.line)?.spec.to ?? run.head, stationOf(run.line)?.spec.side ?? 1),
};
