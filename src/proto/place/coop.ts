// Two players, one railway: `?proto=place&coop=1`, a throwaway for one playtest (real shared code comes through
// docs/plans/rail-slice.md). Serves DESIGN.md 4 (Cooperation is automatic). Research: docs/research/shared-construction.md,
// recommendations 2, 3, 9, 11 and 12. Without the flag every hook here is a no-op and nothing is sent.
//
// How it stays together, cheapest thing that works:
// - One authority: the oldest visible coop tab (presence key `placeCoop`, the world tick it got here). Not the room's lead,
//   which could be a tab without the flag, and not the lowest id, which a newcomer could take. It is the only tab that
//   accepts a deposit, starts a station's run and ends a stretch, so the last log can't start two runs and a frame can't
//   overfill: a deposit it can't take goes back on the sender's back.
// - Deposit answers match sender + request id before authority/frame guards. Slow presence isn't a rejection: only
//   an explicit rejection or actual peer removal returns a pending piece, never a wall-clock timeout.
// - Every tab runs the rest of the game as ever, so nothing waits on the network. Chops, wakes, rungs and calls go out as they
//   happen and anyone can send them; the machine, cart, trains and town run on each tab.
// - Once a second the authority sends the whole shared state (`captureShared`, ./job.ts: every slice registered there, so a new
//   system's state comes along for free). A newcomer takes it and is caught up, a follower that stays different for a few
//   seconds is put right, and a follower that takes over already has everything it needs.
// - Trains are nudged to the authority's place, and platforms get stable ids so a rider stands on your copy of the deck.
// - Owner presence tracks a carried great beam or boiler. Departure returns it to its pickup; snapshots clear a
//   returning carrier's stale shoulder, including ordinary reconciliation after reconnecting.
// - Cart calls and rail loads are reliable events; cargo rides on a stable platform on each tab. Bills stay fixed.
// - The optional long beam has Owner grips (`placeLongBeam`) and a saved shared pose. While held, snapshots leave its
//   midpoint alone; only the authority sets it on the fulcrum. A departing grip leaves the other end usable.
// - See-saw bounces are one-off events: tilt is Local, and only the receiving tab launches its own player.
//
// Personal: your back, crates and gifts (each tab gets its own crate at each stretch), crystals, gold finds. Shared: the rungs,
// the money, the felled trees, the paths. A newcomer inherits every rung without earning it again.
import * as THREE from 'three/webgpu';
import {
  addPresenceField,
  keepPresenceWhile,
  net,
  onPeerRemoved,
  onRemotePresence,
  onRoomReady,
} from '../../netplay/net.ts';
import { world } from '../../world/sync.ts';
import { carry } from '../../physics/platforms.ts';
import { backSeam } from '../../features/haul-stack.ts';
import { drawHeaps, type Kind } from '../net/crates.ts';
import { clearMoments, showBanner } from './celebrate.ts';
import {
  MOST_STROKES,
  ROCK_LIST,
  TREES,
  back,
  chopHooks,
  putDownBig,
  shoulder,
  rockStruck,
  setTrunkTaken,
  standing,
  trunkTaken,
  type BigThing,
  type Rock,
  type Tree,
} from './chop.ts';
import { cartPlatform, rackTake, reconcileCart } from './depot.ts';
import { forge, takeRail } from './forge.ts';
import { COOP, applyShared, captureShared, count, job, num, save } from './job.ts';
import { GOODS, TUNE, type Goods } from './layout.ts';
import { allHeaps, frameById, hub, lines, machine } from './lines.ts';
import { chips, clearTrips } from './pieces.ts';
import { callTrain } from './rail.ts';
import type { TrainSave } from './cargo.ts';
import { flyToStock, type StationRun } from './stations.ts';

