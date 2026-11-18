// Owner-requested P2 regression: execute the real arrival view with browser/audio boundaries mocked.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three/webgpu';
import { sourceModule } from '../dev/level/source.ts';
import type { RailwayAdapter } from '../src/adapters/railway-session.ts';
import type { RailwayAccepted } from '../src/adapters/railway-effects.ts';
import type { OwnedView } from '../src/render/owned-view.ts';

function harness() {
  const storage = new Map<string, string>();
  const w = { awake: -1, trains: -1, boiler: 'none', jump: false, glide: false };
  const sounds: unknown[] = [];
  /** What holds a friend's card back: each read every frame. */
  const hold = { glide: false, chair: false, vehicle: false, moment: false, busy: false, air: false };
  const cards: string[] = [];
  const marks: unknown[] = [];
  let phase = 'asleep';
  function mount(pid: string) {
    let accepted: (e: RailwayAccepted) => void = () => {};
    const shown = new Set<string>();
    const body = { interpolatedPosition: new THREE.Vector3(), velocity: new THREE.Vector3() };
    const element = () => ({ classList: { remove() {}, toggle() {} }, style: {}, remove() {} });
    const module = sourceModule<typeof import('../src/entities/railway/ability-arrival.ts')>(
      fs.readFileSync('src/entities/railway/ability-arrival.ts', 'utf8'),
      {
        THREE,
        me: {
          body,
          get coyote() {
            return hold.air ? 0 : 1;
          },
          swimming: false,
        },
        inputState: {
          get seated() {
            return hold.vehicle;
          },
        },
        momentBusy: () => hold.moment,
        playMark: (...args: unknown[]) => marks.push(args),
        glyph: () => '',
        fallArrival: { active: false },
        localJumpCount: () => 0,
        getRoomId: () => 'wait',
        identity: { pid },
        PLAYER_R: 0.45,
        reducedMotion: true,
        placeSound: (...args: unknown[]) => sounds.push(args),
        rewardSparkles: () => {},
        readableUnlit: (m: unknown) => m,
        toScreen: () => {},
        railwayRoomId: (room: string) => room,
        railwayGlideOpen: () => hold.glide,
        rail: () => w,
        boilerRow: () => ({ state: w.boiler }),
        line2Trains: () => w.trains >= 0,
        railPhase: () => phase,
        localStorage: {
          getItem: (key: string) => storage.get(key) ?? null,
          setItem: (key: string, value: string) => storage.set(key, value),
        },
        document: { createElement: element, querySelector: () => null, body: { append() {} } },
        innerWidth: 1000,
        innerHeight: 600,
      },
    );
    const adapter = {
      read: { pid, ready: () => true, world: () => w, tick: () => 0 },
      onAccepted: (fn: typeof accepted) => {
        accepted = fn;
        return () => {};
      },
      onCorrected: () => () => {},
    } as unknown as RailwayAdapter;
    const owner = { root: new THREE.Group(), cleanup() {} } as unknown as OwnedView;
    const v = module.createAbilityArrival(adapter, owner, {
      busy: () => hold.busy,
      seated: () => hold.chair,
      card: (key) => (key === 'boiler' ? null : { key, name: key, model: new THREE.Group() }),
      youGot: (g) => {
        if (shown.has(g.key!)) return false;
        shown.add(g.key!);
        cards.push(g.key!);
        return true;
      },
      jump: () => ({ charge: false, second: false }),
      axeModel: () => new THREE.Group(),
    });
    return {
      v,
      fit: (fitter: string) => {
        w.boiler = 'fitted';
        accepted({ op: 'rail.boilerFit', pid: fitter, accepted: 1 } as RailwayAccepted);
      },
      /** A live accepted event from `finder`, its row turning as it lands. */
      take: (op: RailwayAccepted['op'], finder: string, row?: 'jump' | 'glide') => {
        if (row) w[row] = true;
        accepted({ op, pid: finder, accepted: 1 } as RailwayAccepted);
      },
    };
  }
  return {
    w,
    sounds,
    hold,
    cards,
    marks,
    mount,
    phase: (p: string) => void (phase = p),
  };
}

