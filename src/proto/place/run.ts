// The run of ?proto=place: the machine, what it asks for, and what happens when a frame fills. `run` is where the machine is
// and what it's doing; `activeFrame()` is the one frame that takes what you carry right now. The run goes:
//   line 1's three frames (by hand) -> the first path opens, with no train -> the axe's chest -> the forge's frame (by hand,
//   over your shortcut) -> the pack's chest -> the forge lights -> the machine turns onto line 2 -> its first frame -> the depot
//   -> four more frames, out over the sea -> Far Head -> the boiler -> trains -> the pier -> the end.
// Local, or shared by ./coop.ts: the tab that decides (`coop.follower()` is false) ends stretches and starts runs.
import * as THREE from 'three/webgpu';
import { myBundleNext } from '../../features/haul-stack.ts';
import { me } from '../../player/player.ts';
import { clank, thump, whistle } from '../../render/machine-sfx.ts';
import { protoCount } from '../count.ts';
import { playMark, protoMark, type PlayData } from '../mark.ts';
import { fanfare, knock } from '../minis/common.ts';
import { after, clearMoments, firstPathShow, headShow, pierShow, shakeView, wakeShow } from './celebrate.ts';
import { back, putDownBig } from './chop.ts';
import { coop } from './coop.ts';
import { cart, drawRack, moveRack, rack, setDepotFrame, snapCart } from './depot.ts';
import { cheerAround, pourOut, setCamp, setCommuters, setPushers, setRiders } from './folk.ts';
import { forge, logIn, nextPiece, snapForge } from './forge.ts';
import { deliver } from './gifts.ts';
import { H } from './land.ts';
import { lampRow, snapLamps } from './lamps.ts';
import { grantChest, grantMultiAxe, snapChest } from './ladder.ts';
import { job, save, sharedSlice, num } from './job.ts';
import {
  FAR,
  FORGE_BILLS,
  GOODS,
  HEAD,
  ORIGIN,
  PAY,
  STUB,
  TUNE,
  VILLAGE,
  railY,
  toWorld,
  type Goods,
} from './layout.ts';
import { L1, L2, TX, TY, TZ, disc, forgeFrame, heading, lines, machine, type LineRun } from './lines.ts';
import { dustRing, send } from './pieces.ts';
import { besideLine } from './rail.ts';
import { delivered, earn } from './score.ts';
import { flyToStock, type StationRun } from './stations.ts';
import { snapCamp, wakeCamp } from './town.ts';

export type Mode =
  'asleep' | 'waking' | 'idle' | 'feeding' | 'laying' | 'running' | 'waiting' | 'turning' | 'shunting' | 'done';
