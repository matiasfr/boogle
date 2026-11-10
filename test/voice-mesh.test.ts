// Voice chat's signalling (src/netplay/voice-mesh.ts) over fake peer links, and its wire validator (src/net/rtc-wire.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createVoiceMesh, type PeerLink, type VoiceMesh } from '../src/netplay/voice-mesh.ts';
import { validateRtc, RTC_SDP_MAX, type RtcMsg } from '../src/net/rtc-wire.ts';

type Fake = { self: string; mesh: VoiceMesh; links: Map<string, FakeLink> };
type FakeLink = PeerLink & {
  peer: string;
  closed: boolean;
  remote: string | null;
  ice: unknown[];
  state?: (s: 'connected' | 'failed') => void;
};

// A room of fake tabs: signals are delivered asynchronously (as the server relays them), a link "connects" once both
// sides have set the other's description, unless `blocked` says the pair can't reach each other (no TURN).
function room() {
  let clock = 0;
  const tabs = new Map<string, Fake>();
  const sent: RtcMsg[] = [];
  const blocked = new Set<string>();
  const pairKey = (a: string, b: string) => [a, b].sort().join('|');
  function add(self: string) {
    const links = new Map<string, FakeLink>();
    const mesh = createVoiceMesh({
      self,
      now: () => clock,
      send(msg) {
        sent.push(msg);
        queueMicrotask(() => tabs.get(msg.to)?.mesh.hear(msg, self));
      },
      open(peer, onIce, onState) {
        const link: FakeLink = {
          peer,
          closed: false,
          remote: null,
          ice: [],
          state: onState,
          async makeOffer() {
            queueMicrotask(() => onIce({ candidate: `cand-${self}`, sdpMid: '0', sdpMLineIndex: 0 }));
            return `offer-from-${self}`;
          },
          async takeOffer(sdp) {
            link.remote = sdp;
            return `answer-from-${self}`;
          },
          async takeAnswer(sdp) {
            link.remote = sdp;
            const other = tabs.get(peer)?.links.get(self);
            if (blocked.has(pairKey(self, peer))) return;
            queueMicrotask(() => {
              if (!link.closed) onState('connected');
              if (other && !other.closed) other.state?.('connected');
            });
          },
          async addIce(c) {
            link.ice.push(c);
          },
          close() {
            link.closed = true;
          },
        };
        links.set(peer, link);
        return link;
      },
    });
    const tab = { self, mesh, links };
    tabs.set(self, tab);
    return tab;
  }
  // Everyone's presence: each joined tab sees every other joined tab as a member.
  function publish(...inVoice: Fake[]) {
    for (const t of tabs.values()) t.mesh.setMembers(inVoice.map((o) => o.self));
  }
  const settle = async () => {
    for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r));
  };
  const advance = (ms: number) => (clock += ms);
  return { add, publish, settle, advance, sent, blocked, tabs };
}
const states = (t: Fake) => Object.fromEntries([...t.mesh.links()].map(([p, l]) => [p, l.state]));
const live = (t: Fake) => [...t.links.values()].filter((l) => !l.closed);

test('two tabs in voice: the smaller id offers, both connect, candidates arrive after the description', async () => {
  const r = room();
  const a = r.add('aaa'),
    b = r.add('bbb');
  a.mesh.join();
  b.mesh.join();
  r.publish(a, b);
  await r.settle();
  assert.deepEqual(states(a), { bbb: 'connected' });
  assert.deepEqual(states(b), { aaa: 'connected' });
  assert.equal(a.mesh.links().get('bbb')!.role, 'offer');
  assert.equal(r.sent.filter((m) => m.k === 'offer').length, 1);
  assert.deepEqual(b.links.get('aaa')!.ice, [{ candidate: 'cand-aaa', sdpMid: '0', sdpMLineIndex: 0 }]);
});

test('a tab that never joins gets no offer and opens no link', async () => {
  const r = room();
  const a = r.add('aaa'),
    b = r.add('bbb'),
    quiet = r.add('ccc');
  a.mesh.join();
  b.mesh.join();
  r.publish(a, b);
  await r.settle();
  assert.equal(quiet.links.size, 0);
  assert.ok(!r.sent.some((m) => m.to === 'ccc'));
  // Even a stray offer to it is ignored while it is not in voice.
  quiet.mesh.hear({ t: 'rtc', to: 'ccc', k: 'offer', n: 1, sdp: 'x' }, 'aaa');
  assert.equal(quiet.links.size, 0);
});

test('a third tab joining late links to both; a tab that leaves closes its links on every side', async () => {
  const r = room();
  const a = r.add('aaa'),
    b = r.add('bbb'),
    c = r.add('ccc');
  a.mesh.join();
  b.mesh.join();
  r.publish(a, b);
  await r.settle();
  c.mesh.join();
  r.publish(a, b, c);
  await r.settle();
  assert.deepEqual(states(c), { aaa: 'connected', bbb: 'connected' });
  assert.deepEqual(states(a), { bbb: 'connected', ccc: 'connected' });
  b.mesh.leave();
  await r.settle();
  assert.deepEqual(states(a), { ccc: 'connected' });
  assert.deepEqual(states(c), { aaa: 'connected' });
  assert.equal(live(b).length, 0);
});

