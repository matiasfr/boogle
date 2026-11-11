// The scripted op stream (docs/plans/ecs-migration-railway.md, M0 follow-up): the railway ops and lifecycle entry
// points that no seed stage runs (or runs only to be refused), each driven here on a world a seed stage or the route's
// own opening leaves, with the world hash after every step recorded in test/fixtures/railway-ops-golden.json. Like
// test/railway-golden.test.ts, a refactor step must NEVER regenerate it (`GOLDEN=1 node --test test/railway-ops.test.ts`
// is for a deliberate rule change that bumps WORLD_NS).
//
// Not run by any stage: rail.take, rail.rackTake, rail.axe (the route calls it before the forge is lit, so it is
// always refused), rail.beamDrop, rail.call, rail.jump, rail.reject and an unknown op, and the entry points
// railResume, railSupplyPulse, railBeamRelease, railBeamStood, railBeamPutDown, railBoilerStood, railBoilerPutDown and
// railFootRelease (and railSession past a first epoch). Every other op and system a stage does run.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { RAILWAY_SOURCES } from '../src/sim/railway-layout.ts';
import { LINE1_GREAT_TREE } from '../src/sim/railway-line-layout.ts';
import { RAIL_HALTS, RAIL_TRAINS } from '../src/sim/railway-lines.ts';
import { railGrowthMask } from '../src/sim/railway-supply.ts';
import { Pile } from '../src/sim/railway-world.ts';
import { act, advance, buildSeedWorld, logs, type SeedStage, type World } from '../src/sim/railway-seeds.ts';
import { railBoilerPutDown, railBoilerStood } from '../src/sim/railway-systems.ts';
import {
  createRailway,
  edit,
  need,
  railApply,
  railBeamPutDown,
  railBeamRelease,
  railBeamStood,
  railFootRelease,
  railResume,
  railSession,
  railSupplyPulse,
  restore,
  worldOf,
} from './railway-live.ts';

const FILE = new URL('./fixtures/railway-ops-golden.json', import.meta.url);
type Step = [label: string, result: number, hash: number];
const got: Record<string, Step[]> = {};

function scenario(name: string, w: World, body: (step: (label: string, fn: () => number | boolean) => number) => void) {
  const steps: Step[] = [];
  const step = (label: string, fn: () => number | boolean) => {
    const r = Number(fn());
    steps.push([label, r, worldOf(w.s).hash()]);
    return r;
  };
  body(step);
  got[name] = steps;
}
/** A copy of a built stage world (the stage itself belongs to the stage golden). */
const from = (stage: SeedStage): World => {
  const w = buildSeedWorld(stage);
  return { s: restore(w.s), t: w.t };
};
// The boiler's two presence entry points have no wrapper in railway-live.ts: run them through edit().
const boilerStood = (w: World, pid: string, x: number, y: number, z: number) => {
  let r = false;
  edit(w.s, (e) => void (r = railBoilerStood(e, pid, x, y, z)));
  return r;
};
const boilerPutDown = (w: World, pid: string) => {
  let r = 0;
  edit(w.s, (e) => void (r = railBoilerPutDown(e, pid)));
  return r;
};
const PILE = { x: 100000, y: 2000, z: 3000 };
const GROW = railGrowthMask([]);
const pulse = (w: World, marker: number, extra: { recover?: number[]; beam?: number; boiler?: number } = {}) =>
  railSupplyPulse(w.s, { marker, grow: GROW, recover: [], ...extra });

