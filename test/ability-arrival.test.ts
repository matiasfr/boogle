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
  const w = { awake: -1, trains: -1, boiler: 'none' };
  const sounds: unknown[] = [];
  function mount(pid: string) {
    let accepted: (e: RailwayAccepted) => void = () => {};
    const body = { interpolatedPosition: new THREE.Vector3(), velocity: new THREE.Vector3() };
    const element = () => ({ classList: { remove() {}, toggle() {} }, style: {}, remove() {} });
    const module = sourceModule<typeof import('../src/entities/railway/ability-arrival.ts')>(
      fs.readFileSync('src/entities/railway/ability-arrival.ts', 'utf8'),
      {
        THREE,
        me: { body, coyote: 1, swimming: false },
        inputState: { seated: false },
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
        railwayGlideOpen: () => false,
        rail: () => w,
        boilerRow: () => ({ state: w.boiler }),
        line2Trains: () => w.trains >= 0,
        railPhase: () => 'asleep',
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
      busy: () => false,
      jump: () => ({ charge: false, second: false }),
      axeModel: () => new THREE.Group(),
    });
    return {
      v,
      fit: (fitter: string) => {
        w.boiler = 'fitted';
        accepted({ op: 'rail.boilerFit', pid: fitter, accepted: 1 } as RailwayAccepted);
      },
    };
  }
  return { w, sounds, mount };
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
