// Atlas fact extractor: reads src/ and server/src/ with acorn and reports what each file registers (imports, frame
// hooks, presence keys, ops, messages, actions, routes). Pure apart from listSources (reads the tree) and gitFacts
// (runs git). Never throws on bad input: a file acorn cannot parse gets a `parseError` record. Same tree and history
// give the same JSON (no timestamps). Schema: docs/plans/atlas.md, "Facts schema".
import * as acorn from 'acorn';
import { isCoreHook, readFile } from '../scan/read.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { dirOf } from '../../atlas/model.js';
import { git } from './git.mjs';

const posix = path.posix;
const uniq = (list) => [...new Set(list)];

// LOCKSTEP_FILES from eslint.config.js (the files whose math must be deterministic), read as text so the config is
// never executed. Globs: `**` crosses folders, `*` does not.
export function readLockstepGlobs(root) {
  try {
    const ast = acorn.parse(fs.readFileSync(path.join(root, 'eslint.config.js'), 'utf8'), {
      ecmaVersion: 'latest',
      sourceType: 'module',
    });
    for (const st of ast.body) {
      const d = st.type === 'ExportNamedDeclaration' && st.declaration?.declarations?.[0];
      if (d?.id?.name === 'LOCKSTEP_FILES' && d.init?.type === 'ArrayExpression')
        return d.init.elements.filter((e) => typeof e?.value === 'string').map((e) => e.value);
    }
  } catch {
    // No eslint config here (a fixture root): nothing is flagged.
  }
  return [];
}

function globRegex(g) {
  const re = g
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*\//g, '\0')
    .replace(/\*/g, '[^/]*')
    .replace(/\0/g, '(?:.*/)?');
  return new RegExp(`^${re}$`);
}

// The atlas record of one file: the shared reader's raw record (dev/scan/read.mjs) cut down to what the page draws.
// `lockstep` is the list of lockstep globs. Owner keys include the core keys of buildPresence.
const project = (r, lockstep) => {
  const file = r.f;
  const keys = (list) => uniq(list.map((x) => x.key));
  return {
    f: r.f,
    loc: r.loc,
    head: r.head,
    imports: r.imports,
    lazy: r.lazy,
    exports: r.exports,
    names: r.names,
    frames: r.frames.map(({ phase, order, name }) => ({ phase, order, name, core: isCoreHook(file, order) })),
    owner: uniq([...r.corePresence, ...keys(r.owner)]),
    host: keys(r.host),
    ops: r.ops,
    states: r.states,
    ticks: r.ticks,
    msgs: uniq([...r.sends, ...r.reads]),
    onMessage: r.onMessage,
    submits: r.submits,
    actions: uniq(r.actions.map((a) => a.id).filter(Boolean)),
    interact: r.interact,
    routes: r.routes,
    lockstep: lockstep.some((g) => globRegex(g).test(file)),
    ...(r.parseError ? { parseError: r.parseError } : {}),
  };
};

export const extractFile = (file, text, lockstep = []) => project(readFile(file, text), lockstep);

// Every .js file under src/ and server/src/, as posix paths sorted with localeCompare.
export function listSources(root) {
  const out = [];
  for (const dir of ['src', 'server/src']) {
    const abs = path.join(root, dir);
    if (!fs.existsSync(abs)) continue;
    for (const rel of fs.readdirSync(abs, { recursive: true })) {
      const p = posix.join(dir, String(rel).split(path.sep).join('/'));
      if (!p.endsWith('.js')) continue;
      if (!fs.statSync(path.join(root, p)).isFile()) continue;
      out.push(p);
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

// { head, commits, first } (the short sha, the commit count and the date of the first commit), or null when this is
// not a git checkout. Never throws. A shallow clone has no usable history, so it reports only the head.
export function gitFacts(root) {
  try {
    git(root, 'rev-parse', '--git-dir');
    const head = git(root, 'rev-parse', '--short', 'HEAD');
    if (git(root, 'rev-parse', '--is-shallow-repository') === 'true') return { head, commits: null, first: null };
    const commits = Number(git(root, 'rev-list', '--count', 'HEAD'));
    const rootSha = git(root, 'rev-list', '--max-parents=0', 'HEAD').split('\n').pop();
    const first = git(root, 'log', '-1', '--format=%cI', rootSha);
    return { head, commits, first };
  } catch {
    return null;
  }
}

// extractFacts({ root, git, sources }): sources ([{ path, text }]) replaces reading the tree, for tests.
export function extractFacts({ root = process.cwd(), git: withGit = true, sources, lockstep } = {}) {
  const globs = lockstep ?? readLockstepGlobs(root);
  const src = sources ?? listSources(root).map((p) => ({ path: p, text: fs.readFileSync(path.join(root, p), 'utf8') }));
  const raw = src.map((s) => readFile(s.path, s.text));
  const files = raw.map((r) => project(r, globs)).sort((a, b) => a.f.localeCompare(b.f));
  // The frame loop in src/main.js (what runs before the physics step, and the last call, the draw), or null.
  const loop = raw.find((r) => r.f === 'src/main.js')?.loop ?? null;
  return { schema: 1, git: withGit ? gitFacts(root) : null, loop, files };
}

// The facts as they were at a git ref, for `npm run atlas -- --changes`: the ref's src/ and server/src/ unpacked with
// one `git archive` into a temp dir (as baseTree in dev/registry/check.mjs does), then read like the working tree.
export function factsAt(root, ref) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-atlas-'));
  try {
    const tar = execFileSync('git', ['archive', ref, 'src', 'server/src'], { cwd: root, maxBuffer: 1 << 28 });
    execFileSync('tar', ['-x', '-C', dir], { input: tar });
    return extractFacts({ root: dir, git: false, lockstep: readLockstepGlobs(root) });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// The kinds of key diffFacts compares: each is a list of names on a file record.
const KEY_KINDS = ['ops', 'states', 'owner', 'host', 'msgs', 'actions', 'routes'];

// What changed between two facts objects: files and folders added or removed, and keys added or removed per kind.
export function diffFacts(before, after) {
  const paths = (facts) => new Set(facts.files.map((f) => f.f));
  const [pb, pa] = [paths(before), paths(after)];
  const only = (a, b) => [...a].filter((x) => !b.has(x)).sort();
  const folders = (set) => new Set([...set].map(dirOf));
  const keys = {};
  for (const kind of KEY_KINDS) {
    const [kb, ka] = [new Set(before.files.flatMap((f) => f[kind])), new Set(after.files.flatMap((f) => f[kind]))];
    const added = only(ka, kb);
    const removed = only(kb, ka);
    if (added.length || removed.length) keys[kind] = { added, removed };
  }
  return {
    filesAdded: only(pa, pb),
    filesRemoved: only(pb, pa),
    foldersAdded: only(folders(pa), folders(pb)),
    foldersRemoved: only(folders(pb), folders(pa)),
    keys,
  };
}
