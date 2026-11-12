// One view's meshes, collision bodies and subscriptions. Shared materials stay with their caches.
import * as THREE from 'three/webgpu';
import { addBody, removeBody, type Body } from '../physics/engine.ts';
import type { FrameCtx } from '../loop.ts';

const owners = new WeakMap<THREE.Object3D, OwnedView>();
export type OwnedView = ReturnType<typeof createOwnedView>;

/** Late-loaded kit geometry follows the receiving view's lifetime, never the shared asset's. */
export function setViewGeometry(mesh: THREE.Mesh, geometry: THREE.BufferGeometry) {
  const owner = owners.get(mesh);
  mesh.geometry = owner ? owner.geometry(geometry) : geometry;
}

export function createOwnedView() {
  const root = new THREE.Group();
  const bodies = new Set<Body>();
  const disposers: (() => void)[] = [];
  const geometries = new Map<THREE.BufferGeometry, THREE.BufferGeometry>();
  const attached = new Set<THREE.Object3D>();
  const animations: { run: (ctx: FrameCtx) => void; order: number }[] = [];
  let alive = true;
  const owner = {
    root,
    get alive() {
      return alive;
    },
    geometry(source: THREE.BufferGeometry) {
      let owned = geometries.get(source);
      if (!owned) {
        owned = source.clone();
        geometries.set(source, owned);
      }
      return owned;
    },
    add(...objects: THREE.Object3D[]) {
      for (const object of objects) {
        root.add(object);
        object.traverse((part) => {
          if (attached.has(part)) return;
          attached.add(part);
          owners.set(part, owner);
          if (part instanceof THREE.Mesh) part.geometry = owner.geometry(part.geometry);
          if (part instanceof THREE.InstancedMesh) disposers.push(() => part.dispose());
        });
      }
    },
    body(body: Body) {
      bodies.add(body);
      return body;
    },
    /** Adds a body to the world and owns it: it leaves with the view. */
    addBody(body: Body) {
      // boogle-disable-next-line boogle/use-an-entity -- the view's owner is where a body's lifetime is kept
      addBody(body);
      bodies.add(body);
      return body;
    },
    removeBody(body: Body) {
      bodies.delete(body);
      removeBody(body);
    },
    counts() {
      let meshes = 0;
      const drawnGeometry = new Set<THREE.BufferGeometry>();
      root.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          meshes++;
          drawnGeometry.add(object.geometry);
        }
      });
      return { meshes, bodies: bodies.size, geometries: drawnGeometry.size, animations: animations.length };
    },
    cleanup(dispose: () => void) {
      disposers.push(dispose);
    },
    animate(run: (ctx: FrameCtx) => void, order: number) {
      animations.push({ run, order });
      animations.sort((a, b) => a.order - b.order);
    },
    update(ctx: FrameCtx) {
      for (const animation of animations) animation.run(ctx);
    },
    dispose() {
      if (!alive) return;
      alive = false;
      for (const dispose of disposers.reverse()) dispose();
      for (const body of bodies) removeBody(body);
      for (const geometry of geometries.values()) geometry.dispose();
      for (const object of attached) owners.delete(object);
      root.clear();
      root.removeFromParent();
      bodies.clear();
      geometries.clear();
      attached.clear();
      disposers.length = 0;
      animations.length = 0;
    },
  };
  return owner;
}
