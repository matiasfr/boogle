// Registry scan: every name in src/ that two agents could pick at once, found statically, and the rules that keep
// mixed-build rooms working when one PR adds to them (AGENTS.md, "Shared registries" and "Mixed builds").
// Pure: takes file texts, returns data. dev/registry/check.mjs feeds it the tree and main's tree; test/registry.test.mjs
// feeds it snippets.
//
//   scanSources(files)        files: [{ path, text }] -> registry (shape below)
//   checkRegistry(reg)        -> [error] for clashes inside one tree
//   compareRegistries(base, head) -> { errors, notes } for what a change does to main's registry
//
// registry = {
//   presence: { key: [path] }        net.js core keys + addPresenceField / addHostField (one namespace)
//   messages: { type: [path] }       `t: '...'` in files that call send(): who sends each room message type
//   pads:     { slot: [path:id] }    registerAction pad slots (describeControl rows only describe, they may share)
//   padSlots: [slot]                 PAD in src/player/controls.js
//   frames:   [{ path, phase, order }]  onFrame hooks with a literal order
//   rules, ops, states               filled in by check.mjs from a real install (names, versions, saved shapes)
//   ns                               WORLD_NS from src/world/namespace.js (absent before 0.1); a change skips the rules diff
// }

const CORE_PRESENCE_FILE = 'src/netplay/net';
// Paths compare without their extension, so a module keeps its registry identity when it moves from .js to .ts.
const bare = (p) => p.replace(/\.[jt]s$/, '');

// Strips comments and replaces string/template contents with spaces (same length), so offsets still line up and
// brackets inside strings don't count. Literal values are read back from the original text at the same offsets.
export function blank(text) {
  let out = '';
  for (let i = 0; i < text.length;) {
    const c = text[i];
    const n = text[i + 1];
    if (c === '/' && n === '/') {
      const end = text.indexOf('\n', i);
      const stop = end === -1 ? text.length : end;
      out += ' '.repeat(stop - i);
      i = stop;
    } else if (c === '/' && n === '*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end === -1 ? text.length : end + 2;
      out += text.slice(i, stop).replace(/[^\n]/g, ' ');
      i = stop;
    } else if (c === "'" || c === '"' || c === '`') {
      let j = i + 1;
      while (j < text.length && text[j] !== c) j += text[j] === '\\' ? 2 : 1;
      out += c + text.slice(i + 1, j).replace(/[^\n]/g, ' ') + c;
      i = j + 1;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

// Every call `name(...)` in text: { at, args: [string] } with args split at top-level commas (original text).
export function calls(text, name) {
  const b = blank(text);
  const out = [];
  const re = new RegExp(`(?<![\\w.$])${name}\\s*\\(`, 'g');
  for (let m; (m = re.exec(b));) {
    if (/function\s+$/.test(b.slice(Math.max(0, m.index - 12), m.index))) continue; // the definition itself
    let depth = 0;
    let start = m.index + m[0].length;
    const args = [];
    for (let i = start; i < b.length; i++) {
      const c = b[i];
      if ('([{'.includes(c)) depth++;
      else if (')]}'.includes(c)) {
        if (depth === 0) {
          args.push(text.slice(start, i).trim());
          break;
        }
        depth--;
      } else if (c === ',' && depth === 0) {
        args.push(text.slice(start, i).trim());
        start = i + 1;
      }
    }
    out.push({ at: lineOf(text, m.index), args: args.filter((a) => a !== '') });
  }
  return out;
}

const lineOf = (text, at) => text.slice(0, at).split('\n').length;
const literal = (s) => s?.match(/^(['"])([^'"]*)\1$/)?.[2];
// A top-level property of an object literal's text, e.g. prop("{ pad: 'x', down() {} }", 'pad') -> "'x'".
function prop(obj, key) {
  if (!obj?.startsWith('{')) return undefined;
  const inner = obj.slice(1, -1);
  const b = blank(inner);
  let depth = 0;
  for (let i = 0; i < b.length; i++) {
    const c = b[i];
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    else if (depth === 0 && b.startsWith(key, i) && !/[\w$]/.test(b[i - 1] ?? ' ')) {
      const rest = b.slice(i + key.length);
      const colon = rest.match(/^\s*:\s*/);
      if (!colon) continue;
      const from = i + key.length + colon[0].length;
      let d = 0;
      let j = from;
      for (; j < b.length; j++) {
        if ('([{'.includes(b[j])) d++;
        else if (')]}'.includes(b[j])) d--;
        else if (b[j] === ',' && d === 0) break;
      }
      return inner.slice(from, j).trim();
    }
  }
  return undefined;
}

const add = (map, key, who) => (map[key] ??= []).push(who);

export function scanSources(files) {
  const reg = { presence: {}, messages: {}, pads: {}, padSlots: [], frames: [] };
  for (const { path, text } of files) {
    if (bare(path) === CORE_PRESENCE_FILE) {
      const body = text.match(/function buildPresence\(\)\s*\{\s*const pr = (\{[^}]*\})/)?.[1];
      for (const m of body?.matchAll(/^\s*([a-z]\w*)\s*:/gm) ?? []) add(reg.presence, m[1], `${path} (core)`);
    }
    for (const fn of ['addPresenceField', 'addHostField']) {
      for (const c of calls(text, fn)) {
        const key = literal(c.args[0]);
        if (key !== undefined) add(reg.presence, key, `${path}:${c.at}`);
      }
    }
    if (!path.startsWith('src/net/') && /\.send\(/.test(blank(text))) {
      const b = blank(text);
      for (const m of b.matchAll(/(?<![\w$])t\s*:\s*'/g)) {
        const type = literal(text.slice(m.index + m[0].length - 1).match(/^'[^']*'/)?.[0]);
        if (type !== undefined && !(reg.messages[type] ?? []).includes(path)) add(reg.messages, type, path);
      }
    }
    for (const c of calls(text, 'registerAction')) {
      const slot = literal(prop(c.args[1], 'pad'));
      if (slot !== undefined) add(reg.pads, slot, `${path}:${literal(c.args[0]) ?? '?'}`);
    }
    if (bare(path) === 'src/player/controls') {
      const list = text.match(/export const PAD = \[([^\]]*)\]/)?.[1] ?? '';
      reg.padSlots = [...list.matchAll(/'([^']+)'/g)].map((m) => m[1]);
    }
    for (const c of calls(text, 'onFrame')) {
      const opts = c.args[1];
      const order = prop(opts, 'order');
      if (order === undefined || !/^-?\d+$/.test(order)) continue;
      const phase = literal(prop(opts, 'phase')) ?? 'update';
      reg.frames.push({ path: `${path}:${c.at}`, phase, order: Number(order) });
    }
  }
  return reg;
}

const isFeature = (p) => p.startsWith('src/features/');
const MIN_FEATURE_ORDER = -10;
const CORE_LATE = 3000;

export function checkRegistry(reg) {
  const errors = [];
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
  // Core hooks (src/loop.js's list) sit below the feature range or at 3000+ in 'late'; lazy feature parts outside
  // src/features/ use the feature range and may tie (ties run in registration order).
  const core = reg.frames.filter((f) => !isFeature(f.path) && (f.order < MIN_FEATURE_ORDER || f.order >= CORE_LATE));
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
  // A new world namespace (src/world/namespace.js) is a clean break: old tabs never meet this world, so main's rules,
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
