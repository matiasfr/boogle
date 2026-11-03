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
//                 small line and the beacon; ./panel.ts the tester's panel and `window.__place`; ./coop.ts `&coop=1`
//
// Sync: Local, all of it, kept in localStorage per room. With `&coop=1`, ./coop.ts shares the railway between the tabs in the room.
import './place.css';
import './ambience.ts';
import * as THREE from 'three/webgpu';
import { onFrame } from '../../loop.ts';
import { worldStatus, world, onApplied } from '../../world/sync.ts';
import { FOG_FAR, PLAYER_R } from '../../constants.ts';
import { me, cam, camConstraints } from '../../player/player.ts';
import { interactTarget } from '../../player/hands.ts';
import { haulHooks } from '../../player/haul-variant.ts';
import { setCcd, teleport } from '../../physics/engine.ts';
import { softWall } from '../../entities/player/state.ts';
import { carry } from '../../physics/platforms.ts';
import { scene } from '../../render/scene.ts';
import { emit } from '../../render/particles.ts';
import { dressSea } from '../crossing/sea.ts';
import { extendSky } from '../crossing/sky.ts';
import { fanfare } from '../minis/common.ts';
import { clearCrates, drawHeaps, hopTo, topSlot, updateCrates, type Kind } from '../net/crates.ts';
import { protoCount } from '../count.ts';
import { playObjective, playWhere } from '../mark.ts';
import { H, buildLand, insidePlace } from './land.ts';
import { clearMoments, showBanner, updateMoments } from './celebrate.ts';
import { snapCrystals, updateCrystals, onCrystal, crystals } from './crystals.ts';
import { resetFolk, setFolkEnv, setPopulation, setRiders, updateFolk } from './folk.ts';
import { resetForge, forge, updateForge, craneClear } from './forge.ts';
import { LOOK, installLight } from './look.ts';
import { installContact } from './look-kit.ts';
import { clearDrops } from './sites.ts';
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
import { job, resetJob, restore, save, personalSlice } from './job.ts';
import { L1, L2, allHeaps, dock, forgeFrame, hub, lines, machine, solidHeaps, stepsOf, yard } from './lines.ts';
import { buildHalt } from './halts.ts';
import { cartFolk } from './depot.ts';
import { haltUnder, snapTrains, updateCargo, wakeTrains } from './cargo.ts';
import { showing, nearestCrate, openCrate, snapGifts, updateGifts, onGiftSaved } from './gifts.ts';
import { updateLamps } from './lamps.ts';
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
import { incoming } from './verbs.ts';
import { arrowTarget, objective } from './objective.ts';
import { buildPanel } from './panel.ts';
import { buildSigns, pointArrow, setNumbers, setObjective, updateObjective } from './signs.ts';
import { onStepUp, snapTown, updateTown } from './town.ts';

// A clean view for someone playing it cold (the tester's link, `&fresh=1`): place.css hides the bar and the panel.
if (new URLSearchParams(location.search).get('fresh') === '1') document.body.classList.add('place-fresh');

buildLand();
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
  for (const l of lines) clearCrates(l.train.tr.load);
  drawHeaps(allHeaps);
  snapRun();
  snapTrains();
  snapTown(stepsOf(job.wood), stepsOf(job.stone));
  setRiders(0, job.rung.trains);
  setRiders(1, job.rung.trains);
}
function startOver() {
  resetJob();
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
  snapAll();
  snapGifts([], 0, []);
  snapCrystals([]);
  log.length = 0;
  atSpawn();
  save();
}
onApplied((e: { op: string }) => e.op === 'tune.reset' && !coop.on && startOver());
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
      snapAll();
      startStepping();
      coop.arrived();
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
    updateMoments(dt);
    updateGifts(dt, now);
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
    updateFinds(dt);
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
    // What's on screen.
    const line = objective(now);
    if (line) playObjective(line);
    setObjective(line);
    updateObjective(dt, me.wish.lengthSq() > 0.01 || run.mode === 'laying' || !!showing() || !!haltUnder());
    pointArrow(showing() ? null : arrowTarget());
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
