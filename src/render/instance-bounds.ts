import { Matrix4, Sphere, type InstancedMesh } from 'three/webgpu';

const transform = new Matrix4();
const instance = new Sphere();
const PAD = 0.5;

function computeFittedSphere(this: InstancedMesh) {
  const bounds = (this.boundingSphere ??= new Sphere()).makeEmpty();
  if (!this.geometry.boundingSphere) this.geometry.computeBoundingSphere();
  const local = this.geometry.boundingSphere!;
  for (let slot = 0; slot < this.count; slot++) {
    this.getMatrixAt(slot, transform);
    instance.copy(local).applyMatrix4(transform);
    if (instance.radius > 0) bounds.union(instance);
  }
  if (!bounds.isEmpty()) bounds.radius += PAD;
}

export function fitInstanceBounds(mesh: InstancedMesh) {
  mesh.computeBoundingSphere = computeFittedSphere;
  mesh.computeBoundingSphere();
  mesh.frustumCulled = true;
}
