import * as THREE from 'three';
import { COLORS, DEFAULT_NAME, DEFAULT_ROOM, INTERP_MS, SEND_MS } from '../constants.js';
import { lerp, angleLerp, finiteArr, r2, sanitizeName } from '../math.js';
import { scene } from '../render/scene.js';
import { teleport } from '../physics/physics.js';
import { addBody, removeBody } from '../physics/engine.ts';
import { makeAvatar, makeLabel, makePlayerBody, animateAvatar } from '../player/avatars.js';
import { me } from '../player/player.js';
import { renderPeople, dom } from '../player/hud.js';
import { createPeerRoom, defaultHostScore } from '../net/peer-room.js';
import { attachWorld, detachWorld, setPid, setSelfId, worldStatus } from '../world/sync.ts';
import { worldRoomId } from '../world/namespace.ts';
import { identity } from '../player/identity.ts';
import { createSnaps } from './snaps.js';
import { mergeFields, hostField } from './presence-fields.js';
import { onFrame } from '../loop.js';

// Presence carries each player's pose, plus the fields features add through the hooks below (the ball, the Boogler).
// state: 'connecting' | 'live' | 'solo' (changes reach onNetState below); turn: our ICE config includes a TURN server
// (for connection reports); retries: failed joins in a row, reset once a room exists; retryAt: Date.now() of the next
// attempt while solo (0: none scheduled); full: the last join was turned away ('room_full'): the cap, or true.
export const net = {
  /** @type {any} */
  room: null, // the room interface (src/net/README.md) once joined
  myPeer: null,
  readyAt: 0,
  lastSend: 0,
  state: 'connecting',
  error: null,
  full: 0,
  turn: false,
  retries: 0,
  retryAt: 0,
};
export const remotes = new Map();

// Room comes from the URL (?room=beach); anything outside [a-z0-9-]{1,32} is stripped.
export function getRoomId() {
  let raw = '';
  try {
    raw = new URLSearchParams(location.search).get('room') ?? '';
  } catch {
    // no URL available; use the default room
  }
  const id = raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 32);
  return id || DEFAULT_ROOM;
}

function peerColor(peer) {
  let h = 0;
  for (const ch of peer) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h) % COLORS.length;
}

// Extension hooks so features never edit buildPresence/upsertPeer (which kind to use: DESIGN.md, "Pick how each
// feature shares state"). Presence goes out every SEND_MS on an unreliable channel, latest value wins, so keep fields
// small; one that rarely changes costs next to nothing.
//   addPresenceField(key, getter)  Owner state: merges a small JSON value (or null to omit) into our presence.
//   onRemotePresence(fn)           fn(remote, pr, time) after each fresh update from a peer; time is the sample's
//                                  local ms, ready for createSnaps (src/netplay/snaps.js).
//   addHostField(key, getter, onValue)  Host state: only the host publishes getter(); every tab hears onValue(value,
//                                  time, peer) for each fresh value. A different peer means the host changed.
//   onRoomReady(fn)                fn(room) once the room exists (immediately if it already does); one-off events go
//                                  here as room.send/onMessage (reliable, ordered, not to self), not in presence.
//   onNetState(fn)                 fn(state, prev) on every setNet call, after net.state changed. It also fires when
//                                  state === prev: 'solo' -> 'solo' is a retry that failed before reaching a room.
//                                  Details are on net (error, retries, room). Local only; never sends anything.
//   keepPresenceWhile(fn)          keep sending presence while fn() is true, even off the island (ball.js: this tab
//                                  owns the ball). Checked after `me.entered`, in registration order, before hosting.
const presenceFields = [];
const presenceReasons = [];
export function keepPresenceWhile(fn) {
  presenceReasons.push(fn);
}
const remoteHooks = [];
const roomHooks = [];
const stateHooks = [];
export function addPresenceField(key, getter) {
  presenceFields.push([key, getter]);
}
export function onRemotePresence(fn) {
  remoteHooks.push(fn);
}
export function addHostField(key, getter, onValue) {
  const h = hostField(getter, onValue, () => !!net.room?.isHost());
  presenceFields.push([key, h.get]);
  remoteHooks.push((r, pr, time) => h.hear(pr[key], time, r.peer));
}
export function onRoomReady(fn) {
  if (net.room) fn(net.room);
  else roomHooks.push(fn);
}
export function onNetState(fn) {
  stateHooks.push(fn);
}

function buildPresence() {
  const pr = {
    v: document.hidden ? 0 : 1,
    t: Math.round(performance.now()),
    n: null,
    c: null,
    p: null,
    r: null,
    s: null,
  };
  if (me.entered && me.body) {
    const p = me.body.position;
    pr.n = me.name;
    pr.c = me.colorIdx;
    pr.p = [r2(p.x), r2(p.y), r2(p.z)];
    pr.r = r2(me.yaw);
    pr.s = me.swimming ? 2 : me.coyote > 0 ? 0 : 1;
  }
  return mergeFields(pr, presenceFields); // a null field deletes its key (src/netplay/presence-fields.js)
}