test('a reload is a new tab: the old link goes once its presence does, the new one connects', async () => {
  const r = room();
  const a = r.add('aaa'),
    b = r.add('bbb');
  a.mesh.join();
  b.mesh.join();
  r.publish(a, b);
  await r.settle();
  const b2 = r.add('bab'); // the reloaded page has a new selfId
  b2.mesh.join();
  r.publish(a, b2); // b's presence is gone
  await r.settle();
  assert.equal(states(a).bab, 'connected');
  assert.equal(states(a).bbb, 'connected'); // inside the member grace an old link is kept
  r.advance(6000);
  a.mesh.tick();
  await r.settle();
  assert.deepEqual(states(a), { bab: 'connected' });
  assert.ok(a.links.get('bbb')!.closed);
});

test('a pair that cannot connect (no TURN) retries, then shows failed instead of hanging', async () => {
  const r = room();
  const a = r.add('aaa'),
    b = r.add('bbb');
  r.blocked.add('aaa|bbb');
  a.mesh.join();
  b.mesh.join();
  r.publish(a, b);
  await r.settle();
  for (let i = 0; i < 3; i++) {
    r.advance(16000);
    a.mesh.tick();
    b.mesh.tick();
    await r.settle();
  }
  assert.equal(states(a).bbb, 'failed');
  assert.equal(r.sent.filter((m) => m.k === 'offer').length, 3); // the first try and two retries
  r.advance(16000);
  a.mesh.tick();
  await r.settle();
  assert.equal(r.sent.filter((m) => m.k === 'offer').length, 3); // and no more
});

test('answers and candidates for an older link are ignored', async () => {
  const r = room();
  const a = r.add('aaa'),
    b = r.add('bbb');
  a.mesh.join();
  b.mesh.join();
  r.publish(a, b);
  await r.settle();
  const link = a.links.get('bbb')!;
  const before = link.ice.length;
  a.mesh.hear(
    { t: 'rtc', to: 'aaa', k: 'ice', n: 999, c: { candidate: 'old', sdpMid: null, sdpMLineIndex: 0 } },
    'bbb',
  );
  a.mesh.hear({ t: 'rtc', to: 'aaa', k: 'answer', n: 999, sdp: 'old' }, 'bbb');
  assert.equal(link.ice.length, before);
  assert.equal(link.remote, 'answer-from-bbb');
});

test('validateRtc keeps only its own fields and refuses bad or oversized signals', () => {
  assert.deepEqual(validateRtc({ t: 'rtc', to: 'b', k: 'offer', n: 1, sdp: 'v=0', extra: { big: 1 } }), {
    t: 'rtc',
    to: 'b',
    k: 'offer',
    n: 1,
    sdp: 'v=0',
  });
  assert.deepEqual(validateRtc({ t: 'rtc', to: 'b', k: 'ice', n: 2, c: null }), {
    t: 'rtc',
    to: 'b',
    k: 'ice',
    n: 2,
    c: null,
  });
  assert.deepEqual(validateRtc({ t: 'rtc', to: 'b', k: 'bye', n: 0 }), { t: 'rtc', to: 'b', k: 'bye', n: 0 });
  for (const bad of [
    null,
    'rtc',
    { t: 'rtc', k: 'offer', n: 1, sdp: 'x' }, // no target
    { t: 'rtc', to: '', k: 'offer', n: 1, sdp: 'x' },
    { t: 'rtc', to: 'x'.repeat(65), k: 'bye', n: 1 },
    { t: 'rtc', to: 'b', k: 'offer', n: 1.5, sdp: 'x' },
    { t: 'rtc', to: 'b', k: 'offer', n: -1, sdp: 'x' },
    { t: 'rtc', to: 'b', k: 'offer', n: 1, sdp: 'x'.repeat(RTC_SDP_MAX + 1) },
    { t: 'rtc', to: 'b', k: 'answer', n: 1 },
    { t: 'rtc', to: 'b', k: 'ice', n: 1, c: { candidate: 'x'.repeat(601) } },
    { t: 'rtc', to: 'b', k: 'ice', n: 1, c: { candidate: 'x', sdpMLineIndex: 99 } },
    { t: 'rtc', to: 'b', k: 'ice', n: 1, c: [] },
    { t: 'rtc', to: 'b', k: 'shout', n: 1 },
  ])
    assert.equal(validateRtc(bad), null, JSON.stringify(bad)?.slice(0, 80));
});

// From the independent review (9 November): one tab with counting fake links and a hand-driven clock.
function lone(self: string) {
  let clock = 0;
  const sent: RtcMsg[] = [];
  let opens = 0;
  const mesh = createVoiceMesh({
    self,
    now: () => clock,
    send: (m) => void sent.push(m),
    open() {
      opens++;
      return {
        makeOffer: async () => 'offer',
        takeOffer: async () => 'answer',
        takeAnswer: async () => {},
        addIce: async () => {},
        close() {},
      };
    },
  });
  const settle = async () => {
    for (let i = 0; i < 10; i++) await new Promise((r) => setImmediate(r));
  };
  return { mesh, sent, settle, advance: (ms: number) => (clock += ms), opens: () => opens };
}