type Api = {
  snapAll: () => void;
  putMachine: (j: unknown) => void;
  run: { mode: string; head: number; line: { k: number; stage: number } };
  startOver: () => void;
  wake: (fromPeer: boolean) => void;
  beginFeed: (l: (typeof lines)[number], st: StationRun) => void;
  finishStretch: (l: (typeof lines)[number]) => void;
  landAtStation: (st: StationRun, kind: Goods, counted: boolean) => void;
  setStationTags: () => void;
  placeMachine: () => void;
  clearIncoming: () => void;
  stationOf: (l: (typeof lines)[number]) => StationRun | null;
  // Set later by the modules that own them.
  rung?: (id: unknown) => void;
  forgeBill?: () => void;
  wakeTrains?: (fromPeer: boolean) => void;
  activeFrame?: () => StationRun | null;
  tech?: (what: unknown) => void;
};
let api: Api | null = null;
let skipsFns: Record<string, () => void> = {};
/** Later hooks, from modules that import this one. */
export const coopWire: Pick<Api, 'rung' | 'forgeBill' | 'wakeTrains' | 'activeFrame' | 'tech'> = {};
export const pairHook = {
  msg: null as ((m: Record<string, unknown>) => void) | null,
  busy: null as (() => boolean) | null,
};

// ---------------------------------------------------------------- the whole shared state, once a second
type Snap = { gen: number; shared: Record<string, unknown> };
let gen = 0, // counts Start overs: an older state can't come back after one
  since = -1, // the world tick this tab got here: the oldest visible tab is the authority
  ready = false,
  synced = false, // has taken the authority's state since arriving
  waiting: Snap | null = null,
  hbAt = 0,
  miss = 0,
  modeMiss = 0,
  numMiss = 0;

type SharedLines = { stage: number; open: boolean; pile: number; have: number[][] }[];
const linesOf = (j: Record<string, unknown>) => (j.lines as SharedLines | undefined) ?? [];
const score = (j: Record<string, unknown>) => {
  const q = j.job as { awake?: boolean } | undefined;
  return (
    (q?.awake ? 1 : 0) + linesOf(j).reduce((a, l) => a + l.stage * 100 + l.have.flat().reduce((b, h) => b + h, 0), 0)
  );
};
const snapshot = (): Snap => ({ gen, shared: captureShared() });
function validSnap(j: unknown): j is Snap {
  const q = j as Snap | null;
  if (!q || !count(q.gen) || !q.shared || typeof q.shared !== 'object') return false;
  const ls = linesOf(q.shared);
  if (!Array.isArray(ls) || ls.length !== lines.length) return false;
  return ls.every((l, k) => {
    const mine = lines[k]!;
    return (
      l &&
      count(l.stage, mine.stations.length) &&
      typeof l.open === 'boolean' &&
      Array.isArray(l.have) &&
      l.have.length === mine.stations.length &&
      l.have.every((h) => Array.isArray(h) && h.length === GOODS.length && h.every((n) => count(n, 400)))
    );
  });
}

/** Everything shared, from the authority's state. Your back, gifts, crystals and finds stay yours. */
function applyFull(a: Api, j: Snap) {
  gen = j.gen;
  clearMoments();
  clearTrips();
  back.incoming = 0;
  a.clearIncoming();
  applyShared(j.shared);
  reconcileBig();
  a.run.mode = 'asleep';
  a.snapAll();
  a.putMachine(j.shared.run);
  save();
}

const discrete = (j: Record<string, unknown>) => {
  const q = j.job as {
    awake: boolean;
    turned: boolean;
    rung: unknown;
    tech: unknown;
    gate: unknown;
    boiler: number;
    forgeBill: number;
    longBeam?: { set: boolean };
  };
  const r = j.run as { k: number };
  return JSON.stringify([
    q.awake,
    q.turned,
    q.rung,
    q.tech,
    q.gate,
    q.boiler,
    q.forgeBill,
    q.longBeam?.set ?? false,
    r.k,
    linesOf(j).map((l) => [l.stage, l.open]),
  ]);
};
const volatile = (j: Record<string, unknown>) => {
  const q = j.job as { people: number; wood: number; stone: number; loose: number };
  const h = j.heaps as { hub: number; dock: number; yard: number };
  return JSON.stringify([
    q.people,
    q.wood,
    q.stone,
    q.loose,
    h,
    linesOf(j).map((l) => l.pile),
    j.depot && (j.depot as { logs: number }).logs,
    j.depot && (j.depot as { rails: number }).rails,
    j.depot && (j.depot as { cartRails: number }).cartRails,
  ]);
};

