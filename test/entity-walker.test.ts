// An exception to AGENTS.md's test diet, by the owner's call: this exists so agents can catch walker ordering bugs they
// can't see in a still. It's no precedent for testing features.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWalkers, type EntityPhase, type WalkerEntity } from '../src/entity/walker.ts';
import type { FrameCtx } from '../src/loop.ts';

const CTX: FrameCtx = { now: 0, dt: 1 / 60, elapsed: 0 };
type E = WalkerEntity & { name?: string };

function setup() {
  const log: string[] = [];
  const errors: string[] = [];
  const hooks = new Map<string, (ctx: FrameCtx) => void>();
  const w = createWalkers<E>({
    addHook: (phase: EntityPhase, _order, name, walk) => void hooks.set(name, walk),
    attach: (e) => void log.push(`attach ${e.name}`),
    detach: (e) => void log.push(`detach ${e.name}`),
    reportError: (err, where) => void errors.push(`${where}: ${(err as Error).message}`),
  });
  const run = (name: string) => hooks.get(name)!(CTX);
  const entity = (name: string, update?: (e: E) => void, kind = 'k'): E => {
    const e: E = {
      kind,
      name,
      alive: true,
      update() {
        log.push(name);
        update?.(e);
      },
      dispose() {
        log.push(`dispose ${name}`);
      },
    };
    return e;
  };
  return { w, log, errors, hooks, run, entity };
}

test('each declared phase gets one hook, named after kind and phase', () => {
  const { w, hooks } = setup();
  w.defineKind('ball', { update: -300, fixedPre: 40 });
  assert.deepEqual([...hooks.keys()].sort(), ['ball fixedPre', 'ball update']);
});

test('a kind defined twice throws', () => {
  const { w } = setup();
  w.defineKind('k', {});
  assert.throws(() => w.defineKind('k', {}), /defined twice/);
});

test('spawn throws on an undefined kind, a method with no order, and a double spawn', () => {
  const { w, entity, log } = setup();
  assert.throws(() => w.spawn(entity('a')), /no kind 'k'/);
  w.defineKind('k', { lateUpdate: 1 });
  assert.throws(() => w.spawn(entity('a')), /update\(\) but its defineKind/);
  assert.deepEqual(log, [], 'nothing joined the world');
  w.defineKind('j', { update: 1 });
  const e = entity('b', undefined, 'j');
  w.spawn(e);
  assert.throws(() => w.spawn(e), /already spawned/);
});

test('a spawn whose attach throws leaves nothing walking', () => {
  const walked: string[] = [];
  const hooks = new Map<string, (ctx: FrameCtx) => void>();
  const w = createWalkers<E>({
    addHook: (_p, _o, name, walk) => void hooks.set(name, walk),
    attach: () => {
      throw new Error('bad shape');
    },
    detach: () => {},
    reportError: () => {},
  });
  w.defineKind('k', { update: 0 });
  assert.throws(() => w.spawn({ kind: 'k', alive: true, update: () => void walked.push('x') }), /bad shape/);
  hooks.get('k update')!(CTX);
  assert.deepEqual(walked, []);
});

test('alive set by hand: a later despawn still tears it down', () => {
  const { w, entity, log } = setup();
  w.defineKind('k', { update: 0 });
  const a = entity('a');
  w.spawn(a);
  a.alive = false;
  w.despawn(a);
  w.flush();
  assert.deepEqual(log, ['attach a', 'detach a', 'dispose a']);
});

test('entities without a method for a phase are skipped, and spawn order holds', () => {
  const { w, entity, log, run } = setup();
  w.defineKind('k', { update: 0 });
  w.spawn(entity('a'));
  w.spawn({ kind: 'k', alive: true, name: 'quiet' });
  w.spawn(entity('b'));
  log.length = 0;
  run('k update');
  assert.deepEqual(log, ['a', 'b']);
});

test('an entity spawned during a walk starts on the next walk', () => {
  const { w, entity, log, run } = setup();
  w.defineKind('k', { update: 0 });
  let once = true;
  w.spawn(
    entity('a', () => {
      if (once) w.spawn(entity('born'));
      once = false;
    }),
  );
  log.length = 0;
  run('k update');
  assert.deepEqual(log, ['a', 'attach born']);
  log.length = 0;
  run('k update');
  assert.deepEqual(log, ['a', 'born']);
});

