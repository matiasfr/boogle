// Instance pools (docs/plans/game-loop.md, step 3): anything drawn in dozens is one InstancedMesh, refilled each frame
// without allocating, with a bounding sphere kept up to date so frustum culling stays on (a bare InstancedMesh has
// the bounds of its first frame, so callers used to turn culling off).
//
//   const pool = createPool(geometry, material, max)   pool.mesh goes in the scene
//   pool.begin()                                       start a frame's fill
//   pool.push(x, y, z, qx, qy, qz, qw, sx, sy, sz)     one instance (stops at max)
//   pool.pushMatrix(m)                                 one instance from a Matrix4 (a transform built in steps)
//   pool.end()                                         count, upload and bounds
//
//   freezeStatic(object)   decor that never moves: compute its matrices once and skip them every frame after
import * as THREE from 'three/webgpu';

export type Pool = {
  mesh: THREE.InstancedMesh;
  begin(): void;
  push(
    x: number,
    y: number,
    z: number,
    qx: number,
    qy: number,
    qz: number,
    qw: number,
    sx: number,
    sy: number,
    sz: number,
  ): void;
  pushMatrix(m: THREE.Matrix4): void;
  end(): void;
};

export function createPool(geometry: THREE.BufferGeometry, material: THREE.Material, max: number): Pool {
  const mesh = new THREE.InstancedMesh(geometry, material, max);
  mesh.count = 0;
  geometry.computeBoundingSphere();
  const r0 = geometry.boundingSphere!.radius + geometry.boundingSphere!.center.length();
  const sphere = new THREE.Sphere();
  mesh.boundingSphere = sphere;
  const a = mesh.instanceMatrix.array as Float32Array;
  let n = 0,
    x0 = 0,
    y0 = 0,
    z0 = 0,
    x1 = 0,
    y1 = 0,
    z1 = 0,
    reach = 0;
  return {
    mesh,
    begin() {
      n = 0;
      x0 = y0 = z0 = Infinity;
      x1 = y1 = z1 = -Infinity;
      reach = 0;
    },
    push(x, y, z, qx, qy, qz, qw, sx, sy, sz) {
      if (n >= max) return;
      // Matrix4.compose, written straight into the instance buffer (column-major).
      const x2 = qx + qx,
        y2 = qy + qy,
        z2 = qz + qz;
      const xx = qx * x2,
        xy = qx * y2,
        xz = qx * z2,
        yy = qy * y2,
        yz = qy * z2,
        zz = qz * z2,
        wx = qw * x2,
        wy = qw * y2,
        wz = qw * z2;
      const o = n * 16;
      a[o] = (1 - (yy + zz)) * sx;
      a[o + 1] = (xy + wz) * sx;
      a[o + 2] = (xz - wy) * sx;
      a[o + 3] = 0;
      a[o + 4] = (xy - wz) * sy;
      a[o + 5] = (1 - (xx + zz)) * sy;
      a[o + 6] = (yz + wx) * sy;
      a[o + 7] = 0;
      a[o + 8] = (xz + wy) * sz;
      a[o + 9] = (yz - wx) * sz;
      a[o + 10] = (1 - (xx + yy)) * sz;
      a[o + 11] = 0;
      a[o + 12] = x;
      a[o + 13] = y;
      a[o + 14] = z;
      a[o + 15] = 1;
      n++;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      if (z < z0) z0 = z;
      if (z > z1) z1 = z;
      const s = Math.max(Math.abs(sx), Math.abs(sy), Math.abs(sz)) * r0;
      if (s > reach) reach = s;
    },
    pushMatrix(m) {
      if (n >= max) return;
      const e = m.elements;
      a.set(e, n * 16);
      n++;
      const x = e[12],
        y = e[13],
        z = e[14];
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      if (z < z0) z0 = z;
      if (z > z1) z1 = z;
      const s =
        Math.sqrt(
          Math.max(
            e[0] * e[0] + e[1] * e[1] + e[2] * e[2],
            e[4] * e[4] + e[5] * e[5] + e[6] * e[6],
            e[8] * e[8] + e[9] * e[9] + e[10] * e[10],
          ),
        ) * r0;
      if (s > reach) reach = s;
    },
    end() {
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
      if (!n) return;
      sphere.center.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      sphere.radius = Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2 + reach;
    },
  };
}

export function freezeStatic(object: THREE.Object3D) {
  object.updateMatrixWorld(true);
  object.traverse((o) => {
    o.matrixAutoUpdate = false;
  });
}
