// The only runtime door: compiled data becomes owned meshes, bodies and seat registrations.
// Local only. Seat authority, ids and registration lifetime retain the existing seat service's contract.
import * as THREE from 'three/webgpu';
import artifact from '../../content/built/prefabs.json' with { type: 'json' };
import workshop from '../../content/built/levels/workshop.json' with { type: 'json' };
import { names } from './names.ts';
import type { BuilderName } from './names.ts';
import type { Attach, Placement, PrefabKey, Vec3 } from './types.ts';
import {
  validateArtifact,
  validateLevelArtifact,
  validatePlacement,
  validatePrefab,
  validateColliderWorldTransforms,
} from './validate.ts';
import './builders/seat-chair.ts';
import { builders } from './builders.ts';
import { registerSeat, type Seat } from '../entities/railway/seat.ts';
import { ROOM_GROUP, staticBody } from '../place/land.ts';
import type { Body, Shape } from '../physics/engine.ts';
import type { OwnedView } from '../render/owned-view.ts';

const compiled = (() => {
  const value: unknown = artifact;
  validateArtifact(value);
  return value;
})();
const room: unknown = workshop;
validateLevelArtifact(room, compiled.prefabs);
export const workshopChair = room.placements[0]!;
for (const name of names.builders)
  if (!builders.has(name as BuilderName)) throw new Error(`prefabs: missing builder ${name}`);
const euler = (v: Vec3 = [0, 0, 0]) => new THREE.Euler(v[1], v[0], v[2], 'YXZ');

