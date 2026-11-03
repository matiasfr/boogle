// Two players, one railway: `?proto=place&coop=1`, a throwaway for one playtest (real shared code comes through
// docs/plans/rail-slice.md). Serves DESIGN.md 4 (Cooperation is automatic). Research: docs/research/shared-construction.md,
// recommendations 2, 3, 9, 11 and 12. Without the flag every hook here is a no-op and nothing is sent.
//
// How it stays together, cheapest thing that works:
// - One authority: the oldest visible coop tab (presence key `placeCoop`, the world tick it got here). Not the room's lead,
//   which could be a tab without the flag, and not the lowest id, which a newcomer could take. It is the only tab that
//   accepts a deposit, starts a station's run and ends a stretch, so the last log can't start two runs and a station can't
//   overfill: a deposit it can't take goes back on the sender's back.
// - Every tab runs the rest of the game as ever, so nothing waits on the network. Chops and wakes go out as they happen and
//   anyone can send them; the machine, crates and town run on each tab.
// - Once a second the authority sends the whole shared state. A newcomer takes it and is caught up, a follower that stays
//   different for a few seconds is put right, and a follower that takes over already has everything it needs.
// - Trains run from a shared clock, the world's tick; platforms get stable ids so a rider stands on your copy of the deck.
//
// Personal: your back, crates and gifts (each tab gets its own crate at each stretch), crystals, gold finds.
import * as THREE from 'three/webgpu';
import {
  addPresenceField,
  keepPresenceWhile,
  net,
  onPeerRemoved,
  onRemotePresence,
  onRoomReady,
} from '../../netplay/net.ts';
import { TICK_MS, world } from '../../world/sync.ts';
import { backSeam } from '../../features/haul-stack.ts';
import { drawHeaps, type Heap, type Kind } from '../net/crates.ts';
import { clearMoments, showBanner } from './celebrate.ts';
import { TREES, back, chopHooks, fellenList, resetTrees, restoreFellen, standing, type Tree } from './chop.ts';
import { craneClear, forge, resetForge, snapForge, takeRail } from './forge.ts';
import { TUNE, type LINKS } from './layout.ts';
import { chips, clearTrips, send } from './pieces.ts';
import { cycleOf, type Machine, type Track, type TrainRun } from './rail.ts';
import { clearDrops } from './sites.ts';
import { type StationRun } from './stations.ts';
import { snapTown } from './town.ts';

export const COOP = new URLSearchParams(location.search).get('coop') === '1';
/** Under the flag, a save of its own: a solo save's shape and progress stay out of it. */
export const coopKey = (solo: string, room: string) => (COOP ? `boogle-place-coop-v1:${room}` : solo);

type StockKind = 'logs' | 'rails';
type CoopLine = {
  k: number;
  spec: (typeof LINKS)[number];
  track: Track;
  stations: StationRun[];
  stage: number;
  open: boolean;
  train: TrainRun;
  pile: Heap;
  smoke: { x: number; y: number; z: number };
  madeAt: number;
};
type Api = {
  lines: CoopLine[];
  machine: Machine;
  run: {
    mode: string;
    head: number;
    line: CoopLine;
    cradle: number;
    rack: number;
    cradle0: number;
    rack0: number;
    stretch0: number;
  };
  s: { awake: boolean; turned: boolean; wood: number; stone: number; people: number; loose: number };
  hub: Heap;
  dock: Heap;
  yard: Heap;
  allHeaps: Heap[];
  stepsOf: (n: number) => number;
  wake: (fromPeer: boolean) => void;
  beginFeed: (l: CoopLine, st: StationRun) => void;
  finishStretch: (l: CoopLine) => void;
  landAtStation: (l: CoopLine, st: StationRun, kind: StockKind, counted: boolean) => void;
  setStationTags: () => void;
  startOver: () => void;
  snapLines: () => void;
  placeMachine: () => void;
  folkState: () => void;
  clearIncoming: () => void;
  save: () => void;
  skips: Record<string, () => void>;
};
let api: Api | null = null;

