// Reproducible Node-only measurements for docs/research/bitecs-store-spike.md. No network or browser.
// Run: node dev/bitecs-spike.ts [--out .look/bitecs-spike/metrics.json]
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { parseSync } from 'oxc-parser';
import { walk } from './scan/parse.ts';
import { buildSeedWorld, SEED_STAGES } from '../src/sim/railway-seeds.ts';
import { createWorld as bitWorld, addEntity, addComponent, removeEntity, query } from 'bitecs';
import { createWorld, defineComponent } from '../src/ecs/index.ts';
import { createRailwayWorld, RAIL_COMPONENTS, Outcome, Pile } from '../src/sim/railway-components.ts';
import { railApply, railTick } from '../src/sim/railway-systems.ts';
import { railSession } from '../src/sim/railway-sys-core.ts';
import { RAILWAY_OUTCOMES } from '../src/sim/railway.ts';
import { mulberry32 } from '../src/sim/rng.ts';

let sink = 0;
function measure(fn: () => void, iterations = 500): number {
  for (let i = 0; i < Math.min(100, iterations); i++) fn();
  const batches: number[] = [];
  for (let batch = 0; batch < 7; batch++) {
    const t = performance.now();
    for (let i = 0; i < iterations; i++) fn();
    batches.push(((performance.now() - t) * 1000) / iterations);
  }
  return +batches.sort((a, b) => a - b)[3]!.toFixed(3);
}
function shuffled(n: number) {
  const out = Array.from({ length: n }, (_, k) => k + 1);
  const rand = mulberry32(411);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
function direct(n: number) {
  const world = bitWorld();
  const c = { stable: [] as number[], n: [] as number[] };
  const sequence = shuffled(n);
  for (const id of sequence) {
    const eid = addEntity(world);
    addComponent(world, eid, c);
    c.stable[eid] = id;
    c.n[eid] = id;
  }
  const consume = (eids: Iterable<number>) => {
    for (const eid of eids) sink += c.n[eid]!;
  };
  const native = measure(() => consume(query(world, [c])));
  const canonical = measure(() => consume(Array.from(query(world, [c])).sort((a, b) => c.stable[a]! - c.stable[b]!)));
  const sortOnly = measure(() => {
    sink += Array.from(query(world, [c])).sort((a, b) => c.stable[a]! - c.stable[b]!)[0]!;
  });
  const restored = bitWorld();
  const restoredC = { stable: [] as number[], n: [] as number[] };
  const snapshot = sequence.map((id) => ({ id, n: id }));
  const restore = () => {
    const w = bitWorld();
    const data = { stable: [] as number[], n: [] as number[] };
    for (const row of [...snapshot].sort((a, b) => a.id - b.id)) {
      const eid = addEntity(w);
      addComponent(w, eid, data);
      data.stable[eid] = row.id;
      data.n[eid] = row.n;
    }
    sink += query(w, [data]).length;
  };
  for (let id = 1; id <= n; id++) {
    const eid = addEntity(restored);
    addComponent(restored, eid, restoredC);
    restoredC.stable[eid] = id;
    restoredC.n[eid] = id;
  }
  const restoredTick = measure(() => {
    for (const eid of query(restored, [restoredC])) sink += restoredC.n[eid]!;
  });
  const before = Array.from(query(restored, [restoredC]), (eid) => restoredC.stable[eid]);
  removeEntity(restored, query(restored, [restoredC])[1]!);
  const after = Array.from(query(restored, [restoredC]), (eid) => restoredC.stable[eid]);
  return {
    n,
    nativeUs: native,
    sortedTickUs: canonical,
    sortOnlyUs: sortOnly,
    restoreUs: measure(restore, 30),
    restoredTickUs: restoredTick,
    before: before.slice(0, 5),
    after: after.slice(0, 5),
  };
}
const Thing = defineComponent('spikeThing', { n: 'int', x: 'int', z: 'int', active: 'bool', owner: 'str', yaw: 'f64' });
function facade(n: number, store: 'inhouse' | 'bitecs') {
  const w = createWorld([Thing], { store });
  for (let i = 0; i < n; i++) w.spawn([Thing, { n: i, x: i, owner: 'owner' }]);
  w.changes(Thing);
  const walkUs = measure(() =>
    w.each([Thing], (_id, r) => {
      sink += r.n;
    }),
  );
  const writeUs = measure(() => {
    w.each(
      [Thing],
      (_id, r) => {
        r.n++;
      },
      [Thing],
    );
    w.changes(Thing);
  });
  const cloneUs = measure(() => {
    sink += w.clone().count(Thing);
  }, 50);
  const rebuild8Us = measure(() => {
    const c = w.clone();
    for (let i = 1; i <= 8; i++) c.mut(Thing, i)!.n++;
    sink += c.get(Thing, 1)!.n;
  }, 50);
  const snapshotUs = measure(() => {
    sink += w.snapshot().next;
  }, 50);
  const snap = w.snapshot();
  const loadUs = measure(() => {
    const c = createWorld([Thing], { store });
    c.load(snap);
    sink += c.count(Thing);
  }, 30);
  return { n, store, walkUs, writeUs, cloneUs, rebuild8Us, snapshotUs, loadUs };
}
function railway(n: number, store: 'inhouse' | 'bitecs') {
  const w = createWorld(RAIL_COMPONENTS, { store });
  w.load(createRailwayWorld().snapshot());
  railSession(w, 'spike', 1);
  railApply(w, 'spike', { op: 'rail.wake', epoch: 1, request: 1 }, 0);
  const ids = new Set(w.components.flatMap((c) => [...w.ids(c)]));
  for (let i = ids.size; i < n; i++) w.spawn([Pile, { x: i, n: 1 }]);
  for (const c of w.components) if (c.track) w.changes(c);
  let tick = 0;
  const tickUs = measure(() => {
    railTick(w, ++tick);
    for (const c of w.components) if (c.track) w.changes(c);
  }, 200);
  const cloneUs = measure(() => {
    sink += w.clone().nextId();
  }, 50);
  return { n, store, tickUs, cloneUs, entities: new Set(w.components.flatMap((c) => [...w.ids(c)])).size };
}
function history(queryOrder: 'canonical' | 'native') {
  const w = createWorld(RAIL_COMPONENTS, { store: 'bitecs', queryOrder });
  w.load(createRailwayWorld().snapshot());
  railSession(w, 'spike', 1);
  for (let request = 1; request <= RAILWAY_OUTCOMES + 5; request++)
    railApply(w, 'spike', { op: 'rail.reject', epoch: 1, request }, 1);
  return {
    queryOrder,
    retainedRequests: [...w.ids(Outcome)].map((id) => w.get(Outcome, id)!.request).sort((a, b) => a - b),
  };
}
function inventory() {
  const files = execFileSync('git', ['ls-files', '*.ts'], { encoding: 'utf8' }).trim().split('\n');
  const imports = files
    .filter((file) => file !== 'dev/bitecs-spike.ts')
    .filter((file) => /from ['"][^'"]*ecs\/index\.ts['"]/.test(fs.readFileSync(file, 'utf8')));
  const calls: Record<string, number> = {};
  const sites: { file: string; method: string; start: number }[] = [];
  const apiCalls: Record<string, number> = {};
  for (const file of imports.filter((f) => f.startsWith('src/'))) {
    const text = fs.readFileSync(file, 'utf8');
    walk(parseSync(file, text, { lang: 'ts' }).program, (node) => {
      if (node.type !== 'CallExpression') return;
      const callee = node.callee;
      if (
        callee.type === 'Identifier' &&
        ['createWorld', 'defineComponent', 'defineSystem', 'createSchedule'].includes(callee.name)
      )
        apiCalls[callee.name] = (apiCalls[callee.name] ?? 0) + 1;
      if (
        callee.type !== 'MemberExpression' ||
        callee.computed ||
        callee.object.type !== 'Identifier' ||
        callee.property.type !== 'Identifier'
      )
        return;
      const receiver = callee.object.name;
      // Reviewed World receiver names in these 44 files; exclude Map/Set, tune.get and TICK.run.
      if (
        !['w', 'world'].includes(receiver) &&
        !(receiver === 'next' && file === 'src/world/railway-server.ts') &&
        !(receiver === 'out' && file === 'src/sim/railway-drive.ts')
      )
        return;
      const method = callee.property.name;
      calls[method] = (calls[method] ?? 0) + 1;
      sites.push({ file, method, start: node.start });
    });
  }
  const fields: Record<string, number> = {};
  const strings: string[] = [];
  for (const c of RAIL_COMPONENTS)
    for (const name of c.names) {
      const type = c.fields[name]!;
      fields[type] = (fields[type] ?? 0) + 1;
      if (type === 'str') strings.push(`${c.kind}.${name}`);
    }
  return {
    imports,
    sourceImports: imports.filter((f) => f.startsWith('src/')),
    calls,
    apiCalls,
    sites,
    components: RAIL_COMPONENTS.length,
    fields,
    strings,
  };
}
// Run each mode in its own process so seed caches cannot carry worlds between backends.
if (process.argv.includes('--stages')) {
  const stages: Record<string, unknown> = {};
  const hashes = (w: ReturnType<typeof createWorld>) =>
    Object.fromEntries(
      Object.entries(w.snapshot().c).map(([kind, cols]) => [
        kind,
        createHash('sha256').update(JSON.stringify(cols)).digest('hex'),
      ]),
    );
  for (const stage of SEED_STAGES) {
    const seed = buildSeedWorld(stage);
    const before = hashes(seed.w);
    const w = createWorld(RAIL_COMPONENTS);
    w.load(seed.w.snapshot());
    for (let t = 1; t <= 1200; t++) railTick(w, seed.t + t);
    stages[stage] = { before, after: hashes(w) };
  }
  console.log(JSON.stringify(stages, null, 2));
  process.exit(0);
}
if (process.argv.includes('--inventory')) {
  console.log(JSON.stringify(inventory(), null, 2));
  process.exit(0);
}
const loadStart = os.loadavg();
const result = {
  node: process.version,
  cpu: os.cpus()[0]?.model,
  platform: process.platform,
  loadStart,
  direct: [300, 3000].map(direct),
  facade: [300, 3000].flatMap((n) => (['inhouse', 'bitecs'] as const).map((s) => facade(n, s))),
  railway: [300, 3000].flatMap((n) => (['inhouse', 'bitecs'] as const).map((s) => railway(n, s))),
  history: [history('canonical'), history('native')],
  inventory: inventory(),
  loadEnd: os.loadavg(),
  sink,
};
const output = process.argv[process.argv.indexOf('--out') + 1];
if (process.argv.includes('--out') && output) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
}
console.log(JSON.stringify(result, null, 2));
