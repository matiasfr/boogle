// The couplings between a train's vehicles: a drawbar from one headstock to the next, and a pair of buffers on each
// car's end facing it, so the gap between two vehicles reads as a coupling and not a detached car (owner, 14 November,
// after the cars were spaced along their own track: car-spacing.ts stretches a coupling up to 0.27 m round a bend,
// and the bar stretches with it). Drawn only: no collider, no state; two instanced batches for every train.
import * as THREE from 'three/webgpu';
import { guardInstances } from '../../render/draw-count.ts';
import { flat } from '../../render/flat.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { BOTTOM, type Car } from './car.ts';
import { CAR_BUFFER } from './car-spacing.ts';

/** The bar's section and its height over the rail at a car's headstock and under the engine's frame; a buffer: its
 * radius, how far it stands out from a car's end, how far off the middle, and its height. */
const BAR = { w: 0.12, h: 0.1, y: 0.42, engine: 0.52 },
  BUFFER = { ...CAR_BUFFER, y: 0.46 };

/** `links`: the most couplings shown at once (car-spacing.ts couplingCapacity of the fleet). */
export function createCouplings(owner: OwnedView, links: number) {
  const MAX = links;
  const iron = flat('#2c2e34', 0.6);
  const barGeo = new THREE.BoxGeometry(1, 1, 1),
    bufferGeo = new THREE.CylinderGeometry(BUFFER.r, BUFFER.r, 1, 10).rotateX(Math.PI / 2);
  const bars = guardInstances(new THREE.InstancedMesh(barGeo, iron, MAX), 'train couplings'),
    buffers = guardInstances(new THREE.InstancedMesh(bufferGeo, iron, MAX * 4), 'train buffers');
  for (const m of [bars, buffers]) {
    m.count = 0;
    m.frustumCulled = false;
    m.castShadow = true;
    owner.add(m);
  }
  owner.cleanup(() => {
    bars.removeFromParent();
    buffers.removeFromParent();
    barGeo.dispose();
    bufferGeo.dispose();
  });
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    at = new THREE.Vector3(),
    size = new THREE.Vector3(),
    q = new THREE.Quaternion(),
    m = new THREE.Matrix4();
  const AHEAD = new THREE.Vector3(0, 0, 1),
    UP = new THREE.Vector3(0, 1, 0);
  /** A point of `c` as it is drawn: `x` across, `z` along from its middle, `y` over the rail line (the car's mesh
   * sits BOTTOM + hy over it). */
  const point = (c: Car, x: number, z: number, y: number, out: THREE.Vector3) => {
    const yaw = c.mesh.rotation.y,
      k = c.mesh.scale.x;
    const cos = Math.cos(yaw),
      sin = Math.sin(yaw);
    return out.set(
      c.mesh.position.x + (x * cos + z * sin) * k,
      c.mesh.position.y + (y - BOTTOM - c.hy) * k,
      c.mesh.position.z + (-x * sin + z * cos) * k,
    );
  };
  const stub = (c: Car, end: 1 | -1) => {
    if (buffers.count + 2 > MAX * 4) return;
    q.setFromAxisAngle(UP, c.mesh.rotation.y);
    for (const side of [-1, 1]) {
      point(c, side * BUFFER.x, end * (c.spec.hz + BUFFER.out / 2), BUFFER.y, at);
      buffers.setMatrixAt(buffers.count++, m.compose(at, q, size.set(1, 1, BUFFER.out)));
    }
  };
  return {
    begin() {
      bars.count = buffers.count = 0;
    },
    /** Couple `front` to `back`, the next vehicle behind it. `ownBuffers`: `front` is the engine, whose model has its
     * buffers. Skipped while either is not drawn. */
    link(front: Car, back: Car, ownBuffers: boolean) {
      if (!front.mesh.visible || !back.mesh.visible || bars.count >= MAX) return;
      point(front, 0, -front.spec.hz, ownBuffers ? BAR.engine : BAR.y, a);
      point(back, 0, back.spec.hz, BAR.y, b);
      const len = a.distanceTo(b);
      if (len < 0.02 || len > 6) return;
      q.setFromUnitVectors(AHEAD, at.subVectors(a, b).divideScalar(len));
      bars.setMatrixAt(
        bars.count++,
        m.compose(at.addVectors(a, b).multiplyScalar(0.5), q, size.set(BAR.w, BAR.h, len)),
      );
      if (!ownBuffers) stub(front, -1);
      stub(back, 1);
    },
    end() {
      bars.instanceMatrix.needsUpdate = buffers.instanceMatrix.needsUpdate = true;
    },
  };
}
