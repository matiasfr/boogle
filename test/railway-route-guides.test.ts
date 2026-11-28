import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { sourceModule } from '../dev/level/source.ts';
import { gorgeAt, GORGE_DECK } from '../src/entities/route-greybox/massing.ts';
import { ROUTE_LINES, routeGuideStage, type RouteStage } from '../src/components/phase-guide/route-stages.ts';
import { roomWorks, WORKS_STEPS } from '../src/sim/railway-queries-room.ts';
import { laySection, railwayAtLegs, type LegStage } from '../src/sim/railway-seed-legs.ts';
import { act } from '../src/sim/railway-seed-route.ts';
import { RAIL_GATES, RAIL_GRANTS, RAIL_LEGS } from '../src/sim/railway-route.ts';
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

test('West landing directs the cave crew to its plug while Bell Rock still holds the seeds', () => {
  const s = railwayAtLegs('bell-reached');
  const bay = RAIL_LEGS.findIndex((leg) => leg.id === 'bay-cut');
  for (let i = 0; i < RAIL_LEGS[bay]!.sections.length; i++) laySection(s, bay);
  const site = roomWorks(s.w).site;
  assert.equal(site, 'seeds');
  assert.equal(routeGuideStage('west', s.w as ReadWorld, site), 'plug');
});

test('Quay identifies the deep barrier while cloth is still waiting at Canopy', () => {
  const s = railwayAtLegs('canopy-reached');
  const cave = RAIL_LEGS.findIndex((leg) => leg.id === 'cave');
  const wall = RAIL_LEGS.findIndex((leg) => leg.id === 'wall');
  assert.equal(act(s, 'a', 'rail.gate', { id: RAIL_GATES.findIndex((gate) => gate.id === 'plug') }), 1);
  for (let i = 0; i < RAIL_LEGS[cave]!.sections.length; i++) laySection(s, cave);
  for (let i = 0; i < 5; i++) laySection(s, wall);
  const site = roomWorks(s.w).site;
  assert.equal(site, 'cloth');
  assert.equal(routeGuideStage('quay', s.w as ReadWorld, site), 'deep');
});

test('Bell Rock points to the current Canopy railhead when the cave crew opens its plug', () => {
  const s = railwayAtLegs('canopy-mid');
  assert.equal(act(s, 'b', 'rail.gate', { id: RAIL_GATES.findIndex((gate) => gate.id === 'plug') }), 1);
  const work = roomWorks(s.w);
  assert.equal(work.site, 'cave-1');
  const aims = new Map<string, () => unknown>();
  const { createRouteGuides } = sourceModule<{
    createRouteGuides(
      owner: object,
      ready: () => boolean,
    ): { read(w: ReadWorld, work: ReturnType<typeof roomWorks>): void };
  }>(
    fs
      .readFileSync('src/entities/route-greybox/phase-guides.ts', 'utf8')
      .replace("import('../../place/folk.ts').then", 'Promise.resolve({}).then'),
    {
      WORKS_STEPS,
      ROUTE_LINES,
      gorgeAt,
      GORGE_DECK,
      routeGuideStage,
      folkVoice: () => ({}),
      createPhaseGuide: (_owner: object, opts: { id: string; aim: () => unknown }) => {
        aims.set(opts.id, opts.aim);
        return {};
      },
    },
  );
  createRouteGuides({ alive: false }, () => true).read(s.w as ReadWorld, work);
  const { at } = WORKS_STEPS.find((step) => step.site === 'canopy-2')!;
  assert.deepEqual(aims.get('railway-talk-bell')!(), { x: at.x / 100, z: at.z / 100 });
});