test('an entity despawned during a walk is skipped at once, and torn down at the flush', () => {
  const { w, entity, log, run } = setup();
  w.defineKind('k', { update: 0 });
  const b = entity('b');
  w.spawn(entity('a', () => w.despawn(b)));
  w.spawn(b);
  w.spawn(entity('c'));
  log.length = 0;
  run('k update');
  assert.equal(b.alive, false);
  assert.deepEqual(log, ['a', 'c'], 'b is dead, and still attached');
  w.flush();
  assert.deepEqual(log, ['a', 'c', 'detach b', 'dispose b'], 'mesh and bodies first, dispose last');
  log.length = 0;
  run('k update');
  assert.deepEqual(log, ['a', 'c'], 'the list closed up in order');
});

test('despawning itself mid-walk finishes the walk for the rest', () => {
  const { w, entity, log, run } = setup();
  w.defineKind('k', { update: 0 });
  w.spawn(entity('a', (e) => w.despawn(e)));
  w.spawn(entity('b'));
  log.length = 0;
  run('k update');
  w.flush();
  assert.deepEqual(log, ['a', 'b', 'detach a', 'dispose a']);
});

test('a double despawn tears down once', () => {
  const { w, entity, log } = setup();
  w.defineKind('k', {});
  w.defineKind('j', { update: 0 });
  const a = entity('a', undefined, 'j');
  w.spawn(a);
  w.despawn(a);
  w.despawn(a);
  log.length = 0;
  w.flush();
  w.despawn(a);
  w.flush();
  assert.deepEqual(log, ['detach a', 'dispose a']);
});

test('a despawned entity never spawns again, before or after its teardown', () => {
  const { w, entity } = setup();
  w.defineKind('k', { update: 0 });
  const a = entity('a');
  w.spawn(a);
  w.despawn(a);
  assert.throws(() => w.spawn(a), /already spawned/);
  w.flush();
  assert.throws(() => w.spawn(a), /already spawned/);
});

test('a dispose can despawn another entity, in the same flush', () => {
  const { w, entity, log } = setup();
  w.defineKind('k', { update: 0 });
  const b = entity('b');
  const a = entity('a');
  a.dispose = () => {
    log.push('dispose a');
    w.despawn(b);
  };
  w.spawn(a);
  w.spawn(b);
  w.despawn(a);
  log.length = 0;
  w.flush();
  assert.deepEqual(log, ['detach a', 'dispose a', 'detach b', 'dispose b']);
});

test('despawning something never spawned only marks it dead', () => {
  const { w, entity, log } = setup();
  w.defineKind('k', { update: 0 });
  const a = entity('a');
  w.despawn(a);
  w.flush();
  assert.equal(a.alive, false);
  assert.deepEqual(log, []);
});

test('a throwing method turns off only that kind and phase', () => {
  const { w, log, errors, run } = setup();
  w.defineKind('bad', { update: 0, lateUpdate: 1 });
  w.defineKind('good', { update: 2 });
  w.spawn({
    kind: 'bad',
    alive: true,
    update() {
      log.push('bad update');
      throw new Error('boom');
    },
    lateUpdate() {
      log.push('bad late');
    },
  });
  w.spawn({ kind: 'bad', alive: true, update: () => void log.push('second, never reached') });
  w.spawn({ kind: 'good', alive: true, update: () => void log.push('good') });
  log.length = 0;
  for (let k = 0; k < 2; k++) {
    run('bad update');
    run('bad lateUpdate');
    run('good update');
  }
  assert.deepEqual(log, ['bad update', 'bad late', 'good', 'bad late', 'good']);
  assert.deepEqual(errors, ['bad update: boom'], 'reported once');
});

test('a throwing dispose is reported and the rest of the flush still runs', () => {
  const { w, entity, log, errors } = setup();
  w.defineKind('k', { update: 0 });
  const a = entity('a');
  a.dispose = () => {
    throw new Error('stuck');
  };
  const b = entity('b');
  w.spawn(a);
  w.spawn(b);
  w.despawn(a);
  w.despawn(b);
  log.length = 0;
  w.flush();
  assert.deepEqual(log, ['detach a', 'detach b', 'dispose b']);
  assert.deepEqual(errors, ['k dispose: stuck']);
});
