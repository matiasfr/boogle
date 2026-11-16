import assert from 'node:assert/strict';
import test from 'node:test';
import { sourceFunction } from '../dev/level/source.ts';

function harness(initial: { boogles: number } | undefined) {
  let row = initial;
  const coins = { visible: true, scale: { y: 1 } };
  const labels: string[][] = [];
  let enabled = false;
  let i = 0;
  const create = sourceFunction<(adapter: unknown, owner: unknown) => { update(): void }>(
    'src/entities/railway/till-view.ts',
    'createTill',
    {
      loadLevelArtifact: () => ({ placements: [{}, {}] }),
      kit: {},
      compiled: { prefabs: {} },
      instantiate: () =>
        i++ === 0
          ? {
              root: { add() {} },
              setEnabled(on: boolean) {
                enabled = on;
              },
              relabel(_key: string, text: string[]) {
                labels.push(text);
              },
            }
          : { root: coins, setEnabled() {} },
      ORIGIN: { x: 0 },
      TILL: { x: 0, z: 0, yaw: 0 },
      HALL: { floor: 0 },
      Till: {},
      boxCap: () => 100,
    },
  );
  // Guarded component reads replace the throwing singleton reader; keep the review assertions unchanged.
  const world = { ids: () => (row ? [1] : []), get: () => row };
  const view = create({ read: { world: () => world, trade() {} } }, {});
  return {
    view,
    coins,
    labels,
    enabled: () => enabled,
    set(value: number) {
      row = { boogles: value };
    },
    remove() {
      row = undefined;
    },
  };
}

test('till clears its presentation when its replicated row disappears', () => {
  const h = harness({ boogles: 50 });
  h.view.update();
  h.remove();
  assert.doesNotThrow(() => h.view.update());
  assert.equal(h.coins.visible, false);
});

for (const n of [-1, NaN])
  test(`till keeps a finite nonnegative scale for ${n}`, () => {
    const h = harness({ boogles: n });
    h.view.update();
    assert.ok(Number.isFinite(h.coins.scale.y) && h.coins.scale.y >= 0);
  });

test('till starts hidden, recovers after missing rows and clamps its label as well as its column', () => {
  const h = harness(undefined);
  h.view.update();
  assert.equal(h.enabled(), false);
  h.set(150);
  h.view.update();
  assert.equal(h.enabled(), true);
  assert.equal(h.coins.visible, true);
  assert.equal(h.coins.scale.y, 1);
  assert.deepEqual(h.labels.at(-1), ['100', 'Boogles']);
  h.remove();
  h.view.update();
  assert.equal(h.enabled(), false);
  h.set(NaN);
  h.view.update();
  assert.equal(h.enabled(), true);
  assert.equal(h.coins.scale.y, 0);
  assert.deepEqual(h.labels.at(-1), ['0', 'Boogles']);
});

test('waiting crowds hide and recover, clamp counts and reuse their unchanged poses', () => {
  let row: { wait0: number; wait1: number } | undefined;
  const counts = [0, 0],
    labels: string[][] = [],
    enabled = [false, false];
  const positions: unknown[] = [];
  let calls = 0,
    i = 0;
  const platforms = [
    { x: 0, y: 0, z: 0 },
    { x: 100, y: 0, z: 0 },
  ];
  const world = { lookup: () => (row ? 1 : undefined), get: () => row };
  const create = sourceFunction<(a: unknown, o: unknown) => { update(): void; restore(): void }>(
    'src/entities/railway/riders-view.ts',
    'createRiders',
    {
      loadLevelArtifact: () => ({ placements: [{}, {}, {}, {}] }),
      kit: {},
      compiled: { prefabs: {} },
      instantiate: () => {
        const end = i++;
        return {
          root: { position: { set() {} }, rotation: { y: 0 } },
          setEnabled(on: boolean) {
            enabled[end] = on;
          },
          relabel(_key: string, text: string[]) {
            labels[end] = text;
          },
        };
      },
      TRADE: { routes: [{ town: 0, line: 1, a: 0 }] },
      Town: {},
      LINE_HALTS: [
        { line: 1, stop: 0 },
        { line: 1, stop: 1 },
      ],
      line2Trains: () => true,
      trainStops: () => [0, 100],
      routeFar: () => 1,
      railCallPlatform: (_w: unknown, halt: number) => platforms[halt],
      line2At: (_s: number, out: { ux: number; uz: number }) => {
        out.ux = 1;
        out.uz = 0;
      },
      folk: {
        setWaiting(end: number, n: number, at: (k: number) => unknown) {
          calls++;
          counts[end] = n;
          for (let k = 0; k < n; k++) positions.push(at(k));
        },
      },
    },
  );
  const view = create({ read: { world: () => world, tickNow: () => 0 } }, { cleanup() {} });
  assert.doesNotThrow(() => view.update());
  row = { wait0: 13, wait1: 4 };
  view.update();
  assert.deepEqual(counts, [12, 4]);
  assert.deepEqual(enabled, [true, false]);
  assert.deepEqual(labels[0], ['13', 'Waiting']);
  assert.equal(positions[0], positions[11], 'one scratch point is reused per crowd');
  const previous = calls;
  view.update();
  assert.equal(calls, previous, 'unchanged rows and platforms do not pose the crowds again');
  view.restore();
  assert.equal(calls, previous + 2, 'restoring reposes unchanged counts');
  row = undefined;
  view.update();
  assert.deepEqual(counts, [0, 0]);
  assert.deepEqual(enabled, [false, false]);
  row = { wait0: -1, wait1: NaN };
  view.update();
  assert.deepEqual(counts, [0, 0]);
  row = { wait0: 2, wait1: 3 };
  view.update();
  assert.deepEqual(counts, [2, 3]);
});
