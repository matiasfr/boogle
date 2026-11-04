// A real place, fourth round (docs/plans/round-4.md; loaded by src/features/proto-place.ts behind ?proto=place). A slice of
// Threefold Reach with the crossing's sea. You walk the long way round to a stranded track layer, wake it, and chop and carry
// its bills by hand until the first path opens across the gorge, with no train: walking it is the reward. Then the ladder, each
// rung answering what you were already wishing for: a proper axe, a pack frame, a cart of logs to a rack by the frame. Line 2
// runs out over the sea to Far Head, far enough that walking home for rails gets slow, and then trains, as their own unlock.
// Gut question: did you get hungry for a better way, and did finding one feel great?
// Serves DESIGN.md 1 (Toys before chores), 7 (Telegraph everything) and 9 (Leave something for the next visitor).
//
// How it's cut up, for whoever comes next:
//   ./job.ts      what's kept: `job` (shared state) and slices; saving and the co-op snapshot both read them
//   ./score.ts    money, a comic score: earn, spend, money, onMoney
//   ./layout.ts   the map and every number; ./terrain.ts the land as numbers (no three.js), ./land.ts drawn
//   ./lines.ts    what stands on the lines; ./run.ts the machine and the order of the job; ./ladder.ts the rungs; ./depot.ts the
//                 cart and rack; ./cargo.ts trains, ./halts.ts their stations; ./verbs.ts the Interact button; ./objective.ts the
//                 internal playdata labels; ./panel.ts the tester's panel and `window.__place`; ./coop.ts `&coop=1`
//   ./tech.ts     ancient technology: devices, gates, rings, secrets; ./tech-layout.ts its numbers; ./moves.ts the moves; ./moves-view.ts their look
//   ./town-life.ts the town you can go into: ./rooms.ts, ./house.ts, ./shop.ts, ./museum.ts, ./residents.ts; every word in ./town-lines.ts
//
// Sync: Local, all of it, kept in localStorage per room. With `&coop=1`, ./coop.ts shares the railway between the tabs in the room.
import './place.css';
import './ambience.ts';
import * as THREE from 'three/webgpu';
import { onFrame } from '../../loop.ts';
import { worldStatus, world } from '../../world/sync.ts';
import { FOG_FAR, PLAYER_R } from '../../constants.ts';
import { me, cam, camConstraints } from '../../player/player.ts';
import { describeControl, hideControls } from '../../player/controls.ts';
import { freshStart } from '../../player/arrival.ts';
import { fallArrival } from '../../fall/arrival.ts';
import { interactTarget } from '../../player/hands.ts';
import { haulHooks } from '../../player/haul-variant.ts';
import { setCcd, sweepSphere, teleport } from '../../physics/engine.ts';
import { GROUP } from '../../physics/physics.ts';
import { softWall } from '../../entities/player/state.ts';
import { carry } from '../../physics/platforms.ts';
import { scene } from '../../render/scene.ts';
import { emit } from '../../render/particles.ts';
import { dressSea } from '../crossing/sea.ts';
import { extendSky } from '../crossing/sky.ts';
import { fanfare } from '../minis/common.ts';
import { drawHeaps, hopTo, topSlot, updateCrates, type Kind } from '../net/crates.ts';
import { protoCount } from '../count.ts';
import { pageQuery } from '../flags.ts';
import { playObjective, playWhere } from '../mark.ts';
import { H, buildLand, insidePlace } from './land.ts';
import { registerPlaceShore } from './water.ts';
import { clearMoments, showBanner, updateMoments } from './celebrate.ts';
import { snapCrystals, updateCrystals, onCrystal, crystals } from './crystals.ts';
import { resetFolk, setFolkEnv, setPopulation, setRiders, updateFolk } from './folk.ts';
import { resetForge, forge, updateForge, craneClear } from './forge.ts';
import { LOOK, installLight } from './look.ts';
import { installContact } from './look-kit.ts';
import { clearDrops, feet, outOf } from './sites.ts';
import { rooms, worldToRoom } from './rooms.ts';
import {
  FORGE_BILLS,
  GOODS,
  HEAD,
  LINKS,
  ORIGIN,
  SPAWN,
  TUNE,
  VILLAGE,
  lineAt,
  railY,
  toWorld,
  type LinePoint,
} from './layout.ts';
import { clearTrips, updatePieces, dustRing } from './pieces.ts';
import { besideLine } from './rail.ts';
import { TREES, back, resetRocks, resetTrees, updateChop, felled } from './chop.ts';
import { coop, coopWire } from './coop.ts';
import { rungFromPeer } from './ladder.ts';
import { job, resetJob, restore, save, personalSlice, num, forgetSaves } from './job.ts';
import { L1, L2, allHeaps, dock, forgeFrame, hub, lines, machine, solidHeaps, stepsOf, yard } from './lines.ts';
import { buildHalt } from './halts.ts';
import { cartFolk } from './depot.ts';
import { resetCargo, snapTrains, updateCargo, wakeTrains } from './cargo.ts';
import { showing, nearestCrate, openCrate, snapGifts, updateGifts, onGiftSaved } from './gifts.ts';
import { updateGot } from './got.ts';
import { resetDrops, updateDrop } from './drop.ts';
import './flag.ts';
import { updateLamps } from './lamps.ts';
import './pair.ts';
import './great-carry.ts';
import {
  activeFrame,
  beginFeed,
  finishStretch,
  forgeBillFromPeer,
  landAtStation,
  log,
  mark,
  placeMachine,
  putMachine,
  run,
  setStationTags,
  snapRun,
  startStepping,
  stationOf,
  updateRun,
  wake,
} from './run.ts';
import { clearFinds, updateBoiler, updateBuoys, updateFinds } from './props.ts';
import { backUp, incoming } from './verbs.ts';
import { objective } from './objective.ts';
import { buildPanel } from './panel.ts';
import { buildSigns, setNumbers } from './signs.ts';
import { onStepUp, snapTown, updateTown } from './town.ts';
import { buildTech, resetFinds, techApi, updateTech } from './tech.ts';
import { resetTownLife, updateTownLife } from './town-life.ts';

