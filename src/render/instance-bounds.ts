import { Matrix4, Sphere, type InstancedMesh } from 'three/webgpu';

const transform = new Matrix4();
const instance = new Sphere();
const PAD = 0.5;
const isFinite = (v: { x: number; y: number; z: number }) =>
  Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);

function computeFittedSphere(this: InstancedMesh) {
  const bounds = (this.boundingSphere ??= new Sphere()).makeEmpty();
  if (!this.geometry.boundingSphere) this.geometry.computeBoundingSphere();
  const local = this.geometry.boundingSphere!;
  for (let slot = 0; slot < this.count; slot++) {
    this.getMatrixAt(slot, transform);
    instance.copy(local).applyMatrix4(transform);
    // A non-finite instance (a bad pose) is left out, so it can never make the whole batch's sphere NaN.
    if (instance.radius > 0 && Number.isFinite(instance.radius) && isFinite(instance.center)) bounds.union(instance);
  }
  if (!bounds.isEmpty()) bounds.radius += PAD;
}

export function fitInstanceBounds(mesh: InstancedMesh) {
  mesh.computeBoundingSphere = computeFittedSphere;
  mesh.computeBoundingSphere();
  mesh.frustumCulled = true;
}
