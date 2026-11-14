import { resolveLayout } from './resolve-layout.ts';
import { names, type NameRegistry } from './names.ts';
import {
  metadata,
  type ColliderDef,
  type LevelArtifact,
  type LevelDef,
  type Placement,
  type PrefabArtifact,
  type PrefabDef,
  type Vec3,
} from './types.ts';

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
// Local matrix decomposition introduces a few ulps even for authored unit scales. Reject real distortion,
// not those representation errors; compiler and runtime use the same relative comparison.
const SCALE_RELATIVE_TOLERANCE = 1e-9;
export function validateColliderWorldTransforms(
  colliders: readonly ColliderDef[],
  chain: readonly Basis[],
): readonly Basis[] {
  const equal = (a: number, b: number) =>
    Math.abs(a - b) <= SCALE_RELATIVE_TOLERANCE * Math.max(Math.abs(a), Math.abs(b));
  let world: Basis = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  for (const basis of chain) world = composeBasis(world, basis);
  const checked: Basis[] = [];
  for (const c of colliders) {
    // The sole physical rule: owner/parents, placement and collider are composed BEFORE testing support.
    const basis = composeBasis(world, placementBasis({ rot: c.rot }));
    const scale: Vec3 = [Math.hypot(...basis[0]), Math.hypot(...basis[1]), Math.hypot(...basis[2])];
    vec(scale, true);
    const unit = basis.map((axis, i) => axis.map((n) => n / scale[i]!)) as unknown as Basis;
    const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const determinant =
      unit[0][0] * (unit[1][1] * unit[2][2] - unit[1][2] * unit[2][1]) -
      unit[1][0] * (unit[0][1] * unit[2][2] - unit[0][2] * unit[2][1]) +
      unit[2][0] * (unit[0][1] * unit[1][2] - unit[0][2] * unit[1][1]);
    if (determinant <= 0) fail('non-positive collider world scale');
    const orthogonal =
      Math.abs(dot(unit[0], unit[1])) <= SCALE_RELATIVE_TOLERANCE &&
      Math.abs(dot(unit[0], unit[2])) <= SCALE_RELATIVE_TOLERANCE &&
      Math.abs(dot(unit[1], unit[2])) <= SCALE_RELATIVE_TOLERANCE;
    if (!orthogonal) fail('sheared collider world basis');
    const uniform = equal(scale[0], scale[1]) && equal(scale[0], scale[2]) && equal(scale[1], scale[2]);
    if (c.shape === 'sphere' && !uniform) fail('sphere needs uniform scale');
    if (c.shape === 'trunk' && !equal(scale[0], scale[2])) fail('trunk needs equal radial scale');
    checked.push(basis);
  }
  return checked;
}

type Basis = readonly [Vec3, Vec3, Vec3];
const composeBasis = (a: Basis, b: Basis): Basis => [applyBasis(a, b[0]), applyBasis(a, b[1]), applyBasis(a, b[2])];
const applyBasis = (b: Basis, v: Vec3): Vec3 => [
  b[0][0] * v[0] + b[1][0] * v[1] + b[2][0] * v[2],
  b[0][1] * v[0] + b[1][1] * v[1] + b[2][1] * v[2],
  b[0][2] * v[0] + b[1][2] * v[1] + b[2][2] * v[2],
];
/** Match three's YXZ Euler -> quaternion -> Matrix4.compose operation order, without importing the renderer.
 * Algebraically equivalent direct Euler matrices differ by ulps, amplified by extreme scale ratios.
 * References: three/src/math/Quaternion.js setFromEuler, Matrix4.js compose; round-trip tests guard parity.
 */
