// The clients of one server-hosted room (docs/plans/server-host.md, "Joining", "Presence relay", "Leaving", "Lead"):
// the cap, presence and message relay, heartbeats, the lead, and the room adapter the world host's sync talks through.
// Wire shapes: src/net/ws-wire.ts.
//
//   const room = createHostedRoom({ roomId, store, cfg, log })
//   room.join(ws, selfId, pid, key)   an upgraded socket (rooms.ts has checked the room, ids, origin and rate). An
//                                older session of the same player (same pid and key) is closed with ELSEWHERE and
//                                leaves at once; a pid in the room under another key is refused with TAKEN
//   room.replication             the room's replicator (src/world/replicate-server.ts): states define projections on it;
//                                every client is subscribed on join (late join from change tick -1), and at the end of
//                                each 60 Hz step what changed goes out, skipping sockets over HIGH_WATER (coalescing)
//   room.status()                { boot, tick, players, max, lead, noSave, steps }  (steps: step-meter.ts)
//   room.idleMs()                how long nobody has been in the room (0 while anyone is, or is reconnecting)
//   A railway room is paused (world.pause(), the paused world) once idleMs() passes cfg.roomPauseMs, and woken with its
//   away credit by the next join. A hidden tab is still a client (until hiddenDeadMs), so it keeps the room running.
//   await room.close({ save })   bye to everyone, save the world, close the sockets with 1012
import type { WebSocket } from 'ws';
import { CLOSE, MAX_MSG, encode, decode, type WireMsg } from '../../../src/net/ws-wire.ts';
import { SERVER_ID } from '../../../src/net/ids.ts';
import { createStepMeter } from './step-meter.ts';
import { createWorldHost, createRailwayWorldHost, type RailwayWorldHost } from './world-host.ts';
import { isRailwayRoom } from '../../../src/world/railway-namespace.ts';
import { RAILWAY_CLIENT_MESSAGES } from '../../../src/world/railway-wire.ts';
import { HOST_TYPES } from '../../../src/world/sync.ts';
import { validatePing, honkShape } from '../../../src/sim/social.ts';
import { HALF } from '../../../src/world/grid.ts';
import { RTC_TYPE, validateRtc } from '../../../src/net/rtc-wire.ts';
import { createReplicator } from '../../../src/world/replicate-server.ts';
import { RAIL_AWAY } from '../../../src/sim/railway-away.ts';
import type { Store } from '../store.ts';

export type HostCfg = {
  maxPlayers: number;
  serverSaveMs: number;
  tuneControllerKey?: string;
  reconnectGraceMs?: number;
  deadMs?: number;
  hiddenDeadMs?: number;
  leadHiddenMs?: number;
  housekeepMs?: number;
  roomPauseMs?: number; // a railway room stops simulating this long after it empties (RAIL_AWAY.pauseMs)
};

const LIST_CHARS = 12000; // a peer list is chunked at this many chars
const HIGH_WATER = 64 * 1024; // hold presence back while a socket has this much unsent
const MIN_GAP_MS = 20; // per-source spacing of presence packets to one client
const MSG_RATE = 50; // messages/s per client (burst MSG_BURST)
const MSG_BURST = 100;
const PRESENCE_RATE = 40; // presence packets/s per client
const CLIENT_ONLY = new Set(['w:edit', 'w:need']); // for the server's sync alone
// Voice signals (src/net/rtc-wire.ts): their own bucket, so a burst of ICE candidates never eats game messages.
const RTC_RATE = 20;
const RTC_BURST = 60;

type Bucket = { tokens: number; at: number };
type Client = {
  id: string;
  pid: string; // the player (src/player/identity.ts), bound at the upgrade; the sync stamps edits with it
  key: string; // the browser's secret behind that pid: only the same key takes the pid over
  ws: WebSocket;
  joinedAt: number;
  seen: number; // last message
  s: number; // presence sequence
  d: unknown; // latest presence
  hiddenSince: number; // when its presence last went v !== 1 (0 while visible)
  pending: Map<string, string>; // source id -> encoded presence, latest wins
  sentAt: Map<string, number>;
  timer: NodeJS.Timeout | null;
  msgs: Bucket;
  pres: Bucket;
  rtc: Bucket;
  dropped: number;
};