// ---------------------------------------------------------------- the whole shared state, once a second
type Snap = {
  gen: number;
  s: Api['s'];
  f: [number, number, number]; // forge: crates, rails on the rack, made
  h: [number, number, number]; // crates in the hub, the dock, the yard
  fellen: number[];
  lines: { stage: number; open: boolean; pile: number; have: [number, number][] }[];
  run: { mode: string; k: number; head: number; s0: number; c0: number; r0: number; c: number; r: number };
  refs: (Ref | null)[];
};
/** A train's clock is `t` at world tick `tick`. */
type Ref = { tick: number; t: number };

let gen = 0, // counts Start overs: an older state can't come back after one
  since = -1, // the world tick this tab got here: the oldest visible tab is the authority
  ready = false,
  synced = false, // has taken the authority's state since arriving
  waiting: Snap | null = null,
  hbAt = 0,
  miss = 0,
  modeMiss = 0,
  numMiss = 0;
let refs: (Ref | null)[] = [];

const score = (j: Snap) =>
  (j.s.awake ? 1 : 0) +
  j.f[0] +
  j.lines.reduce((a, l) => a + l.stage * 100 + l.have.reduce((b, h) => b + h[0] + h[1], 0), 0);

function snapshot(a: Api): Snap {
  const { s, run } = a;
  return {
    gen,
    s: { awake: s.awake, turned: s.turned, wood: s.wood, stone: s.stone, people: s.people, loose: s.loose },
    f: [forge.crates, forge.rails, forge.made],
    h: [a.hub.list.length, a.dock.list.length, a.yard.list.length],
    fellen: fellenList(),
    lines: a.lines.map((l) => ({
      stage: l.stage,
      open: l.open,
      pile: l.pile.list.length,
      have: l.stations.map((st): [number, number] => [st.have.logs + st.coming.logs, st.have.rails + st.coming.rails]),
    })),
    run: {
      mode: run.mode,
      k: run.line.k,
      head: run.head,
      s0: run.stretch0,
      c0: run.cradle0,
      r0: run.rack0,
      c: run.cradle,
      r: run.rack,
    },
    refs,
  };
}

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const count = (v: unknown, max = 100000): v is number =>
  Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max;
const MODES = ['asleep', 'waking', 'idle', 'feeding', 'laying', 'running', 'waiting', 'turning', 'shunting', 'done'];
function validSnap(j: unknown, a: Api): j is Snap {
  const q = j as Snap | null;
  if (!q || !count(q.gen) || !q.s || !q.run || !Array.isArray(q.lines) || !Array.isArray(q.fellen)) return false;
  if (!Array.isArray(q.f) || !Array.isArray(q.h) || !Array.isArray(q.refs)) return false;
  if (q.f.length !== 3 || !q.f.every((n) => count(n)) || q.h.length !== 3 || !q.h.every((n) => count(n, 200)))
    return false;
  const { s, run } = q;
  if (![s.wood, s.stone, s.people, s.loose].every((n) => count(n))) return false;
  if (typeof s.awake !== 'boolean' || typeof s.turned !== 'boolean') return false;
  if (!MODES.includes(run.mode) || !count(run.k, a.lines.length - 1)) return false;
  if (![run.head, run.s0, run.c0, run.r0, run.c, run.r].every(num)) return false;
  if (!q.fellen.every((n) => count(n, TREES.length - 1))) return false;
  if (q.lines.length !== a.lines.length) return false;
  if (!q.refs.every((r) => r === null || (!!r && num(r.tick) && num(r.t)))) return false;
  return q.lines.every((l, k) => {
    const mine = a.lines[k]!;
    return (
      count(l.stage, mine.stations.length) &&
      typeof l.open === 'boolean' &&
      count(l.pile, 200) &&
      Array.isArray(l.have) &&
      l.have.length === mine.stations.length &&
      l.have.every((h) => Array.isArray(h) && count(h[0], 200) && count(h[1], 200))
    );
  });
}

