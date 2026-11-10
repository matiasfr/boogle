// Voice chat's link bookkeeping (docs/game-design/social.md, "Voice chat"): one audio link to every other tab in voice,
// a full mesh. Pure and headless: the browser's RTCPeerConnection sits behind `open` (src/features/voice.ts), a fake
// in test/voice-mesh.test.ts. Signals are room messages addressed to one tab (src/net/rtc-wire.ts).
//
//   const mesh = createVoiceMesh({ self, send, open, now })
//   mesh.join() / mesh.leave()   start; stop (closes every link and tells each peer 'bye')
//   mesh.setMembers(ids)         the other tabs whose presence says they are in voice. Of each pair the smaller id
//                                offers, so two tabs never offer each other. A link to a tab that stopped being a member
//                                closes once it is MEMBER_GRACE_MS old (an offer can arrive before its sender's presence)
//   mesh.hear(msg, from)         an incoming signal (validated already)
//   mesh.tick()                  timeouts: a link not connected after connectMs fails; the offerer retries `retries` times
//   mesh.links()                 peer -> { state: 'connecting' | 'connected' | 'failed', role }
import type { RtcIce, RtcMsg } from '../net/rtc-wire.ts';

export type LinkState = 'connecting' | 'connected' | 'failed';
/** One peer connection, as the mesh drives it. Each promise may reject; the link then fails. */
export interface PeerLink {
  makeOffer(): Promise<string>;
  takeOffer(sdp: string): Promise<string>; // resolves to the answer
  takeAnswer(sdp: string): Promise<void>;
  addIce(c: RtcIce | null): Promise<void>;
  close(): void;
}
export type MeshOpts = {
  self: string;
  send(msg: RtcMsg): void;
  /** A new link to peer. onIce: a local candidate to send; onState: the connection reached connected or failed. */
  open(peer: string, onIce: (c: RtcIce | null) => void, onState: (s: 'connected' | 'failed') => void): PeerLink;
  now(): number;
  onChange?(): void;
  connectMs?: number;
  retries?: number;
};

const MEMBER_GRACE_MS = 5000;
const BYE_COOL_MS = 3000;
const ICE_QUEUE_MAX = 64;

type Rec = {
  peer: string;
  n: number;
  role: 'offer' | 'answer';
  link: PeerLink;
  state: LinkState;
  at: number;
  remoteSet: boolean;
  queued: (RtcIce | null)[]; // remote candidates that came before the remote description
  outbox: (RtcIce | null)[] | null; // our candidates, held until our offer or answer has gone (null once it has)
  tries: number;
};

