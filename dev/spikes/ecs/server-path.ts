// The railway's server path before and after the move onto E (docs/plans/ecs-e.md, step 3), in one process: the same
// action stream through each tree's own railway install (rules, validation, replication commit and flush to two
// mirrors), timed per action and per rule tick. MAIN=<a checkout of the pre-move tree> node dev/spikes/ecs/server-path.ts
const MAIN = process.env.MAIN;
if (!MAIN) throw new Error('MAIN=<pre-move checkout>');
const HERE = new URL('../../../', import.meta.url).pathname;

type Tree = {
  createSync: () => any; // oxlint-disable-line typescript/no-explicit-any
  installRules: (...a: unknown[]) => any; // oxlint-disable-line typescript/no-explicit-any
  install: (...a: unknown[]) => any; // oxlint-disable-line typescript/no-explicit-any
  createReplicator: () => any; // oxlint-disable-line typescript/no-explicit-any
  createRailwayMirror: () => any; // oxlint-disable-line typescript/no-explicit-any
  homeLand: () => unknown;
  RAILWAY_SOURCES: readonly (readonly number[])[];
  mulberry32: (seed: number) => () => number;
};
async function load(root: string): Promise<Tree> {
  const m = (p: string) => import(`${root}${p}`);
  return {
    ...(await m('src/world/sync.ts')),
    ...(await m('src/world/rules/index.ts')),
    ...(await m('src/world/railway-server.ts')),
    ...(await m('src/world/replicate-server.ts')),
    ...(await m('src/world/railway-replicate.ts')),
    ...(await m('test/helpers/land.ts')),
    ...(await m('src/sim/railway-layout.ts')),
    ...(await m('src/sim/rng.ts')),
  };
}
const anywhere = { reach: () => true, height: () => true, cadence: () => true };

function run(t: Tree, actions: number) {
  const sync = t.createSync();
  sync.setSelfId('server');
  const rules = t.installRules(sync, t.homeLand());
  const rep = t.createReplicator();
  const api = t.install(sync, rules, rep);
  api.touchAll();
  const mirrors = ['a', 'b'].map((cid) => {
    rep.addClient(cid);
    return t.createRailwayMirror();
  });
  const pids = ['alice', 'bob', 'cleo', 'dan'];
  const req = new Map(pids.map((p) => [p, 0]));
  for (const pid of pids) api.session(pid, 1);
  let step = 0;
  const flush = () => {
    sync.stepWorld(1000 / 60 + 1);
    step = sync.roomStep();
    rep.commit(step);
    rep.flush(step, (cid: string, _p: unknown, json: string) =>
      mirrors[cid === 'a' ? 0 : 1]!.mirror.apply(JSON.parse(json), 0),
    );
  };
  const act = (pid: string, e: Record<string, unknown>) => {
    const n = req.get(pid)! + 1;
    req.set(pid, n);
    return api.act(pid, { ...e, epoch: 1, request: n }, anywhere);
  };
  act('alice', { op: 'rail.wake' });
  for (let k = 0; k < 40; k++) flush();
  const r = t.mulberry32(9);
  let actMs = 0,
    stepMs = 0;
  for (let k = 0; k < actions; k++) {
    const pid = pids[k % pids.length]!;
    const s = api.railway;
    const roll = r();
    const e =
      roll < 0.45
        ? { op: 'rail.chop', id: t.RAILWAY_SOURCES[Math.floor(r() * 60)]![0], yaw: 0.5, collapsed: false }
        : roll < 0.7
          ? { op: 'rail.drop', x: 99000 + Math.floor(r() * 4) * 100, y: 3000, z: -14000, n: 1 + Math.floor(r() * 4) }
          : roll < 0.9
            ? { op: 'rail.take', id: s.piles[Math.floor(r() * s.piles.length)]?.id ?? 1, kind: 0 }
            : { op: 'rail.deposit', station: 'T1', n: 4, kind: 0 };
    let t0 = performance.now();
    act(pid, e);
    actMs += performance.now() - t0;
    t0 = performance.now();
    flush();
    stepMs += performance.now() - t0;
  }
  return { actUs: (actMs / actions) * 1000, stepUs: (stepMs / actions) * 1000 };
}

const trees = { before: await load(MAIN.endsWith('/') ? MAIN : `${MAIN}/`), E: await load(HERE) };
for (let round = 0; round < 3; round++)
  for (const [name, t] of Object.entries(trees)) {
    const { actUs, stepUs } = run(t, 4000);
    console.log(
      `${name.padEnd(6)} act ${actUs.toFixed(1)} µs   step (tick when due, commit, flush) ${stepUs.toFixed(1)} µs`,
    );
  }
