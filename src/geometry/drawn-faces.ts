// Read CPU vertex/index buffers, including instances. Does not create or change a draw.
import {
  Box3,
  Matrix4,
  Mesh,
  InstancedMesh,
  SkinnedMesh,
  Vector3,
  type BufferGeometry,
  type Object3D,
} from 'three/webgpu';
import type { Face, Point } from './zfight.ts';

export function geometryFaces(geometry: BufferGeometry, matrix: Matrix4, piece: string, ground = false): Face[] {
  const position = geometry.getAttribute('position');
  if (!position) return [];
  const index = geometry.index;
  const count = index?.count ?? position.count;
  const out: Face[] = [];
  const start = geometry.drawRange.start;
  const end = Math.min(count, start + geometry.drawRange.count);
  for (let i = start; i + 2 < end; i += 3) {
    const points: Point[] = [];
    for (let k = 0; k < 3; k++) {
      const id = index ? index.getX(i + k) : i + k;
      const v = new Vector3().fromBufferAttribute(position, id).applyMatrix4(matrix);
      points.push([v.x, v.y, v.z]);
    }
    out.push({ piece, points, ...(ground ? { ground: true } : {}) });
  }
  return out;
}

/** Split a merged draw into edge-connected pieces; duplicate seam vertices share an edge.
 * Coincident full edges can join authored pieces: the live view reports that limitation.
 */
export function splitDraw(faces: Face[]): Face[] {
  const parent = faces.map((_, i) => i);
  const root = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]!]!;
      i = parent[i]!;
    }
    return i;
  };
  const edges = new Map<string, number>();
  for (const [i, face] of faces.entries()) {
    const vertices = face.points.map((p) => p.map((n) => Math.round(n * 100000)).join(','));
    for (let k = 0; k < vertices.length; k++) {
      const key = [vertices[k]!, vertices[(k + 1) % vertices.length]!].sort().join('|');
      const other = edges.get(key);
      if (other !== undefined) parent[root(i)] = root(other);
      else edges.set(key, i);
    }
  }
  return faces.map((face, i) => ({ ...face, piece: `${face.piece}/part-${root(i)}` }));
}

export function sceneFaces(root: Object3D, at: Vector3, radius: number) {
  const out: Face[] = [];
  const bounds = new Box3();
  root.updateWorldMatrix(true, true);
  root.traverseVisible((object) => {
    if (!(object instanceof Mesh) || object instanceof SkinnedMesh || object.userData.zfightOverlay) return;
    if (
      (Array.isArray(object.material) ? object.material : [object.material]).some(
        (m) => !m.visible || m.transparent || m.opacity < 1,
      )
    )
      return;
    const label: string[] = [];
    for (let p: Object3D | null = object; p && p !== root; p = p.parent) if (p.name) label.unshift(p.name);
    const name = `${label.join('/') || object.geometry.type}/mesh-${object.id}`;
    const take = (matrix: Matrix4, suffix: string) => {
      object.geometry.computeBoundingBox();
      if (!object.geometry.boundingBox) return;
      bounds.copy(object.geometry.boundingBox).applyMatrix4(matrix);
      if (bounds.distanceToPoint(at) > radius) return;
      const ground = object.geometry.hasAttribute('covePath');
      const faces = geometryFaces(object.geometry, matrix, name + suffix, ground).filter((f) => {
        bounds.setFromPoints(f.points.map((p) => new Vector3(...p)));
        return bounds.distanceToPoint(at) <= radius;
      });
      out.push(...(ground ? faces : splitDraw(faces)));
    };
    if (object instanceof InstancedMesh) {
      const matrix = new Matrix4();
      for (let i = 0; i < object.count; i++) {
        object.getMatrixAt(i, matrix);
        matrix.premultiply(object.matrixWorld);
        if (Math.abs(matrix.determinant()) > 1e-12) take(matrix, `/instance-${i}`);
      }
    } else take(object.matrixWorld, '');
  });
  return out;
}
