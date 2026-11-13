import { names, type NameRegistry } from './names.ts';
import { metadata, type LevelArtifact, type LevelDef, type PrefabArtifact, type PrefabDef } from './types.ts';

function fail(message: string): never {
  throw new Error(`prefabs: ${message}`);
}
type Obj = Record<string, unknown>;
function object(value: unknown): Obj {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('expected object');
  return value as Obj;
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.length) fail('expected nonempty name');
  return value;
}
function number(value: unknown, positive = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || (positive && value <= 0)) fail('degenerate number');
  return value;
}
function vec(value: unknown, positive = false) {
  if (!Array.isArray(value) || value.length !== 3) fail('expected vec3');
  value.forEach((n) => number(n, positive));
}
function list(value: unknown): unknown[] {
  if (!Array.isArray(value)) fail('expected array');
  return value;
}
function known(value: unknown, choices: readonly string[]) {
  const name = text(value);
  if (!choices.includes(name)) fail(`unknown name ${name}`);
}
/** Reject code, sparse arrays, cycles and non-plain values before serialization can hide them. */
export function validateJson(value: unknown, ancestors = new Set<object>()): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    number(value);
    return;
  }
  if (typeof value !== 'object' || !value) fail('non-JSON value');
  if (ancestors.has(value)) fail('non-JSON cycle');
  if (
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) !== Object.prototype &&
    Object.getPrototypeOf(value) !== null
  )
    fail('non-JSON class');
  if (Object.getOwnPropertySymbols(value).length) fail('non-JSON symbol');
  ancestors.add(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Array.isArray(value)) {
    // Read descriptors, never indexed values: validation must not run authoring getters.
    const length = descriptors.length!.value as number;
    if (Object.keys(descriptors).length !== length + 1) fail('non-JSON array property or hole');
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (key === 'length') continue;
      const index = Number(key);
      if (!Number.isInteger(index) || index < 0 || index >= length || String(index) !== key)
        fail('non-JSON array property');
      if (descriptor.get || descriptor.set || !descriptor.enumerable) fail('non-JSON array accessor or property');
      validateJson(descriptor.value, ancestors);
    }
  } else {
    for (const descriptor of Object.values(descriptors)) {
      if (descriptor.get || descriptor.set || !descriptor.enumerable) fail('non-JSON property');
      validateJson(descriptor.value, ancestors);
    }
  }
  ancestors.delete(value);
}
export function validatePrefab(value: unknown, registry: NameRegistry = names): asserts value is PrefabDef {
  validateJson(value);
  const p = object(value),
    key = text(p.key);
  if (!/^[^.\s]+\.[^\s]+$/.test(key)) fail('key needs area.name');
  if (registry.retired.includes(key)) fail(`retired key ${key}`);
  known(p.scope, ['owner', 'place', 'room']);
  const v = object(p.visual);
  if (Object.hasOwn(v, 'builder')) {
    known(v.builder, registry.builders);
    object(v.params);
    if (v.batch !== undefined) text(v.batch);
    if ('asset' in v || 'none' in v) fail('ambiguous visual');
  } else if (Object.hasOwn(v, 'asset')) {
    if (!Object.hasOwn(registry.assets, text(v.asset))) fail(`unknown asset ${String(v.asset)}`);
    const asset = registry.assets[text(v.asset)];
    if (!asset) fail(`unknown asset ${String(v.asset)}`);
    if (v.node !== undefined) known(v.node, asset.nodes);
    if ('none' in v) fail('ambiguous visual');
  } else if (v.none !== true) fail('missing visual');
  for (const value of list(p.colliders)) {
    const c = object(value);
    vec(c.at);
    if (c.rot !== undefined) vec(c.rot);
    if (c.group !== undefined) known(c.group, ['scenery', 'room']);
    switch (c.shape) {
      case 'box':
        vec(c.half, true);
        break;
      case 'sphere':
        number(c.r, true);
        break;
      case 'capsule':
        return fail('capsule implementation awaits an authored user');
      case 'trunk':
        number(c.r, true);
        number(c.h, true);
        break;
      default:
        fail('unknown collider');
    }
  }
  const attachments = p.attach === undefined ? {} : object(p.attach);
  for (const value of Object.values(attachments)) {
    const a = object(value);
    vec(a.at);
    switch (a.kind) {
      case 'seat':
        vec(a.exit);
        number(a.yaw);
        if (a.forward !== undefined) number(a.forward);
        if (a.perch !== undefined) number(a.perch);
        break;
      case 'label':
        vec(a.facing);
        if ((a.facing as number[]).every((n) => n === 0)) fail('zero label facing');
        number(a.w, true);
        number(a.h, true);
        break;
      case 'point':
        break;
      default:
        fail('unknown attachment');
    }
  }
  for (const value of p.interactions === undefined ? [] : list(p.interactions)) {
    const i = object(value);
    known(i.action, registry.interactions);
    if (i.gate !== undefined) known(i.gate, registry.gates);
    if (i.at !== undefined && !Object.hasOwn(attachments, text(i.at))) fail('unknown attachment reference');
  }
  if (p.material !== undefined) known(p.material, registry.materials);
  if (p.components !== undefined && Object.keys(object(p.components)).length) fail('v1 has no component initializers');
}
export function validateLevel(value: unknown, prefabs: Readonly<Record<string, PrefabDef>>): asserts value is LevelDef {
  validateJson(value);
  const level = object(value);
  text(level.place);
  const placements = list(level.placements),
    ids = new Set<string>();
  for (const value of placements) {
    const p = object(value),
      id = text(p.id);
    if (ids.has(id)) fail(`duplicate id ${id}`);
    ids.add(id);
    if (!Object.hasOwn(prefabs, text(p.prefab))) fail(`unknown prefab ${String(p.prefab)}`);
    vec(p.pos);
    if (p.rot !== undefined) vec(p.rot);
    if (p.scale !== undefined) vec(p.scale, true);
    if (p.params !== undefined) object(p.params);
    if (p.parent !== undefined) text(p.parent);
  }
  const parents = new Map(
    placements.map((p) => {
      const v = object(p);
      return [text(v.id), v.parent];
    }),
  );
  for (const id of ids) {
    const seen = new Set<string>([id]);
    let parent = parents.get(id);
    while (parent !== undefined) {
      const key = text(parent);
      if (!ids.has(key) || seen.has(key)) fail('missing or cyclic parent');
      seen.add(key);
      parent = parents.get(key);
    }
  }
}
function header(value: unknown, format: string) {
  validateJson(value);
  const a = object(value);
  if (a.format !== format) fail('unknown format');
  for (const [key, expected] of Object.entries(metadata)) if (a[key] !== expected) fail(`unknown ${key}`);
  return a;
}
export function validateArtifact(value: unknown, registry: NameRegistry = names): asserts value is PrefabArtifact {
  const a = header(value, 'boogle-prefabs');
  for (const [key, prefab] of Object.entries(object(a.prefabs))) {
    validatePrefab(prefab, registry);
    if (key !== prefab.key) fail('prefab key mismatch');
  }
}
export function validateLevelArtifact(
  value: unknown,
  prefabs: Readonly<Record<string, PrefabDef>>,
): asserts value is LevelArtifact {
  header(value, 'boogle-level');
  validateLevel(value, prefabs);
}
