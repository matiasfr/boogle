// Owner-requested (7 November): the playable 2D economy prototype's sim, driven headlessly through whole runs for one,
// two and three players, as docs/world/economy-prototype.html runs it. Offline design arithmetic, not game code.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROUTE } from '../dev/economy/ring-data.ts';
import { playMap } from '../dev/economy/play-map.ts';
import { USES, runWhole, timelineCsv } from '../dev/economy/play-sim.ts';
import { pageData, sourceHash } from '../dev/economy/build-prototype.ts';

const map = playMap();
const h = (x: number) => x.toFixed(2);

for (const players of [1, 2, 3])
  test(`economy prototype: a whole ${players}-player run reaches the ending`, (t) => {
    const { world, summary } = runWhole(map, { players, branchFirst: 'gorge' });
    // Every route step, in the map's stage order, each finished after the last.
    assert.equal(summary.steps.length, ROUTE.length);
    assert.deepEqual(new Set(summary.steps.map((s) => s.key)), new Set(ROUTE.map((r) => r.key)));
    for (const [i, s] of summary.steps.entries()) {
      assert.ok(s.endH >= s.startH, s.key);
      if (i) assert.ok(s.startH >= summary.steps[i - 1]!.endH - 1e-9, s.key);
    }
    assert.ok(
      summary.steps.findIndex((s) => s.key === 'b2.reach') < summary.steps.findIndex((s) => s.key === 'port.reach'),
    );
    for (const st of world.steps)
      assert.ok(
        st.jobs.every((j) => j.done),
        st.key,
      );
    // Each player's clock is all hauling, exploring or waiting.
    for (const u of summary.use) assert.ok(Math.abs(USES.reduce((a, k) => a + u[k], 0) - summary.mainH) < 0.01);
    assert.ok(summary.mainH > 3 && summary.mainH < 9, `${summary.mainH} h`);
    assert.ok(summary.crossovers.length > 0, 'machines overtake hands somewhere');
    assert.ok(summary.sittings > 1, 'the paused world and its away credit come into play');
    assert.ok(timelineCsv(world).split('\n').length > 60);
    t.diagnostic(
      `${players}p ${h(summary.mainH)} h; ` +
        summary.use.map((u, i) => `P${i + 1} haul ${h(u.haul)} explore ${h(u.explore)} wait ${h(u.wait)}`).join('; '),
    );
  });

test('economy prototype: more players reach the ending sooner, and both branch orders finish', () => {
  const at = (players: number) => runWhole(map, { players, branchFirst: 'gorge' }).summary.mainH;
  const [one, two, three] = [at(1), at(2), at(3)];
  assert.ok(two < one && three <= two, `${one} ${two} ${three}`);
  assert.ok(runWhole(map, { players: 1, branchFirst: 'canopy', trainFirst: 'chassis' }).summary.mainH > 3);
});

test('economy prototype: the page is built from the current sources', () => {
  assert.equal(pageData().sourceHash, sourceHash(), 'stale: run node dev/economy/build-prototype.ts');
});
