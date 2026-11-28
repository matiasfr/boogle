import { gunzipSync } from 'node:zlib';

export const namespace = 'src/world/namespace.ts';
const declaration = /^export const WORLD_NS = 'v(\d+)';$/m;
export function version(source: string) {
  const match = declaration.exec(source);
  if (!match) throw new Error('unrecognized WORLD_NS declaration');
  return Number(match[1]);
}

/** Only the appended version note and declaration belong to the allocator. */
export function allocate(base: string, main: string, branch: string) {
  if (branch === base) return main;
  const old = version(base);
  if (version(branch) !== old + 1 || version(main) < old) throw new Error('unexpected WORLD_NS increment');
  const [prefix, suffix] = base.split(declaration.exec(base)![0]);
  const notes = branch.slice(prefix!.length, branch.indexOf(declaration.exec(branch)![0]));
  if (
    !notes.split('\n').every((line) => !line || line.startsWith('//')) ||
    branch !== prefix + notes + declaration.exec(branch)![0] + suffix
  )
    throw new Error('namespace edit outside the version and appended history');
  const next = version(main) + 1;
  return main.replace(
    declaration,
    () =>
      notes.replace(new RegExp('^// v' + (old + 1) + '\\b', 'gm'), '// v' + next) +
      "export const WORLD_NS = 'v" +
      next +
      "';",
  );
}

export const host = 'server/test/fixtures/world-host-trace.jsonl.gz';
export const pins = new Map<string, [string, string]>([
  ['test/fixtures/railway-golden.json', ['GOLDEN', 'test/railway-golden-*.test.ts']],
  ['test/fixtures/rail-schema.json', ['GOLDEN', 'test/railway-schema.test.ts']],
  ['test/fixtures/railway-ops-golden.json', ['GOLDEN', 'test/railway-ops.test.ts']],
  ['test/fixtures/railway-m12-trace.json', ['M12_RECORD', 'test/railway-m12.test.ts']],
  ['test/fixtures/railway-tick-order-heads.json', ['TICK_ORDER_HEADS', 'test/railway-tick-order.test.ts']],
  [host, ['HOST_TRACE_RECORD', 'server/test/world-host-trace.test.ts']],
]);

export function ruleConflicts(files: string[]) {
  return files.length > 0 && files.every((f) => f === namespace || pins.has(f));
}

const hashSlots: Record<string, RegExp> = {
  'railway-golden.json': /^\/stages\/[^/]+\/(stage|after)$/,
  'railway-ops-golden.json': /^\/[^/]+\/\d+\/2$/,
  'railway-m12-trace.json': /^\/.+\/(h|marks\/\d+)$/,
  'railway-tick-order-heads.json': /^\/stages\/[^/]+\/hashes\/\d+$/,
  'world-host-trace.jsonl.gz': /^\/1\/data\/hash$/,
};

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
const obj = (v: Json | undefined): v is Record<string, Json> => v !== null && typeof v === 'object';
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Compare ordered keys separately, so even JSON object iteration order remains part of the oracle. */
export function checkPin(
  name: string,
  base: Json | undefined,
  main: Json | undefined,
  branch: Json | undefined,
  got: Json | undefined,
  path = '',
): void {
  if (same(base, main) ? same(got, branch) : (same(base, branch) || same(main, branch)) && same(got, main)) return;
  if (
    obj(base) &&
    obj(main) &&
    obj(branch) &&
    obj(got) &&
    [main, branch, got].every((v) => Array.isArray(v) === Array.isArray(base))
  ) {
    const keys = Object.keys(got);
    const before = Object.keys(base),
      incoming = Object.keys(main),
      reviewed = Object.keys(branch);
    if (
      same(keys, same(before, incoming) ? reviewed : incoming) &&
      (same(before, incoming) || same(before, reviewed) || same(incoming, reviewed))
    ) {
      for (const key of keys) checkPin(name, base[key], main[key], branch[key], got[key], path + '/' + key);
      // A deletion opposite a modification must also refuse.
      for (const key of Object.keys(base))
        if (!Object.hasOwn(got, key)) checkPin(name, base[key], main[key], branch[key], undefined, path + '/' + key);
      return;
    }
  } else {
    if (
      hashSlots[name]?.test(path) &&
      [base, main, branch, got].every((v) => typeof v === 'number' && v >>> 0 === v) &&
      base !== main &&
      base !== branch &&
      main !== branch
    )
      return;
  }
  let detail = '';
  if (name === 'railway-golden.json' && /^\/stages\/[^/]+(?:\/(tick|stage|after))?$/.test(path)) {
    const show = (v: Json | undefined) => JSON.stringify(v) ?? '<absent>';
    detail = ` (base ${show(base)}, target ${show(main)}, branch ${show(branch)}, recorded ${show(got)})`;
  }
  throw new Error(name + ' has an unexplained change at ' + (path || '/') + detail);
}

export function verifyPin(file: string, buffers: Buffer[], versions: number[]) {
  const name = file.split('/').pop()!;
  if (file === host) {
    const traces = buffers.map((b) => gunzipSync(b).toString().trimEnd().split('\n'));
    if (!traces.every((t) => t.length === traces[0]!.length)) throw new Error('host trace record count changed');
    const bytes = traces.map(() => 0);
    for (let i = 0; i < traces[0]!.length; i++) {
      const records = traces.map((t, side) => {
        const [kind, value] = JSON.parse(t[i]!);
        if (kind === 'checkpoint') {
          if (value.data.namespace !== 'rail-v' + versions[side]) throw new Error('unexpected checkpoint namespace');
          bytes[side] = Buffer.byteLength(JSON.stringify(value.data));
          const { checksum, ...body } = value.data;
          let hash = 2166136261;
          const text = JSON.stringify(body);
          for (let j = 0; j < text.length; j++) hash = Math.imul(hash ^ text.charCodeAt(j), 16777619) >>> 0;
          if (checksum !== hash) throw new Error('invalid checkpoint checksum at record ' + i);
          value.data.namespace = '';
          value.data.checksum = 0;
        }
        if (kind === 'status') {
          // A join samples the synchronous host before the queued checkpoint write reaches storage.
          if (value.status.snapBytes !== bytes[side]) {
            const next =
              value.label.startsWith('join ') && t.slice(i + 1, i + 10).find((l) => l.startsWith('["checkpoint",'));
            if (!next || value.status.snapBytes !== Buffer.byteLength(JSON.stringify(JSON.parse(next)[1].data)))
              throw new Error('unexplained snapshot byte count at record ' + i);
          }
          value.status.snapBytes = 0;
        }
        return [kind, value];
      });
      checkPin(name, records[0], records[1], records[2], records[3]);
    }
  } else {
    const rows = buffers.map((b) => JSON.parse(b.toString()));
    if (['railway-golden.json', 'rail-schema.json'].includes(name)) {
      if (rows[3].worldNs !== 'v' + versions[3]) throw new Error(name + ': wrong recorded namespace');
      for (const row of rows) row.worldNs = '';
    }
    checkPin(name, rows[0], rows[1], rows[2], rows[3]);
  }
}
