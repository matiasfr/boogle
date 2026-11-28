import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three/webgpu';
import { sourceModule } from '../dev/level/source.ts';
import { CANOPY_CHIME, GORGE_HORN } from '../src/sim/railway-route.ts';
import { RING_HANGOUT, ringAt } from '../src/sim/railway-ring-layout.ts';
import { createLimiter } from '../src/sim/social.ts';
import { PLOT_KIND } from '../src/sim/railway-trade-layout.ts';
import { chimeCalls, townAnswer } from '../src/entities/town/signal-timing.ts';

test('overlapping chimes finish their own four notes', () => {
  const c = chimeCalls(),
    notes: number[] = [];
  c.pull(0, 'one');
  c.update(999, (beat) => notes.push(beat));
  c.pull(1000, 'two');
  c.update(1000, (beat) => notes.push(beat));
  c.update(1260, (beat) => notes.push(beat));
  c.update(2260, (beat) => notes.push(beat));
  assert.deepEqual(notes, [0, 1, 2, 0, 3, 1, 2, 3]);
  assert.equal(c.harmonizes(3999, 'one'), true);
  assert.equal(c.harmonizes(4000, 'one'), false);
});
test('a distant town waits 800 ms and accepts one call per four seconds', () => {
  const a = townAnswer();
  a.call(0);
  a.call(700);
  assert.equal(a.update(799), false);
  assert.equal(a.update(800), true);
  a.call(3999);
  assert.equal(a.update(4000), false);
  a.call(4000);
  assert.equal(a.update(4799), false);
  assert.equal(a.update(4800), true);
});

test('Canopy pulls reach a completed Ring bellhouse and skip the unfinished Gorge horn', () => {
  let now = 0;
  let receive!: (m: unknown, from: string) => void;
  let frame!: () => void;
  const pulses: THREE.Mesh[] = [];
  const sounds: number[][] = [];
  const rope = ringAt(RING_HANGOUT.u, RING_HANGOUT.lat);
  const world = {
    lookup: (_: unknown, slot: number) => slot,
    get: (_: unknown, slot: number) => ({ kind: slot === 16 ? PLOT_KIND.bell : PLOT_KIND.echo }),
  };
  const { createSignalAnswers } = sourceModule<{ createSignalAnswers(owner: unknown): void }>(
    readFileSync('src/entities/town/signal-answers.ts', 'utf8'),
    {
      THREE,
      CANOPY_CHIME,
      GORGE_HORN,
      RING_HANGOUT,
      ringAt,
      PLOT_KIND,
      createLimiter,
      townAnswer,
      plotBuilt: (_: unknown, slot: number) => slot !== 32,
      Plot: {},
      localTownPulls: new Set(),
      performance: { now: () => now },
      railwayWorldRead: () => ({ ready: () => true, world: () => world, tick: () => 100 }),
      windChime: (x: number, z: number, _beat: number, soft: boolean) => {
        assert.equal(soft, true);
        sounds.push([x, z]);
      },
      onRoomReady: (ready: (room: unknown) => void) =>
        ready({
          onMessage: (fn: typeof receive) => {
            receive = fn;
          },
        }),
    },
  );
  createSignalAnswers({
    alive: true,
    cleanup() {},
    add: (p: THREE.Mesh) => pulses.push(p),
    animate: (fn: typeof frame) => {
      frame = fn;
    },
  });
  receive({ t: 'chime', id: 48 }, 'first');
  now = 799;
  frame();
  assert.equal(sounds.length, 0);
  now = 800;
  frame();
  assert.deepEqual(
    pulses.map((p) => p.visible),
    [true, false, false],
  );
  now = 1000;
  receive({ t: 'chime', id: 48 }, 'second');
  now = 1800;
  frame();
  assert.deepEqual(sounds, [[rope.x / 100, rope.z / 100]]);
  now = 4000;
  receive({ t: 'chime', id: 48 }, 'second');
  now = 4800;
  frame();
  assert.equal(sounds.length, 2);
});