test('the accepted fitter keeps attribution through an already-aged cold wait', () => {
  const h = harness();
  const { v, fit } = h.mount('a');
  v.update(4);
  fit('a');
  assert.equal(v.seen.has('boiler'), true);
  v.update(0.1);
  v.update(30);
  h.w.trains = 3376;
  v.update(0.1);
  assert.deepEqual({ keys: v.inspect().keys, sounds: h.sounds.length }, { keys: [], sounds: 0 });
  v.dispose();
});

test('a peer still gets the boiler flourish once, at the wake', () => {
  const h = harness();
  const { v, fit } = h.mount('b');
  v.update(4);
  fit('a');
  v.update(30);
  assert.deepEqual(v.inspect().keys, []);
  h.w.trains = 3376;
  v.update(0.1);
  v.update(4);
  assert.deepEqual(v.inspect().keys, ['boiler']);
  assert.equal(h.sounds.length, 1);
  v.dispose();
});

test('a fitter reloading during the wait retains attribution in local storage', () => {
  const h = harness();
  const first = h.mount('a');
  first.v.update(4);
  first.fit('a');
  first.v.dispose();
  const { v } = h.mount('a');
  v.update(4);
  assert.equal(v.seen.has('boiler'), true);
  h.w.trains = 3376;
  v.update(0.1);
  assert.deepEqual(v.inspect().keys, []);
  assert.equal(h.sounds.length, 0);
  v.dispose();
});

test('a real progress reset clears fitter attribution after the existing reset grace', () => {
  const h = harness();
  const { v, fit } = h.mount('a');
  v.update(4);
  fit('a');
  v.update(4);
  assert.equal(v.seen.has('boiler'), true);
  h.w.boiler = 'none';
  v.update(3.1);
  assert.equal(v.seen.has('boiler'), false);
  v.dispose();
});

test("a friend's glider: one card on the next frame, no flourish", () => {
  const h = harness();
  const { v, take } = h.mount('b');
  v.update(0.1);
  take('rail.glide', 'a', 'glide');
  v.update(0.016);
  assert.deepEqual(h.cards, ['glide']);
  assert.deepEqual(v.inspect().keys, []);
  assert.equal(h.sounds.length, 0);
  assert.equal(v.seen.has('glide'), true);
  v.update(2);
  assert.deepEqual({ cards: h.cards, keys: v.inspect().keys }, { cards: ['glide'], keys: [] });
  v.dispose();
});

test("a friend's card waits while gliding, seated, under a moment or a card, then comes once free", () => {
  for (const busy of ['glide', 'chair', 'vehicle', 'moment', 'busy', 'air'] as const) {
    const h = harness();
    const { v, take } = h.mount('b');
    v.update(0.1);
    h.hold[busy] = true;
    take('rail.glide', 'a', 'glide');
    for (let i = 0; i < 20; i++) v.update(1);
    assert.deepEqual({ busy, cards: h.cards, keys: v.inspect().keys }, { busy, cards: [], keys: [] });
    h.hold[busy] = false;
    v.update(0.016);
    assert.deepEqual({ busy, cards: h.cards, keys: v.inspect().keys }, { busy, cards: ['glide'], keys: [] });
    v.dispose();
  }
});

test("a friend's jump card counts as the jump teach", () => {
  const h = harness();
  const { v, take } = h.mount('b');
  v.update(0.1);
  take('rail.jump', 'a', 'jump');
  v.update(0.016);
  assert.deepEqual(h.cards, ['jump']);
  assert.equal(v.seen.has('jump-taught'), true);
  v.dispose();
});

test('a reload after the card shows nothing; a page that never heard it gets the late flourish, no card', () => {
  const h = harness();
  const first = h.mount('b');
  first.v.update(0.1);
  first.take('rail.glide', 'a', 'glide');
  first.v.update(0.016);
  first.v.dispose();
  const again = h.mount('b');
  for (let i = 0; i < 5; i++) again.v.update(0.5);
  assert.deepEqual({ cards: h.cards, keys: again.v.inspect().keys }, { cards: ['glide'], keys: [] });
  again.v.dispose();
  const late = h.mount('c');
  for (let i = 0; i < 5; i++) late.v.update(0.5);
  assert.deepEqual({ cards: h.cards, keys: late.v.inspect().keys }, { cards: ['glide'], keys: ['glide'] });
  late.v.dispose();
});

