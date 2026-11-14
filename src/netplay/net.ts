import { BUILD } from '../build-id.ts';
import { background } from '../async.ts';
import { pageQuery, productionRailway } from '../proto/flags.ts';
import { COLORS, DEFAULT_NAME, DEFAULT_ROOM, SEND_MS } from '../constants.ts';
import { finiteArr, r2, sanitizeName } from '../math.ts';
import { createWsRoom, type Room } from '../net/ws-room.ts';
import { attachWorld, detachWorld } from '../world/sync.ts';
import { worldRoomId } from '../world/namespace.ts';
import { railwayRoomId } from '../world/railway-namespace.ts';
import { identity } from '../player/identity.ts';
import { createSnaps } from './snaps.ts';
import { addField, mergeFields } from './presence-fields.ts';
import { onFrame } from '../loop.ts';
import type { Field, Presence } from './presence-fields.ts';

/** A peer as the room reports it (src/net/README.md). */
type PeerEntry = { peer: string; sameTab?: boolean; presence?: Presence };
type PoseSample = { p: number[]; r: number; s: unknown };
/** What presence reads from the local player, each send (src/entities/player/state.ts registers it: setLocalPresence). */
export type LocalPresence = {
  entered: boolean;
  name: string;
  colorIdx: number;
  body: { position: { x: number; y: number; z: number } } | null;
  yaw: number;
  swimming: boolean;
  coyote: number;
};
/** Everything the network knows about another player: identity and their pose buffer. Features may add fields
 * (r.build: src/netplay/builds.ts); src/entities/remote-player/ adds the meshes and body drawn for them. */
export interface Remote {
  peer: string;
  name: string;
  colorIdx: number;
  visible: boolean;
  entered: boolean;
  snaps: ReturnType<typeof createSnaps<PoseSample>>;
  lastT: number;
  off: number | null;
  state: unknown;
  build?: string | null;
  pid?: string | null; // their player id (src/features/haul-stack.ts)
  // Fields features keep per remote (their presence, decoded):
  hd?: string | null; // what they hold (src/features/held.ts)
  flop?: { kind: string; until: number } | null; // a flop playing (src/features/feel.ts)
  kdUntil?: number; // knocked down until (ms)
  guest?: number[] | null; // the guest's pose (src/features/dino.ts; src/guest/)
}
type RemoteHook = (r: Remote, pr: Presence, time: number) => void;

// Presence carries each player's pose, plus the fields features add through the hooks below (the ball, the Boogler).
// state: 'connecting' | 'live' | 'solo' (changes reach onNetState below); retries: failed joins in a row, reset once a room exists; retryAt: Date.now() of the next
// attempt while solo (0: none scheduled); full: the last join was turned away ('room_full'): the cap, or true.
export const net = {
  room: null as Room | null, // the room interface (src/net/README.md) once joined
  myPeer: null as string | null,
  readyAt: 0,
  lastSend: 0,
  state: 'connecting',
  error: null as string | null,
  full: 0 as number | true,
  retries: 0,
  retryAt: 0,
};
export const remotes = new Map<string, Remote>();

// Effective flags assign the room: the bare address and headless tools open the current game's.
// Anything outside [a-z0-9-]{1,32} is stripped from an explicit room.
export function getRoomId() {
  let raw = '';
  try {
    const q = pageQuery();
    raw = q.get('room') ?? '';
  } catch {
    // no URL available; use the default room
  }
  const id = raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 32);
  return id || DEFAULT_ROOM;
}

function peerColor(peer: string) {
  let h = 0;
  for (const ch of peer) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h) % COLORS.length;
}

