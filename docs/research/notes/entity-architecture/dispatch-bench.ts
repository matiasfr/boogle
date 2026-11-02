// What does one entity update call cost? Numbers in ../../entity-architecture.md, "Cost in a browser". Not part of the
// game: run by hand, in a fresh process per variant so JIT feedback can't leak between them.
//
//   node --expose-gc --min-semi-space-size=64 --max-semi-space-size=64 dispatch-bench.ts <variant> <entities> <kinds>
//
// The fixed young generation keeps a scavenge out of the byte count (`allocCalibration` reads 4004 bytes a frame for
// 100 five-word objects; without the flags it reads 872). For jsc or a browser page, strip the types first with
// node:module's stripTypeScriptTypes, then `jsc stripped.js -- <variant> <entities> <kinds>`, or set
// globalThis.arguments and evaluate it.
//
// Prints one JSON line: warm us/frame (median of 15 batches of 1000 frames), the first 60 frames' total, and bytes per
// frame on V8. Each kind gets its own class from its own source text, so its update is a different function and its
// instances a different shape, as separately written kinds would be.
const g = globalThis as unknown as Record<string, never>;
const args: string[] = g.process ? (g.process as { argv: string[] }).argv.slice(2) : (g.arguments as string[]);
const log: (s: string) => void = g.document ? console.log : (g.print ?? console.log); // a page's print() is the dialog
const clock: () => number = g.performance ? () => performance.now() : () => (g.preciseTime as () => number)() * 1000;
const [variant = 'sharedWalker', nArg = '300', kArg = '30'] = args;
const N = Number(nArg);
const K = Number(kArg);

type Ent = Record<string, unknown>;
const work = `m.x = b.x + b.vx * dt * C; m.y = b.y + b.vy * dt * C; m.z = b.z + b.vz * dt * C; `;
const newBody = (i: number) => ({ x: i * 0.5, y: 1.5, z: 2.5, vx: 0.25, vy: 0.75, vz: 1.25 });
const newMesh = () => ({ x: 0.5, y: 0.5, z: 0.5 });
const make = new Function('src', 'return new Function(src)()') as (src: string) => unknown;

function classOf(k: number, sig: string, pre: string): new (i: number) => Ent {
  return make(
    `return class Kind${k} {
       constructor(i, b, m) { this.id = 'k${k}-' + i; this.kind = 'k${k}'; this.body = b; this.mesh = m; this.t = 0.5; this.extra${k} = i; }
       update(${sig}) { ${pre} const C = ${1 + k * 0.001}; const b = this.body, m = this.mesh; ${work} this.t = now; }
     }`,
  ) as new (i: number) => Ent;
}
const walker = (body: string) => make(`return function walk(list, dt, now, ctx) { ${body} }`) as Walk;
type Walk = (list: unknown, dt: number, now: number, ctx: { dt: number; now: number }) => void;

function buildClasses(sig = 'dt, now', pre = ''): Ent[][] {
  const kinds: Ent[][] = [];
  for (let k = 0; k < K; k++) {
    const C = classOf(k, sig, pre) as unknown as new (i: number, b: unknown, m: unknown) => Ent;
    const list: Ent[] = [];
    for (let i = 0; i < Math.ceil(N / K); i++) list.push(new C(i, newBody(i), newMesh()));
    kinds.push(list);
  }
  return kinds;
}
function buildClosures(): Ent[][] {
  const kinds: Ent[][] = [];
  for (let k = 0; k < K; k++) {
    const factory = make(
      `return function make(i, b, m) { const C = ${1 + k * 0.001}; const e = { id: 'k${k}-' + i, kind: 'k${k}', t: 0.5, extra${k}: i,
         update: (dt, now) => { ${work} e.t = now; } }; return e; }`,
    ) as (i: number, b: unknown, m: unknown) => Ent;
    const list: Ent[] = [];
    for (let i = 0; i < Math.ceil(N / K); i++) list.push(factory(i, newBody(i), newMesh()));
    kinds.push(list);
  }
  return kinds;
}

let sum = 0;
const ctx = { dt: 0.0166, now: 1000.5, elapsed: 0.5 };
const CALL = 'list[i].update(dt, now)';
const LOOP = `for (let i = 0, n = list.length; i < n; i++) ${CALL};`;

