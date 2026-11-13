// Replay the actual main brain source, not a hand-written approximation.
// node dev/boogler-equivalence.ts [trace.jsonl] records both inputs and main decisions.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { stripTypeScriptTypes } from 'node:module';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { createBooglerBrain, findStart } from '../src/world/boogler-brain.ts';
import type { BooglerLand } from '../src/world/boogler-land.ts';
import { HALF } from '../src/world/grid.ts';
import { clamp, lerp } from '../src/math-pure.ts';
import { angleLerp } from '../src/math.ts';
import { mulberry32 } from '../src/sim/rng.ts';
import { loadBooglerLand } from '../server/src/host/land.ts';

export const MAIN = 'f00736aec97827bc11d06cd9375b9430732ace4b';
type Brain = ReturnType<typeof createBooglerBrain>;
type Snapshot = ReturnType<Brain['snapshot']>;
type Visitor = { x: number; z: number; act: number; wary: boolean };
type MainBrain = {
  step(dt: number, visitors: Visitor[]): void;
  snapshot(): Snapshot;
  animate(dt: number, disp: Snapshot, puff: number): void;
  takeover(pose: { x: number; z: number; yaw: number }): void;
};

function section(source: string, from: string, to: string) {
  const a = source.indexOf(from),
    b = source.indexOf(to, a + from.length);
  assert.ok(a >= 0 && b > a, `main trace boundary changed: ${from} / ${to}`);
  return source.slice(a, b);
}

function original(source: string, land: BooglerLand, rng: () => number): MainBrain {
  const constants = section(source, '// Wandering.', 'const sim =')
    .replaceAll('export ', '')
    .replace(/const rng = .*?;\n/, '');
  const terrain = section(
    source,
    '// ---------------------------------------------------------------- terrain checks',
    '// The players near him',
  );
  const thinking = section(
    source,
    'function fleeFrom',
    '// ---------------------------------------------------------------- network',
  ).replace('  visitors();\n', '');
  const animation = section(source, '  anim.t += dt;', '  const breathe =');
  const make = new Function(
    'land',
    'rng',
    'HALF',
    'clamp',
    'lerp',
    'angleLerp',
    stripTypeScriptTypes(`function create() {
    const { height: groundHeight, blocked: blockedAt, mainland: MAINLAND } = land;
    const island = land, W_R = 0.8, H_R = 0.27, BODY_Y = 0.32;
    ${constants}
    ${section(source, 'const sim =', 'const disp =')}
    let seen = [], seenCount = 0;
    ${terrain}
    ${thinking}
    const start = findStart();
    sim.x = start.x; sim.z = start.z; sim.wait = 0.6;
    const anim = { phase: 0, hop: 0, hopIn: 5, walk: 0, t: 0 };
    const react = { petAt: -1e9 }, reducedMotion = false;
    return {
      step(dt, visitors) { seen = visitors; seenCount = seen.length; think(dt); },
      snapshot() { return { ...sim, trip: trip && { ...trip } }; },
      takeover(pose) { sim.x = pose.x; sim.z = pose.z; sim.yaw = pose.yaw; sim.walking = false; sim.wait = 0.6; },
      animate(dt, disp, amount) { const now = 0, puffAmount = () => amount; ${animation} }
    };
  }`) + '\nreturn create();',
  );
  return make(land, rng, HALF, clamp, lerp, angleLerp) as MainBrain;
}

export function compareBooglerTrace(count = 20000, write?: (row: string) => void) {
  const source = execFileSync('git', ['show', `${MAIN}:src/boogler/boogler.ts`], { encoding: 'utf8' });
  const land = loadBooglerLand();
  const seed = 0x5eed;
  const a = mulberry32(seed),
    b = mulberry32(seed);
  let mainDraws = 0,
    branchDraws = 0;
  const mainRng = () => {
    mainDraws++;
    return a();
  };
  const branchRng = () => {
    branchDraws++;
    return b();
  };
  const main = original(source, land, mainRng);
  // The unchanged client animation shares the brain RNG. Exercise its actual main source too.
  const branchAnimation = original(source, land, branchRng);
  const brain = createBooglerBrain({ land, rng: branchRng, start: findStart(land) });
  brain.takeover({ ...findStart(land), yaw: 0 });
  const hash = createHash('sha256');
  const phases: Record<string, number> = {};
  const modes = new Set<number>();
  let decisions = 0,
    unsafe = 0;
  let previous = main.snapshot();
  for (let tick = 0; tick < count; tick++) {
    const p = main.snapshot();
    const k = tick % 1800;
    const phase =
      k < 600 ? 'wander' : k < 800 ? 'approach' : k < 1000 ? 'wary' : k < 1250 ? 'talk' : k < 1500 ? 'ride' : 'launch';
    const visitors: Visitor[] =
      phase === 'wander'
        ? []
        : [
            {
              x:
                p.x +
                (phase === 'approach' ? 6 : phase === 'wary' ? 4 : phase === 'talk' ? 2 : phase === 'ride' ? 0 : 12),
              z: p.z,
              act: phase === 'talk' ? 1 : phase === 'ride' ? 2 : 0,
              wary: phase === 'wary',
            },
          ];
    const dt = [1 / 60, 1 / 120, 1 / 30, 1 / 60][tick % 4]!;
    main.step(dt, visitors);
    brain.step(dt, visitors);
    const expected = main.snapshot(),
      actual = brain.snapshot();
    assert.deepEqual(actual, expected, `brain diverged at frame ${tick} (${phase})`);
    assert.equal(branchDraws, mainDraws, `random stream diverged at frame ${tick}`);
    if (
      expected.tx !== previous.tx ||
      expected.tz !== previous.tz ||
      expected.walking !== previous.walking ||
      expected.mode !== previous.mode
    )
      decisions++;
    if (land.height(actual.x, actual.z) < 0.45 || land.blocked(actual.x, actual.z, 0.8)) unsafe++;
    const row = JSON.stringify({ tick, dt, phase, visitors, expected, draws: mainDraws });
    hash.update(row + '\n');
    write?.(row + '\n');
    const puff = phase === 'ride' && k >= 1460 ? 1 : 0;
    main.animate(dt, expected, puff);
    branchAnimation.animate(dt, actual, puff);
    assert.equal(branchDraws, mainDraws, `animation random stream diverged at frame ${tick}`);
    phases[phase] = (phases[phase] ?? 0) + 1;
    modes.add(actual.mode);
    previous = expected;
  }
  assert.equal(unsafe, 0, 'a sampled position is wet or blocked');
  return {
    main: MAIN,
    seed,
    frames: count,
    decisions,
    rngDraws: mainDraws,
    maxPositionError: 0,
    maxYawError: 0,
    unsafe,
    modes: [...modes],
    phases,
    sha256: hash.digest('hex'),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = process.argv[2];
  const fd = file ? fs.openSync(file, 'w') : undefined;
  try {
    console.log(
      JSON.stringify(
        compareBooglerTrace(20000, fd === undefined ? undefined : (row) => fs.writeSync(fd, row)),
        null,
        2,
      ),
    );
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}