function placementBasis(p: Pick<Placement, 'rot' | 'scale'>): Basis {
  const [yaw, pitch, roll] = p.rot ?? [0, 0, 0],
    [sx, sy, sz] = p.scale ?? [1, 1, 1];
  const c1 = Math.cos(pitch / 2),
    c2 = Math.cos(yaw / 2),
    c3 = Math.cos(roll / 2);
  const s1 = Math.sin(pitch / 2),
    s2 = Math.sin(yaw / 2),
    s3 = Math.sin(roll / 2);
  const x = s1 * c2 * c3 + c1 * s2 * s3,
    y = c1 * s2 * c3 - s1 * c2 * s3;
  const z = c1 * c2 * s3 - s1 * s2 * c3,
    w = c1 * c2 * c3 + s1 * s2 * s3;
  const x2 = x + x,
    y2 = y + y,
    z2 = z + z;
  const xx = x * x2,
    xy = x * y2,
    xz = x * z2,
    yy = y * y2,
    yz = y * z2,
    zz = z * z2;
  const wx = w * x2,
    wy = w * y2,
    wz = w * z2;
  return [
    [(1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx],
    [(xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy],
    [(xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz],
  ];
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
  if (Array.isArray(value) && Object.getPrototypeOf(value) !== Array.prototype) fail('non-JSON array subclass');
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
    if (v.instances !== undefined) {
      if (!v.batch || !list(v.instances).length) fail('instances need a batch and at least one transform');
      for (const value of list(v.instances)) {
        const instance = object(value);
        vec(instance.pos);
        if (instance.rot !== undefined) vec(instance.rot);
        if (instance.scale !== undefined) vec(instance.scale, true);
      }
    }
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
      case 'trimesh': {
        const vertices = list(c.vertices),
          indices = list(c.indices);
        if (vertices.length < 9 || vertices.length % 3 || !indices.length || indices.length % 3)
          fail('malformed trimesh arrays');
        vertices.forEach((n) => number(n));
        for (const i of indices)
          if (!Number.isInteger(i) || (i as number) < 0 || (i as number) >= vertices.length / 3)
            fail('trimesh index out of range');
        for (let k = 0; k < indices.length; k += 3) {
          const a = (indices[k] as number) * 3,
            b = (indices[k + 1] as number) * 3,
            d = (indices[k + 2] as number) * 3;
          const u = [0, 1, 2].map((j) => (vertices[b + j] as number) - (vertices[a + j] as number));
          const v = [0, 1, 2].map((j) => (vertices[d + j] as number) - (vertices[a + j] as number));
          if (!Math.hypot(u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!))
            fail('degenerate trimesh triangle');
        }
        break;
      }
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
        if (a.idSuffix !== undefined) text(a.idSuffix);
        if (a.group !== undefined) text(a.group);
        if (a.anchorView !== undefined && a.anchorView !== true) fail('expected anchorView true');
        break;
      case 'label':
        vec(a.facing);
        if ((a.facing as number[]).every((n) => n === 0)) fail('zero label facing');
        number(a.w, true);
        number(a.h, true);
        if (a.posts !== undefined) known(a.posts, ['one', 'two', 'none']);
        if ((a.facing as number[])[1] !== 0) fail('standing label needs horizontal facing');
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
/** Structure only: a placement's physical scale cannot be judged without its actual parent/owner frame. */
export function validatePlacement(
  value: unknown,
  prefabs: Readonly<Record<string, PrefabDef>>,
): asserts value is Placement {
  validateJson(value);
  const p = object(value);
  text(p.id);
  if (!Object.hasOwn(prefabs, text(p.prefab))) fail(`unknown prefab ${String(p.prefab)}`);
  vec(p.pos);
  if (p.rot !== undefined) vec(p.rot);
  if (p.scale !== undefined) vec(p.scale, true);
  if (p.params !== undefined) object(p.params);
  if (p.parent !== undefined) text(p.parent);
  const labels = p.labels === undefined ? {} : object(p.labels);
  const attachments = prefabs[text(p.prefab)]!.attach ?? {};
  for (const [name, key] of Object.entries(labels)) {
    if (attachments[name]?.kind !== 'label') fail('unknown label attachment');
    text(key);
  }
  for (const [name, a] of Object.entries(attachments))
    if (a.kind === 'label' && !Object.hasOwn(labels, name)) fail('missing label text reference');
}
export function validateLevel(value: unknown, prefabs: Readonly<Record<string, PrefabDef>>): asserts value is LevelDef {
  validateJson(value);
  const raw = object(value);
  if (raw.layout !== undefined) {
    validateLevel(resolveLayout(raw as unknown as LevelDef), prefabs);
    return;
  }
  const level = raw;
  text(level.place);
  const placements = list(level.placements),
    ids = new Set<string>();
  for (const value of placements) {
    validatePlacement(value, prefabs);
    const id = value.id;
    if (ids.has(id)) fail(`duplicate id ${id}`);
    ids.add(id);
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
  // Parent references are now known and acyclic. Include their authored scale and rotation in each check.
  const byId = new Map((placements as Placement[]).map((p) => [p.id, p]));
  const chains = new Map<string, readonly Basis[]>();
  const worldChain = (id: string): readonly Basis[] => {
    const cached = chains.get(id);
    if (cached) return cached;
    const p = byId.get(id)!;
    const chain = [...(p.parent ? worldChain(p.parent) : []), placementBasis(p)];
    chains.set(id, chain);
    return chain;
  };
  for (const p of byId.values()) {
    validateColliderWorldTransforms(prefabs[p.prefab]!.colliders, worldChain(p.id));
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

/** Resolve the same authored artifact for runtime, tools and checks, then validate every world basis. */
export function loadLevelArtifact(value: unknown, prefabs: Readonly<Record<string, PrefabDef>>): LevelArtifact {
  header(value, 'boogle-level');
  const resolved = resolveLayout(value as LevelArtifact) as LevelArtifact;
  validateLevel(resolved, prefabs);
  return resolved;
}
