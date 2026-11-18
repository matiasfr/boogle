import { Matrix4, Sphere, type InstancedMesh } from 'three/webgpu';

const transform = new Matrix4();
const instance = new Sphere();
const DEFAULT_PAD = 0.5;

function computeFittedSphere(this: InstancedMesh, pad = DEFAULT_PAD) {
  const bounds = (this.boundingSphere ??= new Sphere()).makeEmpty();
  if (!this.geometry.boundingSphere) this.geometry.computeBoundingSphere();
  const local = this.geometry.boundingSphere!;
  for (let slot = 0; slot < this.count; slot++) {
    this.getMatrixAt(slot, transform);
    instance.copy(local).applyMatrix4(transform);
    if (instance.radius > 0) bounds.union(instance);
  }
  if (!bounds.isEmpty()) bounds.radius += pad;
}

export function fitInstanceBounds(mesh: InstancedMesh, pad = DEFAULT_PAD) {
  mesh.computeBoundingSphere = pad === DEFAULT_PAD ? computeFittedSphere : computeFittedSphere.bind(mesh, pad);
  mesh.computeBoundingSphere();
  mesh.frustumCulled = true;
}