test('PRIVACY: a tab whose presence never says vc is never answered (no hidden listener)', async () => {
  const v = lone('mmm');
  v.mesh.join();
  v.mesh.setMembers([]); // nobody else is in voice, as far as presence says
  for (let i = 0; i < 6; i++) {
    v.mesh.hear({ t: 'rtc', to: 'mmm', k: 'offer', n: i + 1, sdp: 'x' }, 'stranger');
    await v.settle();
    v.advance(4900); // re-offer just inside the grace, forever
    v.mesh.tick();
  }
  assert.equal(v.sent.filter((m) => m.k === 'answer' && m.to === 'stranger').length, 0);
  assert.equal(v.opens(), 0);
});

test("an offer that arrives just before its sender's presence is answered once the presence lands", async () => {
  const v = lone('mmm');
  v.mesh.join();
  v.mesh.hear({ t: 'rtc', to: 'mmm', k: 'offer', n: 1, sdp: 'x' }, 'aaa');
  v.mesh.hear({ t: 'rtc', to: 'mmm', k: 'ice', n: 1, c: { candidate: 'c', sdpMid: '0', sdpMLineIndex: 0 } }, 'aaa');
  await v.settle();
  assert.equal(v.opens(), 0);
  v.advance(200);
  v.mesh.setMembers(['aaa']);
  await v.settle();
  assert.equal(v.opens(), 1);
  assert.equal(v.sent.filter((m) => m.k === 'answer' && m.to === 'aaa').length, 1);
  // A held offer older than the hold is dropped.
  v.mesh.hear({ t: 'rtc', to: 'mmm', k: 'offer', n: 1, sdp: 'x' }, 'zzz');
  v.advance(5000);
  v.mesh.setMembers(['aaa', 'zzz']);
  await v.settle();
  assert.equal(v.sent.filter((m) => m.k === 'answer' && m.to === 'zzz').length, 0);
});

test('GRIEF: an offer flood from one peer does not open a peer connection per offer', async () => {
  const v = lone('mmm');
  v.mesh.join();
  v.mesh.setMembers(['aaa']);
  for (let i = 0; i < 60; i++) v.mesh.hear({ t: 'rtc', to: 'mmm', k: 'offer', n: i + 1, sdp: 'x' }, 'aaa');
  await v.settle();
  assert.equal(v.opens(), 1);
  v.advance(1500); // a real restart, later, still replaces the link
  v.mesh.hear({ t: 'rtc', to: 'mmm', k: 'offer', n: 99, sdp: 'x' }, 'aaa');
  await v.settle();
  assert.equal(v.opens(), 2);
});

test('a duplicate answer does not restart a good link', async () => {
  const v = lone('aaa');
  v.mesh.join();
  v.mesh.setMembers(['bbb']);
  await v.settle();
  const n = v.sent.find((m) => m.k === 'offer')!.n;
  v.mesh.hear({ t: 'rtc', to: 'aaa', k: 'answer', n, sdp: 'a' }, 'bbb');
  v.mesh.hear({ t: 'rtc', to: 'aaa', k: 'answer', n, sdp: 'a' }, 'bbb');
  await v.settle();
  assert.equal(v.opens(), 1);
});

test('validateRtc: hostile shapes never throw and never pass extra fields', () => {
  const deep: Record<string, unknown> = {};
  let cur = deep;
  for (let i = 0; i < 2000; i++) cur = cur.c = {};
  const bad: unknown[] = [
    null,
    1,
    'rtc',
    [],
    { t: 'rtc' },
    { t: 'rtc', to: '__proto__', k: 'bye', n: 1.5 },
    { t: 'rtc', to: 'b', k: 'ice', n: 1, c: deep },
    { t: 'rtc', to: 'b', k: 'offer', n: 1, sdp: { length: 1 } },
    { t: 'rtc', to: 'b', k: 'ice', n: -1, c: null },
    { t: 'rtc', to: 'b', k: 'ice', n: NaN, c: null },
    { t: 'rtc', to: ['b'], k: 'bye', n: 1 },
    { t: 'rtc', to: 'b', k: 'toString', n: 1 },
  ];
  for (const b of bad) assert.equal(validateRtc(b), null, JSON.stringify(b)?.slice(0, 80));
  const ok = validateRtc(
    JSON.parse(
      '{"t":"rtc","to":"__proto__","k":"ice","n":1,"c":{"candidate":"","__proto__":{"x":1},"extra":1},"__proto__":{"polluted":1}}',
    ),
  );
  assert.deepEqual(ok, {
    t: 'rtc',
    to: '__proto__',
    k: 'ice',
    n: 1,
    c: { candidate: '', sdpMid: null, sdpMLineIndex: null },
  });
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
});
