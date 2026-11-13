// Generated coverage: every committed record and placement participates, without named-record assertions.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateArtifact, validateLevelArtifact } from '../src/prefab/validate.ts';
import artifact from '../content/built/prefabs.json' with { type: 'json' };
import type { ColliderDef, Vec3, PrefabDef } from '../src/prefab/types.ts';
import { FORGE } from '../src/place/layout.ts';

function inside(point: Vec3, c: ColliderDef) {
  let [x, y, z] = point.map((n, i) => n - c.at[i]!) as [number, number, number];
  // Undo YXZ (yaw, then pitch, then roll); Local scenery, never lockstep math.
  const [yaw, pitch, roll] = c.rot ?? [0, 0, 0];
  [x, z] = [x * Math.cos(yaw) - z * Math.sin(yaw), x * Math.sin(yaw) + z * Math.cos(yaw)];
  [y, z] = [y * Math.cos(pitch) + z * Math.sin(pitch), -y * Math.sin(pitch) + z * Math.cos(pitch)];
  [x, y] = [x * Math.cos(roll) + y * Math.sin(roll), -x * Math.sin(roll) + y * Math.cos(roll)];
  switch (c.shape) {
    case 'box':
      return Math.abs(x) <= c.half[0] && Math.abs(y) <= c.half[1] && Math.abs(z) <= c.half[2];
    case 'sphere':
      return x * x + y * y + z * z <= c.r * c.r;
    case 'trunk':
      return x * x + z * z <= c.r * c.r && Math.abs(y) <= c.h / 2;
    case 'capsule':
      return x * x + z * z + Math.max(0, Math.abs(y) - c.halfHeight) ** 2 <= c.r * c.r;
    case 'trimesh':
      throw new Error('Seat clearance on trimeshes needs an authored floor authority');
  }
}
test('every compiled record has valid geometry, names and clear seat exits', () => {
  const value: unknown = artifact;
  validateArtifact(value);
  for (const prefab of Object.values(value.prefabs)) {
    for (const attachment of Object.values(prefab.attach ?? {})) {
      if (attachment.kind !== 'seat') continue;
      assert.ok(!prefab.colliders.some((c) => inside(attachment.exit, c)), `${prefab.key}: exit inside collider`);
    }
    // A missing drawn mesh is explicit data, never a missing visual field.
    assert.ok('none' in prefab.visual || 'builder' in prefab.visual || 'asset' in prefab.visual);
  }
  for (const file of fs.globSync('content/built/levels/*.json')) {
    const level: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
    validateLevelArtifact(level, value.prefabs);
    for (const placement of level.placements) {
      const prefab: PrefabDef = value.prefabs[placement.prefab]!;
      for (const attachment of Object.values(prefab.attach ?? {})) {
        if (attachment.kind !== 'seat') continue;
        // Step 3's room levels use the owner's standing floor as y=0; the room golden proves its world frame.
        assert.ok(
          placement.pos[1] + attachment.exit[1] * (placement.scale?.[1] ?? 1) >= 0,
          `${placement.id}: exit below floor`,
        );
        // Floor extent comes from the existing room authority, not a per-prefab test or copied dimensions.
        assert.equal(level.place, 'workshop', 'a new place must supply its owning floor authority');
        assert.ok(Math.abs(placement.pos[0] + attachment.exit[0]) < FORGE.w / 2);
        assert.ok(Math.abs(placement.pos[2] + attachment.exit[2]) < FORGE.d / 2);
      }
    }
  }
});