// Each returns one frame of work.
const variants: Record<string, () => () => void> = {
  // The floor: the same work written out in one loop, no call per entity.
  inline() {
    const all = buildClasses().flat();
    const f = make(`return function (all, dt, now) { const C = 1.001; for (let i = 0; i < all.length; i++) {
      const e = all[i], b = e.body, m = e.mesh; ${work} e.t = now; } }`) as (a: Ent[], dt: number, now: number) => void;
    return () => f(all, ctx.dt, ctx.now);
  },
  // A walker per kind, each its own function literal: every call site sees one class.
  perKindWalker() {
    const kinds = buildClasses();
    const walks = kinds.map(() => walker(LOOP));
    return () => {
      for (let k = 0; k < kinds.length; k++) walks[k]!(kinds[k], ctx.dt, ctx.now, ctx);
    };
  },
  // One helper in entity.ts walks every kind: one call site sees K classes. The plan's natural implementation.
  sharedWalker() {
    const kinds = buildClasses();
    const walk = walker(LOOP);
    return () => {
      for (let k = 0; k < kinds.length; k++) walk(kinds[k], ctx.dt, ctx.now, ctx);
    };
  },
  // The same, passing the one frame context object instead of two doubles.
  sharedWalkerCtx() {
    const kinds = buildClasses('ctx', 'const dt = ctx.dt, now = ctx.now;');
    const walk = walker('for (let i = 0, n = list.length; i < n; i++) list[i].update(ctx);');
    return () => {
      for (let k = 0; k < kinds.length; k++) walk(kinds[k], ctx.dt, ctx.now, ctx);
    };
  },
  // Hooks as rows on the kind: `run(entity, ctx)`, a plain function per kind, entities are data. One shared walker.
  kindRow() {
    const kinds = buildClasses();
    const rows = kinds.map((list, k) => ({
      list,
      run: make(`return function run(e, ctx) { const dt = ctx.dt, now = ctx.now; const C = ${1 + k * 0.001};
         const b = e.body, m = e.mesh; ${work} e.t = now; }`) as (e: Ent, c: typeof ctx) => void,
    }));
    const walk = make(`return function walk(row, ctx) { const list = row.list, run = row.run;
      for (let i = 0, n = list.length; i < n; i++) run(list[i], ctx); }`) as (r: unknown, c: typeof ctx) => void;
    return () => {
      for (let k = 0; k < rows.length; k++) walk(rows[k], ctx);
    };
  },
  // The same, skipping entities marked dead, inside a try/catch per row: the shape a hardened walker would have.
  kindRowGuarded() {
    const kinds = buildClasses();
    const rows = kinds.map((list, k) => ({
      list,
      run: make(`return function run(e, ctx) { const dt = ctx.dt, now = ctx.now; const C = ${1 + k * 0.001};
         const b = e.body, m = e.mesh; ${work} e.t = now; }`) as (e: Ent, c: typeof ctx) => void,
    }));
    const walk = make(`return function walk(row, ctx) { const list = row.list, run = row.run;
      try { for (let i = 0, n = list.length; i < n; i++) { const e = list[i]; if (e.dead !== true) run(e, ctx); } }
      catch (err) { row.off = true; reportError(err); } }`) as (r: unknown, c: typeof ctx) => void;
    return () => {
      for (let k = 0; k < rows.length; k++) walk(rows[k], ctx);
    };
  },
  // The plan's `update?`: the walker doesn't know whether this entity has the hook.
  optionalCall() {
    const kinds = buildClasses();
    const walk = walker('for (let i = 0, n = list.length; i < n; i++) list[i].update?.(dt, now);');
    return () => {
      for (let k = 0; k < kinds.length; k++) walk(kinds[k], ctx.dt, ctx.now, ctx);
    };
  },
  // Object literals holding a closure each, instead of class methods.
  closures() {
    const kinds = buildClosures();
    const walk = walker(LOOP);
    return () => {
      for (let k = 0; k < kinds.length; k++) walk(kinds[k], ctx.dt, ctx.now, ctx);
    };
  },
  forOf() {
    const kinds = buildClasses();
    const walk = walker('for (const e of list) e.update(dt, now);');
    return () => {
      for (let k = 0; k < kinds.length; k++) walk(kinds[k], ctx.dt, ctx.now, ctx);
    };
  },
  forEach() {
    const kinds = buildClasses();
    const walk = walker('list.forEach((e) => e.update(dt, now));');
    return () => {
      for (let k = 0; k < kinds.length; k++) walk(kinds[k], ctx.dt, ctx.now, ctx);
    };
  },
  setIter() {
    const kinds = buildClasses().map((l) => new Set(l));
    const walk = walker('for (const e of list) e.update(dt, now);');
    return () => {
      for (let k = 0; k < kinds.length; k++) walk(kinds[k], ctx.dt, ctx.now, ctx);
    };
  },
  // A per-frame copy, as a naive "skip the dead ones" would do.
  filterCopy() {
    const kinds = buildClasses();
    const walk = walker('const live = list.filter((e) => !e.dead); for (let i = 0; i < live.length; i++) live[i].update(dt, now);');
    return () => {
      for (let k = 0; k < kinds.length; k++) walk(kinds[k], ctx.dt, ctx.now, ctx);
    };
  },
  // The plan as a whole: one profiled hook per kind (two clock reads, as src/loop.ts's mark does), a shared walker.
  kindHookProfiled() {
    const kinds = buildClasses();
    const walk = walker(LOOP);
    const hooks = kinds.map((list) => ({ fn: (c: typeof ctx) => walk(list, c.dt, c.now, c), order: 0, name: 'k' }));
    let cursor = 0;
    return () => {
      for (let k = 0; k < hooks.length; k++) {
        hooks[k]!.fn(ctx);
        const t = clock();
        sum += t - cursor;
        cursor = t;
      }
    };
  },
  // What the plan avoids: every entity its own profiled hook on the frame list.
  entityHookProfiled() {
    const hooks: { fn: (c: typeof ctx) => void; order: number; name: string }[] = [];
    for (const list of buildClasses()) {
      for (const e of list) {
        const u = e as unknown as { update(dt: number, now: number): void };
        hooks.push({ fn: ({ dt, now }) => u.update(dt, now), order: 0, name: 'e' });
      }
    }
    let cursor = 0;
    return () => {
      for (let k = 0; k < hooks.length; k++) {
        hooks[k]!.fn(ctx);
        const t = clock();
        sum += t - cursor;
        cursor = t;
      }
    };
  },
  // Calibration: 100 two-field objects a frame are 100 x 40 bytes on 64-bit Node.
  allocCalibration() {
    const keep: unknown[] = new Array(100).fill(null);
    return () => {
      for (let i = 0; i < 100; i++) keep[i] = { a: i, b: i + 1 };
    };
  },
  // The cost of one clock read, N of them a frame.
  clockOnly() {
    return () => {
      for (let i = 0; i < N; i++) sum += clock();
    };
  },
};