/** Each second, on a follower: the same run? Small numbers settle on their own; what stays different gets put right. */
function reconcile(a: Api, j: Snap) {
  reconcileCart(j.shared.depot);
  const mine = captureShared();
  miss = discrete(j.shared) === discrete(mine) ? 0 : miss + 1;
  const theirRun = j.shared.run as { mode: string; k: number; head: number };
  const myRun = a.run;
  modeMiss = theirRun.mode === myRun.mode ? 0 : modeMiss + 1;
  if (miss >= 3 || modeMiss >= 5) {
    miss = modeMiss = numMiss = 0;
    return applyFull(a, j);
  }
  // Riding the machine together: the same head, near enough.
  if (
    theirRun.mode === myRun.mode &&
    theirRun.k === myRun.line.k &&
    (myRun.mode === 'laying' || myRun.mode === 'running')
  )
    if (Math.abs(theirRun.head - myRun.head) > 1.5) myRun.head = theirRun.head;
  // The trains: nudged to the authority's place, so a rider stays on your copy of the deck.
  const trains = Array.isArray(j.shared.trains) ? (j.shared.trains as (TrainSave | null)[]) : [];
  lines.forEach((l, k) => {
    const t = trains?.[k];
    if (
      !t ||
      !l.train.clockRunning() ||
      !num(t.s) ||
      !num(t.v) ||
      Math.abs(t.v) > TUNE.cruise ||
      !count(t.target, l.train.tr.stops.length - 1) ||
      !num(t.dwell) ||
      (t.sweep !== 1 && t.sweep !== -1)
    )
      return;
    const d = t.s - l.train.tr.s;
    if (Math.abs(d) > 8) {
      nudge[k] = 0;
      l.train.put(
        t.s,
        t.v,
        t.target,
        t.sweep,
        t.dwell,
        typeof t.express === 'boolean' ? t.express : l.train.tr.express,
      );
    } else {
      nudge[k] = d;
      l.train.tr.target = t.target;
      l.train.tr.sweep = t.sweep;
      l.train.tr.v = t.v;
      l.train.tr.dwell = t.dwell;
      l.train.tr.stop = t.dwell > 0 ? t.target : -1;
      if (typeof t.express === 'boolean') l.train.tr.express = t.express;
    }
  });
  // The current frame's stack, when nothing's in the air here.
  const st = coopWire.activeFrame?.();
  if (st && !GOODS.some((g) => st.coming[g])) {
    const ls = linesOf(j.shared);
    let h: number[] | undefined;
    for (const [k, l] of ls.entries()) {
      const n = lines[k]!.stations.indexOf(st);
      if (n >= 0) h = l.have[n];
    }
    if (!h) h = j.shared.forgeFrame as number[] | undefined;
    if (h && GOODS.some((g, m) => h![m] !== st.have[g])) {
      GOODS.forEach((g, m) => (st.have[g] = h![m]!));
      st.drawStock(st.have);
      st.setTag(true);
    }
  }
  // What's fallen stays fallen; money follows the authority.
  const felled = j.shared.felled as { trees?: unknown[] } | undefined;
  if (Array.isArray(felled?.trees)) {
    const q = (j.shared.felled as { trees: number[]; yaw: number[]; trunk?: boolean }) ?? {};
    q.trees.forEach((k, n) => {
      const t = TREES[k];
      if (t && standing(t)) {
        t.fallYaw = q.yaw?.[n] ?? 0;
        t.fall = 0;
      }
    });
    if ((q.trunk === true) !== trunkTaken()) setTrunkTaken(q.trunk === true);
  }
  Object.assign(job.score, (j.shared.job as typeof job).score);
  const theirs = (j.shared.job as typeof job).longBeam;
  if (!pairHook.busy?.() && theirs && typeof theirs === 'object' && num(theirs.x) && num(theirs.z) && num(theirs.yaw))
    Object.assign(job.longBeam, { x: theirs.x, z: theirs.z, yaw: theirs.yaw, set: theirs.set === true });
  // Crates and people: each tab counts them as they land, so a moment's difference is normal.
  numMiss = volatile(j.shared) === volatile(mine) ? 0 : numMiss + 1;
  if (numMiss < 4) return;
  numMiss = 0;
  applyShared({
    ...mine,
    job: pairHook.busy?.() ? { ...(j.shared.job as typeof job), longBeam: { ...job.longBeam } } : j.shared.job,
    heaps: j.shared.heaps,
    lines: j.shared.lines,
    depot: j.shared.depot,
    forge: j.shared.forge,
  });
  drawHeaps(allHeaps);
}
const nudge = lines.map(() => 0);

