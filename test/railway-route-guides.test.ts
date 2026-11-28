import assert from 'node:assert/strict';
import test from 'node:test';
import { routeGuideStage, type RouteStage } from '../src/components/phase-guide/route-stages.ts';
import { roomWorks } from '../src/sim/railway-queries-room.ts';
import { railwayAtLegs, type LegStage } from '../src/sim/railway-seed-legs.ts';
import { act } from '../src/sim/railway-seed-route.ts';
import { RAIL_GATES, RAIL_GRANTS } from '../src/sim/railway-route.ts';
import type { ReadWorld } from '../src/sim/railway-rows.ts';

const cases: [LegStage, ...(RouteStage | null)[]][] = [
  ['gorge-reached', 'pick', null, null, null, null],
  ['incline-mid', 'incline', null, null, null, null],
  ['bell-reached', 'idle', 'seeds', 'seeds', null, null],
  ['bay-open', 'idle', 'bay', 'bay', null, null],
  ['bay-reached', 'idle', 'canopyGate', 'plug', null, null],
  ['cave-first-open', 'idle', 'canopyGate', 'cave', null, null],
  ['cave-first-reached', 'idle', 'canopyOnly', 'idle', null, 'otherBranch'],
  ['canopy-open', 'idle', 'canopy', 'plug', null, null],
  ['canopy-reached', 'idle', 'idle', 'plug', 'cloth', null],
  ['cave-open', 'idle', 'idle', 'cave', 'waitWall', null],
  ['port-reached', 'idle', 'idle', 'idle', 'waitWall', 'wall'],
  ['wall-deep', 'idle', 'idle', 'idle', 'waitWall', 'deep'],
  ['wall-closed', 'idle', 'idle', 'idle', 'notchGate', 'closed'],
  ['notch-reached', 'idle', 'lantern', 'idle', 'idle', 'closed'],
  ['causeway-open', 'idle', 'causeway', 'idle', 'idle', 'closed'],
  ['island-reached', 'idle', 'idle', 'idle', 'idle', 'closed'],
];
for (const [seed, ...expected] of cases) {
  const { w } = railwayAtLegs(seed);
  test(`station guides at ${seed}`, () => {
    const { site } = roomWorks(w);
    const areas = ['gorge', 'bell', 'west', 'canopy', 'quay'] as const;
    assert.deepEqual(
      areas.map((area) => routeGuideStage(area, w as ReadWorld, site)),
      expected,
    );
  });
}

// These jump-ins combine collecting a key and opening its gate, or opening a gate and laying a section.
for (const [seed, area, op, id, expected] of [
  ['gorge-reached', 'gorge', 'rail.grant', 'pick', 'inclineGate'],
  ['wall-deep', 'quay', 'rail.gate', 'deep-span', 'lastSpan'],
  ['notch-open', 'canopy', 'rail.gate', 'notch', 'notch'],
  ['notch-reached', 'bell', 'rail.grant', 'lantern', 'causewayGate'],
] as const) {
  test(`the ${area} guide after ${id} is accepted`, () => {
    const s = railwayAtLegs(seed);
    const catalog = op === 'rail.grant' ? RAIL_GRANTS : RAIL_GATES;
    assert.equal(act(s, 'a', op, { id: catalog.findIndex((entry) => entry.id === id) }), 1);
    assert.equal(routeGuideStage(area, s.w as ReadWorld, roomWorks(s.w).site), expected);
  });
}
