// Registry scan: every name in src/ that two agents could pick at once, found statically, and the rules that keep
// mixed-build rooms working when one PR adds to them (AGENTS.md, "Shared registries" and "Mixed builds").
// Pure: takes file texts, returns data (read by dev/scan/read.ts, which the atlas uses too). dev/registry/check.mjs feeds it the tree and main's tree; test/registry.test.mjs
// feeds it snippets.
//
//   scanSources(files)        files: [{ path, text }] -> registry (shape below)
//   checkRegistry(reg)        -> [error] for clashes inside one tree
//   compareRegistries(base, head) -> { errors, notes } for what a change does to main's registry
//
// registry = {
//   presence: { key: [path] }        net.js core keys + addPresenceField / addHostField (one namespace)
//   messages: { type: [path] }       `t: '...'` in files that call .send(, outside src/net/: who sends each type
//   pads:     { slot: [path:id] }    registerAction pad slots (describeControl rows only describe, they may share)
//   padSlots: [slot]                 PAD in src/player/controls.ts
//   frames:   [{ path, phase, order }]  onFrame hooks with a literal order (path is file:line)
//   parseErrors: [string]            only when a file could not be parsed
//   rules, ops, states               filled in by check.mjs from a real install (names, versions, saved shapes)
//   ns                               WORLD_NS from src/world/namespace.ts (absent before 0.1); a change skips the rules diff
// }

import { MIN_FEATURE_ORDER, isCoreHook, readFile } from '../scan/read.ts';

const CORE_PRESENCE_FILE = 'src/netplay/net';
// Paths compare without their extension, so a module keeps its registry identity when it moves from .js to .ts.
const bare = (p) => p.replace(/\.[jt]s$/, '');

const add = (map, key, who) => (map[key] ??= []).push(who);

// The registry as one projection of dev/scan/read.ts, the reader the atlas uses too: a message type belongs to the
// files that *send* it (`.send(` plus `t: '...'`), never to a receiver; the room layer's own protocol (src/net/) is
// not a name two agents can pick; presence includes the core keys of buildPresence; a hook is core by order
// (isCoreHook). A file the reader cannot parse is an error, not a silent skip.
export function scanSources(files) {
  const reg = { presence: {}, messages: {}, pads: {}, padSlots: [], frames: [] };
  for (const { path, text } of files) {
    const r = readFile(path, text);
    if (r.parseError) (reg.parseErrors ??= []).push(`${path}: ${r.parseError}`);
    if (bare(path) === CORE_PRESENCE_FILE) for (const key of r.corePresence) add(reg.presence, key, `${path} (core)`);
    for (const { key, line } of [...r.owner, ...r.host]) add(reg.presence, key, `${path}:${line}`);
    if (!path.startsWith('src/net/')) for (const type of r.sends) add(reg.messages, type, path);
    for (const a of r.actions) if (a.pad !== null) add(reg.pads, a.pad, `${path}:${a.id ?? '?'}`);
    if (bare(path) === 'src/player/controls') reg.padSlots = r.padSlots;
    for (const f of r.frames) {
      if (f.explicit) reg.frames.push({ path: `${path}:${f.line}`, phase: f.phase ?? 'update', order: f.order });
    }
  }
  return reg;
}

const isFeature = (p) => p.startsWith('src/features/');

