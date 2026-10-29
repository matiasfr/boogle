import * as THREE from 'three';
import { COLORS, DEFAULT_NAME, DEFAULT_ROOM, INTERP_MS } from './constants.js';
import { lerp, angleLerp, finiteArr, r2, sanitizeName } from './math.js';
import { scene } from './scene.js';
import { world, teleport } from './physics.js';
import { makeAvatar, makeLabel, makePlayerBody } from './avatars.js';
import { me } from './player.js';
import { renderPeople, dom } from './hud.js';
import { createPeerRoom } from './net/peer-room.js';
import { attachWorld, detachWorld, setSelfId } from './world/sync.js';
import { createSnaps } from './snaps.js';
import { mergeFields, hostField } from './presence-fields.js';

// Presence carries each player's pose, plus the fields features add through the hooks below (the ball, the Boogler).
// state: 'connecting' | 'live' | 'solo'; turn: our ICE config includes a TURN server (for connection reports)
export const net = { room: null, myPeer: null, readyAt: 0, lastSend: 0, state: 'connecting', error: null, turn: false };
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
//                                  local ms, ready for createSnaps (src/snaps.js).
//   addHostField(key, getter, onValue)  Host state: only the host publishes getter(); every tab hears onValue(value,
//                                  time, peer) for each fresh value. A different peer means the host changed.
//   onRoomReady(fn)                fn(room) once the room exists (immediately if it already does).
const presenceFields = [];
const remoteHooks = [];
const roomHooks = [];
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

export function buildPresence() {
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
  return mergeFields(pr, presenceFields); // a null field deletes its key (src/presence-fields.js)
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

function dropRemoteBody(r) {
  if (r.avatar) {
    scene.remove(r.avatar);
    r.avatar.userData.mat.dispose();
    r.avatar = null;
  }
  if (r.label) {
    r.label.material.map.dispose();
    r.label.material.dispose();
    r.label = null;
    r.labelText = '';
  }
  if (r.body) {
    world.removeBody(r.body);
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
  const hasT = Number.isFinite(pr.t);
  const fresh = hasT && pr.t !== r.lastT;
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

export function setNet(state) {
  net.state = state;
  dom.netEl.dataset.state = state;
  if (state === 'solo') {
    for (const peer of [...remotes.keys()]) removePeer(peer);
  }
  renderPeople();
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
// unless the browser can't do WebRTC at all.
let retryTimer = 0;
function scheduleRetry(e) {
  if (e?.code === 'browser-incompatible' || retryTimer) return;
  net.retries = (net.retries || 0) + 1;
  const wait = Math.min(5000 * net.retries, 30000);
  net.retryAt = Date.now() + wait;
  retryTimer = setTimeout(() => {
    retryTimer = 0;
    if (net.state === 'solo' && !net.room) connectRoom();
  }, wait);
}

export async function connectRoom() {
  let room;
  try {
    const debug = Number(new URLSearchParams(location.search).get('netdebug')) || 0; // ?netdebug=1 (or 3 for PeerJS internals)
    room = await createPeerRoom({ roomId: getRoomId(), debug, ...(await serverOptions()) });
  } catch (e) {
    console.warn('[boogle] could not join room:', e);
    net.error = String(e?.code || e?.type || 'connect_failed');
    scheduleRetry(e);
    setNet('solo');
    return;
  }
  net.retries = 0;
  net.retryAt = 0;
  net.error = null;
  net.room = room;
  setNet('connecting');
  setSelfId(room.selfId);
  for (const fn of roomHooks.splice(0)) fn(room);
  attachWorld(room, { roomId: getRoomId(), serverUrl: import.meta.env.VITE_BOOGLE_SERVER });
  const fail = (e) => {
    if (net.state === 'solo') return;
    net.error = String(e?.code || e?.type || 'unknown');
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
        world.addBody(r.body);
      }
      r.avatar.userData.mat.color.set(COLORS[r.colorIdx]);
      if (r.labelText !== r.name) {
        if (r.label) {
          r.avatar.remove(r.label);
          r.label.material.map.dispose();
          r.label.material.dispose();
        }
        r.label = makeLabel(r.name);
        r.labelText = r.name;
        r.avatar.add(r.label);
      }
    }
  }
}