function onSnap(a: Api, j: Snap, force: boolean) {
  if (!ready) return void (waiting = j);
  if (!synced) {
    synced = true;
    // A fresh room, and you've come with a save: the room takes yours rather than wiping it.
    const mine = snapshot();
    if (!force && score(j.shared) === 0 && score(mine.shared) > 0) return void msg({ k: 'mine', snap: mine });
    return applyFull(a, j);
  }
  if (j.gen < gen) return; // from before a Start over
  if (force || j.gen > gen) return applyFull(a, j);
  reconcile(a, j);
  reconcileBig();
}

function reconcileBig() {
  if ((back.big === 'beam' && !trunkTaken()) || (back.big === 'boiler' && job.boiler !== 2)) putDownBig();
}

// ---------------------------------------------------------------- who's here, and who decides
const peers = new Map<string, { since: number; visible: boolean; seen: number; railCart: boolean; rideCart: number }>();
const peerBack = new Map<string, number>();
const peerBig = new Map<string, BigThing>();
const SEEN_MS = 5000; // no presence for this long (a tab stuck or gone): it doesn't decide
/** The tab that decides, null for this one. */
function authorityPeer(): string | null {
  const now = performance.now();
  let best: string | null = null,
    bestSince = document.hidden ? Infinity : since < 0 ? Infinity : since,
    bestId = net.myPeer ?? '';
  for (const [id, p] of peers) {
    if (!p.visible || now - p.seen > SEEN_MS) continue;
    if (p.since < bestSince || (p.since === bestSince && id < bestId)) {
      best = id;
      bestSince = p.since;
      bestId = id;
    }
  }
  return best;
}
const amAuthority = () => authorityPeer() === null;

function msg(m: Record<string, unknown>) {
  try {
    net.room?.send({ t: 'placeCoop', ...m });
  } catch (e) {
    console.warn('[place coop] send failed', e);
  }
}
// A few dozen a second is far past anything real (a back unloads at 11 a second).
const budget = new Map<string, { n: number; at: number }>();
function allow(from: string) {
  const now = performance.now();
  let b = budget.get(from);
  if (!b) budget.set(from, (b = { n: 40, at: now }));
  b.n = Math.min(40, b.n + ((now - b.at) / 1000) * 30);
  b.at = now;
  if (b.n < 1) return false;
  b.n--;
  return true;
}

// ---------------------------------------------------------------- deposits
const pending: { q: number; kind: Goods; to: string }[] = [];
let depQ = 0;
function settle(q: number, kind: Goods, from: string) {
  const k = pending.findIndex((p) => p.to === from && p.kind === kind && (q === 0 || p.q === q));
  if (k < 0) return false;
  pending.splice(k, 1);
  return true;
}
function refund(kind: Goods) {
  if (kind === 'beam') {
    if (!back.big) shoulder('beam');
  } else back[kind]++;
}
const flyFrom = new THREE.Vector3();
function flyIn(a: Api, st: StationRun, kind: Goods, x: number, y: number, z: number, n: number, counted: boolean) {
  flyFrom.set(x, y + 0.9, z);
  flyToStock(st, kind, n, flyFrom, () => a.landAtStation(st, kind, counted));
}
const shownNow = (st: StationRun) => {
  const out = { logs: 0, rails: 0, stone: 0, beam: 0 };
  for (const g of GOODS) out[g] = Math.max(0, st.have[g] - st.coming[g]);
  return out;
};
const isKind = (v: unknown): v is Goods => GOODS.includes(v as Goods);

