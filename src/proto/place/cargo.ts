// Trains and their cargo, the top of the ladder. They come last and as their own big unlock: once the long second route has you
// walking home for rails, the forge casts a boiler, you shoulder it across to the old train, and it wakes. Cargo is their job:
// timber crates finish the forge's roof and then build the village, stone builds the stone street, and the first train out of
// the village carries the pier's whole kit to Far Head. You can ride any of them. Stand on a platform and one comes for you
// (./halts.ts). Machine-free: ./run.ts starts it all.
import * as THREE from 'three/webgpu';
import { carry } from '../../physics/platforms.ts';
import { me } from '../../player/player.ts';
import { thump, whistle } from '../../render/machine-sfx.ts';
import { protoCount } from '../count.ts';
import { playMark } from '../mark.ts';
import { fanfare, knock } from '../minis/common.ts';
import {
  clearCrates,
  deckFree,
  drawHeaps,
  hopOff,
  hopOn,
  hopTo,
  nextSlot,
  putCrate,
  topSlot,
  type Kind,
} from '../net/crates.ts';
import { back } from './chop.ts';
import { shakeView, trainsShow, wakeShow, type Waker } from './celebrate.ts';
import { coop } from './coop.ts';
import { rack, rackAdd } from './depot.ts';
import { cheerAround, setCamp, setRiders } from './folk.ts';
import { craneBusy, craneClear, craneLift, crateIn, nextDrop, roofed } from './forge.ts';
import { halts } from './halts.ts';
import { TUNE, VILLAGE } from './layout.ts';
import { count, job, num, save, sharedSlice } from './job.ts';
import { L1, L2, allHeaps, dock, hub, lines, type LineRun, yard } from './lines.ts';
import { dustRing } from './pieces.ts';
import { rustTrainU } from './look.ts';
import { trainEta } from './rail.ts';
import { wakeCamp } from './town.ts';