export function sendPresence() {
  if (!net.room) return;
  net.lastSend = performance.now();
  net.room.presence(buildPresence()).catch(() => {});
}

function getRemote(peer) {
  let r = remotes.get(peer);
  if (!r) {
    r = {
      peer,
      name: '',
      colorIdx: peerColor(peer),
      visible: false,
      entered: false,
      snaps: createSnaps(),
      lastT: -1,
      off: null,
      avatar: null,
      body: null,
      label: null,
      labelText: '',
      target: new THREE.Vector3(),
      yaw: 0,
      state: 0,
      speed: 0,
      prevPos: new THREE.Vector3(),
    };
    remotes.set(peer, r);
  }
  return r;
}

function disposeLabel(label) {
  label.material.map.dispose();
  label.material.dispose();
}

function dropRemoteBody(r) {
  if (r.avatar) {
    scene.remove(r.avatar);
    r.avatar.userData.mat.dispose();
    r.avatar = null;
  }
  if (r.label) {
    disposeLabel(r.label);
    r.label = null;
    r.labelText = '';
  }
  if (r.body) {
    removeBody(r.body);
    r.body = null;
  }
}

function upsertPeer(peer) {
  if (peer.sameTab) {
    net.myPeer = peer.peer;
    return;
  }
  const pr = peer.presence || {};
  const r = getRemote(peer.peer);
  r.visible = pr.v === 1;
  r.name = sanitizeName(pr.n) || DEFAULT_NAME;
  r.colorIdx = Number.isInteger(pr.c) && pr.c >= 0 && pr.c < COLORS.length ? pr.c : peerColor(peer.peer);
  const fresh = Number.isFinite(pr.t) && pr.t !== r.lastT;
  let time = 0;
  if (fresh) {
    r.lastT = pr.t;
    const arrival = performance.now();
    const off = arrival - pr.t;
    r.off = r.off === null || off < r.off ? off : r.off + (off - r.off) * 0.01;
    time = pr.t + r.off;
  }
  r.entered = finiteArr(pr.p, 3);
  if (r.entered && fresh) {
    r.snaps.push(time, { p: pr.p, r: Number.isFinite(pr.r) ? pr.r : 0, s: pr.s });
  }
  if (!r.entered) {
    r.snaps.clear();
    dropRemoteBody(r);
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

function removePeer(peer) {
  const r = remotes.get(peer);
  if (!r) return;
  dropRemoteBody(r);
  remotes.delete(peer);
}

function onPeersChange(change) {
  if (!net.readyAt) net.readyAt = performance.now();
  for (const p of change.joined) upsertPeer(p);
  for (const p of change.updated) upsertPeer(p);
  for (const p of change.left) removePeer(p.peer);
  renderPeople();
}

function setNet(state) {
  const prev = net.state;
  net.state = state;
  dom.netEl.dataset.state = state;
  if (state === 'solo') {
    for (const peer of [...remotes.keys()]) removePeer(peer);
  }
  renderPeople();
  for (const fn of stateHooks) {
    try {
      fn(state, prev);
    } catch (e) {
      console.warn('[boogle] net state hook failed', e);
    }
  }
}

// Our own server (see server/README.md): set VITE_BOOGLE_SERVER=https://your-app.fly.dev at build/dev time.
// Without it, PeerJS's free public signaling server and default STUN are used (fine for trying things out).
async function serverOptions() {
  const base = import.meta.env.VITE_BOOGLE_SERVER;
  if (!base) return {};
  const url = new URL(base);
  const secure = url.protocol === 'https:';
  const signal = { host: url.hostname, port: Number(url.port) || (secure ? 443 : 80), path: '/peerjs', secure };
  try {
    const res = await fetch(new URL('/ice', url));
    const { iceServers } = await res.json();
    net.turn = Array.isArray(iceServers) && iceServers.some((s) => [s?.urls].flat().some((u) => /^turns?:/.test(u)));
    return { signal, iceServers };
  } catch (e) {
    console.warn('[boogle] could not fetch ICE servers, using defaults:', e);
    return { signal };
  }
}

// Keep trying while solo (a host that was unreachable, a flaky network, the signaling server blipping),
// unless the browser can't do WebRTC at all. A full room is retried every few seconds, so a spot that opens is taken.
let retryTimer = 0;
const FULL_RETRY_MS = 4000;
function noteError(e, fallback) {
  net.error = String(e?.code || e?.type || fallback);
  net.full = e?.code === 'room_full' ? e.max || true : 0;
}
function scheduleRetry(e) {
  if (e?.code === 'browser-incompatible' || retryTimer) return;
  net.retries += 1;
  const wait = net.full ? FULL_RETRY_MS : Math.min(5000 * net.retries, 30000);
  net.retryAt = Date.now() + wait;
  retryTimer = setTimeout(() => {
    retryTimer = 0;
    if (net.state === 'solo' && !net.room) connectRoom();
  }, wait);
}

// Host choice (src/net/peer-room.js): a tab that doesn't hold the verified world yet would restart the room from the
// last save if it took over, so it scores 0 and is never handed the room.
const hostScore = () => (worldStatus().ready ? defaultHostScore() : 0);

// Saves from before the 0.1 clean break, under the plain room name: nothing loads them any more (src/world/namespace.ts).
function dropOldSave(room) {
  try {
    localStorage.removeItem(`boogle.world.${room}`);
  } catch {
    // storage unavailable: nothing to drop
  }
}

export async function connectRoom() {
  // The room and its world live under the namespaced id; the plain name stays for the URL, titles and telemetry.
  dropOldSave(getRoomId());
  const roomId = worldRoomId(getRoomId());
  setPid((await identity.ready).pid); // before attachWorld: its first message says who we are
  let room;
  try {
    const debug = Number(new URLSearchParams(location.search).get('netdebug')) || 0; // ?netdebug=1 (or 3 for PeerJS internals)
    room = await createPeerRoom({ roomId, debug, hostScore, ...(await serverOptions()) });
  } catch (e) {
    console.warn('[boogle] could not join room:', e);
    noteError(e, 'connect_failed');
    scheduleRetry(e);
    setNet('solo');
    return;
  }
  net.retries = 0;
  net.retryAt = 0;
  net.error = null;
  net.full = 0;
  net.room = room;
  setNet('connecting');
  setSelfId(room.selfId);
  for (const fn of roomHooks.splice(0)) fn(room);
  attachWorld(room, { roomId, serverUrl: import.meta.env.VITE_BOOGLE_SERVER });
  const fail = (e) => {
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
  room.onConnection((connected) => {
    if (net.state !== 'solo') setNet(connected ? 'live' : 'connecting');
  }, fail);
  room.onPeers(onPeersChange, fail);
  // Host fields follow the role at once: a demoted host (even one still on the title screen, which sends no presence
  // otherwise) clears them before it rejoins, and a new host publishes them without waiting for its next send.
  room.onHostChange(() => sendPresence());
  sendPresence();
}

// ---------------------------------------------------------------- remote interpolation
export function updateRemotes(now) {
  const rt = now - INTERP_MS;
  for (const r of remotes.values()) {
    if (r.entered && r.snaps.length) {
      const s = r.snaps.sample(rt);
      r.target.set(lerp(s.a.p[0], s.b.p[0], s.u), lerp(s.a.p[1], s.b.p[1], s.u), lerp(s.a.p[2], s.b.p[2], s.u));
      r.yaw = angleLerp(s.a.r, s.b.r, s.u);
      r.state = s.b.s;
      if (!r.avatar) {
        r.avatar = makeAvatar(r.colorIdx);
        r.avatar.position.copy(r.target);
        r.prevPos.copy(r.target);
        scene.add(r.avatar);
        r.body = makePlayerBody(true);
        teleport(r.body, r.target.x, r.target.y, r.target.z);
        addBody(r.body);
      }
      r.avatar.userData.mat.color.set(COLORS[r.colorIdx]);
      if (r.labelText !== r.name) {
        if (r.label) {
          r.avatar.remove(r.label);
          disposeLabel(r.label);
        }
        r.label = makeLabel(r.name);
        r.labelText = r.name;
        r.avatar.add(r.label);
      }
    }
  }
}

// ---------------------------------------------------------------- frame hooks (orders: top of src/loop.js)
// update -280, after this player's avatar (player.js, -290), before the camera (-200): remote avatars take their
// interpolated pose and walk at the speed they moved since last frame.
const tmpV = new THREE.Vector3();
onFrame(
  ({ dt }) => {
    for (const r of remotes.values()) {
      if (!r.avatar) continue;
      r.avatar.position.copy(r.target);
      r.avatar.rotation.y = r.yaw;
      const speed = dt > 0 ? tmpV.copy(r.target).sub(r.prevPos).setY(0).length() / dt : 0;
      r.speed = lerp(r.speed, speed, 1 - Math.exp(-dt * 10));
      r.prevPos.copy(r.target);
      animateAvatar(r.avatar, r.speed, r.state === 1, dt);
    }
  },
  { phase: 'update', order: -280 },
);

// late 3000, after every other late hook (the caves camera is 2000), just before render: send presence every SEND_MS
// while on the island, hosting, or a keepPresenceWhile reason holds.
onFrame(
  ({ now }) => {
    if (!net.room || now - net.lastSend < SEND_MS) return;
    if (me.entered || presenceReasons.some((fn) => fn()) || net.room.isHost()) sendPresence();
  },
  { phase: 'late', order: 3000 },
);
