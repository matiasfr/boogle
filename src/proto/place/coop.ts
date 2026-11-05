// Two players, one railway: `?proto=place&coop=1`, a throwaway for one playtest (real shared code comes through
// docs/plans/rail-slice.md). Serves DESIGN.md 4 (Cooperation is automatic). Research: docs/research/shared-construction.md,
// recommendations 2, 3, 9, 11 and 12. Without the flag every hook here is a no-op and nothing is sent.
//
// How it stays together, cheapest thing that works:
// - One authority: the oldest visible coop tab (presence key `placeCoopCargo2`, the world tick it got here). Not the room's lead,
//   which could be a tab without the flag, and not the lowest id, which a newcomer could take. It is the only tab that
//   accepts a deposit, starts a station's run and ends a stretch, so the last log can't start two runs and a frame can't
//   overfill: a deposit it can't take goes back on the sender's back.
// - Deposit answers match sender + request id before authority/frame guards. Slow presence isn't a rejection: only
//   an explicit rejection or actual peer removal returns a pending piece, never a wall-clock timeout.
// - Tree harvest is accepted once by that authority before material is awarded. A follower reserves capacity until its
//   matching receipt arrives; duplicate receipts cannot issue another log. The rest of the prototype still runs locally.
// - Cargo uses a versioned whole-place message/presence identity. Legacy clients remain visible in the underlying room,
//   but neither elect nor apply this prototype's state. This is still local-save prototype persistence, not server lockstep.
// - Once a second the authority sends the whole shared state (`captureShared`, ./job.ts: every slice registered there, so a new
//   system's state comes along for free). A newcomer takes it and is caught up, a follower that stays different for a few
//   seconds is put right, and a follower that takes over already has everything it needs.
// - Trains are nudged to the authority's place, and platforms get stable ids so a rider stands on your copy of the deck.
// - Big cargo claims and ground poses belong to this authority. Owner presence draws the carried cargo.
//   Departure returns it to its pickup; snapshots clear stale shoulders, including after reconnecting.
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
  remotes,
} from '../../netplay/net.ts';
import { world } from '../../world/sync.ts';
import { carry } from '../../physics/platforms.ts';
import { backSeam } from '../../features/haul-stack.ts';
import { drawHeaps, type Kind } from '../net/crates.ts';
import { playMark } from '../mark.ts';
import { clearMoments, showBanner } from './celebrate.ts';
import { resetGotHistory } from './got.ts';
import {
  ROCK_LIST,
  TREES,
  back,
  chopHooks,
  harvestTree,
  applyTreeHarvest,
  validTreeHarvest,
  receiveHarvest,
  reserveHarvest,
  releaseHarvest,
  putDownBig,
  shoulder,
  rockStruck,
  setTrunkTaken,
  trunkTaken,
  trunkDown,
  type BigThing,
  type Rock,
  type Tree,
  type HarvestResult,
} from './chop.ts';
import { cartPlatform, rackTake, reconcileCart } from './depot.ts';
import { forge, takeRail } from './forge.ts';
import { COOP, applyShared, captureShared, count, job, num, save, type Rungs } from './job.ts';
import { GOODS, TUNE, type Goods } from './layout.ts';
import { allHeaps, frameById, hub, lines, machine } from './lines.ts';
import { clearTrips } from './pieces.ts';
import { callTrain } from './rail.ts';
import type { TrainSave } from './cargo.ts';
import { COOP_IDENTITY, currentCoopPeer } from './coop-identity.ts';
import { flyToStock, type StationRun } from './stations.ts';
import {
  bigCargo,
  cargoGround,
  cargoFootprint,
  isBigCargo,
  moveCargo,
  validCargo,
  validGround,
  type BigCargo,
  type CargoState,
  type GroundCargo,
} from './big-cargo.ts';
import { H, insidePlace } from './terrain.ts';
import { me } from '../../player/player.ts';
import { PLAYER_R } from '../../constants.ts';
import { sweepSphere } from '../../physics/engine.ts';

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
  rungsChanged?: (before: Rungs, quiet: boolean) => void;
  techChanged?: (before: typeof job.tech, quiet: boolean) => void;
};
let api: Api | null = null;
let skipsFns: Record<string, () => void> = {};
/** Later hooks, from modules that import this one. */
export const coopWire: Pick<
  Api,
  'rung' | 'forgeBill' | 'wakeTrains' | 'activeFrame' | 'tech' | 'rungsChanged' | 'techChanged'