const frame = variants[variant]!();
const tick = () => {
  ctx.now += 16.67;
  ctx.dt = 0.0166 + (ctx.now % 7) * 1e-4;
  frame();
};

const t0 = clock();
for (let i = 0; i < 60; i++) tick();
const coldUs = (clock() - t0) * 1000;
for (let i = 0; i < 3000; i++) tick();

const batches: number[] = [];
for (let b = 0; b < 15; b++) {
  const s = clock();
  for (let i = 0; i < 1000; i++) tick();
  batches.push(((clock() - s) * 1000) / 1000);
}
batches.sort((x, y) => x - y);

let bytes: number | null = null;
const proc = g.process as unknown as { memoryUsage?: () => { heapUsed: number } } | undefined;
const gc = g.gc as unknown as (() => void) | undefined;
if (proc?.memoryUsage && gc) {
  gc();
  const before = proc.memoryUsage().heapUsed;
  for (let i = 0; i < 1000; i++) tick();
  bytes = (proc.memoryUsage().heapUsed - before) / 1000;
}

log(
  JSON.stringify({
    variant,
    N,
    K,
    usPerFrame: +batches[7]!.toFixed(2),
    p10: +batches[1]!.toFixed(2),
    p90: +batches[13]!.toFixed(2),
    nsPerEntity: +((batches[7]! * 1000) / (Math.ceil(N / K) * K)).toFixed(1),
    cold60Us: Math.round(coldUs),
    bytesPerFrame: bytes === null ? null : Math.round(bytes),
    guard: Math.round((sum + ctx.now) % 1000),
  }),
);
