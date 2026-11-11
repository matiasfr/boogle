// node dev/migrate/railway-imports.ts [--check]: point every import of the railway's re-export files at the file that
// defines each name (docs/plans/ecs-migration-railway.md, M3b). `src/sim/railway-world.ts` is gone; `railway-systems.ts`
// keeps only what it defines (`OPS`, `railApply`, `railOutcome`, `railTick`, `RAIL_*`). A branch that started before
// M3b reruns this after its rebase.
//
// It rewrites, under src, server, test, dev and protos: named imports and re-exports (`import { a, type B } from`,
// `import type {…} from`, `export {…} from`), split one statement per defining file with each `type` modifier kept;
// `import * as N from` (each `N.x` moves to a namespace import of x's file, named N plus that file's short name, unless
// x is still defined where N points); `typeof import('…').x`; and `{ a, b } = await import('…')` when every name comes
// from one file. Paths keep their style (relative, or '/src/…'). It is idempotent. Prettier formats what it changed.
// --check writes nothing, lists every import still left on a removed name or file, and exits 1 if there is one.
import fs from 'node:fs';
import path from 'node:path';
import * as prettier from 'prettier';

const ROOT = path.resolve(import.meta.dirname, '../..');
const DIRS = ['src', 'server', 'test', 'dev', 'protos'];
const SIM = 'src/sim/';
const components = [
  'Account',
  'Beam',
  'Boiler',
  'Cart',
  'createRailwayWorld',
  'DEPOT_OUT',
  'Forge',
  'ForgeClock',
  'Hardwood',
  'Job',
  'JobRun',
  'Line',
  'Outcome',
  'Pile',
  'QJob',
  'QJobRun',
  'Rail',
  'RAIL_COMPONENTS',
  'RAIL_REPLICATED',
  'RAIL_STATUS',
  'RailClock',
  'Rock',
  'Shed',
  'Train',
  'Tree',
  'Works',
  'WorksClock',
];
const at = (file: string, names: string[]) => Object.fromEntries(names.map((n) => [n, SIM + file]));
/** For each re-export file, the file that defines each name it served (itself for what it still defines). */
const TABLE: Record<string, Record<string, string>> = {
  [SIM + 'railway-world.ts']: {
    ...at('railway-components.ts', components),
    ...at('railway-read-model.ts', ['copyRailway', 'fillRailway', 'railwayView', 'refreshRailway']),
    ...at('railway-check.ts', ['railwayCheck', 'railwayInvariant', 'validateRailway']),
  },
  [SIM + 'railway-systems.ts']: {
    ...at('railway-systems.ts', ['railApply', 'railOutcome', 'railTick', 'RAIL_TICK', 'RAIL_ENTRIES']),
    ...at('railway-systems.ts', ['RAIL_OPS', 'RAIL_SYSTEMS']),
    ...at('railway-queries.ts', ['railLine2Active']),
    ...at('railway-sys-core.ts', ['railSession', 'railSettle']),
    ...at('railway-sys-line1.ts', ['railBeamPutDown', 'railBeamRelease', 'railBeamStood']),
    ...at('railway-sys-line2.ts', ['railBoilerPutDown', 'railBoilerStood']),
    ...at('railway-sys-works.ts', ['railFootHolders', 'railFootRelease']),
    ...at('railway-sys-away.ts', ['railResume', 'railSupplyPulse']),
  },
};
const check = process.argv.includes('--check');
const left: string[] = [];

function files(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== 'node_modules' && e.name !== 'dist' && !e.name.startsWith('.')) out.push(...files(rel));
    } else if (/\.(ts|mts|tsx)$/.test(e.name)) out.push(rel);
  }
  return out;
}
/** The repo path a specifier names, or null when it is not a file of ours. */
function resolve(file: string, spec: string): string | null {
  if (spec.startsWith('/src/')) return spec.slice(1);
  if (!spec.startsWith('.')) return null;
  return path.relative(ROOT, path.resolve(ROOT, path.dirname(file), spec));
}
/** A specifier for `target` from `file`, in the style of `like`. */
function spec(file: string, target: string, like: string): string {
  if (like.startsWith('/src/')) return '/' + target;
  const rel = path.relative(path.dirname(path.join(ROOT, file)), path.join(ROOT, target));
  return rel.startsWith('.') ? rel : './' + rel;
}
const short = (target: string) =>
  path
    .basename(target, '.ts')
    .replace(/^railway-(sys-)?/, '')
    .replace(/(^|-)(\w)/g, (_m, _d: string, c: string) => c.toUpperCase());

