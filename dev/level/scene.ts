// Read-only Rapier queries over source-described solids. No renderer, controller imitation, or gameplay authority.
import type * as Rapier from '@dimforge/rapier3d';
import type { Shape, V3, Quat, BodyOptions } from '../../src/physics/engine.ts';
import * as constants from '../../src/constants.ts';
import { sourceFunction } from './source.ts';

export type Source = { file: string; symbol: string };
export type Solid = {
  id: string;
  source: Source;
  shape: Shape;
  position: V3;
  rotation?: Quat;
  support: 'grounded' | 'embedded' | 'suspended' | 'assembly';
};
export type Finding = {
  rule: string;
  object: string;
  source: Source;
  surface: string | null;
  world: number[];
  requiredState: string;
  evidence: Record<string, unknown>;
  suggestion: string;
};
export const identity = { x: 0, y: 0, z: 0, w: 1 };

export async function openScene(solids: Solid[]) {
  const start = performance.now();
  await import('../sim/hooks.ts');
  const R = await import('@dimforge/rapier3d');
  const world = new R.World({ x: 0, y: 0, z: 0 });
  // Execute the real facade conversion, including the heightfield's axis/translation convention.
  const describe = sourceFunction<(s: Shape) => Rapier.ColliderDesc | null>(
    'src/physics/backend-rapier.ts',
    'colliderDesc',
    { R },
  );
  const makePlayer = sourceFunction<(kinematic: boolean) => BodyOptions>('src/physics/physics.ts', 'makePlayerBody', {
    ...constants,
    BODY: { DYNAMIC: 'dynamic', KINEMATIC: 'kinematic' },
    playerMat: {},
    NOT_SCENERY: 0,
    createBody: (options: BodyOptions) => options,
  });
  const player = makePlayer(false).shapes;
  if (!player || player.some((s) => s.kind !== 'sphere'))
    throw new Error('Unsupported makePlayerBody shape; extend audit');
  const bodies = new Map<number, Solid>();
  for (const solid of solids) {
    const desc = describe(solid.shape);
    if (!desc) throw new Error(`No collider for ${solid.id}`);
    if (solid.shape.offset && solid.shape.kind !== 'heightfield')
      desc.setTranslation(solid.shape.offset.x, solid.shape.offset.y, solid.shape.offset.z);
    if (solid.shape.rotation) desc.setRotation(solid.shape.rotation);
    const body = world.createRigidBody(
      R.RigidBodyDesc.fixed()
        .setTranslation(solid.position.x, solid.position.y, solid.position.z)
        .setRotation(solid.rotation ?? identity),
    );
    const collider = world.createCollider(desc, body);
    bodies.set(collider.handle, solid);
  }
  world.step();
  const physicsInit = performance.now() - start;
  const below = (point: V3, distance = 3, excluded?: string, support?: string) => {
    const hit = world.castRay(
      new R.Ray(point, { x: 0, y: -1, z: 0 }),
      distance,
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      (c) => bodies.get(c.handle)?.id !== excluded && (!support || bodies.get(c.handle)?.id === support),
    );
    return hit ? { y: point.y - hit.timeOfImpact, solid: bodies.get(hit.collider.handle)! } : null;
  };
  const clear = (feet: V3) => {
    for (const s of player) {
      if (s.kind !== 'sphere') continue;
      const p = {
        x: feet.x + (s.offset?.x ?? 0),
        y: feet.y + constants.PLAYER_R + 0.025 + (s.offset?.y ?? 0),
        z: feet.z + (s.offset?.z ?? 0),
      };
      const hit = world.intersectionWithShape(p, identity, new R.Ball(s.r));
      if (hit) return bodies.get(hit.handle)!;
    }
    return null;
  };
  const sweep = (from: V3, to: V3) => {
    for (const s of player) {
      if (s.kind !== 'sphere') continue;
      const p = {
        x: from.x + (s.offset?.x ?? 0),
        y: from.y + constants.PLAYER_R + 0.025 + (s.offset?.y ?? 0),
        z: from.z + (s.offset?.z ?? 0),
      };
      const hit = world.castShape(
        p,
        identity,
        { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z },
        new R.Ball(s.r),
        0,
        1,
        true,
      );
      if (hit) return { blocker: bodies.get(hit.collider.handle)?.id, fraction: hit.time_of_impact };
    }
    return null;
  };
  return { world, below, clear, sweep, physicsInit, player };
}
