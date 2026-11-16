import test from 'node:test';
import assert from 'node:assert/strict';
import { createRailwayWorld, Shed } from '../src/sim/railway-components.ts';
import type { ReadWorld } from '../src/sim/railway-rows.ts';
import { rotundaStage } from '../src/entities/railway/rotunda-stage.ts';

test('rotunda stages require both stall footings, then the first steel landed at Home', () => {
  const w = createRailwayWorld();
  const sh = w.mut(Shed, w.single(Shed))!;
  for (const [stall, steel, stage] of [
    [0, 0, 0],
    [1, 0, 0],
    [0, 1, 0],
    [1, 1, 0],
    [2, 0, 1],
    [2, 1, 2],
    [2, 8, 2],
  ] as const) {
    sh.stall = stall;
    sh.steel = steel;
    assert.equal(rotundaStage(w as unknown as ReadWorld), stage, `stall=${stall}, steel=${steel}`);
    const loaded = createRailwayWorld();
    loaded.load(JSON.parse(JSON.stringify(w.snapshot())));
    assert.equal(rotundaStage(loaded as unknown as ReadWorld), stage, 'loaded stage matches live rows');
  }
});