// The controls guide lists only what this place uses.
hideControls(['respawn', 'use', 'toss', 'guest-crouch', 'guest-punch']);
describeControl('place-chop', {
  label: 'Chop',
  context: 'Chop',
  keys: ['KeyE', 'Mouse0'],
  pad: ['x', 'rt'],
  touch: 'Chop',
  group: 'hands',
  order: 2,
});
// A clean view for someone playing it cold (the tester's link, `&fresh=1`): place.css hides the panel.
if (pageQuery().get('fresh') === '1') {
  document.body.classList.add('place-fresh');
}
freshStart.warning = coop.on
  ? "Are you sure? You'll lose your own progress and fall in as someone new in this room. If partners are here, you'll rejoin their railway; otherwise the railway starts fresh too."
  : "Are you sure? You'll lose your own progress and railway, and fall in as someone new.";
freshStart.prepare = () => {
  forgetSaves();
  // Rejoin as a newcomer: an existing partner supplies the railway through the usual co-op snapshot.
  // Never send the developer panel's shared reset, or retain a snapshot with this person's carried unique item.
  return undefined;
};

buildLand();
registerPlaceShore();
buildTech();
dressSea();
extendSky();
buildSigns();
haulHooks.moved = () => true; // today's island's bundles aren't in this world
if (LOOK.light) installLight();
if (LOOK.contact) installContact([machine.flatbed, machine.loco], TREES);
if (LOOK.gtao) void import('./look-gtao.ts');

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

// ---------------------------------------------------------------- the stations trains stop at (they appear with the trains)
{
  const N = L1.spec.line.len,
    [, q, h] = LINKS[1]!.stops as [number, number, number];
  buildHalt('Village', L1.k, L1.spec.line, 8, 30, -2.9, 0);
  buildHalt('Camp', L1.k, L1.spec.line, N - 26, N - 2, 2.9, 1);
  buildHalt('Village, line 2', L2.k, L2.spec.line, 6, 28, 2.9, 0);
  buildHalt('Quarry', L2.k, L2.spec.line, q - 11, q + 11, 2.9, 1);
  buildHalt('Far Head', L2.k, L2.spec.line, h - 11, h + 11, 2.9, 2);
}

