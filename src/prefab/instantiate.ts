// The only runtime door: compiled data becomes owned meshes, bodies and seat registrations.
// Local only. Seat authority, ids and registration lifetime retain the existing seat service's contract.
import * as THREE from 'three/webgpu';
import artifact from '../../content/built/prefabs.json' with { type: 'json' };
import workshop from '../../content/built/levels/workshop.json' with { type: 'json' };
import gorge from '../../content/built/levels/gorge.json' with { type: 'json' };
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
import './builders/greybox-box.ts';
import { builders } from './builders.ts';
import { makeGreyboxLabel } from './builders/greybox-label.ts';
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
const gorgeLevel: unknown = gorge;
validateLevelArtifact(gorgeLevel, compiled.prefabs);
export const gorgePlacements = gorgeLevel.placements;
for (const name of names.builders)
  if (!builders.has(name as BuilderName)) throw new Error(`prefabs: missing builder ${name}`);
const euler = (v: Vec3 = [0, 0, 0]) => new THREE.Euler(v[1], v[0], v[2], 'YXZ');

type PrefabBatch = { key: PrefabKey; owner: OwnedView; mesh: THREE.InstancedMesh; slots: Set<number> };
/** One owner-local shared draw, including legacy boxes until their conversion. Instances keep their own lifetime. */
export function createPrefabBatch(key: PrefabKey, count: number, owner: OwnedView): PrefabBatch {
  if (!owner.alive) throw new Error('prefabs: cannot batch for a disposed owner');
  const def = compiled.prefabs[key];
  if (!def || !('builder' in def.visual) || !def.visual.batch) throw new Error('prefabs: expected batched builder');
  const mesh = builders.get(def.visual.builder)!({ ...def.visual.params, count });
  if (!(mesh instanceof THREE.InstancedMesh)) throw new Error('prefabs: batch builder must return InstancedMesh');
  // A fresh instance is disabled until setEnabled(true), including slots not instantiated yet.
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < mesh.count; i++) mesh.setMatrixAt(i, hidden);
  mesh.instanceMatrix.needsUpdate = true;
  mesh.name = def.visual.batch;
  owner.add(mesh);
  return { key, owner, mesh, slots: new Set() };
}

export function instantiate(
  key: PrefabKey,
  placement: Placement,
  options: {
    owner: OwnedView;
    gates?: Readonly<Record<string, () => boolean>>;
    batch?: { target: PrefabBatch; index: number };
    texts?: Readonly<Record<string, readonly string[]>>;
  },
) {
  const owner = options.owner;
  if (!owner.alive) throw new Error('prefabs: cannot instantiate for a disposed owner');
  const def = compiled.prefabs[key];
  if (!def || placement.prefab !== key) throw new Error(`prefabs: unknown or mismatched prefab ${key}`);
  validatePrefab(def);
  validatePlacement(placement, compiled.prefabs);
  // These fields have no authored users yet. Fail closed until their conversion step provides the implementation.
  if ('asset' in def.visual || def.material)
    throw new Error('prefabs: asset and material implementations await their conversion steps');
  const batch = options.batch;
  const parts = 'builder' in def.visual ? def.visual.instances : undefined;
  const slots = parts?.length ?? 1;
  const batchVisual = batch && compiled.prefabs[batch.target.key]?.visual;
  if ('builder' in def.visual && def.visual.batch) {
    if (
      !batch ||
      batch.target.owner !== owner ||
      !batchVisual ||
      !('builder' in batchVisual) ||
      batchVisual.builder !== def.visual.builder ||
      batchVisual.batch !== def.visual.batch ||
      !Number.isInteger(batch.index) ||
      batch.index < 0 ||
      batch.index + slots > batch.target.mesh.count ||
      Array.from({ length: slots }, (_, i) => batch.target.slots.has(batch.index + i)).some(Boolean)
    )
      throw new Error('prefabs: missing, mismatched or occupied batch slot');
  } else if (batch) throw new Error('prefabs: unexpected batch');
  const labels = Object.entries(def.attach ?? {}).flatMap(([name, a]) => {
    if (a.kind !== 'label') return [];
    const key = placement.labels![name]!;
    const lines = options.texts && Object.hasOwn(options.texts, key) ? options.texts[key] : undefined;
    if (!lines?.length || lines.some((line) => typeof line !== 'string'))
      throw new Error(`prefabs: missing label text ${key}`);
    return [{ a, lines }];
  });
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
    // With an identity owner and no collider rotation, retain the authored TRS exactly rather than
    // introducing decomposition ulps. The full world basis above still validates every collider first.
    if (!c.rot && owner.root.matrixWorld.equals(new THREE.Matrix4())) {
      q.setFromEuler(euler(placement.rot));
      scale.fromArray(placement.scale ?? [1, 1, 1]);
    }
    const add = (shape: Shape, at = c.at) =>
      recipes.push({
        shape,
        at: world(at),
        ...(placement.rot || q.x || q.y || q.z ? { q } : {}),
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
      case 'trimesh':
        add({
          kind: 'trimesh',
          vertices: c.vertices.map((n, i) => n * scale.getComponent(i % 3)),
          indices: [...c.indices],
        });
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
  if ('builder' in def.visual) {
    for (let i = 0; i < slots; i++) {
      const visual = builders.get(def.visual.builder)!(
        { ...def.visual.params, ...placement.params },
        batch ? { mesh: batch.target.mesh, index: batch.index + i } : undefined,
      );
      if (!batch) root.add(visual);
      else batch.target.slots.add(batch.index + i);
    }
  }
  for (const { a, lines } of labels) {
    const label = makeGreyboxLabel(a, lines);
    root.add(label.mesh);
    owner.cleanup(label.dispose);
  }
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
    if (batch) {
      for (let i = 0; i < slots; i++) {
        const part = parts?.[i];
        const matrix = part
          ? localMatrix
              .clone()
              .multiply(
                new THREE.Matrix4().compose(
                  new THREE.Vector3().fromArray(part.pos),
                  new THREE.Quaternion().setFromEuler(euler(part.rot)),
                  new THREE.Vector3().fromArray(part.scale ?? [1, 1, 1]),
                ),
              )
          : localMatrix;
        batch.target.mesh.setMatrixAt(batch.index + i, on ? matrix : new THREE.Matrix4().makeScale(0, 0, 0));
      }
      batch.target.mesh.instanceMatrix.needsUpdate = true;
      batch.target.mesh.computeBoundingBox();
      batch.target.mesh.computeBoundingSphere();
    }
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
    if (batch) for (let i = 0; i < slots; i++) batch.target.slots.delete(batch.index + i);
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