/** Everything shared, from the authority's state. Your back, gifts, crystals and finds stay yours. */
function applyFull(a: Api, j: Snap) {
  const { s, run, lines } = a;
  gen = j.gen;
  refs = j.refs.slice();
  clearMoments();
  clearDrops();
  clearTrips();
  craneClear();
  back.incoming = 0;
  a.clearIncoming();
  Object.assign(s, j.s);
  resetForge();
  [forge.crates, forge.rails, forge.made] = j.f;
  a.hub.list = Array.from({ length: j.h[0] }, (): Kind => 'wood');
  a.dock.list = Array.from({ length: j.h[1] }, (): Kind => 'wood');
  a.yard.list = Array.from({ length: j.h[2] }, (): Kind => 'stone');
  resetTrees();
  restoreFellen(j.fellen);
  lines.forEach((l, k) => {
    const q = j.lines[k]!;
    l.stage = q.stage;
    l.open = q.open;
    l.pile.list = Array.from({ length: q.pile }, () => l.spec.kind as Kind);
    l.stations.forEach((st, n) => {
      st.have.logs = q.have[n]![0];
      st.have.rails = q.have[n]![1];
      st.coming.logs = st.coming.rails = 0;
    });
  });
  run.mode = 'asleep';
  a.snapLines();
  a.placeMachine();
  snapForge();
  drawHeaps(a.allHeaps);
  snapTown(a.stepsOf(s.wood), a.stepsOf(s.stone));
  a.folkState();
  // The machine mid-job: placeMachine stands it at a station; put it where the authority's is.
  const l = lines[j.run.k]!,
    st = l.stations[l.stage],
    m = j.run.mode;
  if (m === 'feeding' && st && run.mode === 'idle') a.beginFeed(l, st);
  else if (m === 'running' || (m === 'laying' && st)) {
    run.line = l;
    run.mode = m;
    run.head = j.run.head;
    run.stretch0 = j.run.s0;
    run.cradle0 = j.run.c0;
    run.rack0 = j.run.r0;
    run.cradle = j.run.c;
    run.rack = j.run.r;
    a.machine.at(l.spec.line, run.head, m === 'running' ? -1 : l.spec.dir);
    a.machine.snap();
    a.machine.setCradle(run.cradle);
    a.machine.setRack(run.rack);
    if (m === 'laying') {
      l.track.snapTo(l.track.u(run.head));
      st!.drawStock({ logs: 0, rails: 0 });
    }
    a.setStationTags();
  }
  a.save();
}

const discrete = (awake: boolean, turned: boolean, k: number, lines: { stage: number; open: boolean }[]) =>
  `${awake}${turned}${k}${lines.map((l) => `${l.stage}${l.open}`).join()}`;