test("the multi-axe's friend card comes at the wake's end, not at the event", () => {
  const h = harness();
  const { v, take } = h.mount('b');
  v.update(0.1);
  h.w.awake = 100;
  h.phase('waking');
  take('rail.wake', 'a');
  v.update(0.016);
  v.update(3);
  assert.deepEqual(h.cards, []);
  h.phase('awake');
  v.update(0.016);
  assert.deepEqual({ cards: h.cards, keys: v.inspect().keys }, { cards: ['multi-axe'], keys: [] });
  v.dispose();
});

test('the finder gets nothing more from this file', () => {
  const h = harness();
  const { v, take } = h.mount('a');
  v.update(0.1);
  take('rail.glide', 'a', 'glide');
  for (let i = 0; i < 5; i++) v.update(0.5);
  assert.deepEqual({ cards: h.cards, keys: v.inspect().keys }, { cards: [], keys: [] });
  v.dispose();
});

// Review (review-cutscenes-friend-card): suspected defects and unexercised paths.

test('review: two cards owed at once both come, one after the other, each with one mark', () => {
  const h = harness();
  const { v, take } = h.mount('b');
  v.update(0.1);
  take('rail.jump', 'a', 'jump');
  take('rail.glide', 'a', 'glide');
  v.update(0.016);
  v.update(0.016);
  for (let i = 0; i < 5; i++) v.update(0.5);
  assert.deepEqual({ cards: h.cards, keys: v.inspect().keys }, { cards: ['jump', 'glide'], keys: [] });
  assert.equal(h.marks.length, 2);
  v.dispose();
});

test('review: a card the reveal refuses (key shown before a fresh start) still leaves the friend a flourish, and no card mark', () => {
  const h = harness();
  const { v, take } = h.mount('b');
  v.update(0.1);
  take('rail.jump', 'a', 'jump');
  v.update(0.016);
  assert.deepEqual(h.cards, ['jump']);
  // A fresh start: the jump goes missing for longer than the reset grace, then a friend finds it again.
  h.w.jump = false;
  for (let i = 0; i < 5; i++) v.update(1);
  assert.equal(v.seen.has('jump'), false);
  const marks = h.marks.length;
  take('rail.jump', 'a', 'jump');
  for (let i = 0; i < 5; i++) v.update(0.5);
  // The reveal's own shown set still holds 'jump', so youGot returns false: no card can come up.
  assert.deepEqual(h.cards, ['jump']);
  // Expected: the late flourish stands in (as it did before this branch), and no "jump card" mark claims a card.
  assert.deepEqual({ keys: v.inspect().keys, marks: h.marks.length }, { keys: ['jump'], marks });
  v.dispose();
});

test('review: a wake heard before a fresh start does not owe a card for a later wake nobody announced', () => {
  const h = harness();
  const { v, take } = h.mount('b');
  v.update(0.1);
  h.w.awake = 100;
  h.phase('waking');
  take('rail.wake', 'a');
  v.update(0.016);
  // A fresh start before the wake ends: the machine goes back to sleep.
  h.w.awake = -1;
  h.phase('asleep');
  for (let i = 0; i < 5; i++) v.update(1);
  // Later the world comes back awake without a live accepted wake (a restore): the flourish, not a card.
  h.w.awake = 500;
  h.phase('awake');
  for (let i = 0; i < 4; i++) v.update(0.5);
  assert.deepEqual({ cards: h.cards, keys: v.inspect().keys }, { cards: [], keys: ['multi-axe'] });
  v.dispose();
});

test('review: a solo page leaves no card mark and owes nothing', () => {
  const h = harness();
  const { v, take } = h.mount('a');
  v.update(0.1);
  take('rail.jump', 'a', 'jump');
  take('rail.glide', 'a', 'glide');
  for (let i = 0; i < 5; i++) v.update(0.5);
  assert.deepEqual({ cards: h.cards, owed: v.inspect().owed, marks: h.marks.length }, { cards: [], owed: [], marks: 0 });
  v.dispose();
});
