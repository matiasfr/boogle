// E, the ECS-shaped store (docs/plans/ecs-e.md): id order, deferred structural changes, declared access, the audit,
// change detection, and hash/snapshot/load/clone round-trips, including malformed loads.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSchedule, createWorld, defineComponent, defineSystem, type World } from '../src/ecs/index.ts';
import { mulberry32 } from '../src/sim/rng.ts';

const Age = defineComponent('age', { ticks: 'int' });
const Tree = defineComponent('tree', { slot: 'u16', left: 'int', yaw: 'f64', fell: 'bool' }, { key: 'slot' });
const Pile = defineComponent('pile', { x: 'i32', z: 'i32', n: 'u8', owner: 'str' }, { requires: [Age] });
const ALL = [Age, Tree, Pile];
const world = () => createWorld(ALL, { audit: true });

const fell = defineSystem(
  'fell',
  { reads: [Pile], writes: [Tree, Pile, Age], phase: 'act', order: 0 },
  (w, slot: number) => {
    const id = w.lookup(Tree, slot);
    const tree = id === undefined ? undefined : w.mut(Tree, id);
    if (!tree || !tree.left) return 0;
    const n = Math.min(2, tree.left);
    tree.left -= n;
    if (!tree.left) tree.fell = true;
    return w.spawn([Pile, { x: slot, z: 0, n }], [Age, {}]);
  },
);
const take = defineSystem('take', { writes: [Pile, Age], phase: 'act', order: 1 }, (w, id: number) => {
  const p = w.mut(Pile, id);
  if (!p) return 0;
  p.n--;
  if (!p.n) w.despawn(id);
  return 1;
});
const age = defineSystem('age', { writes: [Age], phase: 'tick', order: 0 }, (w) => {
  for (const id of w.ids(Age)) w.mut(Age, id)!.ticks++;
});

function grove(w: World, n = 10) {
  for (let k = 0; k < n; k++) w.spawn([Tree, { slot: k, left: 5 }]);
}
const order = (w: World) => {
  const out: number[] = [];
  w.each([Pile, Age], (id) => out.push(id));
  return out;
};

test('ids are stamped ascending and never reused; each walks ascending ids, joining components', () => {
  const w = world();
  grove(w, 3);
  const a = w.run(fell, 0),
    b = w.run(fell, 1),
    c = w.run(fell, 2);
  assert.deepEqual([a, b, c], [4, 5, 6]);
  w.despawn(b);
  const d = w.run(fell, 1);
  assert.equal(d, 7, 'a despawned id is not handed out again');
  assert.deepEqual(order(w), [4, 6, 7]);
  w.add(1, Age, { ticks: 9 }); // a tree that also ages joins [Tree, Age]
  const seen: [number, number][] = [];
  w.each([Tree, Age], (id, tree, ageRow) => seen.push([id, tree.left + ageRow.ticks]));
  assert.deepEqual(seen, [[1, 12]]);
  assert.equal(w.lookup(Tree, 2), 3);
  assert.equal(w.count(Pile), 3);
});

test('structural changes in a system wait for its end; field writes do not', () => {
  const w = world();
  grove(w, 1);
  const peek = defineSystem('peek', { writes: [Tree, Pile, Age], phase: 'act', order: 2 }, (sw) => {
    const id = sw.spawn([Pile, { n: 1 }], [Age, {}]);
    assert.equal(sw.get(Pile, id), undefined, 'a spawn is not visible inside its system');
    sw.mut(Tree, 1)!.left = 3;
    assert.equal(sw.get(Tree, 1)!.left, 3, 'a field write is');
    sw.despawn(1);
    assert.ok(sw.has(Tree, 1), 'a despawn waits too');
    return id;
  });
  const id = w.run(peek, undefined);
  assert.equal(w.get(Pile, id)!.n, 1);
  assert.equal(w.has(Tree, 1), false);
  // Outside a system, changes are immediate, but never while iterating.
  w.spawn([Tree, { slot: 4 }]);
  assert.throws(() => w.each([Tree], () => w.despawn(w.lookup(Tree, 4)!)), /while iterating/);
});

test('a system may touch only what it declares', () => {
  const w = world();
  grove(w, 1);
  const sneaky = defineSystem('sneaky', { reads: [Tree], phase: 'act', order: 3 }, (sw) => {
    sw.mut(Tree, 1)!.left = 0;
  });
  assert.throws(() => w.run(sneaky, undefined), /sneaky writes tree without declaring it/);
  const nosy = defineSystem('nosy', { writes: [Tree], phase: 'act', order: 4 }, (sw) => sw.count(Pile));
  assert.throws(() => w.run(nosy, undefined), /nosy reads pile without declaring it/);
  const nested = defineSystem('nested', { writes: [Tree], phase: 'act', order: 5 }, (sw) => sw.run(age, undefined));
  assert.throws(() => w.run(nested, undefined), /run inside nested/);
});

test('the audit catches a write through a read-only row, and a changed key', () => {
  const w = world();
  grove(w, 1);
  const cheat = defineSystem('cheat', { reads: [Tree], writes: [Tree], phase: 'act', order: 6 }, (sw) => {
    (sw.get(Tree, 1) as { left: number }).left = 1;
  });
  assert.throws(() => w.run(cheat, undefined), /cheat changed tree 1 without mut/);
  const rekey = defineSystem('rekey', { writes: [Tree], phase: 'act', order: 7 }, (sw) => {
    sw.mut(Tree, 1)!.slot = 9;
  });
  assert.throws(() => w.run(rekey, undefined), /changed the key of tree 1/);
});