export function instantiate(
  key: PrefabKey,
  placement: Placement,
  options: {
    owner: OwnedView;
    gates?: Readonly<Record<string, () => boolean>>;
  },
) {
  const owner = options.owner;
  if (!owner.alive) throw new Error('prefabs: cannot instantiate for a disposed owner');
  const def = compiled.prefabs[key];
  if (!def || placement.prefab !== key) throw new Error(`prefabs: unknown or mismatched prefab ${key}`);
  validatePrefab(def);
  validatePlacement(placement, compiled.prefabs);
  // These fields have no authored users yet. Fail closed until their conversion step provides the implementation.
  if ('asset' in def.visual || ('batch' in def.visual && def.visual.batch) || def.material)
    throw new Error('prefabs: asset, batch and material implementations await their conversion steps');
  const gates = new Map<string, () => boolean>();
  for (const interaction of def.interactions ?? []) {
    if (interaction.action !== 'seat.sit') throw new Error('prefabs: missing interaction implementation');
    if (!interaction.at || def.attach?.[interaction.at]?.kind !== 'seat')
      throw new Error('prefabs: seat action needs seat attachment');
    if (interaction.gate) {
      const gate =
        options.gates && Object.hasOwn(options.gates, interaction.gate) ? options.gates[interaction.gate] : undefined;
      if (typeof gate !== 'function') throw new Error(`prefabs: missing gate ${interaction.gate}`);
      gates.set(interaction.at, gate);
    }
  }
  // Preflight the ACTUAL owner + placement world frame, before allocating a root, visual, seat or body.
  const localMatrix = new THREE.Matrix4().compose(
    new THREE.Vector3().fromArray(placement.pos),
    new THREE.Quaternion().setFromEuler(euler(placement.rot)),
    new THREE.Vector3().fromArray(placement.scale ?? [1, 1, 1]),
  );
  owner.root.updateWorldMatrix(true, false);
  const matrixWorld = new THREE.Matrix4().multiplyMatrices(owner.root.matrixWorld, localMatrix);
  const e = matrixWorld.elements;
  const colliderBases = validateColliderWorldTransforms(def.colliders, [
    [
      [e[0]!, e[1]!, e[2]!],
      [e[4]!, e[5]!, e[6]!],
      [e[8]!, e[9]!, e[10]!],
    ],
  ]);
  // Compose in full precision. The final world frame already preserves the chair golden's literal values.
  const world = (at: Vec3) => new THREE.Vector3().fromArray(at).applyMatrix4(matrixWorld);
  const pose = (at: Vec3, yaw: number) => {
    const p = world(at);
    const facing = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(new THREE.Quaternion().setFromEuler(euler([yaw, 0, 0])))
      .transformDirection(matrixWorld);
    return { x: p.x, y: p.y, z: p.z, yaw: Math.atan2(facing.x, facing.z) };
  };
  const recipes: { shape: Shape; at: THREE.Vector3; q?: THREE.Quaternion; group?: number }[] = [];
  for (const [i, c] of def.colliders.entries()) {
    // Use the checked collider basis itself: rotations can permute unequal world-axis lengths.
    const [x, y, z] = colliderBases[i]!;
    const q = new THREE.Quaternion(),
      scale = new THREE.Vector3();
    new THREE.Matrix4()
      .set(x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, 0, 0, 0, 1)
      .decompose(new THREE.Vector3(), q, scale);
    const add = (shape: Shape, at = c.at) =>
      recipes.push({
        shape,
        at: world(at),
        ...(q.x || q.y || q.z ? { q } : {}),
        ...(c.group === 'room' ? { group: ROOM_GROUP } : {}),
      });
    switch (c.shape) {
      case 'box':
        add({ kind: 'box', hx: c.half[0] * scale.x, hy: c.half[1] * scale.y, hz: c.half[2] * scale.z });
        break;
      case 'sphere':
        add({ kind: 'sphere', r: c.r * scale.x });
        break;
      case 'trunk':
        add({ kind: 'cylinder', rTop: c.r * scale.x, rBottom: c.r * scale.x, h: c.h * scale.y, segments: 12 });
        break;
      case 'capsule':
        // No capsule shape in today's staticBody API; do not silently approximate a future record.
        throw new Error('prefabs: capsule implementation awaits an authored user');
    }
  }
  let enabled = false,
    disposed = false;
  const root = new THREE.Group();
  root.visible = enabled;
  root.position.fromArray(placement.pos);
  root.rotation.copy(euler(placement.rot));
  root.scale.fromArray(placement.scale ?? [1, 1, 1]);
  if ('builder' in def.visual)
    root.add(builders.get(def.visual.builder)!({ ...def.visual.params, ...placement.params }));
  owner.add(root);
  root.updateWorldMatrix(true, true);
  const bodies: Body[] = [],
    seats: Seat[] = [],
    unseats: (() => void)[] = [];
  for (const [name, a] of Object.entries(def.attach ?? {})) {
    if (a.kind !== 'seat') continue;
    const seat: Seat = {
      id:
        Object.values(def.attach ?? {}).filter((a) => a.kind === 'seat').length === 1
          ? placement.id
          : `${placement.id}/${name}`,
      group: placement.id,
      at: pose(a.at, a.yaw),
      exit: pose(a.exit, a.yaw),
      available: gates.get(name) ?? (() => true),
      ...(a.forward === undefined ? {} : { forward: a.forward }),
      ...(a.perch === undefined ? {} : { perch: a.perch }),
    };
    seats.push(seat);
    unseats.push(registerSeat(seat));
  }
  function setEnabled(on: boolean) {
    if (disposed || on === enabled) return;
    enabled = on;
    root.visible = on;
    if (on) for (const r of recipes) bodies.push(owner.addBody(staticBody(r.shape, r.at, r.q, r.group)));
    else {
      for (const body of bodies) owner.removeBody(body);
      bodies.length = 0;
    }
  }
  function dispose() {
    if (disposed) return;
    setEnabled(false);
    disposed = true;
    for (const unseat of unseats) unseat();
    root.removeFromParent();
  }
  owner.cleanup(dispose);
  return {
    root,
    bodies,
    seats,
    attach(name: string): { definition: Attach; at: THREE.Vector3 } {
      const a = def.attach?.[name];
      if (!a) throw new Error(`prefabs: missing attachment ${name}`);
      return { definition: a, at: world(a.at) };
    },
    setEnabled,
    dispose,
  };
}