// ---- line one's opening, to the moment the great beam is wanted (the first third of the route's railwayAtQ2)
function opening(): World {
  const s = createRailway();
  for (const pid of ['a', 'b']) railSession(s, pid, 1);
  railApply(s, 'a', { op: 'rail.wake', epoch: 1, request: 1 }, 0);
  const w = { s, t: 40 };
  logs(w, 'a', 'T1', 24);
  advance(w, 300);
  for (let i = 0; i < 8;) {
    const n = act(w, 'b', 'rail.mine', { id: s.line!.rocks.findIndex((r) => r > 0) });
    need(act(w, 'b', 'rail.deposit', { station: 'T2', kind: 1, n }) === n, 'T2 took stone');
    i += n;
  }
  logs(w, 'a', 'T2', 32);
  advance(w, 300);
  logs(w, 'a', 'T3', 40);
  return w;
}
const w1 = opening();
scenario('opening', w1, (step) => {
  const a =
    (op: string, f = {}) =>
    () =>
      act(w1, 'a', op, f);
  const tree = () => RAILWAY_SOURCES[w1.s.sources.findIndex((n) => n > 0)]![0];
  step('jump', a('rail.jump'));
  step('jump again', a('rail.jump'));
  step('axe before the forge', a('rail.axe'));
  step('reject', a('rail.reject'));
  step('unknown op', a('rail.nonsense'));
  step('chop', () => act(w1, 'a', 'rail.chop', { id: tree(), yaw: 0, collapsed: false }));
  step('drop', a('rail.drop', { ...PILE, n: 2, kind: 0 }));
  step('take part', a('rail.take', { id: worldOf(w1.s).ids(Pile)[0]!, kind: 0 }));
  step('take wrong kind', a('rail.take', { id: worldOf(w1.s).ids(Pile)[0] ?? 0, kind: 1 }));
  step('drop for recovery', a('rail.drop', { ...PILE, n: 1, kind: 0 }));
  step('supply pulse 1', () => pulse(w1, 100));
  step('supply pulse 2 recovers the pile', () => pulse(w1, 140, { recover: [...worldOf(w1.s).ids(Pile)] }));
  step('rackTake stone', a('rail.rackTake', { kind: 1 }));
  step('rackTake rails', a('rail.rackTake', { kind: 2 }));
  step('rackTake logs', a('rail.rackTake', { kind: 0 }));
  step('drop the rest', a('rail.drop', { ...PILE, n: 8, kind: 0 }));
  for (let i = 0; i < 12; i++) step(`beamChop ${i}`, a('rail.beamChop'));
  const beam = () => w1.s.line!.beam.revision;
  step('beamTake', () => act(w1, 'a', 'rail.beamTake', { revision: beam() }));
  step('beamStood', () => railBeamStood(w1.s, 'a', 99700, 3000, -13700));
  step('beamStood same spot', () => railBeamStood(w1.s, 'a', 99700, 3000, -13700));
  step('beamRelease stale revision', () => railBeamRelease(w1.s, 'a', 1, beam() + 5));
  step('beamRelease', () => railBeamRelease(w1.s, 'a', 1, beam()));
  step('beamTake again', () => act(w1, 'a', 'rail.beamTake', { revision: beam() }));
  step('beamDrop', () =>
    act(w1, 'a', 'rail.beamDrop', { revision: beam(), x: LINE1_GREAT_TREE.x, y: 3000, z: LINE1_GREAT_TREE.z + 100 }),
  );
  step('supply pulse beam age', () => pulse(w1, 170));
  step('supply pulse beam recovers', () => pulse(w1, 200, { beam: beam() }));
  step('beamTake from the tree', () => act(w1, 'a', 'rail.beamTake', { revision: beam() }));
  step('beamPutDown', () => railBeamPutDown(w1.s, 'a'));
  step('beamPutDown not held', () => railBeamPutDown(w1.s, 'a'));
  step('beamTake from the ground', () => act(w1, 'a', 'rail.beamTake', { revision: beam() }));
  step('beamDeposit', () => act(w1, 'a', 'rail.beamDeposit', { revision: beam(), station: 'T3' }));
  step('resume', () => railResume(w1.s, 200, 1, w1.t));
  step('resume same marker', () => railResume(w1.s, 200, 1, w1.t));
  step('session epoch 2', () => railSession(w1.s, 'a', 2));
  step('session epoch skipped', () => railSession(w1.s, 'a', 9));
});