/** Each second, on a follower: the same run? Small numbers settle on their own; what stays different gets put right. */
function reconcile(a: Api, j: Snap) {
  const { s, run, lines } = a;
  refs = j.refs.slice();
  miss =
    discrete(j.s.awake, j.s.turned, j.run.k, j.lines) === discrete(s.awake, s.turned, run.line.k, lines) ? 0 : miss + 1;
  modeMiss = j.run.mode === run.mode ? 0 : modeMiss + 1;
  if (miss >= 3 || modeMiss >= 5) {
    miss = modeMiss = numMiss = 0;
    return applyFull(a, j);
  }
  // Riding the machine together: the same head, near enough.
  if (j.run.mode === run.mode && j.run.k === run.line.k && (run.mode === 'laying' || run.mode === 'running'))
    if (Math.abs(j.run.head - run.head) > 1.5) run.head = j.run.head;
  // The current station's stack, when nothing's in the air here.
  const l = run.line,
    st = l.stations[l.stage];
  if (
    st &&
    run.mode === 'idle' &&
    j.run.k === l.k &&
    j.lines[l.k]!.stage === l.stage &&
    !st.coming.logs &&
    !st.coming.rails
  ) {
    const h = j.lines[l.k]!.have[l.stage]!;
    if (h[0] !== st.have.logs || h[1] !== st.have.rails) {
      st.have.logs = h[0];
      st.have.rails = h[1];
      st.drawStock(st.have);
      st.setTag(true);
    }
  }
  for (const k of j.fellen) if (standing(TREES[k]!)) restoreFellen([k]);
  // Crates and people: each tab counts them as they land, so a moment's difference is normal.
  const same =
    j.s.people === s.people &&
    j.s.wood === s.wood &&
    j.s.stone === s.stone &&
    j.s.loose === s.loose &&
    j.f[0] === forge.crates &&
    Math.abs(j.f[1] - forge.rails) <= 1 &&
    Math.abs(j.f[2] - forge.made) <= 1 &&
    j.h[0] === a.hub.list.length &&
    j.h[1] === a.dock.list.length &&
    j.h[2] === a.yard.list.length &&
    lines.every((q, k) => Math.abs(j.lines[k]!.pile - q.pile.list.length) <= 1);
  numMiss = same ? 0 : numMiss + 1;
  if (numMiss < 4) return;
  numMiss = 0;
  s.people = j.s.people;
  s.wood = j.s.wood;
  s.stone = j.s.stone;
  s.loose = j.s.loose;
  if (j.f[0] !== forge.crates || j.f[1] !== forge.rails || j.f[2] !== forge.made) {
    [forge.crates, forge.rails, forge.made] = j.f;
    snapForge();
  }
  a.hub.list = Array.from({ length: j.h[0] }, (): Kind => 'wood');
  a.dock.list = Array.from({ length: j.h[1] }, (): Kind => 'wood');
  a.yard.list = Array.from({ length: j.h[2] }, (): Kind => 'stone');
  lines.forEach((q, k) => (q.pile.list = Array.from({ length: j.lines[k]!.pile }, () => q.spec.kind as Kind)));
  drawHeaps(a.allHeaps);
}

function onSnap(a: Api, j: Snap, force: boolean) {
  if (!ready) return void (waiting = j);
  if (!synced) {
    synced = true;
    // A fresh room, and you've come with a save: the room takes yours rather than wiping it.
    const mine = snapshot(a);
    if (!force && score(j) === 0 && score(mine) > 0) return void msg({ k: 'mine', snap: mine });
    return applyFull(a, j);
  }
  if (j.gen < gen) return; // from before a Start over
  if (force || j.gen > gen) return applyFull(a, j);
  reconcile(a, j);
}

// ---------------------------------------------------------------- who's here, and who decides
const peers = new Map<string, { since: number; visible: boolean; seen: number }>();
const peerBack = new Map<string, number>();
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
const pending: { kind: StockKind; at: number }[] = [];
const PENDING_MS = 4000; // no answer (the authority went): back on your back
function settle(kind: StockKind) {
  const k = pending.findIndex((p) => p.kind === kind);
  if (k >= 0) pending.splice(k, 1);
}
function refund(kind: StockKind) {
  back[kind]++;
}
const flyFrom = new THREE.Vector3();
function flyIn(
  a: Api,
  l: CoopLine,
  st: StationRun,
  kind: StockKind,
  x: number,
  y: number,
  z: number,
  n: number,
  counted: boolean,
) {
  flyFrom.set(x, y + 0.9, z);
  const land = () => a.landAtStation(l, st, kind, counted);
  if (kind === 'logs')
    send('log', flyFrom, st.logSlot(n, new THREE.Vector3()), { dur: 0.32, apex: 0.9, size: [1, 2.2], land });
  else send('rail', flyFrom, st.railSlot(n, new THREE.Vector3()), { dur: 0.36, apex: 0.9, land });
}
const shownNow = (st: StationRun) => ({
  logs: Math.max(0, st.have.logs - st.coming.logs),
  rails: Math.max(0, st.have.rails - st.coming.rails),
});
const isKind = (v: unknown): v is StockKind => v === 'logs' || v === 'rails';
function stationAt(a: Api, m: Record<string, unknown>) {
  if (!count(m.l, a.lines.length - 1)) return null;
  const l = a.lines[m.l]!;
  if (!count(m.n, l.stations.length - 1)) return null;
  return { l, st: l.stations[m.n]!, n: m.n };
}

