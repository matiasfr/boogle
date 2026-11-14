// Registry scan: every name in src/ that two agents could pick at once, found statically.
// Pure: takes file texts, returns data (read by dev/scan/read.ts, which the atlas uses too). dev/registry/check.ts feeds it the current tree; test/registry.test.ts
// feeds it snippets.
//
//   scanSources(files)        files: [{ path, text }] -> registry (shape below)
//   checkRegistry(reg)        -> [error] for clashes inside one tree
//
// registry = {
//   presence: { key: [path] }        net.ts core keys + addPresenceField (one namespace)
//   messages: { type: [path] }       `t: '...'` in files that call .send(, outside src/net/: who sends each type
//   pads:     { slot: [path:id] }    registerAction pad slots (describeControl rows only describe, they may share)
//   protoPads: { slot: [path:id] }   the same in src/proto/: a slot free on normal pages stays free, and a prototype
//                                    stays out of the game's way (at runtime a claim that clashes stays unbound and warns)
//   padSlots: [slot]                 PAD in src/player/controls.ts
//   frames:   [{ path, phase, order, kind? }]  onFrame, onPreStep and onPostStep hooks with a literal order, and each
//                                    entry of a defineKind (path is file:line)
//   kindErrors: [string]             a defineKind whose kind or orders aren't literals
//   parseErrors: [string]            only when a file could not be parsed
//   rules, ops, states               filled in by check.ts from a real install (names and owners)
// }

import { MIN_FEATURE_ORDER, isCoreHook, readFile } from '../scan/read.ts';

export type Source = { path: string; text: string };
export type FrameHook = { path: string; phase: string; order: number; kind?: string };
export type StateInfo = { module: string };
export type Registry = {
  presence: Record<string, string[]>;
  messages: Record<string, string[]>;
  pads: Record<string, string[]>;
  protoPads: Record<string, string[]>;
  padSlots: string[];
  frames: FrameHook[];
  kindErrors?: string[];
  parseErrors?: string[];
  rules?: string[];
  ops?: Record<string, string>;
  states?: Record<string, StateInfo>;
};

const CORE_PRESENCE_FILE = 'src/netplay/net';
// Paths compare without their extension, so a module keeps its registry identity when it moves from .js to .ts.
const bare = (p: string) => p.replace(/\.[jt]s$/, '');

const add = (map: Record<string, string[]>, key: string, who: string) => (map[key] ??= []).push(who);

// The registry as one projection of dev/scan/read.ts, the reader the atlas uses too: a message type belongs to the
// files that *send* it (`.send(` plus `t: '...'`), never to a receiver; the room layer's own protocol (src/net/) is
// not a name two agents can pick; presence includes the core keys of buildPresence; a hook is core by order
// (isCoreHook). A file the reader cannot parse is an error, not a silent skip.
export function scanSources(files: Source[]): Registry {
  const reg: Registry = { presence: {}, messages: {}, pads: {}, protoPads: {}, padSlots: [], frames: [] };
  for (const { path, text } of files) {
    const r = readFile(path, text);
    if (r.parseError) (reg.parseErrors ??= []).push(`${path}: ${r.parseError}`);
    if (bare(path) === CORE_PRESENCE_FILE) for (const key of r.corePresence) add(reg.presence, key, `${path} (core)`);
    for (const { key, line } of r.owner) add(reg.presence, key, `${path}:${line}`);
    if (!path.startsWith('src/net/')) for (const type of r.sends) add(reg.messages, type, path);
    const pads = path.startsWith('src/proto/') ? reg.protoPads : reg.pads;
    for (const a of r.actions) if (a.pad !== null) add(pads, a.pad, `${path}:${a.id ?? '?'}`);
    if (bare(path) === 'src/player/controls') reg.padSlots = r.padSlots;
    for (const f of r.frames) {
      if (f.explicit) {
        const hook: FrameHook = { path: `${path}:${f.line}`, phase: f.phase ?? 'update', order: f.order as number };
        if (f.kind) hook.kind = f.kind;
        reg.frames.push(hook);
      }
    }
    for (const e of r.badKinds) (reg.kindErrors ??= []).push(`${path} ${e}`);
  }
  return reg;
}

const isFeature = (p: string) => p.startsWith('src/features/');

export function checkRegistry(reg: Registry): string[] {
  const errors = [
    ...(reg.parseErrors ?? []).map((e) => `${e} (the registry cannot read this file)`),
    ...(reg.kindErrors ?? []),
  ];
  for (const [key, who] of Object.entries(reg.presence)) {
    if (who.length > 1) errors.push(`presence key '${key}' is used twice: ${who.join(', ')}. Pick an untaken key.`);
  }
  for (const [type, who] of Object.entries(reg.messages)) {
    if (who.length > 1) errors.push(`message type '${type}' is sent from two files: ${who.join(', ')}. Rename one.`);
  }
  for (const [slot, who] of [...Object.entries(reg.pads), ...Object.entries(reg.protoPads)]) {
    if (who.length > 1) errors.push(`pad slot '${slot}' is claimed twice: ${who.join(', ')}. The later stays unbound.`);
    else if (reg.padSlots.length && !reg.padSlots.includes(slot))
      errors.push(`pad slot '${slot}' (${who}) is not in PAD`);
  }
  if (reg.padSlots.length && reg.padSlots.every((s) => reg.pads[s])) {
    errors.push('every pad slot is taken: updates.ts needs a free one at runtime. Rethink the layout.');
  }
  // Core hooks (src/loop.ts's list) sit below the feature range or at 3000+ in 'late'; lazy feature parts outside
  // src/features/ use the feature range and may tie (ties run in registration order).
  const core = reg.frames.filter((f) => isCoreHook(f.path, f.order));
  for (const f of reg.frames.filter((x) => isFeature(x.path))) {
    if (f.order < MIN_FEATURE_ORDER) errors.push(`${f.path}: features use onFrame order ${MIN_FEATURE_ORDER} and up`);
    const clash = core.find((c) => c.phase === f.phase && c.order === f.order);
    if (clash) errors.push(`${f.path}: onFrame ${f.phase} order ${f.order} equals core ${clash.path}; pick another`);
  }
  const kindFiles = new Map<string, string>();
  for (const f of reg.frames) {
    if (!f.kind) continue;
    const file = f.path.replace(/:\d+$/, '');
    if ((kindFiles.get(f.kind) ?? file) !== file)
      errors.push(`entity kind '${f.kind}' is defined twice: ${file}, ${kindFiles.get(f.kind)}`);
    kindFiles.set(f.kind, file);
  }
  // A kind may not tie with a core order (below the feature range, or 3000+ in 'late'), and a pinned fixed-step order is
  // unique (src/loop.ts has the table). In the feature range kinds tie as onFrame hooks do, in registration order.
  const FIXED_PHASE = new Set(['fixedPre', 'fixedPost']);
  reg.frames.forEach((f, i) => {
    const pinned = FIXED_PHASE.has(f.phase);
    if (!f.kind && !pinned) return;
    const clash = reg.frames.find(
      (o, j) =>
        o.phase === f.phase &&
        o.order === f.order &&
        j !== i &&
        // earlier: each pair is reported once
        (pinned
          ? j < i
          : o.kind
            ? j < i && (isCoreHook(f.path, f.order) || isCoreHook(o.path, o.order))
            : isCoreHook(o.path, o.order)),
    );
    if (clash) errors.push(`${f.path}: ${f.phase} order ${f.order} equals ${clash.path}; pick another`);
  });
  return errors;
}
