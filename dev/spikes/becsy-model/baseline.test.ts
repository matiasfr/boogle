// Owner-requested enforcement probes, deliberately demonstrating holes rather than blessing them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSchedule, defineComponent, defineSystem } from '../../../src/ecs/index.ts';
import { bitReference, inhouse, jobSlice } from './baseline.ts';

const bit = await bitReference();
const Counter = defineComponent('spikeCounter', { value: 'int' });
for (const [name, make] of [
  ['inhouse', inhouse],
  ['bitecs facade', bit.make],
] as const) {
  await test(`${name}: rejects undeclared reads and writes with audit on AND off`, () => {
    for (const audit of [false, true]) {
      const w = make([Counter], { audit });
      const id = w.spawn([Counter, { value: 1 }]);
      for (const access of ['read', 'write'] as const) {
        const bad = defineSystem('bad', { phase: 'tick', order: 0 }, (world) => {
          if (access === 'write') world.mut(Counter, id)!.value++;
          else world.get(Counter, id);
        });
        assert.throws(() => w.run(bad, undefined), /without declaring it/);
        assert.equal(w.get(Counter, id)!.value, 1);
      }
    }
  });
  await test(`${name}: live read-row mutation escapes without audit; audit throws AFTER damage`, () => {
    for (const audit of [false, true]) {
      const w = make([Counter], { audit });
      const id = w.spawn([Counter, { value: 1 }]);
      w.changes(Counter);
      const bad = defineSystem('badAlias', { reads: [Counter], phase: 'tick', order: 0 }, (world) => {
        Object.assign(world.get(Counter, id)!, { value: 99 });
      });
      if (audit) assert.throws(() => w.run(bad, undefined), /without mut/);
      else assert.doesNotThrow(() => w.run(bad, undefined));
      assert.equal(w.get(Counter, id)!.value, 99, 'neither mode rolls back the mutation');
      assert.deepEqual(w.changes(Counter), [], 'the illicit mutation is not replicated as a change');
    }
  });
  await test(`${name}: retained writable row can mutate outside its system`, () => {
    const w = make([Counter], { audit: true });
    const id = w.spawn([Counter, {}]);
    let retained: { value: number } | undefined;
    const capture = defineSystem('capture', { writes: [Counter], phase: 'tick', order: 0 }, (world) => {
      retained = world.mut(Counter, id);
    });
    w.run(capture, undefined);
    w.changes(Counter);
    retained!.value = 7;
    assert.equal(w.get(Counter, id)!.value, 7);
    assert.deepEqual(w.changes(Counter), []);
  });
  await test(`${name}: canonical stable IDs survive different structural histories`, () => {
    const a = make([Counter]),
      b = make([Counter]);
    for (const id of [1, 2, 3]) {
      a.reserve(id);
      a.spawn([Counter, { value: id }]);
    }
    for (const id of [3, 1, 2]) {
      b.reserve(id);
      b.spawn([Counter, { value: id }]);
    }
    assert.deepEqual(a.ids(Counter), [1, 2, 3]);
    assert.deepEqual(a.snapshot(), b.snapshot());
    assert.equal(a.hash(), b.hash());
  });
}

await test('scheduler rejects duplicate numeric slots; no before/after graph API exists', () => {
  const a = defineSystem('a', { phase: 'tick', order: 1 }, () => {});
  const b = defineSystem('b', { phase: 'tick', order: 1 }, () => {});
  assert.throws(() => createSchedule([a, b]), /taken/);
});

await test('real jobClock: both railway lines match every step, snapshot restore and future ticks', () => {
  const a = jobSlice(inhouse, 30, true),
    b = jobSlice(bit.make, 30, true);
  for (let tick = 0; tick < 40; tick++) {
    a.input(tick);
    b.input(tick);
    a.tick();
    b.tick();
    assert.deepEqual(b.w.snapshot(), a.w.snapshot(), `tick ${tick}`);
    assert.equal(b.w.hash(), a.w.hash(), `hash ${tick}`);
    if (tick === 20) b.w.load(JSON.parse(JSON.stringify(a.w.snapshot())));
  }
});