function onMsg(a: Api, m: Record<string, unknown>, from: string) {
  const { run, s } = a;
  switch (m.k) {
    case 'snap': {
      if (from !== authorityPeer() && !m.force) return;
      if (validSnap(m.snap, a)) onSnap(a, m.snap, !!m.force);
      return;
    }
    case 'mine': {
      if (!amAuthority() || !validSnap(m.snap, a) || score(snapshot(a)) > 0) return;
      applyFull(a, m.snap);
      msg({ k: 'snap', snap: snapshot(a), force: true });
      return;
    }
    case 'reset': {
      if (!count(m.gen) || m.gen <= gen) return;
      gen = m.gen;
      refs = [];
      a.startOver();
      showBanner('Started over', 'Your partner reset the railway for you both.', 3);
      return;
    }
    case 'wake':
      if (ready && run.mode === 'asleep') a.wake(true);
      return;
    case 'chop': {
      const t = count(m.i, TREES.length - 1) ? TREES[m.i] : null;
      if (!t || !count(m.n, TUNE.strokes) || !num(m.y) || !ready || !standing(t)) return;
      t.strokes = Math.max(t.strokes, m.n);
      t.shake = 1;
      chips(t.x, t.y + 1.1, t.z, 8);
      if (t.strokes >= TUNE.strokes) {
        t.fall = 0;
        t.fallYaw = m.y;
      }
      return;
    }
    case 'dep': {
      if (!ready || !amAuthority()) return;
      const at = stationAt(a, m);
      if (!at || !isKind(m.kind) || !num(m.x) || !num(m.y) || !num(m.z)) return;
      const { l, st, n } = at;
      if (run.mode !== 'idle' || run.line !== l || l.stage !== n || st.wants(m.kind) <= 0)
        return msg({ k: 'no', to: from, kind: m.kind });
      st.coming[m.kind]++;
      const slot = st.have[m.kind] + st.coming[m.kind] - 1;
      flyIn(a, l, st, m.kind, m.x, m.y, m.z, slot, true);
      sendStock(l, n, st, from, m.kind, m.x, m.y, m.z);
      return;
    }
    case 'no':
      if (m.to === net.myPeer && isKind(m.kind)) {
        settle(m.kind);
        refund(m.kind);
      }
      return;
    case 'stock': {
      if (!ready || amAuthority()) return;
      const at = stationAt(a, m);
      if (!at || !isKind(m.kind) || !count(m.logs, 200) || !count(m.rails, 200)) return;
      if (!num(m.x) || !num(m.y) || !num(m.z)) return;
      const { l, st, n } = at;
      if (l.stage !== n) return;
      st.have.logs = m.logs;
      st.have.rails = m.rails;
      if (m.by === net.myPeer) settle(m.kind);
      else {
        st.coming[m.kind]++;
        flyIn(a, l, st, m.kind, m.x, m.y, m.z, st.have[m.kind] - 1, false);
      }
      if (run.mode === 'idle' && l === run.line) {
        st.drawStock(shownNow(st));
        st.setTag(true);
      }
      return;
    }
    case 'feed': {
      if (!ready) return;
      const at = stationAt(a, m);
      if (!at || at.l !== run.line || at.l.stage !== at.n || run.mode !== 'idle') return;
      at.st.have.logs = at.st.spec.logs;
      at.st.have.rails = at.st.spec.rails;
      at.st.drawStock(at.st.have);
      a.beginFeed(at.l, at.st);
      return;
    }
    case 'stretch': {
      if (!ready) return;
      const at = stationAt(a, m);
      if (!at || at.l !== run.line || at.l.stage !== at.n) return;
      if (run.mode !== 'laying' && run.mode !== 'feeding') return;
      const to = at.st.spec.to;
      run.head = to;
      a.machine.at(at.l.spec.line, to, at.l.spec.dir);
      at.l.track.layTo(at.l.track.u(to));
      a.finishStretch(at.l);
      return;
    }
    case 'took': {
      if (!ready || !count(m.n, TUNE.carry)) return;
      for (let k = 0; k < m.n; k++) {
        if (m.what === 'rails' && forge.rails > 0) takeRail();
        else if (m.what === 'timber') {
          if (s.loose <= 0 && a.hub.list.length) {
            a.hub.list.pop();
            s.loose += TUNE.crateLogs;
          }
          s.loose = Math.max(0, s.loose - 1);
        }
      }
      if (m.what === 'timber') drawHeaps(a.allHeaps);
      return;
    }
    case 'skip': {
      if (!ready || !amAuthority() || typeof m.name !== 'string') return;
      const fn = Object.hasOwn(a.skips, m.name) ? a.skips[m.name] : null;
      if (!fn) return;
      coop.noHop = true;
      try {
        fn();
      } finally {
        coop.noHop = false;
      }
      msg({ k: 'snap', snap: snapshot(a), force: true });
      return;
    }
  }
}
function sendStock(
  l: CoopLine,
  n: number,
  st: StationRun,
  by: string | null,
  kind: StockKind,
  x: number,
  y: number,
  z: number,
) {
  msg({
    k: 'stock',
    l: l.k,
    n,
    kind,
    logs: st.have.logs + st.coming.logs,
    rails: st.have.rails + st.coming.rails,
    by,
    x,
    y,
    z,
  });
}

