// Atlas model: turns the extracted facts into what the views draw. PURE (no DOM, no d3).
//
// kindOf is a reading aid, not a contract. First match wins:
//   lock     ops, states or ticks registered, or a file under src/sim/ or src/world/
//   host     addHostField
//   owner    addPresenceField, or a file under src/netplay/
//   msg      room messages (send/onMessage), or a file under src/net/
//   adapter  submitEdit
//   local    everything else
import { LAYERS, PRE_STEP } from './layout.js';

export const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function dirOf(path) {
  if (path.startsWith('server/')) return 'server';
  const p = path.replace(/^src\//, '').split('/');
  if (p.length === 1) return '(core)';
  if (p[0] === 'world' && p[1] === 'rules') return 'world/rules';
  return p[0];
}

export function kindOf(file) {
  const f = file.f;
  if (file.ops?.length || file.states?.length || file.ticks?.length || /^src\/(sim|world)\//.test(f)) return 'lock';
  if (file.host?.length) return 'host';
  if (file.owner?.length || f.startsWith('src/netplay/')) return 'owner';
  if (file.msgs?.length || file.onMessage || f.startsWith('src/net/')) return 'msg';
  if (file.submits) return 'adapter';
  return 'local';
}

// An unknown folder falls back to "Game systems", so a new src/<folder>/ never crashes the page.
export function layerOf(dir) {
  return LAYERS.find((L) => L.dirs.includes(dir)) ?? LAYERS[1];
}

export const layerById = (id) => LAYERS.find((L) => L.id === id) ?? LAYERS[1];

export const sumLoc = (list) => list.reduce((n, f) => n + f.loc, 0);

export function buildModel(facts) {
  const list = Array.isArray(facts?.files) ? facts.files : [];
  const files = list.map((x) => ({
    ...x,
    dir: dirOf(x.f),
    kind: kindOf(x),
    name: x.f.split('/').pop(),
    uses: new Set([...x.imports, ...x.lazy]),
    users: [],
  }));
  const byPath = new Map(files.map((x) => [x.f, x]));
  for (const x of files) for (const i of x.uses) byPath.get(i)?.users.push(x.f);
  const dirs = {};
  for (const x of files) (dirs[x.dir] ||= []).push(x);
  for (const d in dirs) dirs[d].sort((a, b) => b.loc - a.loc || a.f.localeCompare(b.f));
  const featureCount = files.filter((x) => /^src\/features\/[^/]+\.js$/.test(x.f)).length;
  return { facts, files, byPath, dirs, featureCount };
}

// The wire channels a file puts keys on: [[channel, keys]]. Room plumbing and debug tools are skipped. The lockstep
// wire messages (w:*) belong to the lock channel.
export function wireOf(file) {
  if (/^src\/(net|debug)\//.test(file.f)) return [];
  const out = [];
  const inWorld = file.f.startsWith('src/world/');
  if (file.owner.length) out.push(['owner', file.owner]);
  if (file.host.length) out.push(['host', file.host]);
  const lock = [...file.ops, ...file.states, ...(inWorld ? file.msgs : [])];
  if (lock.length) out.push(['lock', lock]);
  if (file.msgs.length && !inWorld) out.push(['msg', file.msgs]);
  return out;
}

// Every frame hook: extracted onFrame calls, the steps main.js runs before the physics step, and the final draw.
// `core` is true for anything outside src/features/. Hook id: `${file}#${n}`, the nth onFrame in that file.
export function hooks(model) {
  const out = PRE_STEP.map(([name, order], i) => ({
    id: `pre#${i}`,
    phase: 'pre',
    order,
    name,
    file: 'src/main.js',
    base: 'main.js',
    core: true,
  }));
  for (const f of model.files) {
    f.frames.forEach((fr, n) => {
      out.push({
        id: `${f.f}#${n}`,
        phase: fr.phase,
        order: fr.order,
        name: fr.name,
        file: f.f,
        base: f.name,
        core: !f.f.startsWith('src/features/'),
        kind: f.kind,
      });
    });
  }
  out.push({
    id: 'render#0',
    phase: 'render',
    order: 0,
    name: 'renderFrame',
    file: 'src/main.js',
    base: 'main.js',
    core: true,
  });
  return out;
}

const CITE_KEYS = ['file', 'dir', 'op', 'state', 'presence', 'hostField', 'message', 'action', 'route'];

// A cite names one thing in the code: { file, symbol? } | { dir } | { op } | { state } | { presence } | { hostField }
// | { message } | { action } | { route: 'PUT /rooms/:roomId/snapshot' }. Never throws: a bad cite gets an error.
export function resolveCite(cite, model) {
  try {
    if (!cite || typeof cite !== 'object' || Array.isArray(cite)) return { files: [], error: 'cite must be an object' };
    const keys = Object.keys(cite).filter((k) => k !== 'symbol');
    if (keys.length !== 1 || !CITE_KEYS.includes(keys[0])) {
      return {
        files: [],
        error: `cite must have exactly one of ${CITE_KEYS.join(', ')} (got ${keys.join(', ') || 'none'})`,
      };
    }
    const key = keys[0];
    const v = cite[key];
    if (typeof v !== 'string' || !v) return { files: [], error: `cite ${key} must be a non-empty string` };
    if (cite.symbol !== undefined && key !== 'file') return { files: [], error: 'symbol only goes with file' };
    const none = (what) => ({ files: [], error: `no file ${what} (renamed? update the cite)` });
    const match = (pred, what) => {
      const files = model.files.filter(pred).map((f) => f.f);
      return files.length ? { files, error: null } : none(what);
    };
    switch (key) {
      case 'file': {
        const f = model.byPath.get(v);
        if (!f) return { files: [], error: `${v} does not exist (renamed? update the cite)` };
        if (cite.symbol !== undefined && !f.exports.includes(cite.symbol) && !f.names.includes(cite.symbol)) {
          return { files: [], error: `${v} has no symbol ${cite.symbol} (renamed? update the cite)` };
        }
        return { files: [v], error: null };
      }
      case 'dir': {
        const d = v.replace(/\/+$/, '');
        return match((f) => f.f.startsWith(d + '/'), `under ${d}/`);
      }
      case 'op':
        return match((f) => f.ops.includes(v), `registers op ${v}`);
      case 'state':
        return match((f) => f.states.includes(v), `registers state ${v}`);
      case 'presence':
        return match((f) => f.owner.includes(v), `adds presence key ${v}`);
      case 'hostField':
        return match((f) => f.host.includes(v), `adds host field ${v}`);
      case 'message':
        return match((f) => f.msgs.includes(v), `sends or reads message ${v}`);
      case 'action':
        return match((f) => f.actions.includes(v), `registers action ${v}`);
      default:
        return match((f) => f.routes.includes(v), `serves route ${v}`);
    }
  } catch (err) {
    return { files: [], error: `cite could not be read: ${err?.message ?? err}` };
  }
}

// What the search box can jump to: files, folders, registered keys, concepts (c:) and stories (s:).
export function searchIndex(model, narrative) {
  const idx = [
    ...model.files.map((f) => ({ key: 'f:' + f.f, label: f.name, hint: f.dir + '/', kind: f.kind, text: f.f })),
    ...Object.keys(model.dirs).map((d) => ({
      key: 'd:' + d,
      label: d + '/',
      hint: model.dirs[d].length + ' files',
      kind: null,
      text: d,
    })),
    ...model.files.flatMap((f) =>
      [...f.owner, ...f.host, ...f.ops, ...f.states, ...f.msgs, ...f.actions].map((k) => ({
        key: 'f:' + f.f,
        label: k,
        hint: f.name,
        kind: f.kind,
        text: k,
      })),
    ),
  ];
  for (const c of narrative?.concepts ?? [])
    idx.push({
      key: 'c:' + c.id,
      label: c.title ?? c.id,
      hint: 'concept',
      kind: null,
      text: `${c.id} ${c.title ?? ''}`,
    });
  for (const s of narrative?.stories ?? [])
    idx.push({
      key: 's:' + s.id,
      label: s.title ?? s.id,
      hint: 'story',
      kind: s.kind ?? null,
      text: `${s.id} ${s.title ?? ''}`,
    });
  return idx;
}

// What a file registers, as [label, text] rows for the inspector and Focus.
export function registrations(f) {
  const r = [];
  const add = (k, v) => v.length && r.push([k, v.join(', ')]);
  add('presence', f.owner);
  add('host field', f.host);
  add('ops', f.ops);
  add('state', f.states);
  add('messages', f.msgs);
  add('actions', f.actions);
  add(
    'frame',
    f.frames.map((h) => `${h.phase} ${h.order}`),
  );
  if (f.interact) r.push(['interact', `${f.interact} target source${f.interact > 1 ? 's' : ''}`]);
  add(
    'lazy loads',
    f.lazy.map((p) => p.split('/').pop()),
  );
  return r;
}

// The folders of a layer that exist in the code. A folder no layer lists joins "Game systems", so it is still drawn.
export function layerDirs(model, L) {
  const known = new Set(LAYERS.flatMap((x) => x.dirs));
  const extra =
    L === LAYERS[1]
      ? Object.keys(model.dirs)
          .filter((d) => !known.has(d))
          .sort()
      : [];
  return [...L.dirs, ...extra].filter((d) => model.dirs[d]);
}
