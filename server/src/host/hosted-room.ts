// The clients of one server-hosted room (docs/plans/server-host.md, "Joining", "Presence relay", "Leaving", "Lead"):
// the cap, presence and message relay, heartbeats, the lead, and the room adapter the world host's sync talks through.
// Wire shapes: src/net/ws-wire.ts.
//
//   const room = createHostedRoom({ roomId, store, cfg, log })
//   room.join(ws, selfId)        an upgraded socket (rooms.ts has checked the room, id, origin and rate)
//   room.status()                { boot, tick, players, max, lead, noSave }
//   await room.adopt(snap)       replace the world with a handed-over one, re-serve every client, save
//   await room.close({ save })   bye to everyone, save the world, close the sockets with 1012
import type { WebSocket } from 'ws';
import { CLOSE, MAX_MSG, encode, decode, type WireMsg } from '../../../src/net/ws-wire.ts';
import { SERVER_ID } from '../../../src/net/ids.ts';
import { createWorldHost } from './world-host.ts';
import type { Store } from '../store.ts';

export type HostCfg = {
  maxPlayers: number;
  serverSaveMs: number;
  reconnectGraceMs?: number;
  deadMs?: number;
  leadHiddenMs?: number;
  housekeepMs?: number;
};

const LIST_CHARS = 12000; // a peer list is chunked at this many chars
const HIGH_WATER = 64 * 1024; // hold presence back while a socket has this much unsent
const MIN_GAP_MS = 20; // per-source spacing of presence packets to one client
const MSG_RATE = 50; // messages/s per client (burst MSG_BURST)
const MSG_BURST = 100;
const PRESENCE_RATE = 40; // presence packets/s per client
const CLIENT_ONLY = new Set(['w:edit', 'w:need']); // for the server's sync alone
const HOST_ONLY = new Set(['w:edits', 'w:c', 'w:hash', 'w:snap']); // only the host sends these

type Bucket = { tokens: number; at: number };
type Client = {
  id: string;
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
  dropped: number;
};

function take(b: Bucket, rate: number, burst: number, now: number) {
  b.tokens = Math.min(burst, b.tokens + ((now - b.at) * rate) / 1000);
  b.at = now;
  if (b.tokens < 1) return false;
  b.tokens -= 1;
  return true;
}
const visible = (c: Client) => (c.d as { v?: unknown } | null)?.v === 1;

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
  const deadMs = cfg.deadMs ?? 5000;
  const leadHiddenMs = cfg.leadHiddenMs ?? 5000;
  const world = createWorldHost({ roomId, store, saveMs: cfg.serverSaveMs, log });
  const clients = new Map<string, Client>(); // ready clients by selfId
  const gone = new Map<string, { s: number; timer: NodeJS.Timeout }>(); // closed, waiting out the grace period
  let lead: string | null = null;
  let closing = false;

  const write = (c: Client, text: string) => {
    if (c.ws.readyState === c.ws.OPEN) c.ws.send(text);
  };
  const toAll = (text: string, except?: string) => {
    for (const c of clients.values()) if (c.id !== except) write(c, text);
  };
  // Today every other ready client; the seam interest management will narrow (docs/research/shared-state-at-scale.md).
  const audience = (from: string) => [...clients.values()].filter((c) => c.id !== from);

  // The sync's messages: w:snap chunks to the client they name, the rest to everyone, encoded once.
  world.onSend((msg) => {
    if (msg.t === 'w:snap') {
      const c = clients.get(String(msg.to));
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
      c.hiddenSince = visible(c) ? 0 : c.hiddenSince || now;
      const out = encode({ t: 'p', id: c.id, s: c.s, d: c.d });
      for (const to of audience(c.id)) queuePresence(to, c.id, out);
      if (c.id === lead || !lead) checkLead();
      return;
    }
    if (m.t !== 'm') return;
    if (!take(c.msgs, MSG_RATE, MSG_BURST, now)) return void c.dropped++;
    const t = (m.d as WireMsg | null)?.t;
    if (HOST_ONLY.has(t as string)) return void c.dropped++;
    if (!CLIENT_ONLY.has(t as string)) toAll(encode({ t: 'm', from: c.id, d: m.d }), c.id);
    world.deliver(m.d, c.id);
  }

  function leave(c: Client) {
    if (clients.get(c.id) !== c) return; // replaced by a newer socket
    clients.delete(c.id);
    if (c.timer) clearTimeout(c.timer);
    for (const o of clients.values()) o.pending.delete(c.id);
    if (closing) return;
    const timer = setTimeout(() => {
      gone.delete(c.id);
      toAll(encode({ t: 'left', id: c.id, s: c.s }));
      checkLead();
    }, graceMs);
    gone.set(c.id, { s: c.s, timer });
    if (lead === c.id) checkLead(); // the lead does not wait out the grace period
  }

  function join(ws: WebSocket, id: string) {
    if (closing) return void ws.close(CLOSE.RESTART);
    const old = clients.get(id);
    const back = gone.get(id);
    if (!old && !back && clients.size + gone.size >= cfg.maxPlayers) {
      ws.send(encode({ t: 'full', max: cfg.maxPlayers }));
      return void ws.close(CLOSE.FULL);
    }
    if (back) (clearTimeout(back.timer), gone.delete(id));
    const now = performance.now();
    const c: Client = {
      id,
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
      dropped: 0,
    };
    if (old) {
      clients.delete(id); // so its close below is not a leave
      if (old.timer) clearTimeout(old.timer);
      old.ws.close(CLOSE.REPLACED);
    }
    clients.set(id, c);
    ws.on('message', (data) => onMessage(c, data));
    ws.on('close', () => leave(c));
    ws.on('error', () => {});
    if (!lead) lead = id;
    ws.send(encode({ t: 'welcome', v: 1, boot, lead, max: cfg.maxPlayers }));
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
    world.deliver({ t: 'w:need' }, id); // a tab back after a server restart gets the world at once
  }

  const housekeep = setInterval(() => {
    const now = performance.now();
    const hb = encode({ t: 'hb', at: Date.now() });
    for (const c of clients.values()) {
      if (now - c.seen > deadMs) c.ws.terminate();
      else write(c, hb);
    }
    checkLead();
  }, cfg.housekeepMs ?? 1000);
  housekeep.unref();

  return {
    world,
    join,
    status: () => ({
      boot,
      tick: world.sync.world.tick,
      players: clients.size,
      max: cfg.maxPlayers,
      lead,
      noSave: world.status().newerSave, // a state saved by a newer build: deploy the server
    }),
    async adopt(snap: unknown) {
      if (!world.adopt(snap)) return false;
      for (const id of clients.keys()) world.deliver({ t: 'w:need' }, id);
      await world.save();
      return true;
    },
    async close({ save = true } = {}) {
      closing = true;
      clearInterval(housekeep);
      for (const g of gone.values()) clearTimeout(g.timer);
      gone.clear();
      toAll(encode({ t: 'bye', why: 'restart' }));
      await world.close({ save });
      for (const c of [...clients.values()]) c.ws.close(CLOSE.RESTART);
      log(`room ${roomId}: closed at tick ${world.sync.world.tick}`);
    },
  };
}
export type HostedRoom = ReturnType<typeof createHostedRoom>;