export function createVoiceMesh(o: MeshOpts) {
  const connectMs = o.connectMs ?? 15000;
  const retries = o.retries ?? 2;
  const recs = new Map<string, Rec>();
  const cool = new Map<string, number>(); // peer -> no new offer before this (it just said bye)
  let members = new Set<string>();
  let active = false;
  let seq = 0;
  const changed = () => o.onChange?.();

  function close(rec: Rec, tell: boolean) {
    if (recs.get(rec.peer) === rec) recs.delete(rec.peer);
    try {
      rec.link.close();
    } catch {
      // already closed
    }
    if (tell) o.send({ t: 'rtc', to: rec.peer, k: 'bye', n: rec.n });
    changed();
  }
  function fail(rec: Rec) {
    if (recs.get(rec.peer) !== rec || rec.state === 'failed') return;
    if (rec.role === 'offer' && rec.tries < retries && members.has(rec.peer)) {
      close(rec, false);
      offer(rec.peer, rec.tries + 1);
      return;
    }
    rec.state = 'failed';
    changed();
  }
  function make(peer: string, role: Rec['role'], n: number, tries: number) {
    const rec = {
      peer,
      n,
      role,
      state: 'connecting',
      at: o.now(),
      remoteSet: false,
      queued: [],
      outbox: [],
      tries,
    } as unknown as Rec;
    rec.link = o.open(
      peer,
      (c) => {
        if (recs.get(peer) !== rec) return;
        if (rec.outbox) {
          if (rec.outbox.length < ICE_QUEUE_MAX) rec.outbox.push(c);
        } else o.send({ t: 'rtc', to: peer, k: 'ice', n: rec.n, c });
      },
      (s) => {
        if (recs.get(peer) !== rec) return;
        if (s === 'failed') return fail(rec);
        rec.state = 'connected';
        changed();
      },
    );
    recs.set(peer, rec);
    changed();
    return rec;
  }
  function flush(rec: Rec) {
    rec.remoteSet = true;
    for (const c of rec.queued.splice(0)) rec.link.addIce(c).catch(() => {});
  }
  function described(rec: Rec, k: 'offer' | 'answer', sdp: string) {
    o.send({ t: 'rtc', to: rec.peer, k, n: rec.n, sdp });
    const held = rec.outbox ?? [];
    rec.outbox = null;
    for (const c of held) o.send({ t: 'rtc', to: rec.peer, k: 'ice', n: rec.n, c });
  }
  function offer(peer: string, tries = 0) {
    const rec = make(peer, 'offer', ++seq, tries);
    rec.link.makeOffer().then(
      (sdp) => recs.get(peer) === rec && described(rec, 'offer', sdp),
      () => fail(rec),
    );
  }

  function setMembers(ids: Iterable<string>) {
    members = new Set([...ids].filter((id) => id !== o.self));
    if (!active) return;
    const now = o.now();
    for (const rec of [...recs.values()])
      if (!members.has(rec.peer) && now - rec.at > MEMBER_GRACE_MS) close(rec, rec.state !== 'failed');
    for (const peer of members) if (!recs.has(peer) && o.self < peer && (cool.get(peer) ?? 0) <= now) offer(peer);
  }

  function hear(msg: RtcMsg, from: string) {
    if (!active || from === o.self || msg.to !== o.self) return;
    const rec = recs.get(from);
    if (msg.k === 'offer') {
      if (rec) close(rec, false); // a new offer replaces whatever link we had (the peer restarted it)
      const next = make(from, 'answer', msg.n, 0);
      next.link.takeOffer(msg.sdp).then(
        (sdp) => {
          if (recs.get(from) !== next) return;
          described(next, 'answer', sdp);
          flush(next);
        },
        () => fail(next),
      );
      return;
    }
    if (!rec || rec.n !== msg.n) return; // a signal for a link that is gone or was replaced
    if (msg.k === 'answer') {
      if (rec.role !== 'offer' || rec.remoteSet) return;
      rec.link.takeAnswer(msg.sdp).then(
        () => recs.get(from) === rec && flush(rec),
        () => fail(rec),
      );
    } else if (msg.k === 'ice') {
      if (rec.remoteSet) rec.link.addIce(msg.c).catch(() => {});
      else if (rec.queued.length < ICE_QUEUE_MAX) rec.queued.push(msg.c);
    } else if (msg.k === 'bye') {
      cool.set(from, o.now() + BYE_COOL_MS);
      close(rec, false);
    }
  }

  function tick() {
    if (!active) return;
    const now = o.now();
    for (const rec of [...recs.values()]) if (rec.state === 'connecting' && now - rec.at > connectMs) fail(rec);
    setMembers(members);
  }

  return {
    join() {
      if (active) return;
      active = true;
      setMembers(members);
    },
    leave() {
      active = false;
      for (const rec of [...recs.values()]) close(rec, true);
      cool.clear();
    },
    get active() {
      return active;
    },
    setMembers,
    hear,
    tick,
    links() {
      return new Map([...recs].map(([peer, r]) => [peer, { state: r.state, role: r.role }]));
    },
  };
}
export type VoiceMesh = ReturnType<typeof createVoiceMesh>;