function onMsg(a: Api, m: Record<string, unknown>, from: string) {
  const { run } = a;
  switch (m.k) {
    case 'snap': {
      if (from !== authorityPeer() && !m.force) return;
      if (validSnap(m.snap)) onSnap(a, m.snap, !!m.force);
      return;
    }
    case 'mine': {
      if (!amAuthority() || !validSnap(m.snap) || score(captureShared()) > 0) return;
      applyFull(a, m.snap);
      msg({ k: 'snap', snap: snapshot(), force: true });
      return;
    }
    case 'reset': {
      if (!count(m.gen) || m.gen <= gen) return;
      gen = m.gen;
      a.startOver();
      showBanner('Started over', 'Your partner reset the railway for you both.', 3);
      return;
    }
    case 'cartCall':
    case 'cartLoad':
    case 'beamSet':
    case 'beamBounce':
      if (ready) pairHook.msg?.(m);
      return;
    case 'cartRide':
      if (ready && from === authorityPeer()) pairHook.msg?.(m);
      return;
    case 'wake':
      if (ready && run.mode === 'asleep') a.wake(true);
      return;
    case 'chop': {
      const t = count(m.i, TREES.length - 1) ? TREES[m.i] : null;
      if (!t || !count(m.n, MOST_STROKES) || !num(m.y) || !ready || !standing(t)) return;
      t.strokes = Math.max(t.strokes, m.n);
      t.shake = 1;
      chips(t.x, t.y + 1.1, t.z, 8);
      if (m.fell === true) {
        t.fall = 0;
        t.fallYaw = m.y;
      }
      return;
    }
    case 'rock': {
      const q = count(m.i, ROCK_LIST.length - 1) ? ROCK_LIST[m.i] : null;
      if (q && count(m.n, 8) && ready) rockStruck(q, m.n);
      return;
    }
    case 'rung':
      if (ready) a.rung?.(m.id);
      return;
    case 'tech':
      if (ready) a.tech?.(m.what);
      return;
    case 'bill':
      if (ready) a.forgeBill?.();
      return;
    case 'big':
      if (!ready) return;
      if (m.what === 'beam' || m.what === 'boiler') peerBig.set(from, m.what);
      if (m.what === 'beam') setTrunkTaken(true);
      else if (m.what === 'boiler') job.boiler = 2;
      return;
    case 'fit':
      if (ready) a.wakeTrains?.(true);
      return;
    case 'express':
      if (count(m.l, lines.length - 1)) expressNow(lines[m.l]!.train.tr);
      return;
    case 'call': {
      const l = count(m.l, lines.length - 1) ? lines[m.l] : null;
      if (l && l.train.clockRunning() && count(m.stop, l.spec.stops.length - 1)) callTrain(l.train.tr, m.stop);
      return;
    }
    case 'dep': {
      if (!ready || (typeof m.to === 'string' ? m.to !== net.myPeer : !amAuthority())) return;
      const st = frameById(m.id);
      if (!st || !isKind(m.kind) || !num(m.x) || !num(m.y) || !num(m.z)) return;
      const q = count(m.q) ? m.q : 0;
      if (!amAuthority() || coopWire.activeFrame?.() !== st || st.wants(m.kind) <= 0)
        return msg({ k: 'no', to: from, kind: m.kind, q });
      st.coming[m.kind]++;
      const slot = st.have[m.kind] + st.coming[m.kind] - 1;
      flyIn(a, st, m.kind, m.x, m.y, m.z, slot, true);
      sendStock(st, from, m.kind, m.x, m.y, m.z, q);
      return;
    }
    case 'no':
      if (m.to === net.myPeer && isKind(m.kind) && settle(count(m.q) ? m.q : 0, m.kind, from)) refund(m.kind);
      return;
    case 'stock': {
      if (!ready) return;
      const st = frameById(m.id);
      if (!st || !isKind(m.kind) || !Array.isArray(m.have) || !num(m.x) || !num(m.y) || !num(m.z)) return;
      if (m.by === net.myPeer) {
        // Acceptance stays acceptance even if a presence gap briefly made us the authority,
        // or the frame already advanced. Never refund an accepted piece.
        settle(count(m.q) ? m.q : 0, m.kind, from);
      }
      if (amAuthority() || coopWire.activeFrame?.() !== st) return;
      GOODS.forEach((g, n) => {
        const v = (m.have as unknown[])[n];
        if (count(v, 400)) st.have[g] = v;
      });
      if (m.by !== net.myPeer) {
        st.coming[m.kind]++;
        flyIn(a, st, m.kind, m.x, m.y, m.z, st.have[m.kind] - 1, false);
      }
      st.drawStock(shownNow(st));
      st.setTag(true);
      return;
    }
    case 'feed': {
      if (!ready) return;
      const st = frameById(m.id);
      const l = lines[run.line.k]!;
      if (!st || a.stationOf(l) !== st || run.mode !== 'idle') return;
      for (const g of GOODS) st.have[g] = st.need(g);
      st.drawStock(st.have);
      a.beginFeed(l, st);
      return;
    }
    case 'stretch': {
      if (!ready) return;
      const st = frameById(m.id);
      const l = lines[run.line.k]!;
      if (!st || a.stationOf(l) !== st) return;
      if (run.mode !== 'laying' && run.mode !== 'feeding') return;
      const to = st.spec.to;
      run.head = to;
      machine.at(l.spec.line, to, l.spec.dir);
      l.track.layTo(l.track.u(to));
      a.finishStretch(l);
      return;
    }
    case 'took': {
      if (!ready || !count(m.n, 64)) return;
      if (m.what === 'rack') rackTake(m.n, count(m.r, 64) ? m.r : 0);
      else
        for (let k = 0; k < m.n; k++) {
          if (m.what === 'rails' && forge.rails > 0) takeRail();
          else if (m.what === 'timber') {
            if (job.loose <= 0 && hub.list.length) {
              hub.list.pop();
              job.loose += TUNE.crateLogs;
            }
            job.loose = Math.max(0, job.loose - 1);
          }
        }
      if (m.what === 'timber') drawHeaps(allHeaps);
      return;
    }
    case 'skip': {
      if (!ready || !amAuthority() || typeof m.name !== 'string') return;
      const fn = Object.hasOwn(skipsFns, m.name) ? skipsFns[m.name] : null;
      if (!fn) return;
      coop.noHop = true;
      try {
        fn();
      } finally {
        coop.noHop = false;
      }
      msg({ k: 'snap', snap: snapshot(), force: true });
      return;
    }
  }
}
function sendStock(st: StationRun, by: string | null, kind: Goods, x: number, y: number, z: number, q = 0) {
  msg({
    k: 'stock',
    id: st.spec.id,
    kind,
    have: GOODS.map((g) => st.have[g] + st.coming[g]),
    by,
    q,
    x,
    y,
    z,
  });
}