// Extension hooks so features never edit buildPresence/upsertPeer (which kind to use: DESIGN.md, "Pick how each
// feature shares state"). Presence goes out every SEND_MS over the room's latest-wins relay, so keep fields
// small; one that rarely changes costs next to nothing.
//   addPresenceField(key, getter)  Owner state: merges a small JSON value (or null to omit) into our presence.
//   onRemotePresence(fn)           fn(remote, pr, time) after each fresh update from a peer; time is the sample's
//                                  local ms, ready for createSnaps (src/netplay/snaps.ts).
//   onRoomReady(fn)                fn(room) once the room exists (immediately if it already does); one-off events go
//                                  here as room.send/onMessage (reliable, ordered, not to self), not in presence.
//   onNetState(fn)                 fn(state, prev) on every setNet call, after net.state changed. It also fires when
//                                  state === prev: 'solo' -> 'solo' is a retry that failed before reaching a room.
//                                  Details are on net (error, retries, room). Local only; never sends anything.
//   holdPresencePose(fn)           keep this tab's pose (n, c, p, r, s) unpublished while fn() is true: Local, for a
//                                  body that is not yet where it will stand (src/features/return-cover.ts).
//   keepPresenceWhile(fn)          keep sending presence while fn() is true, even off the island (./owner-sync.ts: this tab
//                                  owns the ball). Checked after `entered`, in registration order, before hosting.
//   onPeerAdded(fn)                fn(remote) as a Remote is created, before anything can read it: add your fields here.
//   onPeerLeftIsland(fn)           fn(remote) on each update from a peer that isn't on the island (they may still be in
//                                  the room). Can repeat for one peer.
//   onPeerRemoved(fn)              fn(remote) as a peer leaves the room, while it's still in `remotes`.
//   onPeopleChanged(fn)            fn() after a batch of peer changes (the roster). peopleChanged() runs them.
//   setLocalPresence(source)       the local player, read by every send; localPresence() returns it (null until set).
const presenceFields: Field[] = [];
// The keys buildPresence sets itself; a field can't take one (nor an earlier field's key).
const CORE_KEYS = ['v', 't', 'n', 'c', 'p', 'r', 's'];
function addFieldOrWarn(key: string, getter: () => unknown) {
  if (!addField(presenceFields, key, getter, CORE_KEYS)) console.warn('[boogle] presence key taken:', key);
}
const presenceReasons: (() => boolean)[] = [];
export function keepPresenceWhile(fn: () => boolean) {
  presenceReasons.push(fn);
}
const poseHolds: (() => boolean)[] = [];
/** Local: while fn() is true this tab is not yet where it will stand (a recent return being placed,
 * src/features/return-cover.ts), so its pose stays unpublished: peers see "in the room, not on the island", exactly
 * as before it entered. No new key and no new meaning on the wire. */
export function holdPresencePose(fn: () => boolean) {
  poseHolds.push(fn);
}
const remoteHooks: RemoteHook[] = [];
const roomHooks: ((room: Room) => void)[] = [];
const stateHooks: ((state: string, prev: string) => void)[] = [];
export function addPresenceField(key: string, getter: () => unknown) {
  addFieldOrWarn(key, getter);
}
export function onRemotePresence(fn: RemoteHook) {
  remoteHooks.push(fn);
}
export function onRoomReady(fn: (room: Room) => void) {
  if (net.room) fn(net.room);
  else roomHooks.push(fn);
}
export function onNetState(fn: (state: string, prev: string) => void) {
  stateHooks.push(fn);
}
type PeerHook = (r: Remote) => void;
const peerAddedHooks: PeerHook[] = [];
const peerLeftIslandHooks: PeerHook[] = [];
const peerRemovedHooks: PeerHook[] = [];
const peopleHooks: (() => void)[] = [];
function runPeerHooks(hooks: PeerHook[], r: Remote) {
  for (const fn of hooks) {
    try {
      fn(r);
    } catch (e) {
      console.warn('[boogle] peer hook failed', e);
    }
  }
}
export function onPeerAdded(fn: (r: Remote) => void) {
  peerAddedHooks.push(fn);
}
export function onPeerLeftIsland(fn: (r: Remote) => void) {
  peerLeftIslandHooks.push(fn);
}
export function onPeerRemoved(fn: (r: Remote) => void) {
  peerRemovedHooks.push(fn);
}
export function onPeopleChanged(fn: () => void) {
  peopleHooks.push(fn);
}
export function peopleChanged() {
  for (const fn of peopleHooks) {
    try {
      fn();
    } catch (e) {
      console.warn('[boogle] people hook failed', e);
    }
  }
}
let local: LocalPresence | null = null;
export function setLocalPresence(source: LocalPresence) {
  local = source;
}
export const localPresence = () => local;