// ---------------------------------------------------------------- the little guys' idea of the place
const P: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
const platformAt = (() => {
  lineAt(L1.spec.line, 19, P);
  const q = besideLine(L1.spec.line, 19, -2.9);
  return {
    x: q.x,
    y: railY(L1.spec.line, 19) + 0.72,
    z: q.z,
    ux: P.ux,
    uz: P.uz,
    up: () => job.rung.trains,
  };
})();
const gatherFrom = besideLine(L1.spec.line, 6, -4.6);
const pathSpan = [30, 200] as const;
setFolkEnv({
  station: () => {
    const st = stationOf(run.line);
    return job.awake && st && (run.mode === 'idle' || run.mode === 'feeding') ? { x: st.x, y: st.y, z: st.z } : null;
  },
  machineBusy: () =>
    run.mode === 'laying' || run.mode === 'running' || run.mode === 'shunting' || run.mode === 'turning',
  machine: () => ({ mesh: machine.flatbed.mesh, top: 0.15 }),
  trainCar: (k) => {
    const l = lines[k]!;
    return job.rung.trains ? { mesh: l.train.tr.cars[0]!.mesh, top: 0.97 } : null; // up on the cab's roof
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
  path: (u, lat) => {
    if (!L1.open) return null;
    const s = pathSpan[0] + (pathSpan[1] - pathSpan[0]) * u;
    lineAt(L1.spec.line, s, P);
    const yaw = Math.atan2(P.ux, P.uz);
    const q = besideLine(L1.spec.line, s, lat);
    return { x: q.x, y: railY(L1.spec.line, s) + 0.1, z: q.z, yaw };
  },
  cart: cartFolk,
  hush: () => !!showing(),
});

// ---------------------------------------------------------------- how you got across: the walk, measured
// The reward for the first path is the walk, so it's measured against your own long way round.
const ways = { startT: -1, longDone: false, zone: 0, zoneAt: 0 };
const CAMP_AT = besideLine(L1.spec.line, 191, 0);
const HOME_AT = besideLine(L1.spec.line, 24, 0);
function updateWays() {
  const b = me.body;
  if (!b) return;
  const now = performance.now();
  // The long way: from your first step to the machine.
  if (ways.startT < 0 && me.wish.lengthSq() > 0.01) ways.startT = now;
  if (!ways.longDone && job.awake) {
    ways.longDone = true;
    if (!job.ways.long && ways.startT >= 0) job.ways.long = (now - ways.startT) / 1000;
  }
  if (!L1.open || job.ways.short) return;
  // The new way: leave one end, get to the other, in one go.
  const home = Math.hypot(b.position.x - HOME_AT.x, b.position.z - HOME_AT.z) < 16,
    camp = Math.hypot(b.position.x - CAMP_AT.x, b.position.z - CAMP_AT.z) < 22;
  const zone = home ? 1 : camp ? 2 : 0;
  if (zone && ways.zone && zone !== ways.zone) {
    job.ways.short = (now - ways.zoneAt) / 1000;
    const long = job.ways.long;
    showBanner(
      `${Math.round(job.ways.short)} s!`,
      long ? `The long way round took you ${Math.round(long)} s.` : 'Across your own bridge.',
      4.2,
    );
    fanfare(false);
    protoCount('shortcuts');
    mark('shortcut');
    save();
  }
  if (zone) {
    ways.zone = zone;
    ways.zoneAt = now;
  }
}

playWhere(() => {
  const b = me.body;
  if (!b) return null;
  const x = b.position.x - ORIGIN.x,
    z = b.position.z - ORIGIN.z;
  if (Math.hypot(x - VILLAGE.x, z - VILLAGE.z) < VILLAGE.r) return 'the village';
  if (Math.hypot(x - HEAD.x, z - HEAD.z) < HEAD.r + 10) return 'Far Head';
  if (Math.hypot(x - LINKS[0]!.camp.x, z - LINKS[0]!.camp.z) < 55) return 'the timber camp';
  if (Math.hypot(x - LINKS[1]!.camp.x, z - LINKS[1]!.camp.z) < 45) return 'the quarry';
  if (carry.on) return 'on a train';
  return b.position.y > H(b.position.x, b.position.z) + 3 ? 'on a trestle' : null;
});

// ---------------------------------------------------------------- start over and the frame
function fillPiles() {
  L1.pile.list = Array.from({ length: TUNE.deckCrates + 2 }, (): Kind => 'wood');
  L2.pile.list = Array.from({ length: TUNE.deckCrates + 2 }, (): Kind => 'stone');
}
/** Everything drawn as the state says. */
function snapAll() {
  clearMoments();
  clearDrops();
  clearTrips();
  craneClear();
  drawHeaps(allHeaps);
  snapRun();
  snapTrains();
  snapTown(stepsOf(job.wood), stepsOf(job.stone));
  setRiders(0, job.rung.trains);
  setRiders(1, job.rung.trains);
}
function startOver() {
  resetJob();
  resetCargo();
  for (const l of lines) {
    l.stage = 0;
    l.open = false;
    l.madeAt = 0;
    for (const st of l.stations)
      for (const g of GOODS) {
        st.have[g] = 0;
        st.coming[g] = 0;
      }
  }
  for (const g of GOODS) {
    forgeFrame.have[g] = 0;
    forgeFrame.coming[g] = 0;
  }
  forgeFrame.spec = FORGE_BILLS[0]!;
  fillPiles();
  hub.list = [];
  dock.list = [];
  yard.list = [];
  resetFolk();
  back.logs = back.rails = back.stone = back.beam = back.incoming = 0;
  back.big = null;
  resetDrops();
  incoming.rails = incoming.logs = 0;
  resetTrees();
  resetRocks();
  felled.n = 0;
  resetForge();
  run.mode = 'asleep';
  ways.startT = -1;
  ways.longDone = false;
  ways.zone = 0;
  clearFinds();
  resetFinds();
  snapGifts([], 0, []);
  snapAll();
  snapCrystals([]);
  resetTownLife();
  log.length = 0;
  atSpawn();
  savedPose = null;
  save();
}
onGiftSaved(save);
// A step-up: a crate off the heap sails over to the first new plot, so you can see which cargo built what.
onStepUp.fn = (kind, first) => {
  const from = topSlot(kind === 'wood' ? hub : yard, new THREE.Vector3());
  const to = new THREE.Vector3(first.plan.x, first.plan.y + 1, first.plan.z);
  hopTo(kind, from, to, 0, () => dustRing(to.x, to.y - 0.4, to.z, 10, 3, 0.5));
};
onCrystal(() => save());
personalSlice('crystals', {
  get: () => crystals.found.slice(),
  set: (v) => snapCrystals(Array.isArray(v) ? (v as number[]) : []),
});
type SavedPose = { x: number; z: number; yaw: number };
let savedPose: SavedPose | null = null;
function safePose(p: SavedPose) {
  if (![p.x, p.z, p.yaw].every(num) || !insidePlace(p.x, p.z) || H(p.x, p.z) <= 1.6) return false;
  if (feet.some((f) => outOf(f, { x: p.x, z: p.z }, PLAYER_R + 0.2))) return false;
  return !Object.values(rooms).some((r) => {
    const q = worldToRoom(r, p.x, p.z);
    return Math.abs(q.x) < r.w / 2 + PLAYER_R && Math.abs(q.z) < r.d / 2 + PLAYER_R;
  });
}
personalSlice('position', {
  get: () => savedPose,
  set: (v) => {
    savedPose = null;
    if (!v || typeof v !== 'object') return;
    const p = v as SavedPose;
    if (safePose(p)) savedPose = { x: p.x, z: p.z, yaw: p.yaw };
  },
});
function capturePose() {
  const b = me.body;
  if (!b || fallArrival.active) return;
  const p = { x: b.position.x, z: b.position.z, yaw: me.yaw };
  // Never leave a stale safe position behind when quitting on a moving deck or in an unsafe spot.
  savedPose = !carry.on && !me.swimming && safePose(p) ? p : null;
}
function restorePose() {
  const b = me.body;
  if (!b || fallArrival.active || !savedPose || !safePose(savedPose)) return;
  teleport(b, savedPose.x, H(savedPose.x, savedPose.z) + PLAYER_R + 0.4, savedPose.z);
  b.velocity.set(0, 0, 0);
  cam.yaw = me.yaw = savedPose.yaw;
}
/** Local recovery: use the rejoin safety rules on nearby ground before falling back to a path. */
export function getUnstuck() {
  const b = me.body;
  if (!b) return;
  carry.on = null;
  carry.x = carry.y = carry.z = carry.spin = 0;
  for (let r = 2; r <= 40; r += 2) {
    const n = Math.ceil((2 * Math.PI * r) / 2);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const p = { x: b.position.x + Math.cos(a) * r, z: b.position.z + Math.sin(a) * r, yaw: me.yaw };
      if (!safePose(p)) continue;
      const h = H(p.x, p.z);
      if (
        [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ].some(([x, z]) => Math.abs(H(p.x + x!, p.z + z!) - h) > 0.5)
      )
        continue;
      // Start above even Needle Bell: the sweep ignores solids containing its starting point.
      const from = { x: p.x, y: h + 128, z: p.z };
      const to = { x: p.x, y: h + PLAYER_R + 0.4, z: p.z };
      if (
        ['skip', 'only'].some(
          (thin) => sweepSphere(from, to, PLAYER_R, { mask: GROUP.SCENERY, thin: thin as 'skip' | 'only' }) >= 0,
        )
      )
        continue;
      savedPose = p;
      restorePose();
      return;
    }
  }
  backUp();
}
let poseClock = 0;
window.addEventListener('pagehide', () => {
  if (!ready || !placed) return;
  capturePose();
  save();
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
let smokeAcc = 0;
let lastObjective = '';
onFrame(
  ({ dt, now }) => {
    const b = me.body;
    if (b && !placed) {
      placed = true;
      // Above a falling deck at train speed, the player body's CCD stops whole steps (src/proto/crossing/index.ts).
      setCcd(b, false);
      if (!fallArrival.active) {
        atSpawn();
        if (ready) restorePose(); // the room can be ready before the character is created
      }
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
      snapAll();
      restorePose();
      startStepping();
      coop.arrived();
    }
    poseClock += dt;
    if (poseClock >= 5) {
      poseClock = 0;
      const before = JSON.stringify(savedPose);
      capturePose();
      if (JSON.stringify(savedPose) !== before) save();
    }
    updateRun(dt);
    updateCargo(dt, now);
    updateForge(dt, () => {
      mark('forge lit');
      protoCount('forge');
      fanfare(true);
      save();
    });
    updatePieces(dt);
    if (fallArrival.active) {
      coop.tick(dt, now);
      return; // keep the shared railway running while the opening owns this player's camera and input
    }
    updateMoments(dt);
    updateGifts(dt, now);
    updateGot(dt);
    updateDrop();
    updateCrystals(dt, now);
    setPopulation(job.people);
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
    solidHeaps();
    updateTown(stepsOf(job.wood), stepsOf(job.stone), dt);
    updateTownLife(dt);
    updateFinds(dt);
    updateTech(dt, now);
    updateBoiler();
    updateBuoys(now);
    updateLamps(dt);
    updateWays();
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
    // Internal progression labels still reach playdata; none are shown to the player.
    const line = objective();
    if (line || line !== lastObjective) playObjective(line);
    lastObjective = line;
    document.body.classList.toggle('place-no-target', !interactTarget()?.run);
    setNumbers(job.score, job.people);
    // What the owner does.
    const riding_ = lines.some((l) => l.train.onTrain(carry.on));
    if (riding_ && !wasRiding) {
      protoCount('rides');
      mark('ride');
    }
    if (!riding_ && wasRiding) mark('off');
    wasRiding = riding_;
    coop.tick(dt, now);
  },
  { phase: 'update', order: 10 },
);

// ---------------------------------------------------------------- the panel, and the other tab
buildPanel({ startOver, atSpawn });
(window.__place as Record<string, unknown>).tech = techApi;
coopWire.rung = rungFromPeer;
coopWire.forgeBill = forgeBillFromPeer;
coopWire.wakeTrains = wakeTrains;
coopWire.activeFrame = activeFrame;
coop.setup({
  snapAll,
  putMachine,
  run,
  startOver,
  wake,
  beginFeed,
  finishStretch,
  landAtStation,
  setStationTags,
  placeMachine,
  clearIncoming: () => void (incoming.rails = incoming.logs = 0),
  stationOf,
});
