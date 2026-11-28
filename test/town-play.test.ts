import test from 'node:test';
import { sourceFunction } from '../dev/level/source.ts';
import { Line3, Vector3 } from 'three';
import { throughMouth } from '../src/entities/town/court-crossing.ts';
import assert from 'node:assert/strict';
import { cupStroll, cheerSite, continuous } from '../src/entities/town/play.ts';
import { townAnswer } from '../src/entities/town/signal-timing.ts';

test('a streamed-out greeting releases the listener and its pending reply', () => {
  type Hear = (at: { x: number; z: number }) => void;
  const honkListeners = new Set<Hear>();
  const onHonk = sourceFunction<(hear: Hear) => () => void>('src/features/honk.ts', 'onHonk', { honkListeners });
  const answer = townAnswer(),
    cleanups: (() => void)[] = [];
  const mount = sourceFunction<
    (owner: unknown, slot: number, at: unknown, built: () => boolean, reply: () => void) => (now: number) => void
  >('src/entities/town/greeting.ts', 'townGreeting', {
    answerFor: () => answer,
    conversation: { open: false },
    performance: { now: () => 0 },
    onHonk,
  });
  let replies = 0;
  const update = mount(
    { cleanup: (fn: () => void) => cleanups.push(fn) },
    16,
    { x: 0, z: 0 },
    () => true,
    () => replies++,
  );
  assert.equal(honkListeners.size, 1);
  for (const hear of honkListeners) hear({ x: 260, z: 0 });
  for (const cleanup of cleanups) cleanup();
  assert.equal(honkListeners.size, 0);
  update(400);
  assert.equal(replies, 0);
});
test('busy folk keep their jobs through a toy cheer', () => {
  const guys = ['stroll', 'stroll', 'rider', 'scaffold', 'platform', 'hauler'].map((job, i) => ({
    job,
    site: i === 1 ? {} : null,
    on: true,
    x: 0,
    z: 0,
    cheer: 0,
  }));
  const cheer = sourceFunction<(x: number, z: number, r: number, s: number) => void>(
    'src/place/folk.ts',
    'cheerAround',
    { guys, crew: null },
  );
  cheer(0, 0, 16, 1.4);
  assert.deepEqual(
    guys.map((g) => g.cheer),
    [1.4, 0, 0, 0, 0, 0],
  );
});
test('a swept throw survives, a recall and handoff do not', () => {
  const disc = { p: new Vector3(), v: new Vector3(0, 0, 10), enabled: true, held: false, e: 1 };
  const sample = sourceFunction<(owner: unknown) => (now: number) => Line3 | null>(
    'src/entities/town/disc-path.ts',
    'discPath',
    { Line3, disc, continuous, document: new EventTarget() },
  )({ cleanup() {} });
  const enters = sourceFunction<(path: Line3 | null, centre: Vector3, radius: number) => boolean>(
    'src/entities/town/disc-path.ts',
    'enters',
    { closest: new Vector3() },
  );
  const target = new Vector3(0, 1, 0);
  function hits(now: number, z: number) {
    disc.p.set(0, 1, z);
    const path = sample(now);
    return [!!path && throughMouth(path.start, path.end), enters(path, target, 0.4)];
  }
  assert.deepEqual(hits(0, -1), [false, false]);
  assert.deepEqual(hits(200, 1), [true, true]);
  disc.v.setScalar(0);
  assert.deepEqual(hits(300, -1), [false, false]);
  disc.v.z = 10;
  disc.e++;
  assert.deepEqual(hits(500, 1), [false, false]);
});
test('one cheer per site per three seconds', () => {
  const calls: number[][] = [];
  const hit = cheerSite((...args) => calls.push(args));
  for (const now of [0, 2999, 3000]) hit(now, 1, 2);
  assert.deepEqual(calls, [
    [1, 2, 16, 1.4],
    [1, 2, 16, 1.4],
  ]);
});
test('third distinct cup flourishes and starts a fresh stroll', () => {
  const sink = cupStroll();
  assert.deepEqual([0, 0, 2, 1, 1, 2, 0].map(sink), [false, false, false, true, false, false, true]);
});
test('honk and pull share one pending reply and cooldown', () => {
  const answer = townAnswer();
  answer.call(0, true);
  answer.call(10);
  assert.equal(answer.update(399), false);
  assert.equal(answer.update(400), false);
  assert.equal(answer.update(400, true), true);
  answer.call(800);
  assert.equal(answer.update(1600), false);
  answer.call(4000, true);
  assert.equal(answer.update(4400, true), true);
});