/** This tab isn't on screen. A headless run (dev/sim/) has no document, and counts as on screen. */
export const tabHidden = () => typeof document !== 'undefined' && document.hidden;

// One presence object, refilled every send (the room copies what it sends): same keys in the same order each time, so
// no new object growing a field at a time 20 times a second.
const out: Presence = { v: 0, t: 0, n: null, c: null, p: null, r: null, s: null };
function buildPresence() {
  out.v = tabHidden() ? 0 : 1;
  out.t = Math.round(performance.now());
  out.n = out.c = out.p = out.r = out.s = null;
  if (local?.entered && local.body && !poseHolds.some((fn) => fn())) {
    const p = local.body.position;
    out.n = local.name;
    out.c = local.colorIdx;
    out.p = [r2(p.x), r2(p.y), r2(p.z)];
    out.r = r2(local.yaw);
    out.s = local.swimming ? 2 : local.coyote > 0 ? 0 : 1;
  }
  return mergeFields(out, presenceFields); // a null field deletes its key (src/netplay/presence-fields.ts)
}

export function sendPresence() {
  if (!net.room) return;
  net.lastSend = performance.now();
  net.room.presence(buildPresence()).catch(() => {});
}
// A tab going hidden stops its frame loop, so it would never say so: one presence now (v 0) tells the server, which
// then allows it a longer silence before it drops the socket.
if (typeof document !== 'undefined')
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) sendPresence();
  });

function getRemote(peer: string): Remote {
  let r = remotes.get(peer);
  if (!r) {
    r = {
      peer,
      name: '',
      colorIdx: peerColor(peer),
      visible: false,
      entered: false,
      snaps: createSnaps<PoseSample>(),
      lastT: -1,
      off: null,
      state: 0,
    } as Remote; // onPeerAdded fills in the fields other modules declare on it
    runPeerHooks(peerAddedHooks, r);
    remotes.set(peer, r);
  }
  return r;
}

function upsertPeer(peer: PeerEntry) {
  if (peer.sameTab) {
    net.myPeer = peer.peer;
    return;
  }
  const pr: Presence = peer.presence || {};
  const r = getRemote(peer.peer);
  r.visible = pr.v === 1;
  r.name = sanitizeName(pr.n) || DEFAULT_NAME;
  r.colorIdx =
    typeof pr.c === 'number' && Number.isInteger(pr.c) && pr.c >= 0 && pr.c < COLORS.length
      ? pr.c
      : peerColor(peer.peer);
  const t = typeof pr.t === 'number' && Number.isFinite(pr.t) ? pr.t : null;
  const fresh = t !== null && t !== r.lastT;
  let time = 0;
  if (fresh) {
    r.lastT = t;
    const arrival = performance.now();
    const off = arrival - t;
    r.off = r.off === null || off < r.off ? off : r.off + (off - r.off) * 0.01;
    time = t + r.off;
  }
  r.entered = finiteArr(pr.p, 3);
  if (r.entered && fresh) {
    r.snaps.push(time, {
      p: pr.p as number[],
      r: typeof pr.r === 'number' && Number.isFinite(pr.r) ? pr.r : 0,
      s: pr.s,
    });
  }
  if (!r.entered) {
    r.snaps.clear();
    runPeerHooks(peerLeftIslandHooks, r);
  }
  if (fresh)
    for (const fn of remoteHooks) {
      try {
        fn(r, pr, time);
      } catch (e) {
        console.warn('[boogle] presence hook failed', e);
      }
    }
}

function removePeer(peer: string) {
  const r = remotes.get(peer);
  if (!r) return;
  runPeerHooks(peerRemovedHooks, r);
  remotes.delete(peer);
}

function onPeersChange(change: {
  joined: readonly PeerEntry[];
  updated: readonly PeerEntry[];
  left: readonly PeerEntry[];
}) {
  if (!net.readyAt) net.readyAt = performance.now();
  for (const p of change.joined) upsertPeer(p);
  for (const p of change.updated) upsertPeer(p);
  for (const p of change.left) removePeer(p.peer);
  peopleChanged();
}