function migrate(file: string, text: string): string {
  const where = (line: number) => `${file}:${line}`;
  const lineOf = (i: number) => text.slice(0, i).split('\n').length;
  // Named imports and re-exports.
  text = text.replace(
    /(^|\n)([ \t]*)(import|export)(\s+type)?\s*\{([^}]*)\}\s*from\s*'([^']+)';/g,
    (all, nl: string, indent: string, kw: string, type: string | undefined, body: string, s: string, i: number) => {
      const table = TABLE[resolve(file, s) ?? ''];
      if (!table) return all;
      const groups = new Map<string, string[]>();
      for (const raw of body.split(',')) {
        const item = raw.trim();
        if (!item) continue;
        const name = /^(?:type\s+)?(\w+)/.exec(item)![1]!;
        const target = table[name];
        if (!target) {
          left.push(`${where(lineOf(i))}: ${name} is not in the table for ${s}`);
          return all;
        }
        groups.set(target, [...(groups.get(target) ?? []), item]);
      }
      const lines = [...groups].map(
        ([target, items]) => `${indent}${kw}${type ?? ''} { ${items.join(', ')} } from '${spec(file, target, s)}';`,
      );
      return nl + lines.join('\n');
    },
  );
  // Namespace imports: each member to its own file's namespace (planned first, then applied).
  for (const [line, indent, ns, s] of [...text.matchAll(/^([ \t]*)import \* as (\w+) from '([^']+)';$/gm)]) {
    const from = resolve(file, s!) ?? '';
    const table = TABLE[from];
    if (!table) continue;
    const members = [...new Set([...text.matchAll(new RegExp(`\\b${ns}\\.(\\w+)\\b`, 'g'))].map((m) => m[1]!))];
    const missing = members.filter((m) => !table[m]);
    if (missing.length) {
      left.push(`${file}: ${missing.map((m) => `${ns}.${m}`).join(', ')} not in the table for ${s}`);
      continue;
    }
    const targets = new Map(members.map((m) => [table[m]!, table[m] === from ? ns! : ns + short(table[m]!)]));
    for (const m of members)
      text = text.replace(new RegExp(`\\b${ns}\\.${m}\\b`, 'g'), `${targets.get(table[m]!)!}.${m}`);
    const lines = [...targets].map(([t, n]) => `${indent}import * as ${n} from '${spec(file, t, s!)}';`);
    text = text.replace(line!, lines.join('\n'));
  }
  // `typeof import('…').x`
  text = text.replace(/typeof import\('([^']+)'\)\.(\w+)/g, (all, s: string, name: string) => {
    const target = TABLE[resolve(file, s) ?? '']?.[name];
    return target ? `typeof import('${spec(file, target, s)}').${name}` : all;
  });
  // `{ a, b } = await import('…')` from one file.
  text = text.replace(/\{([^}]*)\}\s*=\s*await import\('([^']+)'\)/g, (all, body: string, s: string) => {
    const table = TABLE[resolve(file, s) ?? ''];
    if (!table) return all;
    const names = body
      .split(',')
      .map((n) => n.trim().split(':')[0]!.trim())
      .filter(Boolean);
    const targets = new Set(names.map((n) => table[n]));
    if (targets.size !== 1 || targets.has(undefined)) return all;
    return all.replace(`'${s}'`, `'${spec(file, [...targets][0]!, s)}'`);
  });
  return text;
}
/** What still names a removed file, or a name a re-export file no longer serves. */
function leftIn(file: string, text: string) {
  for (const m of text.matchAll(/(?:from\s*|import\(\s*)'([^']+)'/g)) {
    const target = resolve(file, m[1]!);
    if (target === SIM + 'railway-world.ts') left.push(`${file}: imports ${m[1]}`);
  }
  for (const m of text.matchAll(/(?:import|export)(?:\s+type)?\s*\{([^}]*)\}\s*from\s*'([^']+)'/g)) {
    const table = TABLE[resolve(file, m[2]!) ?? ''];
    if (!table) continue;
    for (const raw of m[1]!.split(',')) {
      const name = /^(?:type\s+)?(\w+)/.exec(raw.trim())?.[1];
      if (name && table[name] && table[name] !== resolve(file, m[2]!))
        left.push(`${file}: ${name} from ${m[2]} (defined in ${table[name]})`);
    }
  }
}

const changed: string[] = [];
for (const file of DIRS.flatMap(files)) {
  if (file === 'dev/migrate/railway-imports.ts' || TABLE[file]) continue;
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const next = check ? text : migrate(file, text);
  leftIn(file, next);
  if (next === text) continue;
  const options = (await prettier.resolveConfig(path.join(ROOT, file))) ?? {};
  fs.writeFileSync(path.join(ROOT, file), await prettier.format(next, { ...options, filepath: path.join(ROOT, file) }));
  changed.push(file);
}
if (changed.length) console.log(`rewrote ${changed.length} files:\n  ${changed.join('\n  ')}`);
if (left.length) {
  console.log(`left (${left.length}):\n  ${left.join('\n  ')}`);
  process.exit(1);
}
console.log(check ? 'nothing left' : 'done; nothing left');
