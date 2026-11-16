import test from 'node:test';
import assert from 'node:assert/strict';
import { railValid } from '../src/world/railway-server.ts';
import { townPlotBoard, TOWN_BOARD } from '../src/place/town-plan.ts';
import { createRailway } from './helpers/rail.ts';

test('buy reach uses each board anchor and refuses one centimetre beyond its radius', () => {
  const w = createRailway();
  for (let id = 0; id < 3; id++) {
    const board = townPlotBoard(id);
    const x = Math.round((board.x + 1000) * 100),
      z = Math.round(board.z * 100);
    for (const offset of [0, TOWN_BOARD.reach * 100, TOWN_BOARD.reach * 100 + 1]) {
      const actor = {
        reach: (bx: number, bz: number, r: number) => {
          assert.deepEqual([bx, bz, r], [x, z, 320]);
          return (x + offset - bx) ** 2 + (z - bz) ** 2 <= r * r;
        },
        height: () => true,
        cadence: () => true,
      };
      assert.equal(railValid(w, { op: 'rail.buy', id, epoch: 1, request: 1 }, actor), offset <= 320);
    }
  }
});