function setNet(state: string) {
  const prev = net.state;
  net.state = state;
  if (state === 'solo') {
    for (const peer of [...remotes.keys()]) removePeer(peer);
  }
  for (const fn of stateHooks) {
    try {
      fn(state, prev);
    } catch (e) {
      console.warn('[boogle] net state hook failed', e);
    }
  }
}

// Keep trying while solo (the server unreachable or restarting, a flaky network), unless the browser can't open a
// WebSocket at all. A full room is retried every few seconds, so a spot that opens is taken.
let retryTimer: ReturnType<typeof setTimeout> | 0 = 0;
const FULL_RETRY_MS = 4000;
type NetError = { code?: string; type?: string; max?: number } | null | undefined;
function noteError(e: NetError, fallback: string) {
  net.error = String(e?.code || e?.type || fallback);
  net.full = e?.code === 'room_full' ? e.max || true : 0;
}
function scheduleRetry(e: NetError) {
  // elsewhere: a newer tab of this player took over; coming back would only take it back (src/features/identity.ts)
  if (e?.code === 'browser-incompatible' || e?.code === 'elsewhere' || retryTimer) return;
  net.retries += 1;
  const wait = net.full ? FULL_RETRY_MS : Math.min(5000 * net.retries, 30000);
  net.retryAt = Date.now() + wait;
  retryTimer = setTimeout(() => {
    retryTimer = 0;
    if (net.state === 'solo' && !net.room) background(connectRoom(), 'room retry');
  }, wait);
}

// World copies tabs kept before the server hosted every room (boogle.world.<room>): nothing loads them any more, so
// the first connect of a page load clears them all.
let swept = false;
function dropOldSaves() {
  if (swept) return;
  swept = true;
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith('boogle.world.')) localStorage.removeItem(k);
  } catch {
    // storage unavailable: nothing to drop
  }
}

export async function connectRoom() {
  // The room and its world live under the namespaced id; the plain name stays for the URL, titles and telemetry.
  dropOldSaves();
  const roomId = productionRailway ? railwayRoomId(getRoomId()) : worldRoomId(getRoomId());
  let room: Room;
  try {
    const debug = Number(new URLSearchParams(location.search).get('netdebug')) || 0; // ?netdebug=1 (2: every reconnect)
    // Our server hosts every room (server/README.md): VITE_BOOGLE_SERVER, set by deploy.yml, and by the dev server's
    // own in-process one in `npm run dev` (vite.config.ts).
    const server = import.meta.env.VITE_BOOGLE_SERVER;
    if (!server) throw Object.assign(new Error('VITE_BOOGLE_SERVER is not set'), { code: 'no_server' });
    room = await createWsRoom({
      roomId,
      server,
      pid: identity.pid,
      key: identity.key,
      debug,
      build: BUILD,
    });
  } catch (e) {
    console.warn('[boogle] could not join room:', e);
    noteError(e as NetError, 'connect_failed');
    scheduleRetry(e as NetError);
    setNet('solo');
    return;
  }
  net.retries = 0;
  net.retryAt = 0;
  net.error = null;
  net.full = 0;
  net.room = room;
  setNet('connecting');
  for (const fn of roomHooks.splice(0)) fn(room);
  attachWorld(room, { roomId });
  const fail = (e: NetError) => {
    if (net.state === 'solo') return;
    noteError(e, 'unknown');
    console.warn('[boogle] room unavailable:', e);
    detachWorld();
    try {
      room.close();
    } catch {
      /* already closed */
    }
    net.room = null;
    scheduleRetry(e);
    setNet('solo');
  };
  room.onConnection((connected: boolean) => {
    if (net.state !== 'solo') setNet(connected ? 'live' : 'connecting');
  }, fail);
  room.onPeers(onPeersChange, fail);
  sendPresence();
}

// ---------------------------------------------------------------- frame hooks (orders: top of src/loop.ts)
// late 3000, after every other late hook (the caves camera is 2000), just before render: send presence every SEND_MS
// while on the island or a keepPresenceWhile reason holds.
onFrame(
  ({ now }: { now: number }) => {
    if (!net.room || now - net.lastSend < SEND_MS) return;
    if (local?.entered || presenceReasons.some((fn) => fn())) sendPresence();
  },
  { phase: 'late', order: 3000 },
);