// ---------------------------------------------------------------- the hooks in ./index.ts
let startOverArmed = 0;
export const coop = {
  /** Under the flag, and another tab decides. */
  follower: () => COOP && !amAuthority(),
  /** The authority is running someone else's Skip: it doesn't move its own player. */
  noHop: false,
  /** What this tab has decided a station shows. */
  shown: (st: StationRun) => (COOP && !amAuthority() ? shownNow(st) : { logs: st.have.logs, rails: st.have.rails }),
  saved: () => (COOP ? { gen, refs } : undefined),
  restored(j: { gen?: unknown; refs?: unknown } | undefined) {
    if (!COOP || !j) return;
    if (count(j.gen)) gen = j.gen;
    if (Array.isArray(j.refs) && j.refs.every((r) => r === null || (!!r && num(r.tick) && num(r.t))))
      refs = j.refs as (Ref | null)[];
  },
  woke: () => COOP && msg({ k: 'wake' }),
  /** A piece left your back for a station. True: it counts when it lands (solo, or you decide). */
  deposited(l: CoopLine, st: StationRun, kind: StockKind, p: { x: number; y: number; z: number }) {
    if (!COOP) return true;
    if (amAuthority()) {
      sendStock(l, l.stage, st, net.myPeer, kind, p.x, p.y, p.z);
      return true;
    }
    pending.push({ kind, at: performance.now() });
    msg({ k: 'dep', l: l.k, n: l.stage, kind, x: p.x, y: p.y, z: p.z });
    return false;
  },
  fed: (l: CoopLine) => COOP && amAuthority() && msg({ k: 'feed', l: l.k, n: l.stage }),
  stretched: (l: CoopLine) => COOP && amAuthority() && msg({ k: 'stretch', l: l.k, n: l.stage }),
  took: (what: 'rails' | 'timber', n: number) => COOP && n > 0 && msg({ k: 'took', what, n }),
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
    refs = [];
    msg({ k: 'reset', gen });
    api?.startOver();
  },
  /** A panel skip changes the shared run, so the authority does it and everyone takes the result. */
  skip(name: string, fn: () => void, hopMe?: () => void) {
    if (!COOP) return fn();
    if (amAuthority()) {
      fn();
      if (api) msg({ k: 'snap', snap: snapshot(api), force: true });
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
    // A deposit nobody answered: the authority went with it.
    for (let k = pending.length - 1; k >= 0; k--)
      if (now - pending[k]!.at > PENDING_MS) {
        refund(pending[k]!.kind);
        pending.splice(k, 1);
      }
    // Trains: the same place on every tab, from the world's tick.
    for (const l of a.lines) {
      const c = l.train.clock;
      if (!c.running) {
        if (lead) refs[l.k] = null;
        continue;
      }
      let r = refs[l.k];
      if (!r) {
        if (!lead) continue;
        r = refs[l.k] = { tick: world.tick, t: c.t };
      }
      const C = cycleOf(l.spec.line),
        target = r.t + ((world.tick - r.tick) * TICK_MS) / 1000;
      let d = (((target - c.t) % C) + C) % C;
      if (d > C / 2) d -= C;
      if (Math.abs(d) > 3) c.t += d;
      else if (Math.abs(d) > 0.15) c.t += d * Math.min(1, dt * 1.5);
    }
    if (!lead) return;
    // Taking over: a full frame nobody started (the last authority left between the last log and the start).
    const st = a.run.line.stations[a.run.line.stage];
    if (st && a.run.mode === 'idle' && st.full() && !st.coming.logs && !st.coming.rails) {
      st.drawStock(st.have);
      a.beginFeed(a.run.line, st);
    }
    if (now >= hbAt) {
      hbAt = now + 1000;
      msg({ k: 'snap', snap: snapshot(a) });
    }
  },
  /** Everything from ./index.ts; platforms get their stable ids for riders. */
  setup(a: Api) {
    if (!COOP) return;
    api = a;
    const ids = (p: { id?: string; shared?: boolean }, id: string) => {
      p.id = id;
      p.shared = true;
    };
    ids(a.machine.flatbed.platform, 'place:flatbed');
    ids(a.machine.loco.platform, 'place:loco');
    for (const l of a.lines) l.train.tr.cars.forEach((c, n) => ids(c.platform, `place:train${l.k}:car${n}`));
    chopHooks.stroke = (t: Tree) => msg({ k: 'chop', i: t.index, n: t.strokes, y: t.fallYaw });
    addPresenceField('placeCoop', () => (since >= 0 ? since : null));
    keepPresenceWhile(() => since >= 0);
    // A partner's back reads at a glance: their logs on their avatar (the rails stay personal, a small glitch).
    addPresenceField('placeBack', () => (back.logs > 0 ? back.logs : null));
    backSeam.remote = (peer) => peerBack.get(peer) ?? 0;
    onRemotePresence((r, pr) => {
      const b = (pr as { placeBack?: unknown }).placeBack;
      peerBack.set(r.peer, count(b, TUNE.carry) ? b : 0);
      const v = (pr as { placeCoop?: unknown }).placeCoop;
      if (!count(v, Number.MAX_SAFE_INTEGER)) return void peers.delete(r.peer);
      if (!peers.has(r.peer)) showBanner('Your partner is here', 'Same railway, same job.', 2.6);
      peers.set(r.peer, { since: v, visible: r.visible, seen: performance.now() });
    });
    onPeerRemoved((r) => {
      budget.delete(r.peer);
      peerBack.delete(r.peer);
      if (peers.delete(r.peer)) showBanner('Your partner left', 'The railway is still here. It just takes longer.', 3);
    });
    onRoomReady((room) =>
      room.onMessage((raw, from) => {
        const m = raw as Record<string, unknown> | null;
        if (m?.t !== 'placeCoop' || typeof from !== 'string' || !allow(from)) return;
        try {
          onMsg(a, m, from);
        } catch (e) {
          console.warn('[place coop] bad message', e);
        }
      }),
    );
    // Back from a hidden tab: behind on everything, so it goes to the back of the queue and catches up.
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && since >= 0) since = world.tick;
    });
  },
  /** For the test run. */
  debug: () => ({ amAuthority: amAuthority(), since, gen, peers: [...peers.keys()], snap: api && snapshot(api) }),
};