export function checkRegistry(reg) {
  const errors = [...(reg.parseErrors ?? []).map((e) => `${e} (the registry cannot read this file)`)];
  for (const [key, who] of Object.entries(reg.presence)) {
    if (who.length > 1) errors.push(`presence key '${key}' is used twice: ${who.join(', ')}. Pick an untaken key.`);
  }
  for (const [type, who] of Object.entries(reg.messages)) {
    if (who.length > 1) errors.push(`message type '${type}' is sent from two files: ${who.join(', ')}. Rename one.`);
  }
  for (const [slot, who] of Object.entries(reg.pads)) {
    if (who.length > 1) errors.push(`pad slot '${slot}' is claimed twice: ${who.join(', ')}. The later stays unbound.`);
    else if (reg.padSlots.length && !reg.padSlots.includes(slot))
      errors.push(`pad slot '${slot}' (${who}) is not in PAD`);
  }
  if (reg.padSlots.length && reg.padSlots.every((s) => reg.pads[s])) {
    errors.push('every pad slot is taken: updates.js needs freeSlots()[0] at runtime. Rethink the layout.');
  }
  // Core hooks (src/loop.ts's list) sit below the feature range or at 3000+ in 'late'; lazy feature parts outside
  // src/features/ use the feature range and may tie (ties run in registration order).
  const core = reg.frames.filter((f) => isCoreHook(f.path, f.order));
  for (const f of reg.frames.filter((x) => isFeature(x.path))) {
    if (f.order < MIN_FEATURE_ORDER) errors.push(`${f.path}: features use onFrame order ${MIN_FEATURE_ORDER} and up`);
    const clash = core.find((c) => c.phase === f.phase && c.order === f.order);
    if (clash) errors.push(`${f.path}: onFrame ${f.phase} order ${f.order} equals core ${clash.path}; pick another`);
  }
  return errors;
}

// Shape of a saved value, for spotting a format change without a version bump: object keys and leaf types.
export function shapeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) {
    const kinds = [...new Set(v.map(shapeOf))].sort();
    return `[${kinds.join('|')}]`;
  }
  if (typeof v === 'object') {
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${k}:${shapeOf(v[k])}`)
      .join(',')}}`;
  }
  return typeof v;
}

export function compareRegistries(base, head) {
  const errors = [];
  const notes = [];
  // A new world namespace (src/world/namespace.ts) is a clean break: old tabs never meet this world, so main's rules,
  // ops and states bind nothing here.
  const fresh = (base.ns ?? null) !== (head.ns ?? null);
  if (fresh) notes.push(`world namespace ${base.ns ?? '(none)'} -> ${head.ns}: a clean break, rules not compared`);
  const baseRules = fresh ? [] : (base.rules ?? []);
  const headRules = head.rules ?? [];
  if (baseRules.some((r, i) => headRules[i] !== r)) {
    errors.push(
      `RULES order changed: main has [${baseRules}], this tree [${headRules}]. Main's list must stay a prefix ` +
        "(append only; reordering desyncs mixed-build rooms). After a rebase conflict, keep main's order and append.",
    );
  }
  for (const [key, s] of Object.entries(fresh ? {} : (base.states ?? {}))) {
    const h = head.states?.[key];
    if (!h) {
      errors.push(`state '${key}' was removed: saves and older tabs still carry it. Keep it registered (empty is ok).`);
    } else if (h.version < s.version) {
      errors.push(`state '${key}' version went down (${s.version} -> ${h.version})`);
    } else if (h.version === s.version && s.shape !== undefined && h.shape !== s.shape) {
      errors.push(
        `state '${key}' saves a different shape at the same version ${h.version}: bump \`version\` and add a ` +
          `\`migrate[${h.version + 1}]\` step.\n    main: ${s.shape}\n    now:  ${h.shape}`,
      );
    }
  }
  for (const op of Object.keys(fresh ? {} : (base.ops ?? {}))) {
    if (!head.ops?.[op])
      errors.push(`op '${op}' was removed: older tabs still submit it. Keep it (validate can reject).`);
  }
  for (const [what, field] of [
    ['presence key', 'presence'],
    ['message type', 'messages'],
  ]) {
    for (const k of Object.keys(base[field] ?? {})) {
      if (!head[field]?.[k])
        notes.push(`${what} '${k}' is gone; older tabs may still send it (fine if nothing reads it)`);
    }
    for (const k of Object.keys(head[field] ?? {})) {
      if (!base[field]?.[k]) notes.push(`new ${what} '${k}' (${head[field][k].join(', ')})`);
    }
  }
  for (const k of headRules.slice(baseRules.length)) notes.push(`new rules module '${k}' (appended)`);
  for (const k of Object.keys(head.states ?? {})) if (fresh || !base.states?.[k]) notes.push(`new state '${k}'`);
  for (const k of Object.keys(head.ops ?? {})) if (fresh || !base.ops?.[k]) notes.push(`new op '${k}'`);
  return { errors, notes };
}
