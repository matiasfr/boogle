import assert from 'node:assert/strict';
import test from 'node:test';
import { sourceFunction } from '../dev/level/source.ts';

function harness(initial: { boogles: number } | undefined) {
  let row = initial;
  const coins = { visible: true, scale: { y: 1 } };
  const labels: string[][] = [];
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
              setEnabled() {},
              relabel(_key: string, text: string[]) {
                labels.push(text);
              },
            }
          : { root: coins, setEnabled() {} },
      ORIGIN: { x: 0 },
      TILL: { x: 0, z: 0, yaw: 0 },
      HALL: { floor: 0 },
      till: () => row,
      boxCap: () => 100,
    },
  );
  const view = create({ read: { world() {}, trade() {} } }, {});
  return {
    view,
    coins,
    labels,
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