// ---------------------------------------------------------------- crates
const scr = new THREE.Vector3();
function make(l: LineRun, now: number) {
  if (!job.rung.trains || !l.open || now < l.madeAt || l.pile.list.length >= TUNE.pileMax) return;
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
/** The pier's kit goes out on the first train from the village: 8 crates. Each is 4 rails and 4 logs. */
const KIT = { crates: 8, rails: 4, logs: 4 };
// A slot owns its goods from boarding until they LAND at the destination. Flights are only a view;
// even after hopOff frees its mesh slot, a save still owns that crate here.
export type TrainCargo = { kind: Kind; logs: number; rails: number };
const loads: (TrainCargo | null)[][] = lines.map((l) => l.train.tr.load.held.map(() => null));
const unloading = lines.map(() => new Set<number>());
let legacyCargo = false;
let craneCargo = false;
sharedSlice('craneCargoV1', {
  get: () => craneCargo,
  set: (v) => {
    craneCargo = v === true;
  },
});
export function resetCargo() {
  for (const load of loads) load.fill(null);
  trainsSaved = [];
  legacyCargo = false;
  craneCargo = false;
}
function board(l: LineRun, kind: Kind, from: THREE.Vector3, delay: number) {
  const k = deckFree(l.train.tr.load);
  if (k < 0 || loads[l.k]![k]) return false;
  if (!hopOn(l.train.tr.load, kind, from, delay)) return false;
  loads[l.k]![k] = { kind, logs: kind === 'fill' ? KIT.logs : 0, rails: kind === 'fill' ? KIT.rails : 0 };
  return true;
}
function unload(l: LineRun, k: number, to: THREE.Vector3, delay: number, landed: () => void) {
  const goods = loads[l.k]![k];
  if (!goods || unloading[l.k]!.has(k)) return;
  unloading[l.k]!.add(k);
  hopOff(l.train.tr.load, k, to, delay, () => {
    if (loads[l.k]![k] !== goods) return;
    unloading[l.k]!.delete(k);
    loads[l.k]![k] = null;
    landed();
  });
}
sharedSlice('trainCargoV1', {
  get: () => loads.map((load) => load.map((c) => c && { ...c })),
  set: (v) => {
    legacyCargo = !Array.isArray(v);
    for (const [n, load] of loads.entries())
      for (let k = 0; k < load.length; k++) {
        const c = (Array.isArray(v) && Array.isArray(v[n]) ? v[n][k] : null) as Partial<TrainCargo> | null;
        load[k] =
          c &&
          (c.kind === 'wood' || c.kind === 'stone' || c.kind === 'fill') &&
          count(c.logs, KIT.logs) &&
          count(c.rails, KIT.rails)
            ? { kind: c.kind, logs: c.logs, rails: c.rails }
            : null;
      }
  },
});

function arrive(l: LineRun, stop: number) {
  const { tr } = l.train;
  const car = tr.cars[0]!;
  if (stop === 0) {
    whistle(car.x, car.z);
    cheerAround(car.x, car.z, 16, 2.5);
    const onto = l === L1 ? dock : yard;
    let n = 0;
    tr.load.held.forEach((c, k) => {
      if (!c || c.kind === 'fill') return;
      const kind = c.kind;
      const to = nextSlot(onto, new THREE.Vector3());
      const delay = 0.4 + n++ * 0.22;
      unload(l, k, to, delay, () => {
        onto.list.push(kind);
        thump(to.x, to.z);
        knock(0.5, 0.65);
        dustRing(to.x, to.y - 0.3, to.z, 6, 1.8, 0.3);
        if (onto === yard) {
          job.stone++;
          job.people++;
        }
        drawHeaps(allHeaps);
        save();
      });
    });
    // Back at the village on line 2 with the pier still to come: load its kit, crate by crate, off the yard's edge.
    if (l === L2 && job.kitSent < KIT.crates) {
      let m = 0;
      while (job.kitSent < KIT.crates && deckFree(tr.load) >= 0) {
        scr.set(yard.x, VILLAGE.y + 1, yard.z);
        if (!board(l, 'fill', scr, 0.6 + m++ * 0.14)) break;
        job.kitSent++;
      }
      save();
    }
    return;
  }
  if (l === L2 && stop === tr.stops.length - 1) {
    // Far Head: the kit, onto the rack by the frame.
    whistle(car.x, car.z);
    let n = 0;
    tr.load.held.forEach((c, k) => {
      if (!c || c.kind !== 'fill') return;
      const goods = loads[l.k]![k];
      if (!goods) return;
      const to = rack.at.clone();
      unload(l, k, to, 0.4 + n++ * 0.24, () => {
        rackAdd(goods.logs, goods.rails);
        thump(to.x, to.z);
        dustRing(to.x, to.y - 0.3, to.z, 6, 1.8, 0.3);
        save();
      });
    });
    return;
  }
  // A camp: its crates climb aboard.
  let n = 0;
  while (l.pile.list.length && deckFree(tr.load) >= 0) {
    const from = topSlot(l.pile, new THREE.Vector3());
    if (!board(l, l.pile.list.at(-1)!, from, 0.4 + n * 0.14)) break;
    l.pile.list.pop();
    n++;
  }
  if (n) {
    drawHeaps(allHeaps);
    save();
  }
}
function feedCrane() {
  if (craneBusy() || !dock.list.length) return;
  const from = topSlot(dock, new THREE.Vector3());
  const toForge = !roofed();
  craneCargo = true;
  dock.list.pop();
  drawHeaps(allHeaps);
  if (toForge)
    craneLift(from, nextDrop(new THREE.Vector3()), () => {
      craneCargo = false;
      crateIn();
      job.people++;
      if (roofed()) {
        fanfare(true);
      }
      save();
    });
  else
    craneLift(from, nextSlot(hub, new THREE.Vector3()), () => {
      craneCargo = false;
      hub.list.push('wood');
      if (hub.list.length > 60) hub.list.splice(0, hub.list.length - 60);
      job.wood++;
      job.people++;
      drawHeaps(allHeaps);
      thump(hub.x, hub.z);
      save();
    });
}

// ---------------------------------------------------------------- calling one
let currentHalt: (typeof halts)[number] | null = null;
/** The halt you're standing on, or null. */
export function haltUnder() {
  const b = me.body;
  if (!b) return (currentHalt = null);
  const { x, y, z } = b.position;
  // One decision for the objective and calls: a small step at an edge must not leave and re-enter the halt.
  if (currentHalt?.onIt(x, y, z, 0.4)) return currentHalt;
  currentHalt = halts.find((h) => h.onIt(x, y, z)) ?? null;
  return currentHalt;
}
const lineOfHalt = (h: { k: number }) => lines[h.k]!;
const called: { l: LineRun; stop: number } = { l: L1, stop: -1 };
let wasOn: unknown = null,
  sawIt = false;
/** Seconds till a called train's in, for the objective; null when none's on its way. */
export const trainComing = () => (called.stop < 0 ? null : trainEta(called.l.train.tr, called.stop));
function updateCall() {
  // Aboard, you're not waiting: going past a platform on a train doesn't call one.
  const h = job.rung.trains && !onATrain() ? haltUnder() : null;
  if (h && h !== wasOn) {
    // Up on the platform: the bell rings and it's on its way.
    const l = lineOfHalt(h);
    called.l = l;
    called.stop = h.stop;
    coop.callTrain(l.k, h.stop);
    protoCount('calls');
    playMark('train called', { halt: h.name });
  }
  wasOn = h;
  for (const q of halts) {
    const l = lineOfHalt(q);
    if (!l.train.clockRunning()) continue;
    const near = called.l === l && called.stop === q.stop;
    q.signal(near ? trainEta(l.train.tr, q.stop) : null);
  }
  if (called.stop >= 0) {
    const tr = called.l.train.tr;
    // It came and went, and you were on the platform and didn't get on.
    if (tr.stop === called.stop) sawIt = true;
    else if (sawIt) {
      sawIt = false;
      if (haltUnder() && !onATrain()) playMark('missed train', { line: called.l.spec.id });
    }
    if (tr.stop === called.stop && !haltUnder()) called.stop = -1;
    else if (!haltUnder() && Math.abs(tr.stops[called.stop]! - tr.s) < 0.5) called.stop = -1;
  }
}

// ---------------------------------------------------------------- the unlock
const AT_CAMP = () => L1.train.waker as unknown as Waker;
/** You fit the boiler: the old train wakes, the way the machine did, and then there are trains. */
export function wakeTrains(fromPeer = false) {
  if (job.rung.trains || job.boiler >= 3) return;
  if (!fromPeer) coop.boilerFitted();
  job.boiler = 3;
  const w = AT_CAMP();
  wakeShow(
    w,
    () => cheerAround(w.flatbed.x, w.flatbed.z, 34, 4),
    () => startTrains(),
  );
  save();
}
const camera = new THREE.Vector3(),
  cameraTo = new THREE.Vector3(),
  lookAt = new THREE.Vector3();
function startTrains() {
  job.rung.trains = true;
  rustTrainU.value = 0;
  L1.train.start();
  L2.train.park(0);
  L2.train.start();
  for (const l of lines) l.train.tr.lastStop = -1;
  for (const [n, h] of halts.entries()) h.build(0.3 + n * 0.3);
  wakeCamp(1);
  setCamp(1, true);
  setRiders(0, true);
  setRiders(1, true);
  job.people += 6;
  shakeView(0.14);
  const b = me.body;
  const c = L1.train.tr.cars[0]!;
  lookAt.set(c.x, c.y, c.z);
  camera.set(c.x - 26, c.y + 14, c.z + 22);
  cameraTo.set(c.x - 32, c.y + 18, c.z + 26);
  if (b) trainsShow(lookAt, camera, cameraTo);
  protoCount('trains');
  playMark('train unlocked');
  playMark('rung earned', { rung: 'trains' });
  save();
}
/** Back to how it stands, with no show. */
export function snapTrains() {
  craneClear();
  if (craneCargo) {
    dock.list.push('wood');
    craneCargo = false;
    drawHeaps(allHeaps);
  }
  // Pre-cargo saves lost every travelling crate. Only the finite kit is reconstructable: count
  // surviving supply and Q6 work before reissuing the missing crates. Never refill a completed pier.
  if (legacyCargo && job.rung.trains) {
    const pier = L2.stations.find((st) => st.spec.id === 'Q6')!;
    const sent = count(job.kitSent, KIT.crates) ? job.kitSent : 0;
    const complete = job.ended || L2.stage > L2.stations.indexOf(pier);
    let logs = complete ? 0 : Math.max(0, sent * KIT.logs - rack.logs - back.logs - pier.have.logs);
    let rails = complete ? 0 : Math.max(0, sent * KIT.rails - rack.rails - back.rails - pier.have.rails);
    for (let k = 0; k < KIT.crates && (logs || rails); k++) {
      const c = { kind: 'fill' as const, logs: Math.min(KIT.logs, logs), rails: Math.min(KIT.rails, rails) };
      loads[L2.k]![k] = c;
      logs -= c.logs;
      rails -= c.rails;
    }
  }
  legacyCargo = false;
  // clearCrates also cancels global flights: clear EVERY train before rebuilding any load.
  for (const l of lines) clearCrates(l.train.tr.load);
  for (const slots of unloading) slots.clear();
  rustTrainU.value = job.rung.trains ? 0 : 1;
  for (const h of halts) h.snap(job.rung.trains);
  called.stop = -1;
  wasOn = null;
  currentHalt = null;
  for (const l of lines) {
    l.train.tr.lastStop = -1;
    const t = trainsSaved[l.k];
    if (job.rung.trains) {
      if (t) l.train.put(t.s, t.v, t.target, t.sweep, t.dwell, t.express ?? l.train.tr.express);
      else {
        l.train.park(0);
        l.train.start();
      }
    } else if (l === L1) l.train.park();
    else l.train.hide();
    loads[l.k]!.forEach((c, k) => {
      if (c) putCrate(l.train.tr.load, k, c.kind);
    });
    setRiders(l.k, job.rung.trains);
  }
  setCamp(1, job.rung.trains);
}
export type TrainSave = { s: number; v: number; target: number; sweep: 1 | -1; dwell: number; express?: boolean };
let trainsSaved: (TrainSave | null)[] = [];
sharedSlice('trains', {
  get: () =>
    lines.map((l) => {
      const t = l.train.tr;
      return l.train.clockRunning()
        ? {
            s: +t.s.toFixed(2),
            v: +t.v.toFixed(2),
            target: t.target,
            sweep: t.sweep,
            dwell: +t.dwell.toFixed(2),
            express: t.express,
          }
        : null;
    }),
  set: (v) => {
    const a = Array.isArray(v) ? v : [];
    trainsSaved = lines.map((l, k) => {
      const q = a[k] as Partial<TrainSave> | null | undefined;
      if (!q || !num(q.s) || !count(q.target, l.spec.stops.length - 1)) return null;
      return {
        s: q.s,
        v: num(q.v) ? Math.max(-TUNE.cruise, Math.min(TUNE.cruise, q.v)) : 0,
        target: q.target,
        sweep: q.sweep === -1 ? -1 : 1,
        dwell: num(q.dwell) ? q.dwell : 0,
        express: typeof q.express === 'boolean' ? q.express : undefined,
      };
    });
  },
});
/** Each frame. */
export function updateCargo(dt: number, now: number) {
  // Someone's aboard: it runs straight through to the end of the line. Cargo waits for the way back.
  for (const l of lines) if (l.train.onTrain(carry.on)) coop.express(l.k);
  for (const l of lines) {
    make(l, now);
    const { tr } = l.train;
    if (tr.stop !== tr.lastStop) {
      if (tr.stop >= 0 && (job.rung.trains || (l === L1 && tr.stop === tr.stops.length - 1))) arrive(l, tr.stop);
      tr.lastStop = tr.stop;
    }
  }
  feedCrane();
  for (const h of halts) h.update(dt);
  updateCall();
}
export const onATrain = () => lines.some((l) => l.train.onTrain(carry.on));