> = {};
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
function applyFull(a: Api, j: Snap, announce = true) {
  // A same-generation snapshot can precede our request on the authority's channel.
  // Keep that reservation/receipt alive; only a reset invalidates the transaction.
  if (j.gen !== gen) {
    bigPending = null;
    clearHarvest();
    resetGotHistory();
    announce = false;
  }
  gen = j.gen;
  clearMoments();
  clearTrips();
  back.incoming = 0;
  a.clearIncoming();
  applyCoopShared(j.shared, announce);
  for (const what of ['beam', 'boiler'] as const) acceptBig(what, bigCargo[what]);
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
  const q = j.job as { people: number; wood: number; stone: number; loose: number; kitSent: number };
  const h = j.heaps as { hub: number; dock: number; yard: number };
  return JSON.stringify([
    q.people,
    q.wood,
    q.stone,
    q.loose,
    q.kitSent,
    j.trainCargoV1,
    j.craneCargoV1,
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
  const cargo = j.shared.bigCargoV1 as Partial<typeof bigCargo> | undefined;
  for (const kind of ['beam', 'boiler'] as const) if (validCargo(cargo?.[kind])) acceptBig(kind, cargo[kind]);
  if (bigPending && bigPending.to !== authorityPeer()) bigPending = null;
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
  // Partial work and finite remaining output reconcile too, not just fallen IDs.
  const harvest = j.shared.treeHarvestV1;
  if (Array.isArray(harvest))
    for (const row of harvest) {
      if (!Array.isArray(row) || !count(row[0], TREES.length - 1) || !validTreeHarvest(row[1])) continue;
      const tree = TREES[row[0]]!;
      if (row[1].revision > tree.revision) applyTreeHarvest(tree, row[1]);
    }
  const felled = j.shared.felled as { trunk?: boolean } | undefined;
  if (felled && (felled.trunk === true) !== trunkTaken()) setTrunkTaken(felled.trunk === true);
  Object.assign(job.score, (j.shared.job as typeof job).score);
  const theirs = (j.shared.job as typeof job).longBeam;
  if (!pairHook.busy?.() && theirs && typeof theirs === 'object' && num(theirs.x) && num(theirs.z) && num(theirs.yaw))
    Object.assign(job.longBeam, { x: theirs.x, z: theirs.z, yaw: theirs.yaw, set: theirs.set === true });
  // Crates and people: each tab counts them as they land, so a moment's difference is normal.
  numMiss = volatile(j.shared) === volatile(mine) ? 0 : numMiss + 1;
  if (numMiss < 4) return;
  numMiss = 0;
  // Tree receipts above may be newer than `mine`, captured at the start of reconciliation.
  // Correcting a crate count must not roll their accepted work back to that earlier snapshot.
  const current = captureShared();
  // Cargo, motion and destination stock are one snapshot. Keeping our in-flight callbacks while
  // replacing only the rack/heaps can land the same crate twice (or discard it without delivery).
  applyFull(a, {
    ...j,
    shared: {
      ...j.shared,
      felled: current.felled,
      treeHarvestV1: current.treeHarvestV1,
      job: pairHook.busy?.() ? { ...(j.shared.job as typeof job), longBeam: { ...job.longBeam } } : j.shared.job,
    },
  });
}
const nudge = lines.map(() => 0);

function onSnap(a: Api, j: Snap, force: boolean) {
  if (!ready) return void (waiting = j);
  if (!synced) {
    synced = true;
    // A fresh room, and you've come with a save: the room takes yours rather than wiping it.
    const mine = snapshot();
    if (!force && score(j.shared) === 0 && score(mine.shared) > 0) return void msg({ k: 'mine', snap: mine });
    return applyFull(a, j, false);
  }
  if (j.gen < gen) return; // from before a Start over
  if (force || j.gen > gen) return applyFull(a, j);
  reconcile(a, j);
  reconcileBig();
}

let returningBig: BigThing = null;
const beamDelivered = () => lines.some((l) => l.stations.some((st) => st.have.beam > 0 || st.coming.beam > 0));
function reconcileBig() {
  if (returningBig !== back.big) returningBig = null;
  // Availability alone is insufficient after reconnect: a survivor may already have picked up the returned cargo.
  // Only our pre-disconnect shoulder yields here. A lone/transient reconnect keeps it if nobody reclaimed it.
  const reclaimed =
    returningBig &&
    bigCargo[returningBig].revision === 0 &&
    [...peerBig].some(([peer, big]) => remotes.has(peer) && big === returningBig);
  const consumed = back.big === 'beam' && beamDelivered();
  const state = back.big ? bigCargo[back.big] : null;
  // An adopted legacy holder is binding even before its first revisioned move.
  const lost = state && (state.revision > 0 || state.holder !== null) && state.holder !== cargoPeer();
  if (
    lost ||
    (back.big === 'beam' && !trunkTaken()) ||
    (back.big === 'boiler' && job.boiler !== 2) ||
    reclaimed ||
    consumed
  ) {
    putDownBig();
    returningBig = null;
  }
}

// ---------------------------------------------------------------- who's here, and who decides
type Peer = { since: number; visible: boolean; seen: number; railCart: boolean; rideCart: number };
const peers = new Map<string, Peer>();
const peerBack = new Map<string, number>();
const peerBig = new Map<string, BigThing>();
const SEEN_MS = 5000; // no presence for this long (a tab stuck or gone): it doesn't decide
const present = (p: Peer, now = performance.now()) => p.visible && now - p.seen <= SEEN_MS;
const allPeersSupport = (supports: (p: Peer) => boolean) =>
  !COOP || [...peers.values()].every((p) => !present(p) || supports(p));
/** The tab that decides, null for this one. */
function authorityPeer(): string | null {
  const now = performance.now();
  let best: string | null = null,
    bestSince = document.hidden ? Infinity : since < 0 ? Infinity : since,
    bestId = net.myPeer ?? '';
  for (const [id, p] of peers) {
    if (!present(p, now)) continue;
    if (p.since < bestSince || (p.since === bestSince && id < bestId)) {
      best = id;
      bestSince = p.since;
      bestId = id;
    }
  }
  return best;
}
const amAuthority = () => authorityPeer() === null;

// Pickup and Drop share the existing prototype authority, never the personal dropped-pile save.
const cargoPeer = () => (COOP ? (net.myPeer ?? '') : 'solo');
export type BigCargoRequest = {
  k: 'bigMove';
  what: BigCargo;
  action: 'pick' | 'drop';
  revision: number;
  p: GroundCargo;
  to: string;
  gen: number;
};
export type BigCargoReply = {
  k: 'bigState';
  what: BigCargo;
  state: CargoState;
  gen: number;
  to?: string;
  revision?: number;
};
let cargoReadyAt = 0;
let groundCheckAt = 0;
/** The active receiver must have room before this one-off load can fill a back. */
export const beamNeeded = () => (coopWire.activeFrame?.()?.wants('beam') ?? 0) > 0;
const cargoHeight = (x: number, z: number) => (insidePlace(x, z) ? H(x, z) : null);
function recoverGroundCargo(now: number) {
  if (now < groundCheckAt) return;
  groundCheckAt = now + 1000;
  // A freshness election is not a departure. Do not return an old ground pose
  // while a connected but stalled authority may already have accepted a pickup.
  if (COOP && (document.hidden || [...peers.values()].some((p) => !present(p)))) return;
  for (const what of ['beam', 'boiler'] as const) {
    const s = bigCargo[what],
      p = s.ground;
    if (!p || s.holder !== null || (what === 'beam' ? beamDelivered() : job.boiler === 3)) continue;
    // A dropped beam is itself solid. Check overhead clearance and a standing
    // approach on either side or end, without treating its own collider as a blockage.
    const clear = (x: number, y: number, z: number) =>
      sweepSphere({ x, y: y + 1.5, z }, { x, y: y + 1, z }, 0.35, { mask: 0xfffe, thin: 'skip' }) < 0;
    const approaches = [
      [2.4, 0],
      [-2.4, 0],
    ];
    if (what === 'beam') approaches.push([0, 5.9], [0, -5.9]);
    const approach =
      validGround(p) &&
      approaches.some(([side = 0, end = 0]) => {
        const x = p.x + Math.cos(p.yaw) * side + Math.sin(p.yaw) * end,
          z = p.z - Math.sin(p.yaw) * side + Math.cos(p.yaw) * end,
          h = cargoHeight(x, z);
        return (
          h !== null &&
          h >= 2.5 &&
          Math.abs(h - p.y) < 0.4 &&
          sweepSphere({ x, y: h + 2.4, z }, { x, y: h + 0.9, z }, 0.45, { mask: 0xfffe, thin: 'skip' }) < 0 &&
          sweepSphere({ x, y: h + 2.1, z }, { x: p.x, y: p.y + 2.1, z: p.z }, 0.35, { mask: 0xfffe, thin: 'skip' }) < 0
        );
      });
    if (
      (what === 'beam' ? !trunkDown() : job.boiler !== 1) ||
      !cargoFootprint(what, p, cargoHeight, clear) ||
      !approach
    ) {
      if (what === 'boiler') job.boiler = 1;
      returnBig(what);
      if (COOP) msg({ k: 'bigState', what, state: bigCargo[what], gen } satisfies BigCargoReply);
    }
  }
}
let bigPending: (Omit<BigCargoRequest, 'k'> & { retryAt: number }) | null = null;
function retryBig(now: number) {
  const p = bigPending;
  if (!p || !synced || now < p.retryAt) return;
  // Retry the original compare-and-swap, never a new claim at the latest revision.
  // A newer accepted state, reset or different authority ends this request.
  if (p.gen !== gen || p.to !== authorityPeer() || p.revision !== bigCargo[p.what].revision) {
    bigPending = null;
    return;
  }
  p.retryAt = now + 1000;
  msg({
    k: 'bigMove',
    what: p.what,
    action: p.action,
    revision: p.revision,
    p: p.p,
    to: p.to,
    gen: p.gen,
  } satisfies BigCargoRequest);
}
function acceptBig(what: BigCargo, state: CargoState) {
  const changed = JSON.stringify(bigCargo[what]) !== JSON.stringify(state);
  bigCargo[what] = structuredClone(state);
  if (what === 'beam') {
    const taken = state.holder !== null || beamDelivered();
    if (changed || trunkTaken() !== taken) setTrunkTaken(taken);
  } else if (job.boiler !== 0 && job.boiler !== 3) job.boiler = state.holder !== null ? 2 : 1;
  if (bigPending?.what === what && state.revision > bigPending.revision) {
    bigPending = null;
  }
  // The accepted holder survives an election or a lost local request. A deposit
  // reservation still owns its in-flight beam and must never regrow a shoulder.
  if (
    state.holder === cargoPeer() &&
    back.big !== what &&
    !pending.some((p) => p.kind === what) &&
    (what === 'beam' ? !beamDelivered() : job.boiler === 2)
  ) {
    shoulder(what);
    if (what === 'beam') playMark('great beam shouldered');
  }
  reconcileBig();
}
function returnBig(what: BigCargo) {
  // Same source recovery as departure; consumed cargo must never reappear.
  const s = bigCargo[what];
  acceptBig(what, { revision: s.revision + 1, holder: null, ground: null });
  save();
}
function finishBig(what: BigCargo) {
  const s = bigCargo[what];
  if (s.holder !== null || s.ground !== null) bigCargo[what] = { revision: s.revision + 1, holder: null, ground: null };
}
function decideBig(what: BigCargo, action: 'pick' | 'drop', by: string, revision: number, p: GroundCargo) {
  // Freshness can elect a temporary authority before a stalled peer actually leaves.
  // Do not grant a second claim during that uncertainty; actual departure removes the gate.
  if (COOP && (document.hidden || [...peers.values()].some((p) => !present(p)))) return false;
  if (action === 'pick' && Object.values(bigCargo).some((s) => s.holder === by)) return false;
  const available = what === 'beam' ? trunkDown() && !beamDelivered() && beamNeeded() : job.boiler === 1;
  if (action === 'pick' && !available) return false;
  if (action === 'drop' && (what === 'beam' ? beamDelivered() : job.boiler === 3)) return false;
  const ground =
    action === 'drop'
      ? cargoGround(
          what,
          p,
          cargoHeight,
          (x, y, z) =>
            sweepSphere({ x: p.x, y: p.y + 1.1, z: p.z }, { x, y, z }, 0.7, { mask: 0xfffe, thin: 'skip' }) < 0,
        )
      : null;
  const next = moveCargo(bigCargo[what], by, revision, action, ground);
  if (!next) return false;
  if (action === 'drop' && !ground) returnBig(what);
  else acceptBig(what, next);
  save();
  return true;
}
function requestBig(what: BigCargo, action: 'pick' | 'drop') {
  if (!me.body || bigPending || (action === 'pick' && back.big)) return false;
  if (COOP && (!ready || (!amAuthority() && !synced))) return false;
  const p = { x: me.body.position.x, y: me.body.position.y - PLAYER_R, z: me.body.position.z, yaw: me.yaw };
  // Adopt a legacy personal shoulder once; subsequent requests always require its accepted owner.
  if (action === 'drop' && bigCargo[what].revision === 0 && back.big === what) bigCargo[what].holder = cargoPeer();
  const revision = bigCargo[what].revision,
    to = COOP ? authorityPeer() : null;
  if (to) {
    bigPending = { what, to, revision, action, p, gen, retryAt: 0 };
    retryBig(performance.now());
  } else {
    if (!decideBig(what, action, cargoPeer(), revision, p)) return false;
    if (COOP) msg({ k: 'bigState', what, state: bigCargo[what], gen } satisfies BigCargoReply);
  }
  return true;
}

function msg(m: Record<string, unknown>) {
  try {
    net.room?.send({ t: COOP_IDENTITY, ...m });
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

// ---------------------------------------------------------------- finite tree harvest
// One outstanding request per player. No timeout or election can manufacture an award.
type HarvestPending = { q: number; i: number; room: number; to: string; gen: number };
export type HarvestReceipt = { q: number; i: number; gen: number; by: string; result: HarvestResult };
let harvestPending: HarvestPending | null = null;
let harvestQ = 0;
const harvestReceipts = new Map<string, HarvestReceipt>();
let harvestAuthority: string | null = null;
function clearHarvest(resetReceipts = true) {
  if (harvestPending) releaseHarvest(harvestPending.room);
  harvestPending = null;
  if (resetReceipts) harvestReceipts.clear();
}
function applyCoopShared(shared: Record<string, unknown>, announce = true) {
  const rung = { ...job.rung },
    tech = { ...job.tech };
  applyShared(shared);
  // The felled slice rebuilds trees and clears local reservations. A same-generation
  // request still owns this capacity until its receipt, even across full reconciliation.
  if (harvestPending) reserveHarvest(harvestPending.room);
  coopWire.rungsChanged?.(rung, !announce);
  coopWire.techChanged?.(tech, !announce);
}
function validResult(value: unknown): value is HarvestResult {
  const r = value as HarvestResult | null;
  return !!(
    r &&
    validTreeHarvest(r.state) &&
    count(r.logs, 5) &&
    ['bite', 'rebound', 'full', 'gone'].includes(r.outcome) &&
    (r.outcome === 'bite' || r.logs === 0)
  );
}
function broadcastHarvest(receipt: HarvestReceipt) {
  msg({ k: 'harvested', ...receipt });
}
function requestHarvest(t: Tree, room: number, axe: number, yaw: number) {
  if (!ready || harvestPending) return;
  const to = authorityPeer();
  harvestAuthority = to;
  if (to === null) {
    const result = harvestTree(t, room, axe, yaw);
    receiveHarvest(t, result, true);
    broadcastHarvest({ q: ++harvestQ, i: t.index, gen, by: net.myPeer ?? '', result });
    return;
  }
  // Do not spend a tree from a private save before the first shared snapshot arrives.
  if (!synced) return;
  const q = ++harvestQ;
  harvestPending = { q, i: t.index, room, to, gen };
  reserveHarvest(room);
  msg({ k: 'harvest', q, i: t.index, room, axe, yaw, to, gen });
}

// ---------------------------------------------------------------- deposits
// Authority observes accepted contributions only; keep this telemetry local and out of the shared job.
const recentDeposits = new Map<string, { by: string; at: number }>();
function markContribution(st: StationRun, by: string | null) {
  if (!by) return;
  const now = performance.now();
  const previous = recentDeposits.get(st.spec.id);
  if (previous && previous.by !== by && now - previous.at <= 30000) {
    playMark('co-op station work', { frame: st.spec.id });
  }
  recentDeposits.set(st.spec.id, { by, at: now });
}
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
      if (from !== authorityPeer()) return;
      if (validSnap(m.snap)) onSnap(a, m.snap, !!m.force);
      return;
    }
    case 'mine': {
      if (!amAuthority() || !validSnap(m.snap) || score(captureShared()) > 0) return;
      applyFull(a, m.snap, false);
      msg({ k: 'snap', snap: snapshot(), force: true });
      return;
    }
    case 'reset': {
      if (!count(m.gen) || m.gen <= gen) return;
      bigPending = null;
      clearHarvest();
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
    case 'harvest': {
      if (!ready || m.to !== net.myPeer || !count(m.q) || m.q === 0 || !count(m.i, TREES.length - 1)) return;
      if (
        !amAuthority() ||
        m.gen !== gen ||
        !peers.has(from) ||
        !job.rung.multi ||
        !count(m.room, 5) ||
        !count(m.axe, 1) ||
        m.axe > job.rung.axe ||
        !num(m.yaw) ||
        Math.abs(m.yaw) > Math.PI * 2
      )
        return msg({ k: 'harvestNo', to: from, q: m.q, i: m.i, gen: m.gen });
      const previous = harvestReceipts.get(from);
      if (previous && previous.gen === gen && m.q <= previous.q) {
        if (m.q === previous.q && m.i === previous.i) broadcastHarvest(previous);
        return;
      }
      const tree = TREES[m.i]!;
      const result = harvestTree(tree, m.room, m.axe, m.yaw);
      receiveHarvest(tree, result, false);
      const receipt = { q: m.q, i: m.i, gen, by: from, result };
      harvestReceipts.set(from, receipt);
      broadcastHarvest(receipt);
      return;
    }
    case 'harvested': {
      if (!ready || m.gen !== gen || !count(m.i, TREES.length - 1) || !count(m.q) || !validResult(m.result)) return;
      const p = harvestPending;
      const own = !!(p && m.by === net.myPeer && p.to === from && p.q === m.q && p.i === m.i && p.gen === m.gen);
      if (from !== authorityPeer()) return;
      const tree = TREES[m.i]!;
      if (own) {
        if (m.result.logs > p!.room) return;
        releaseHarvest(p!.room);
        harvestPending = null; // consume before effects/save: a duplicate receipt cannot award again
        receiveHarvest(tree, m.result, true);
      } else if (m.result.state.revision > tree.revision) receiveHarvest(tree, m.result, false);
      return;
    }
    case 'harvestNo': {
      const p = harvestPending;
      if (p && m.to === net.myPeer && p.to === from && p.q === m.q && p.i === m.i && p.gen === m.gen) {
        releaseHarvest(p.room);
        harvestPending = null;
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
    case 'bigMove':
      if (
        !ready ||
        !amAuthority() ||
        m.to !== net.myPeer ||
        m.gen !== gen ||
        !isBigCargo(m.what) ||
        (m.action !== 'pick' && m.action !== 'drop') ||
        !count(m.revision) ||
        !validGround(m.p)
      )
        return;
      decideBig(m.what, m.action, from, m.revision, m.p);
      msg({
        k: 'bigState',
        what: m.what,
        state: bigCargo[m.what],
        gen,
        to: from,
        revision: m.revision,
      } satisfies BigCargoReply);
      return;
    case 'bigState':
      if (!ready || from !== authorityPeer() || m.gen !== gen || !isBigCargo(m.what) || !validCargo(m.state)) return;
      acceptBig(m.what, m.state);
      if (m.to === net.myPeer && bigPending?.what === m.what && bigPending.revision === m.revision) bigPending = null;
      save();
      return;
    case 'fit':
      if (ready) {
        finishBig('boiler');
        a.wakeTrains?.(true);
      }
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
      markContribution(st, from);
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
      if (m.kind === 'beam') finishBig('beam');
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
  if (kind === 'beam') finishBig('beam');
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
  railCart: () => allPeersSupport((p) => p.railCart),
  /** 1 = supports the bonus, 2 = riding. Missing/invalid capability keeps every cart at the legacy speed. */
  rideCart: () => allPeersSupport((p) => p.rideCart > 0),
  cartRider: () => COOP && [...peers.values()].some((p) => present(p) && p.rideCart === 2),
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
    if (!COOP) {
      if (kind === 'beam') finishBig('beam');
      return true;
    }
    const to = authorityPeer();
    if (to === null) {
      markContribution(st, net.myPeer);
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
  big: (what: Exclude<BigThing, null>) => requestBig(what, 'pick'),
  dropBig: () => (back.big ? requestBig(back.big, 'drop') : false),
  bigBusy: () => bigPending !== null,
  boilerFitted: () => {
    finishBig('boiler');
    if (COOP) msg({ k: 'fit' });
  },
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
    bigPending = null;
    clearHarvest();
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
    cargoReadyAt = performance.now() + SEEN_MS;
    if (back.big && bigCargo[back.big].revision === 0) bigCargo[back.big].holder = cargoPeer();
    if (waiting) {
      const j = waiting;
      waiting = null;
      onSnap(api, j, false);
    }
  },
  /** Each frame, once loaded. */
  tick(dt: number, now: number) {
    if (!COOP || (ready && amAuthority())) recoverGroundCargo(now);
    if (!COOP || !api || !ready) return;
    const a = api,
      lead = amAuthority();
    const treeLead = authorityPeer();
    if (bigPending && treeLead === null) {
      acceptBig(bigPending.what, bigCargo[bigPending.what]);
      bigPending = null;
    }
    retryBig(now);
    if (treeLead !== harvestAuthority) {
      // An uncertain request belongs to its former authority. Never reissue it under a new ID.
      clearHarvest(false);
      harvestAuthority = treeLead;
    }
    // Trains drift back to the authority's place.
    lines.forEach((l, k) => {
      const d = nudge[k]!;
      if (Math.abs(d) < 0.01) return;
      const step = d * Math.min(1, dt * 1.5);
      l.train.tr.s += step;
      nudge[k] = d - step;
    });
    if (!lead) return;
    if (now >= cargoReadyAt) {
      for (const what of ['beam', 'boiler'] as const) {
        const holder = bigCargo[what].holder;
        if (
          holder &&
          (holder !== cargoPeer()
            ? !remotes.has(holder)
            : back.big !== what &&
              !pending.some((p) => p.kind === what) &&
              !(what === 'beam' ? beamDelivered() : job.boiler === 3))
        )
          returnBig(what);
      }
    }
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
    chopHooks.greatReady = beamNeeded;
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
    chopHooks.harvest = requestHarvest;
    chopHooks.rock = (q: Rock) => msg({ k: 'rock', i: q.index, n: q.strokes });
    addPresenceField(COOP_IDENTITY, () => (since >= 0 ? since : null));
    addPresenceField('placeRailCart', () => (since >= 0 ? 1 : null));
    addPresenceField('placeCartRide', () => (since >= 0 ? (carry.on === cartPlatform ? 2 : 1) : null));
    keepPresenceWhile(() => since >= 0);
    // Keep the legacy log count and cargo recovery fields; chop.ts draws the other worn loads.
    addPresenceField('placeBack', () => (back.logs > 0 ? back.logs : null));
    addPresenceField('placeBig', () => back.big);
    backSeam.remote = (peer) => peerBack.get(peer) ?? 0;
    onRemotePresence((r, pr) => {
      if (!currentCoopPeer(pr)) {
        peers.delete(r.peer);
        peerBack.delete(r.peer);
        peerBig.delete(r.peer);
        return;
      }
      const b = (pr as { placeBack?: unknown }).placeBack;
      peerBack.set(r.peer, count(b, 64) ? b : 0);
      const big = (pr as { placeBig?: unknown }).placeBig;
      peerBig.set(r.peer, big === 'beam' || big === 'boiler' ? big : null);
      if (!peers.has(r.peer)) showBanner('Your partner is here', 'Same railway, same job.', 2.6);
      peers.set(r.peer, {
        since: pr[COOP_IDENTITY],
        visible: r.visible,
        seen: performance.now(),
        railCart: pr.placeRailCart === 1,
        rideCart: pr.placeCartRide === 1 || pr.placeCartRide === 2 ? pr.placeCartRide : 0,
      });
      if (synced) reconcileBig();
    });
    onPeerRemoved((r) => {
      if (harvestPending?.to === r.peer) {
        releaseHarvest(harvestPending.room);
        harvestPending = null;
      }
      // Keep the last receipt until reset: reconnecting with this identity must not
      // make an already accepted request spend the tree a second time.
      for (let k = pending.length - 1; k >= 0; k--)
        if (pending[k]!.to === r.peer) {
          refund(pending[k]!.kind);
          pending.splice(k, 1);
        }
      const big = (['beam', 'boiler'] as const).find((what) => bigCargo[what].holder === r.peer) ?? peerBig.get(r.peer);
      // A last presence packet may precede a deposit/fit; never return a consumed piece.
      if (big === 'beam' && trunkTaken() && !beamDelivered()) {
        if (bigCargo.beam.holder === r.peer || bigCargo.beam.revision === 0) returnBig('beam');
      } else if (big === 'boiler' && job.boiler === 2) {
        if (bigCargo.boiler.holder === r.peer || bigCargo.boiler.revision === 0) returnBig('boiler');
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
          returningBig = back.big;
          clearHarvest(false);
          since = world.tick;
          synced = false;
          if (bigPending) bigPending.retryAt = 0; // retry after the reconnect's authoritative snapshot
        }
      });
      room.onMessage((raw, from) => {
        const m = raw as Record<string, unknown> | null;
        if (m?.t !== COOP_IDENTITY || typeof from !== 'string') return;
        const answer = m.k === 'stock' || m.k === 'no' || m.k === 'harvested' || m.k === 'harvestNo';
        const expected =
          answer &&
          (pending.some((p) => p.to === from && p.kind === m.kind && (!m.q || p.q === m.q)) ||
            (harvestPending?.to === from && harvestPending.q === m.q && harvestPending.i === m.i));
        if (!(answer && (from === authorityPeer() || expected)) && !allow(from)) {
          if (m.k === 'dep' && (m.to === net.myPeer || (!m.to && amAuthority())) && isKind(m.kind))
            msg({ k: 'no', to: from, kind: m.kind, q: count(m.q) ? m.q : 0 });
          if (m.k === 'harvest' && m.to === net.myPeer) msg({ k: 'harvestNo', to: from, q: m.q, i: m.i, gen: m.gen });
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
  debug: () => ({
    amAuthority: amAuthority(),
    since,
    gen,
    peers: [...peers.keys()],
    shared: captureShared(),
    harvestPending,
    bigPending,
    harvestReceipts: [...harvestReceipts.values()],
  }),
};
export type { Kind };