export const run = {
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

const scratch = new THREE.Vector3(),
  bundleRot = new THREE.Quaternion();
export const stationOf = (l: LineRun) => l.stations[l.stage] ?? null;
/** The pier waits for trains: until then no frame takes anything out there. */
const pierWaits = (st: StationRun | null) => st?.spec.rack === 'train' && !job.rung.trains;
/** A slab stands across the line here (./tech.ts): nothing goes in until it's down. */
const gateWaits = (st: StationRun | null) => !!st?.spec.gate && !job.gate[st.spec.gate];
/** The gate the machine is standing at, if it's stopped by one. */
export const gateHere = () => {
  const st = run.mode === 'idle' ? stationOf(run.line) : null;
  return gateWaits(st) ? st!.spec.gate! : null;
};
/** The one frame that takes what you carry right now, or null. */
export function activeFrame(): StationRun | null {
  if (run.mode === 'waiting' && !forge.lit) return forgeFrame;
  if (run.mode !== 'idle') return null;
  const st = stationOf(run.line);
  return pierWaits(st) || gateWaits(st) ? null : st;
}
/** What else there is to put right with the rest of the state: ./tech.ts. */
export const snapHooks: (() => void)[] = [];
setDepotFrame(() => (run.mode === 'idle' || run.mode === 'laying' || run.mode === 'feeding' ? stationOf(L2) : null));
export const laySpeedOf = (st: StationRun | null) => st?.spec.speed ?? TUNE.laySpeed;

// ---------------------------------------------------------------- the machine's run
export function beginFeed(l: LineRun, st: StationRun) {
  run.mode = 'feeding';
  run.line = l;
  run.feedT = 0;
  run.feedLeft = st.shown.logs + st.shown.rails + st.shown.stone + st.shown.beam;
  run.feedAir = 0;
  whistle(st.x, st.z);
  coop.fed(st);
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
    const s = st.shown;
    if (s.beam > 0) {
      s.beam = 0;
      st.drawStock(s);
      send('log', st.at, st.feederEnd, {
        dur: 0.9,
        apex: 0.6,
        size: [4, 4],
        aim: (to) => void machine.worldCradle(to),
        land: () => {
          run.feedAir--;
          thump(st.x, st.z);
          shakeView(0.1);
        },
      });
    } else if (s.stone > 0) {
      const from = st.stoneAt(s.stone - 1, new THREE.Vector3());
      s.stone--;
      st.drawStock(s);
      send('stone', from, st.feederEnd, {
        dur: 0.45,
        apex: 0.3,
        aim: (to) => void machine.worldCradle(to),
        land: () => {
          run.feedAir--;
          clank(st.x, st.z);
        },
      });
    } else if (s.logs > 0) {
      const n = s.logs - 1;
      const from = st.logSlot(n, new THREE.Vector3());
      s.logs = n;
      st.drawStock(s);
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
      const n = s.rails - 1;
      const from = st.railSlot(n, new THREE.Vector3());
      s.rails = n;
      st.drawStock(s);
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
  const step = Math.min(left, laySpeedOf(st) * dt);
  run.head += dir * step;
  job.score.metres += step;
  l.track.layTo(l.track.u(run.head));
  machine.at(line, run.head, dir);
  machine.moved(step);
  const span = (to - run.stretch0) * dir,
    done = span > 0 ? ((run.head - run.stretch0) * dir) / span : 1;
  const cradleNow = Math.ceil(run.cradle0 * (1 - done)),
    rackNow = l === L1 ? rackForLine1(run.head) : Math.ceil(run.rack0 * (1 - done));
  if (cradleNow !== run.cradle) machine.setCradle((run.cradle = cradleNow));
  if (rackNow !== run.rack) machine.setRack((run.rack = rackNow));
  if (left - step <= 0.001 && !coop.follower()) finishStretch(l);
}
/** Line 1's rails come off the machine's own rack: it's empty when the line is done. */
const rackForLine1 = (head: number) => {
  const total = STUB.camp - STUB.village;
  return Math.ceil(TUNE.rackStart * Math.max(0, (head - STUB.village) / total));
};
// The machine hands a crate down beside where it stopped, on ground you can stand on, by the next frame on the side you'll
// come from, so the beacon and your logs bring you to it. What's in it: ./gifts.ts.
function handCrate(l: LineRun, to: number, side: number) {
  const { line, dir } = l.spec;
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
  for (const [back_, lat] of options) {
    const at = to - dir * back_;
    const q = besideLine(line, at, lat);
    if (Math.abs(H(q.x, q.z) - railY(line, at)) > 1.4) continue;
    scratch.set(machine.flatbed.x, machine.flatbed.y + 0.5, machine.flatbed.z);
    deliver(q.x, H(q.x, q.z), q.z, scratch);
    return;
  }
  const q = besideLine(line, to, side * 3.2);
  deliver(q.x, H(q.x, q.z), q.z, null);
}
export function finishStretch(l: LineRun) {
  const st = stationOf(l)!;
  coop.stretched(st);
  whistle(st.x, st.z);
  dustRing(st.x, st.y, st.z, 8, 2, 0.3);
  earn(PAY.stretch, 'stretch');
  if (st.spec.crate) handCrate(l, st.spec.to, st.spec.side);
  cheerAround(st.x, st.z, 26, 3);
  l.stage++;
  mark('stretch laid', { id: st.spec.id });
  const spec = l.spec;
  if (l.stage === spec.freeUpTo + 1) openPath(l);
  if (st.spec.id === 'Q1') openDepot();
  if (l.stage >= l.stations.length) {
    run.mode = l === L1 ? 'running' : 'done';
    if (l === L2) endOfTheRun();
  } else run.mode = 'idle';
  moveRack(stationOf(L2)?.spec.rack && l === L2 ? stationOf(L2) : l === L2 ? null : rack.on ? stationOf(L2) : null);
  setStationTags();
  save();
}
function stepRunIn(dt: number) {
  const to = headAtTurntable();
  const step = Math.min(run.head - to, TUNE.runSpeed * dt);
  run.head -= step;
  machine.at(L1.spec.line, run.head, -1);
  machine.moved(step);
  if (run.head - to < 0.001) {
    run.mode = 'waiting';
    setStationTags();
  }
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
let stepping = false;
export const startStepping = () => void (stepping = true);
machine.onStep = (dt) => {
  if (!stepping) return;
  if (run.mode === 'laying') stepLay(dt);
  else if (run.mode === 'running') stepRunIn(dt);
  else if (run.mode === 'turning') stepTurn(dt);
  else if (run.mode === 'shunting') stepShunt(dt);
};

export function setStationTags() {
  const a = activeFrame();
  for (const l of lines)
    for (const st of l.stations) st.setTag(st === a || (st === stationOf(run.line) && run.mode === 'feeding'));
  forgeFrame.setTag(a === forgeFrame);
}

export function wake(fromPeer = false) {
  if (!fromPeer) coop.woke();
  job.awake = true;
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
      grantMultiAxe();
      setStationTags();
      save();
    },
  );
  save();
}
/** The skips: awake now, with no show. */
export function wakeNow() {
  clearMoments();
  job.awake = true;
  run.mode = 'idle';
  machine.wake(true);
  setCamp(0, true);
  job.rung.multi = true;
  mark('woke');
  setStationTags();
}

// ---------------------------------------------------------------- paths opening
const v1 = new THREE.Vector3(),
  v2 = new THREE.Vector3(),
  v3 = new THREE.Vector3(),
  v4 = new THREE.Vector3(),
  v5 = new THREE.Vector3();
/** The line's through to where it was going: you can walk it. On line 1 there's no train yet, and that's the point. */
export function openPath(l: LineRun) {
  l.open = true;
  job.people += l === L1 ? 8 : 6;
  protoCount('links');
  mark('path opened', { line: l.spec.id });
  if (l === L1) {
    // The one big moment: out and up over the village's shoulder, along everything you just built.
    firstPathShow({
      village: v1.set(TX - 4, VILLAGE.y, TZ - 4),
      gorge: v2.set(toWorld(-34), 24, -82),
      shot: v3.set(toWorld(-142), 78, -116),
      shotTo: v4.set(toWorld(-148), 84, -124),
      at: v5.set(toWorld(-36), 16, -74),
    });
    pourOut(10);
    setCommuters(true, 14);
    lampRow(0, 60, 116, 0.6);
    // It's yours to walk: the axe is at the far end of it.
    after(1.2, () => grantChest('axe'));
  } else {
    const end = besideLine(l.spec.line, l.spec.stations[l.spec.freeUpTo]!.to, 0);
    headShow(v1.set(end.x, HEAD.y + 6, end.z), v2.set(TX - 4, VILLAGE.y, TZ + 8));
    lampRow(1, 306, 490, 0.5);
    pourOut(6);
    cheerAround(end.x, end.z, 40, 6);
    // The forge has been busy. The way home is long, and that's the point too.
    job.boiler = 1;
  }
}
/** Line 2's first stretch laid: the camp starts sending logs. */
function openDepot() {
  job.rung.depot = true;
  playMark('rung earned', { rung: 'depot' });
  cart.leg = 'rest';
  cart.d = 0;
  wakeCamp(0);
  setPushers(true);
  snapCart();
  fanfare(false);
  protoCount('depots');
}
/** The pier's out: the job's done, and the beacon goes to the shard across the sea. */
function endOfTheRun() {
  job.ended = true;
  const end = besideLine(L2.spec.line, L2.spec.line.len - 4, 0);
  pierShow(
    v1.set(end.x, 24, end.z),
    v2.set(end.x + 34, 46, end.z + 46),
    v3.set(end.x + 40, 58, end.z + 58),
    v4.set(FAR.x + ORIGIN.x, 110, FAR.z + ORIGIN.z),
  );
  protoCount('ends');
  playMark('run ended');
}

// ---------------------------------------------------------------- delivering: your back into the frame
let unloadT = 0;
export function unload(dt: number) {
  unloadT -= dt;
  if (unloadT > 0 || !me.body) return;
  const st = activeFrame();
  if (!st) return;
  const p = me.body.position;
  if (Math.hypot(p.x - st.x, p.z - st.z) > TUNE.reachStation) return;
  const kind = GOODS.find((g) => back[g] > 0 && st.wants(g) > 0);
  if (!kind) return;
  unloadT = TUNE.unloadS;
  st.coming[kind]++;
  const counted = coop.deposited(st, kind, p);
  if (kind === 'logs') {
    myBundleNext(Math.max(0, back.logs - 1), scratch, bundleRot);
    back.logs--;
  } else if (kind === 'rails') {
    scratch.set(p.x, p.y + 0.9, p.z);
    back.rails--;
  } else if (kind === 'stone') {
    scratch.set(p.x, p.y + 0.7, p.z);
    back.stone--;
  } else {
    scratch.set(p.x, p.y + 1.1, p.z);
    putDownBig();
  }
  flyToStock(st, kind, st.have[kind] + st.coming[kind] - 1, scratch, () => {
    if (kind === 'beam') shakeView(0.12);
    landAtStation(st, kind, counted);
  });
}
let depositAt = 0;
export function landAtStation(st: StationRun, kind: Goods, counted = true) {
  st.coming[kind]--;
  if (counted) st.have[kind]++;
  if (counted) delivered(kind);
  // One mark a load, not one a log.
  if (performance.now() - depositAt > 3000) playMark('deposit', { frame: st.spec.id, kind });
  depositAt = performance.now();
  const mine = st === activeFrame() || st === forgeFrame;
  if (mine) {
    st.drawStock(coop.shown(st));
    st.setTag(true);
  }
  if (kind === 'logs') knock(0.7, 1);
  else clank(st.x, st.z);
  thump(st.x, st.z);
  dustRing(st.x, st.y + 0.4, st.z, 2, 0.8, 0.14);
  if (st === forgeFrame) {
    // Straight in: down the rollers and up onto the forge, and its pieces drop.
    if (kind === 'logs') feedForge(counted);
    return;
  }
  if (st.full() && run.mode === 'idle' && stationOf(run.line) === st && !gateWaits(st) && !coop.follower()) {
    // The whole bill's landed: drawn as it stands, and off it goes.
    st.drawStock(st.have);
    beginFeed(run.line, st);
  }
  save();
}
function feedForge(counted: boolean) {
  const st = forgeFrame;
  const from = st.logSlot(Math.max(0, st.shown.logs - 1), new THREE.Vector3());
  st.shown.logs = Math.max(0, st.shown.logs - 1);
  st.drawStock(st.shown);
  send('log', from, nextPiece(new THREE.Vector3()), {
    dur: 0.5,
    apex: 1.4,
    size: [2, 2.4],
    land: () => {
      logIn();
      if (counted) forgeBillCheck();
      save();
    },
  });
}
function forgeBillCheck() {
  const st = forgeFrame;
  if (!st.full() || st.coming.logs || coop.follower()) return;
  if (job.forgeBill === 0) {
    job.forgeBill = 1;
    st.spec = FORGE_BILLS[1]!;
    st.have.logs = 0;
    st.drawStock(st.have);
    st.setTag(true);
    grantChest('pack');
    fanfare(false);
    coop.forgeBill();
    setStationTags();
  }
}
/** Another tab's forge moved on to its second bill. */
export function forgeBillFromPeer() {
  job.forgeBill = 1;
  forgeFrame.spec = FORGE_BILLS[1]!;
  forgeFrame.have.logs = 0;
  forgeFrame.drawStock(forgeFrame.have);
  setStationTags();
}

// ---------------------------------------------------------------- the machine turns, once the forge is lit
export function updateRun(dt: number) {
  if (run.mode === 'feeding') stepFeed(dt);
  if (run.mode === 'waiting' && forge.lit) {
    job.turned = true;
    run.mode = 'turning';
    run.turnT = 0;
    whistle(TX, TZ);
    setStationTags();
    moveRack(null);
    mark('turning');
  }
  unload(dt);
  for (const l of lines) l.track.update(dt);
}

// ---------------------------------------------------------------- the whole state, with no show
export function placeMachine() {
  const l = !job.turned ? L1 : L2;
  run.line = l;
  if (l === L1 && L1.open) {
    run.head = headAtTurntable();
    machine.at(L1.spec.line, run.head, -1);
    run.mode = 'waiting';
  } else {
    const st = stationOf(l);
    run.head = st ? st.spec.s : l.spec.line.len - 1;
    machine.at(l.spec.line, run.head, l.spec.dir);
    if (!job.awake) run.mode = 'asleep';
    else run.mode = st ? 'idle' : 'done';
  }
  machine.snap();
  machine.wake(job.awake);
  disc.rotation.y = job.turned ? heading.line2 : heading.line1;
  run.cradle = 0;
  machine.setCradle(0);
  run.rack = l === L1 && !L1.open ? rackForLine1(run.head) : 0;
  machine.setRack(run.rack);
  for (const q of lines) {
    const end = q.stations[q.stage];
    const head = end ? end.spec.s : q.spec.dir > 0 ? q.spec.line.len : STUB.village;
    q.track.snapTo(q.track.u(head));
    q.stations.forEach((st, n) => st.drawStock(n === q.stage ? st.have : { logs: 0, rails: 0, stone: 0, beam: 0 }));
  }
  forgeFrame.spec = FORGE_BILLS[Math.min(job.forgeBill, 1)]!;
  forgeFrame.drawStock({ logs: 0, rails: 0, stone: 0, beam: 0 });
  setStationTags();
  const st = stationOf(l);
  moveRack(l === L2 && st?.spec.rack ? st : null);
  if (run.mode === 'idle' && st?.full() && !coop.follower()) {
    st.drawStock(st.have);
    beginFeed(l, st);
  }
}
/** Everything drawn as the state says: a reload, a Start over, or taking a partner's state. */
export function snapRun() {
  for (const l of lines) {
    snapCamp(l.k, l === L1 ? job.rung.depot : job.rung.trains);
    setRiders(l.k, job.rung.trains);
  }
  placeMachine();
  snapForge();
  snapChest();
  snapCart();
  drawRack();
  snapLamps();
  setCamp(0, job.awake);
  setCommuters(L1.open);
  setPushers(job.rung.depot && !job.rung.trains);
  for (const fn of snapHooks) fn();
}
sharedSlice('run', {
  get: () => ({
    mode: run.mode,
    k: run.line.k,
    head: +run.head.toFixed(2),
    s0: run.stretch0,
    c0: run.cradle0,
    r0: run.rack0,
    c: run.cradle,
    r: run.rack,
  }),
  set: () => {}, // ./coop.ts puts a moving machine right; a saved one stands at its station (`placeMachine`)
});
/** From a snapshot: the machine mid-job. */
export function putMachine(j: unknown) {
  const q = (j ?? {}) as {
    mode?: unknown;
    k?: unknown;
    head?: unknown;
    s0?: unknown;
    c0?: unknown;
    r0?: unknown;
    c?: unknown;
    r?: unknown;
  };
  const l = lines[q.k === 1 ? 1 : 0]!,
    st = stationOf(l);
  if (q.mode === 'feeding' && st && run.mode === 'idle') beginFeed(l, st);
  else if ((q.mode === 'running' || (q.mode === 'laying' && st)) && num(q.head)) {
    run.line = l;
    run.mode = q.mode;
    run.head = q.head;
    run.stretch0 = num(q.s0) ? q.s0 : q.head;
    run.cradle0 = num(q.c0) ? q.c0 : 0;
    run.rack0 = num(q.r0) ? q.r0 : 0;
    run.cradle = num(q.c) ? q.c : 0;
    run.rack = num(q.r) ? q.r : 0;
    machine.at(l.spec.line, run.head, q.mode === 'running' ? -1 : l.spec.dir);
    machine.snap();
    machine.setCradle(run.cradle);
    machine.setRack(run.rack);
    if (q.mode === 'laying' && st) {
      l.track.snapTo(l.track.u(run.head));
      st.drawStock({ logs: 0, rails: 0, stone: 0, beam: 0 });
    }
    setStationTags();
  }
}

// What the owner did, for the evals' log and the report.
export const log: [string, number][] = [];
export const mark = (name: string, data?: PlayData) => {
  log.push([name, performance.now()]);
  playMark(name, data);
};