function take(b: Bucket, rate: number, burst: number, now: number) {
  b.tokens = Math.min(burst, b.tokens + ((now - b.at) * rate) / 1000);
  b.at = now;
  if (b.tokens < 1) return false;
  b.tokens -= 1;
  return true;
}
// A bag of seeds' mushrooms (src/adapters/mushrooms.ts sprout): { s: [x, z, ...] }, at most five spots on the island.
// Returns a clean copy (positions to the decimetre, as the sender rounds them) or null; receivers validate again.
const MUSH_SPOTS = 10;
function mushShape(msg: unknown): { s: number[] } | null {
  const s = (msg as { s?: unknown } | null)?.s;
  if (!Array.isArray(s) || !s.length || s.length > MUSH_SPOTS || s.length % 2) return null;
  const r = s.map((v: unknown) => (typeof v === 'number' ? Math.round(v * 10) / 10 : NaN));
  return r.every((v) => Number.isFinite(v) && Math.abs(v) < HALF) ? { s: r } : null;
}
const visible = (c: Client) => (c.d as { v?: unknown } | null)?.v === 1;
// Voice chat's presence field (src/features/voice.ts): 1 in voice, 2 muted; missing means not in voice.
const inVoice = (c: Client) => {
  const vc = (c.d as { vc?: unknown } | null)?.vc;
  return vc === 1 || vc === 2;
};

