// Record interaction branches at the physics boundary using the supplied real collider function.
import * as THREE from 'three/webgpu';
import type { TreeSource } from '../../src/place/tree-sources.ts';
import type { TreePose } from '../../src/render/place-tree-view.ts';
import type { Body } from '../../src/physics/engine.ts';

export function treeColliderCase(
  loadSolids: (
    bindings: Record<string, unknown>,
  ) => typeof import('../../src/render/place-tree-view.ts').createTreeSolids,
  sources: readonly TreeSource[],
  ground: (x: number, z: number) => number,
  carried: boolean,
) {
  const events: unknown[] = [];
  let probes = 0;
  const createTreeSolids = loadSolids({
    THREE,
    teleport: (_body: Body, x: number, y: number, z: number) => {
      events.push({ kind: 'teleport', x, y, z });
      player.position.set(x, y, z);
    },
    sweepSphere: (from: unknown, to: unknown, radius: number, options: unknown) => {
      // Exercise one occupied candidate followed by a clear one; do not model Rapier in this golden.
      const hit = probes++ === 0 ? 0.5 : -1;
      events.push({ kind: 'sweep', from, to, radius, options, hit });
      return hit;
    },
  });
  const trees = sources.map(
    (t) => ({ ...t, body: null, stump: null, fall: -1, collapsed: false, fallYaw: 0 }) as TreePose,
  );
  const tree = trees.find((t) => (carried ? t.great : !t.cleared && !t.great && !t.hardwood))!;
  tree.fall = 2;
  const player = {
    position: new THREE.Vector3(tree.x, tree.y + 0.5, tree.z + 1),
    velocity: { set: (x: number, y: number, z: number) => events.push({ kind: 'velocity', x, y, z }) },
  };
  const initialPlayer = player.position.toArray();
  const solid = createTreeSolids(
    trees,
    ground,
    (shape, position, rotation) => {
      events.push({ kind: 'body', shape, position, ...(rotation ? { rotation: rotation.toArray() } : {}) });
      return {} as Body;
    },
    () => {
      events.push({ kind: 'player-read' });
      return player as unknown as Body;
    },
    () => carried,
    () => {},
  );
  solid(tree);
  return { id: tree.index, carried, initialPlayer, events, finalPlayer: player.position.toArray() };
}