// ---------------------------------------------------------------- the hooks
function expressNow(tr: (typeof lines)[number]['train']['tr']) {
  tr.express = true;
  // Already under way to a stop in between: on past it.
  if (tr.stop < 0) tr.target = tr.v >= 0 ? tr.stops.length - 1 : 0;
}
let startOverArmed = 0;
export const coop = {
  on: COOP,
  send: (m: Record<string, unknown>) => COOP && msg(m),
  /** Under the flag, and another tab decides. */
  follower: () => COOP && !amAuthority(),
  /** Legacy participants keep the existing manual cart: they cannot predict a dry-forge wait. */
  railCart: () =>
    !COOP || [...peers.values()].every((p) => !p.visible || performance.now() - p.seen > SEEN_MS || p.railCart),
  /** 1 = supports the bonus, 2 = riding. Missing/invalid capability keeps every cart at the legacy speed. */
  rideCart: () =>
    !COOP || [...peers.values()].every((p) => !p.visible || performance.now() - p.seen > SEEN_MS || p.rideCart > 0),
  cartRider: () =>
    COOP && [...peers.values()].some((p) => p.visible && performance.now() - p.seen <= SEEN_MS && p.rideCart === 2),
  /** The authority is running someone else's Skip: it doesn't move its own player. */
  noHop: false,
  /** What this tab has decided a station shows. */
  shown: (st: StationRun) =>
    COOP && !amAuthority()
      ? shownNow(st)
      : { logs: st.have.logs, rails: st.have.rails, stone: st.have.stone, beam: st.have.beam },
  woke: () => COOP && msg({ k: 'wake' }),
  /** A piece left your back for a frame. True: it counts when it lands (solo, or you decide). */
  deposited(st: StationRun, kind: Goods, p: { x: number; y: number; z: number }) {
    if (!COOP) return true;
    const to = authorityPeer();
    if (to === null) {
      sendStock(st, net.myPeer, kind, p.x, p.y, p.z);
      return true;
    }
    const q = ++depQ;
    pending.push({ q, kind, to });
    msg({ k: 'dep', id: st.spec.id, kind, q, to, x: p.x, y: p.y, z: p.z });
    return false;
  },
  fed: (st: StationRun) => COOP && amAuthority() && msg({ k: 'feed', id: st.spec.id }),
  stretched: (st: StationRun) => COOP && amAuthority() && msg({ k: 'stretch', id: st.spec.id }),
  took: (what: 'rails' | 'timber' | 'rack', n: number, r = 0) => COOP && n + r > 0 && msg({ k: 'took', what, n, r }),
  /** A chest opened here: the rung is everyone's. */
  rung: (id: string) => COOP && msg({ k: 'rung', id }),
  /** A device taken or a slab let down, here: the room's. */
  tech: (what: string) => COOP && msg({ k: 'tech', what }),
  forgeBill: () => COOP && msg({ k: 'bill' }),
  big: (what: Exclude<BigThing, null>) => COOP && msg({ k: 'big', what }),
  boilerFitted: () => COOP && msg({ k: 'fit' }),
  express(l: number) {
    const tr = lines[l]!.train.tr;
    if (tr.express) return;
    expressNow(tr);
    if (COOP) msg({ k: 'express', l });
  },
  callTrain(l: number, stop: number) {
    callTrain(lines[l]!.train.tr, stop);
    if (COOP) msg({ k: 'call', l, stop });
  },
  /** The Start over button: with the flag it resets you both, so it asks once. */
  askStartOver(el: HTMLElement) {
    const now = performance.now();
    if (now > startOverArmed) {
      startOverArmed = now + 4000;
      el.textContent = 'Really? Resets you both';
      setTimeout(() => {
        if (performance.now() >= startOverArmed) el.textContent = 'Start over (both)';
      }, 4100);
      return;
    }
    startOverArmed = 0;
    el.textContent = 'Start over (both)';
    gen++;
    msg({ k: 'reset', gen });
    api?.startOver();
  },
  skips(s: Record<string, () => void>) {
    skipsFns = s;
  },
  /** A panel skip changes the shared run, so the authority does it and everyone takes the result. */
  skip(name: string, fn: () => void, hopMe?: () => void) {
    if (!COOP) return fn();
    if (amAuthority()) {
      fn();
      if (api) msg({ k: 'snap', snap: snapshot(), force: true });
    } else {
      msg({ k: 'skip', name });
      hopMe?.();
    }
  },
  /** The world and the save are loaded. */
  arrived() {
    if (!COOP || !api) return;
    since = world.tick;
    ready = true;
    if (waiting) {
      const j = waiting;
      waiting = null;
      onSnap(api, j, false);
    }
  },
  /** Each frame, once loaded. */
  tick(dt: number, now: number) {
    if (!COOP || !api || !ready) return;
    const a = api,
      lead = amAuthority();
    // Trains drift back to the authority's place.
    lines.forEach((l, k) => {
      const d = nudge[k]!;
      if (Math.abs(d) < 0.01) return;
      const step = d * Math.min(1, dt * 1.5);
      l.train.tr.s += step;
      nudge[k] = d - step;
    });
    if (!lead) return;
    // Taking over: a full frame nobody started (the last authority left between the last log and the start).
    const l = lines[a.run.line.k]!;
    const st = a.stationOf(l);
    if (st && a.run.mode === 'idle' && st.full() && !GOODS.some((g) => st.coming[g])) {
      st.drawStock(st.have);
      a.beginFeed(l, st);
    }
    if (peers.size && now >= hbAt) {
      hbAt = now + 1000;
      msg({ k: 'snap', snap: snapshot() });
    }
  },
  /** Everything from ./index.ts; platforms get their stable ids for riders. */
  setup(a: Api) {
    if (!COOP) return;
    api = a;
    Object.assign(a, coopWire);
    const ids = (p: { id?: string; shared?: boolean }, id: string) => {
      p.id = id;
      p.shared = true;
    };
    ids(cartPlatform, 'place:cart');
    ids(machine.flatbed.platform, 'place:flatbed');
    ids(machine.loco.platform, 'place:loco');
    for (const l of lines) l.train.tr.cars.forEach((c, n) => ids(c.platform, `place:train${l.k}:car${n}`));
    chopHooks.stroke = (t: Tree) => msg({ k: 'chop', i: t.index, n: t.strokes, y: t.fallYaw, fell: t.fall >= 0 });
    chopHooks.rock = (q: Rock) => msg({ k: 'rock', i: q.index, n: q.strokes });
    addPresenceField('placeCoop', () => (since >= 0 ? since : null));
    addPresenceField('placeRailCart', () => (since >= 0 ? 1 : null));
    addPresenceField('placeCartRide', () => (since >= 0 ? (carry.on === cartPlatform ? 2 : 1) : null));
    keepPresenceWhile(() => since >= 0);
    // Keep the legacy log count and cargo recovery fields; chop.ts draws the other worn loads.
    addPresenceField('placeBack', () => (back.logs > 0 ? back.logs : null));
    addPresenceField('placeBig', () => back.big);
    backSeam.remote = (peer) => peerBack.get(peer) ?? 0;
    onRemotePresence((r, pr) => {
      const b = (pr as { placeBack?: unknown }).placeBack;
      peerBack.set(r.peer, count(b, 64) ? b : 0);
      const big = (pr as { placeBig?: unknown }).placeBig;
      peerBig.set(r.peer, big === 'beam' || big === 'boiler' ? big : null);
      const v = (pr as { placeCoop?: unknown }).placeCoop;
      if (!count(v, Number.MAX_SAFE_INTEGER)) return void peers.delete(r.peer);
      if (!peers.has(r.peer)) showBanner('Your partner is here', 'Same railway, same job.', 2.6);
      peers.set(r.peer, {
        since: v,
        visible: r.visible,
        seen: performance.now(),
        railCart: pr.placeRailCart === 1,
        rideCart: pr.placeCartRide === 1 || pr.placeCartRide === 2 ? pr.placeCartRide : 0,
      });
    });
    onPeerRemoved((r) => {
      for (let k = pending.length - 1; k >= 0; k--)
        if (pending[k]!.to === r.peer) {
          refund(pending[k]!.kind);
          pending.splice(k, 1);
        }
      const big = peerBig.get(r.peer);
      // A last presence packet may precede a deposit/fit; never return a consumed piece.
      const beamDelivered = lines.some((l) => l.stations.some((st) => st.have.beam > 0 || st.coming.beam > 0));
      if (big === 'beam' && trunkTaken() && !beamDelivered) {
        setTrunkTaken(false);
        save();
      } else if (big === 'boiler' && job.boiler === 2) {
        job.boiler = 1;
        save();
      }
      budget.delete(r.peer);
      peerBack.delete(r.peer);
      peerBig.delete(r.peer);
      if (peers.delete(r.peer)) showBanner('Your partner left', 'The railway is still here. It just takes longer.', 3);
    });
    onRoomReady((room) => {
      room.onConnection((connected) => {
        // The survivors may have returned our cargo while we were gone. Rejoin
        // behind them, just as a newly visible tab does, and take their snapshot.
        if (!connected && since >= 0) {
          since = world.tick;
          synced = false;
        }
      });
      room.onMessage((raw, from) => {
        const m = raw as Record<string, unknown> | null;
        if (m?.t !== 'placeCoop' || typeof from !== 'string') return;
        const answer = m.k === 'stock' || m.k === 'no';
        const expected = answer && pending.some((p) => p.to === from && p.kind === m.kind && (!m.q || p.q === m.q));
        if (!(answer && (from === authorityPeer() || expected)) && !allow(from)) {
          if (m.k === 'dep' && (m.to === net.myPeer || (!m.to && amAuthority())) && isKind(m.kind))
            msg({ k: 'no', to: from, kind: m.kind, q: count(m.q) ? m.q : 0 });
          return;
        }
        try {
          onMsg(a, m, from);
        } catch (e) {
          console.warn('[place coop] bad message', e);
        }
      });
    });
    // Back from a hidden tab: behind on everything, so it goes to the back of the queue and catches up.
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && since >= 0) since = world.tick;
    });
  },
  /** For the test run. */
  debug: () => ({ amAuthority: amAuthority(), since, gen, peers: [...peers.keys()], shared: captureShared() }),
};
export type { Kind };