// ---- the proper axe, once the forge is lit
const w2 = from('q1-done');
scenario('axe', w2, (step) => {
  const a =
    (op: string, f = {}) =>
    () =>
      act(w2, 'a', op, f);
  step('axe', a('rail.axe'));
  step('axe again', a('rail.axe'));
  const tree = () => RAILWAY_SOURCES[w2.s.sources.findIndex((n) => n > 0)]![0];
  // Five logs a chop with the axe: drop the load after each so the next chop has room.
  for (let i = 0; i < 6; i++) {
    step(`chop ${i}`, a('rail.chop', { id: tree(), yaw: 1.5, collapsed: i % 2 === 0 }));
    step(`drop ${i}`, a('rail.drop', { ...PILE, n: 8, kind: 0 }));
  }
  step('chop a hardwood', a('rail.chop', { id: 209, yaw: 0, collapsed: false }));
  step('chop the other hardwood', a('rail.chop', { id: 232, yaw: 0, collapsed: false }));
  step('supply pulse 1', () => pulse(w2, 100));
  step('supply pulse 2 regrows', () => pulse(w2, 1540));
  step('supply pulse 3 regrows', () => pulse(w2, 2980));
});

// ---- the boiler carried, stood, put down, dropped and recovered
const w3 = from('boiler');
scenario('boiler', w3, (step) => {
  const rev = () => w3.s.line2!.boiler.revision;
  step('boilerTake', () => act(w3, 'a', 'rail.boilerTake', { revision: rev() }));
  step('boilerStood', () => boilerStood(w3, 'a', 92000, 1815, 600));
  step('boilerStood same spot', () => boilerStood(w3, 'a', 92000, 1815, 600));
  step('boilerPutDown', () => boilerPutDown(w3, 'a'));
  step('boilerPutDown not held', () => boilerPutDown(w3, 'a'));
  step('boilerTake from the ground', () => act(w3, 'a', 'rail.boilerTake', { revision: rev() }));
  step('boilerDrop', () => act(w3, 'a', 'rail.boilerDrop', { revision: rev(), x: 95000, y: 2000, z: 0 }));
  step('supply pulse 1', () => pulse(w3, 100));
  step('supply pulse 2 recovers', () => pulse(w3, 140, { boiler: rev() }));
});

// ---- the trains called: every halt, both ways, from its lever and from aboard
const w4 = from('trains-on');
scenario('call', w4, (step) => {
  RAIL_HALTS.forEach((h, id) => {
    for (const dir of [-1, 1])
      step(`call ${id} (line ${h.line} stop ${h.stop}) dir ${dir}`, () => act(w4, 'a', 'rail.call', { id, dir }));
  });
  step('call bad id', () => act(w4, 'a', 'rail.call', { id: RAIL_HALTS.length, dir: 1 }));
  step('call bad dir', () => act(w4, 'a', 'rail.call', { id: 1, dir: 0 }));
  RAIL_TRAINS.forEach((t, train) =>
    RAIL_HALTS.forEach((h, id) => {
      if (h.line === t.line)
        for (const dir of [-1, 1])
          step(`aboard train ${train} calls ${id} dir ${dir}`, () => act(w4, 'a', 'rail.call', { id, dir, train }));
    }),
  );
  step('advance 300', () => (advance(w4, 300), 300));
  RAIL_HALTS.forEach((_h, id) => step(`call ${id} dir 1 after`, () => act(w4, 'b', 'rail.call', { id, dir: 1 })));
});

// ---- a footing shouldered and released
const w5 = from('works-lit');
scenario('foot', w5, (step) => {
  const epoch = () => w5.s.accounts.find((x) => x.pid === 'a')!.epoch;
  step('footTake works rack', () => act(w5, 'a', 'rail.footTake', { rack: 0 }));
  step('footRelease', () => railFootRelease(w5.s, 'a', epoch()));
  step('footRelease nothing held', () => railFootRelease(w5.s, 'a', epoch()));
  step('footTake pier rack', () => act(w5, 'a', 'rail.footTake', { rack: 1 }));
});

if (process.env.GOLDEN === '1') writeFileSync(FILE, JSON.stringify(got, null, 1) + '\n');
const golden = JSON.parse(readFileSync(FILE, 'utf8')) as Record<string, Step[]>;
const HOW =
  'The railway rules changed under a scripted op. A refactor step must never regenerate this golden: undo the change. ' +
  'Only a deliberate rule change that bumps WORLD_NS regenerates it (GOLDEN=1).';

test('the ops golden lists the same scenarios', () => {
  assert.deepEqual(Object.keys(golden), Object.keys(got), HOW);
});
for (const name of Object.keys(got))
  test(`op stream ${name}: every result and world hash matches the golden`, () => {
    assert.deepEqual(got[name], golden[name], `${name}: ${HOW}`);
  });