export function createHostedRoom({
  roomId,
  store,
  cfg,
  boot,
  log = () => {},
}: {
  roomId: string;
  store: Store;
  cfg: HostCfg;
  boot: string;
  log?: (...a: unknown[]) => void;
}) {
  const graceMs = cfg.reconnectGraceMs ?? 1500;
  const born = store.born(roomId); // this world's id (null: unreadable save); a reset or restore loads a new room
  // A tab sends nothing while its own main thread is stalled (a long frame, a software-rendered runner at a frame every few
  // seconds), so a short limit drops healthy sockets and every peer re-lists them. A closed tab or a lost link still ends the
  // socket at once (close/reset); this only bounds a connection that went silent without either.
  const deadMs = cfg.deadMs ?? 20000;
  // A hidden tab (its presence says v 0) may be throttled or frozen by its browser far longer: give it more.
  const hiddenDeadMs = cfg.hiddenDeadMs ?? 120000;
  const leadHiddenMs = cfg.leadHiddenMs ?? 5000;
  const clients = new Map<string, Client>(); // ready clients by selfId
  const railway = isRailwayRoom(roomId);
  const poseAt = new Map<string, number>();
  // The room's replicator (docs/plans/replication.md): a railway room's `railway` state defines its projections on it;
  // every client is subscribed on join (late join from change tick -1), and at the end of each 60 Hz step what changed
  // goes out, skipping sockets over HIGH_WATER (coalescing).
  const replication = createReplicator();
  const meter = createStepMeter();
  const hostOptions = {
    meter,
    roomId,
    store,
    saveMs: cfg.serverSaveMs,
    log,
    pidOf: (sid: string) => clients.get(sid)?.pid ?? null,
    tuneController: (sid: string) => !!cfg.tuneControllerKey && clients.get(sid)?.key === cfg.tuneControllerKey,
  };
  const pauseMs = cfg.roomPauseMs ?? RAIL_AWAY.pauseMs;
  const world = railway
    ? createRailwayWorldHost({
        ...hostOptions,
        replication,
        awake: false, // the first join wakes it, with the away credit since its last save
        positions() {
          return [...clients].map(([sid, client]) => {
            const p = client.d && typeof client.d === 'object' ? (client.d as { p?: unknown }).p : null;
            const at = poseAt.get(sid);
            return Array.isArray(p) && typeof p[0] === 'number' && typeof p[2] === 'number' && at !== undefined
              ? {
                  x: p[0],
                  y: typeof p[1] === 'number' ? p[1] : undefined,
                  z: p[2],
                  at,
                  pid: client.pid,
                }
              : null;
          });
        },
      })
    : createWorldHost(hostOptions);
  const depart = (sid: string) => {
    if (railway) (world as RailwayWorldHost).depart(sid);
  };
  const gone = new Map<string, { s: number; pid: string; key: string; timer: NodeJS.Timeout }>(); // closed, waiting out the grace period
  let lead: string | null = null;
  const retired = new Set<string>(); // sessions a newer tab of their player replaced: turned away if they come back
  let closing = false;
  let emptySince = performance.now(); // when the last client was gone for good (rooms.ts unloads idle rooms)

  const write = (c: Client, text: string) => {
    if (c.ws.readyState === c.ws.OPEN) c.ws.send(text);
  };
  const toAll = (text: string, except?: string) => {
    for (const c of clients.values()) if (c.id !== except) write(c, text);
  };
  // Today every other ready client; the seam interest management will narrow (docs/research/shared-state-at-scale.md).
  const audience = (from: string) => [...clients.values()].filter((c) => c.id !== from);

  // End-of-step send-on-change, up to 60 Hz. A backed-up socket is skipped and catches up with the latest values on its
  // next send.
  // Measured for /rooms/:id/status and npm run load: commit + flush ms per step, and what went out.
  const repStats = { steps: 0, ms: 0, maxMs: 0, packets: 0, chars: 0, skipped: 0 };
  world.sync.onStep((step) => {
    const t0 = performance.now();
    replication.commit(step);
    const out = replication.flush(
      step,
      (cid, _packet, json) => {
        const c = clients.get(cid);
        if (c) write(c, `{"t":"m","from":${JSON.stringify(SERVER_ID)},"d":${json}}`); // encode(), without re-serializing
      },
      (cid) => {
        const c = clients.get(cid);
        return !!c && c.ws.readyState === c.ws.OPEN && c.ws.bufferedAmount <= HIGH_WATER;
      },
    );
    const ms = performance.now() - t0;
    repStats.steps++;
    repStats.ms += ms;
    repStats.maxMs = Math.max(repStats.maxMs, ms);
    repStats.packets += out.packets;
    repStats.chars += out.chars;
    repStats.skipped += out.skipped;
    meter.cost(ms);
  });

  // The host's messages: addressed messages to the client they name, the rest to everyone, encoded once.
  world.onSend((msg) => {
    if (typeof msg.to === 'string') {
      const c = clients.get(msg.to);
      if (c) write(c, encode({ t: 'm', from: SERVER_ID, d: msg }));
    } else toAll(encode({ t: 'm', from: SERVER_ID, d: msg }));
  });

  // Presence to one client: latest wins per source, MIN_GAP_MS apart, held while the socket is backed up.
  function flush(c: Client) {
    c.timer = null;
    if (!clients.has(c.id) || c.ws.readyState !== c.ws.OPEN) return;
    if (c.ws.bufferedAmount > HIGH_WATER) return void (c.timer = setTimeout(() => flush(c), MIN_GAP_MS));
    const now = performance.now();
    let wait = Infinity;
    for (const [src, text] of c.pending) {
      const left = (c.sentAt.get(src) ?? -Infinity) + MIN_GAP_MS - now;
      if (left > 0) wait = Math.min(wait, left);
      else {
        c.ws.send(text);
        c.sentAt.set(src, now);
        c.pending.delete(src);
      }
    }
    if (c.pending.size) c.timer = setTimeout(() => flush(c), wait);
  }
  function queuePresence(c: Client, src: string, text: string) {
    c.pending.set(src, text);
    if (!c.timer) flush(c);
  }

  function pickLead() {
    let best: Client | null = null;
    for (const c of clients.values())
      if (!best || (visible(c) && !visible(best)) || (visible(c) === visible(best) && c.joinedAt < best.joinedAt))
        best = c;
    return best?.id ?? null;
  }
  function checkLead() {
    const cur = lead ? clients.get(lead) : null;
    let next = lead;
    if (!cur) next = pickLead();
    else if (!visible(cur) && cur.hiddenSince && performance.now() - cur.hiddenSince >= leadHiddenMs) {
      const better = pickLead();
      if (better && visible(clients.get(better)!)) next = better;
    }
    if (next === lead) return;
    lead = next;
    toAll(encode({ t: 'lead', id: lead }));
  }

  function onMessage(c: Client, data: unknown) {
    if (clients.get(c.id) !== c) return; // a replaced socket's frames still in flight
    const text = String(data);
    const now = performance.now();
    c.seen = now;
    if (text.length > MAX_MSG) return void c.dropped++;
    const m = decode(text);
    if (!m) return void c.dropped++;
    if (m.t === 'hb') return write(c, encode({ t: 'hb', at: m.at }));
    if (m.t === 'bye') return void c.ws.close(1000);
    if (m.t === 'p') {
      if (!Number.isSafeInteger(m.s) || (m.s as number) <= c.s) return;
      if (!take(c.pres, PRESENCE_RATE, PRESENCE_RATE, now)) return void c.dropped++;
      c.s = m.s as number;
      c.d = m.d;
      if (railway) poseAt.set(c.id, Date.now());
      c.hiddenSince = visible(c) ? 0 : c.hiddenSince || now;
      const out = encode({ t: 'p', id: c.id, s: c.s, d: c.d });
      for (const to of audience(c.id)) queuePresence(to, c.id, out);
      if (c.id === lead || !lead) checkLead();
      return;
    }
    if (m.t !== 'm') return;
    if ((m.d as WireMsg | null)?.t === RTC_TYPE) {
      // Voice: a clean copy to the one tab it names, never to everyone and never into the world or a save. Both tabs'
      // presence must say they are in voice (nobody listens in unseen), and a backed-up socket gets nothing more.
      if (!take(c.rtc, RTC_RATE, RTC_BURST, now)) return void c.dropped++;
      const signal = validateRtc(m.d);
      const to = signal && signal.to !== c.id ? clients.get(signal.to) : undefined;
      if (!signal || !to || !inVoice(c) || !inVoice(to)) return void c.dropped++;
      if (to.ws.bufferedAmount > HIGH_WATER) return void c.dropped++;
      return write(to, encode({ t: 'm', from: c.id, d: signal }));
    }
    if (!take(c.msgs, MSG_RATE, MSG_BURST, now)) return void c.dropped++;
    const t = (m.d as WireMsg | null)?.t;
    if (HOST_TYPES.has(t as string)) return void c.dropped++;
    if (railway) {
      // Existing cosmetic one-offs remain peer messages. Strip unrelated fields; none enters the material host.
      if (t === 'ping' || t === 'honk' || t === 'mush') {
        const cosmetic = t === 'ping' ? validatePing(m.d) : t === 'mush' ? mushShape(m.d) : { v: honkShape(m.d) };
        if (!cosmetic) return void c.dropped++;
        toAll(encode({ t: 'm', from: c.id, d: { t, ...cosmetic } }), c.id);
        return;
      }
      // Railway actions and world requests go only to the host. Never relay a forged packet or old edit protocol.
      if (typeof t !== 'string' || (t !== 'w:need' && t !== 'w:edit' && !RAILWAY_CLIENT_MESSAGES.has(t)))
        return void c.dropped++;
      world.deliver(m.d, c.id);
      return;
    }
    if (!CLIENT_ONLY.has(t as string)) toAll(encode({ t: 'm', from: c.id, d: m.d }), c.id);
    world.deliver(m.d, c.id);
  }

  function leave(c: Client) {
    if (clients.get(c.id) !== c) return; // replaced by a newer socket
    clients.delete(c.id);
    poseAt.delete(c.id);
    replication.removeClient(c.id);
    if (c.timer) clearTimeout(c.timer);
    for (const o of clients.values()) o.pending.delete(c.id);
    if (closing) return;
    const timer = setTimeout(() => {
      gone.delete(c.id);
      depart(c.id);
      if (!clients.size && !gone.size) emptySince = performance.now();
      toAll(encode({ t: 'left', id: c.id, s: c.s }));
      checkLead();
    }, graceMs);
    gone.set(c.id, { s: c.s, pid: c.pid, key: c.key, timer });
    if (lead === c.id) checkLead(); // the lead does not wait out the grace period
  }

  // Takes c out of the room now, without the grace period (its close is then not a leave).
  function drop(c: Client, code: number) {
    clients.delete(c.id);
    poseAt.delete(c.id);
    replication.removeClient(c.id);
    if (c.timer) clearTimeout(c.timer);
    for (const x of clients.values()) x.pending.delete(c.id);
    c.ws.close(code);
  }
  function retire(id: string, s: number) {
    retired.add(id);
    if (retired.size > 256) retired.delete(retired.values().next().value!);
    toAll(encode({ t: 'left', id, s }));
  }
  // Another session of the joining player goes at once: the newer tab wins.
  function dropOlder(id: string, pid: string) {
    for (const o of [...clients.values()]) {
      if (o.pid !== pid || o.id === id) continue;
      write(o, encode({ t: 'elsewhere' }));
      depart(o.id);
      drop(o, CLOSE.ELSEWHERE);
      retire(o.id, o.s);
    }
    for (const [gid, g] of gone) {
      if (g.pid !== pid || gid === id) continue;
      clearTimeout(g.timer);
      gone.delete(gid);
      depart(gid);
      retire(gid, g.s);
    }
    if (lead && !clients.has(lead)) checkLead();
  }
  // Whether another session holds pid under a different key: someone else claiming a player who is here.
  function taken(id: string, pid: string, key: string) {
    for (const c of clients.values()) if (c.pid === pid && c.id !== id && c.key !== key) return true;
    for (const [gid, g] of gone) if (g.pid === pid && gid !== id && g.key !== key) return true;
    return false;
  }

  function join(ws: WebSocket, id: string, pid: string, key: string) {
    if (closing) return void ws.close(CLOSE.RESTART);
    if (retired.has(id)) return void (ws.send(encode({ t: 'elsewhere' })), ws.close(CLOSE.ELSEWHERE));
    const old = clients.get(id);
    const back = gone.get(id);
    const bound = old ?? back;
    // Session ids are public presence ids. Only the bound player and secret may resume or replace that socket.
    if (bound && (bound.pid !== pid || bound.key !== key))
      return void (ws.send(encode({ t: 'taken' })), ws.close(CLOSE.TAKEN));
    if (taken(id, pid, key)) return void (ws.send(encode({ t: 'taken' })), ws.close(CLOSE.TAKEN));
    dropOlder(id, pid);
    if (!old && !back && clients.size + gone.size >= cfg.maxPlayers) {
      ws.send(encode({ t: 'full', max: cfg.maxPlayers }));
      return void ws.close(CLOSE.FULL);
    }
    if (back) (clearTimeout(back.timer), gone.delete(id));
    const now = performance.now();
    const c: Client = {
      id,
      pid,
      key,
      ws,
      joinedAt: old?.joinedAt ?? now,
      seen: now,
      s: old?.s ?? back?.s ?? -1,
      d: old?.d ?? null,
      hiddenSince: old?.hiddenSince ?? 0,
      pending: new Map(),
      sentAt: new Map(),
      timer: null,
      msgs: { tokens: MSG_BURST, at: now },
      pres: { tokens: PRESENCE_RATE, at: now },
      rtc: { tokens: RTC_BURST, at: now },
      dropped: 0,
    };
    if (old) drop(old, CLOSE.REPLACED);
    clients.set(id, c);
    replication.addClient(id); // a fresh mirror: everything whole from change tick -1 (the proof slice subscribes all)
    ws.on('message', (data) => {
      // One malformed message must never reach the process (it hosts every room): drop it like other malformed
      // input. The log names only the error's class, never client text.
      try {
        onMessage(c, data);
      } catch (error) {
        c.dropped++;
        log(`room ${roomId}: dropped a message that threw ${error instanceof Error ? error.name : typeof error}`);
      }
    });
    ws.on('close', () => leave(c));
    ws.on('error', () => {});
    if (!lead) lead = id;
    ws.send(encode({ t: 'welcome', v: 1, boot, ...(born === null ? {} : { born }), lead, max: cfg.maxPlayers }));
    let peers: { id: string; s: number; d: unknown }[] = [];
    let chars = 0;
    const sendList = (last: boolean) => {
      ws.send(encode({ t: 'list', peers, last }));
      peers = [];
      chars = 0;
    };
    for (const o of clients.values()) {
      if (o.id === id || o.d === null) continue;
      const p = { id: o.id, s: o.s, d: o.d };
      const size = JSON.stringify(p).length;
      if (chars && chars + size > LIST_CHARS) sendList(false);
      peers.push(p);
      chars += size;
    }
    sendList(true);
    if (lead !== id) checkLead();
    if (railway) (world as RailwayWorldHost).wake(); // a paused room applies its away credit before anyone sees it
    world.deliver({ t: 'w:need' }, id); // a tab back after a server restart gets the world at once
  }

  const housekeep = setInterval(() => {
    const now = performance.now();
    const hb = encode({ t: 'hb', at: Date.now() });
    for (const c of clients.values()) {
      if (now - c.seen > (c.hiddenSince ? hiddenDeadMs : deadMs)) c.ws.terminate();
      else write(c, hb);
    }
    checkLead();
    if (railway && !clients.size && !gone.size && now - emptySince > pauseMs) (world as RailwayWorldHost).pause();
  }, cfg.housekeepMs ?? 1000);
  housekeep.unref();

  return {
    world,
    replication,
    join,
    status: () => ({
      boot,
      tick: world.sync.world.tick,
      players: clients.size,
      max: cfg.maxPlayers,
      lead,
      noSave: world.status().badSave, // a failed-load fallback must not replace the durable save
      steps: meter.report(world.sync.stepsDropped()),
      replication: { ...repStats, entities: replication.size() },
      ...(railway ? { railway: (world as RailwayWorldHost).stats } : {}),
    }),
    idleMs: () => (clients.size || gone.size ? 0 : performance.now() - emptySince),
    async close({ save = true } = {}) {
      closing = true;
      clearInterval(housekeep);
      for (const g of gone.values()) clearTimeout(g.timer);
      gone.clear();
      toAll(encode({ t: 'bye', why: 'restart' }));
      try {
        await world.close({ save });
      } finally {
        for (const c of [...clients.values()]) c.ws.close(CLOSE.RESTART);
      }
      log(`room ${roomId}: closed at tick ${world.sync.world.tick}`);
    },
  };
}
export type HostedRoom = ReturnType<typeof createHostedRoom>;