test('changes(c) drains what was marked, ascending, despawns included', () => {
  const w = world();
  grove(w, 2);
  for (const c of ALL) w.changes(c);
  const p = w.run(fell, 1);
  w.run(take, p);
  w.run(take, p);
  assert.deepEqual([w.changes(Age), w.changes(Pile), w.changes(Tree)], [[p], [p], [2]]);
  assert.deepEqual(w.changes(Pile), []);
});

test('a schedule runs a phase by order, and refuses two systems at one order', () => {
  const w = world();
  grove(w, 1);
  w.run(fell, 0);
  const s = createSchedule([fell, take, age]);
  s.run(w, 'tick', undefined);
  s.run(w, 'tick', undefined);
  assert.equal(w.get(Age, 2)!.ticks, 2);
  assert.throws(() => createSchedule([age, defineSystem('dup', { phase: 'tick', order: 0 }, () => 0)]), /taken/);
});

// A random history of spawns, takes and ages; the same seed gives the same history.
function churn(w: World, seed: number, steps: number) {
  const r = mulberry32(seed);
  for (let k = 0; k < steps; k++) {
    if (r() < 0.6) w.run(fell, Math.floor(r() * 10));
    const piles = w.ids(Pile);
    if (piles.length && r() < 0.5) w.run(take, piles[Math.floor(r() * piles.length)]!);
    w.run(age, undefined);
  }
}

test('hash, snapshot, load and clone round-trip; a late joiner continues identically', () => {
  const a = world();
  grove(a, 10);
  churn(a, 7, 60);
  const json = JSON.parse(JSON.stringify(a.snapshot()));
  const b = world();
  b.load(json);
  assert.equal(b.hash(), a.hash());
  assert.deepEqual(b.snapshot(), a.snapshot());
  assert.deepEqual(order(b), order(a));
  const c = a.clone();
  churn(a, 8, 40);
  churn(b, 8, 40);
  assert.equal(b.hash(), a.hash(), 'the loaded world runs the same history to the same state');
  assert.deepEqual(order(b), order(a));
  assert.notEqual(c.hash(), a.hash(), 'a clone is independent');
  churn(c, 8, 40);
  assert.equal(c.hash(), a.hash());
  // Floats hash by their bits; strings and booleans by value.
  const f = world();
  f.spawn([Tree, { slot: 1, yaw: 0.1 + 0.2 }]);
  const g = world();
  g.spawn([Tree, { slot: 1, yaw: 0.3 }]);
  assert.notEqual(f.hash(), g.hash());
});

test('load is all or nothing and refuses malformed snapshots', () => {
  const a = world();
  grove(a, 4);
  churn(a, 3, 20);
  const good = a.snapshot();
  const b = world();
  grove(b, 2);
  const before = b.hash();
  const bad = (edit: (j: ReturnType<typeof structuredClone<typeof good>>) => void, why: RegExp) => {
    const j = structuredClone(good);
    edit(j);
    assert.throws(() => b.load(j), why);
    assert.equal(b.hash(), before, 'the live state is untouched');
  };
  bad((j) => (j.v = 2 as 1), /header/);
  bad((j) => delete j.c.age, /components/);
  bad((j) => (j.c.tree![2]![0] = 1.5), /tree 1 left/);
  bad((j) => (j.c.tree![4]![0] = 2), /tree 1 fell/); // booleans are 0 or 1
  bad((j) => (j.c.tree![0]![1] = 0), /tree ids/); // ids strictly ascending
  bad((j) => (j.next = 2), /past next/);
  bad((j) => (j.c.tree![1]![1] = j.c.tree![1]![0]!), /key 0 twice/);
  bad((j) => {
    for (const col of j.c.age!) col.length = 0;
  }, /requires age/);
  bad((j) => j.c.pile!.pop(), /pile columns/);
  assert.throws(() => b.load(good, () => assert.fail('the domain says no')), /the domain says no/);
  assert.equal(b.hash(), before);
  b.load(good);
  assert.equal(b.hash(), a.hash());
});

test('spawns are checked: unknown fields, missing required components and taken keys', () => {
  const w = world();
  assert.throws(() => w.spawn([Tree, { slot: 1, height: 3 } as never]), /no field height/);
  assert.throws(() => w.spawn([Pile, { n: 1 }]), /requires age/);
  w.spawn([Tree, { slot: 1 }]);
  assert.throws(() => w.spawn([Tree, { slot: 1 }]), /key 1 taken/);
  assert.throws(() => w.spawn([Tree, { slot: 2, left: 1.5 }]), /off schema/); // the audit checks values at spawn
  const next = w.nextId();
  w.reserve(-5);
  assert.equal(w.spawn([Tree, { slot: 3 }]), -5, 'a reserved (temporary) id');
  assert.equal(w.nextId(), next, 'the counter is untouched by an id behind it');
  assert.throws(() => w.reserve(-5), /in use/);
  w.reserve(40);
  assert.equal(w.spawn([Tree, { slot: 4 }]), 40, "a replica's id");
  assert.equal(w.spawn([Tree, { slot: 5 }]), 41, 'and stamps continue past it');
});
