import assert from 'node:assert/strict';
import test from 'node:test';
import { NODES, proposeOrders } from '../dev/loop/graph.ts';
import { playOrder } from '../dev/loop/run.ts';

for (const players of [1, 2, 3]) {
  test(`the canonical loop accounts for every player tick with ${players} player(s)`, { timeout: 60_000 }, () => {
    const run = playOrder(proposeOrders()[0]!.order, 'canonical', players);
    assert.equal(run.softlock, undefined);
    assert.equal(run.nodes.length, NODES.length);
    for (const t of run.nodes) {
      assert.equal(t.hands + t.watching + t.rides + t.waits, (t.tick - t.startTick) * players, t.id);
      assert.equal(t.idle, t.watching + t.waits, t.id);
    }
    assert.deepEqual(
      run.nodes.filter((t) => t.rides > 0).map((t) => t.id),
      ['notch-gate'],
    );
  });
}
