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
  type Material,
} from 'three/webgpu';
import type { Face, Point } from './zfight.ts';
import { materialSurface, isOpaqueMaterial, type Surface } from './zfight-surface.ts';
export { materialSurface, isOpaqueMaterial } from './zfight-surface.ts';
const connectivity = new WeakMap<BufferGeometry, number[]>();

export function geometryFaces(
  geometry: BufferGeometry,
  matrix: Matrix4,
  piece: string,
  ground = false,
  surface?: Surface,
  family?: string,
  assembly?: string,
): Face[] {
  const position = geometry.getAttribute('position');
  if (!position) return [];
  const index = geometry.index;
  const count = index?.count ?? position.count;
  const out: Face[] = [];
  const start = geometry.drawRange.start;
  const end = Math.min(count, start + geometry.drawRange.count);
  for (let i = start; i + 2 < end; i += 3) {
    const points: Point[] = [];
    const vertex: Point[] = [],
      uvs: Point[] = [];
    for (let k = 0; k < 3; k++) {
      const id = index ? index.getX(i + k) : i + k;
      const v = new Vector3().fromBufferAttribute(position, id).applyMatrix4(matrix);
      points.push([v.x, v.y, v.z]);
      const color = geometry.getAttribute('color');
      if (color && surface?.vertexColors !== false) vertex.push([color.getX(id), color.getY(id), color.getZ(id)]);
      const uv = geometry.getAttribute('uv');
      if (uv) uvs.push([uv.getX(id), uv.getY(id), 0]);
    }
    out.push({
      piece,
      points,
      ...(ground ? { ground: true } : {}),
      family,
      assembly,
      ...(surface
        ? {
            surface: {
              ...surface,
              ...(vertex.length ? { vertex } : {}),
              ...(surface.texture ? { texture: { ...surface.texture, uv: uvs } } : {}),
            },
          }
        : {}),
    });
  }
  if (!ground) {
    let components = connectivity.get(geometry);
    if (!components) {
      components = connectedFaces(out);
      connectivity.set(geometry, components);
    }
    out.forEach((f, i) => {
      f.solid = `${piece}/solid-${components[i]}`;
    });
  }
  return out;
}

/** Split a merged draw into edge-connected pieces; duplicate seam vertices share an edge.
 * Coincident full edges can join authored pieces: the live view reports that limitation.
 */
function connectedFaces(faces: Face[]): number[] {
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
  return faces.map((_, i) => root(i));
}
export function splitDraw(faces: Face[]): Face[] {
  const components = connectedFaces(faces);
  return faces.map((face, i) => ({ ...face, piece: `${face.piece}/part-${components[i]}` }));
}

export function sceneFaces(root: Object3D, at: Vector3, radius: number) {
  const out: Face[] = [];
  const bounds = new Box3();
  root.updateWorldMatrix(true, true);
  root.traverseVisible((object) => {
    if (!(object instanceof Mesh) || object instanceof SkinnedMesh || object.userData.zfightOverlay) return;
    if ((Array.isArray(object.material) ? object.material : [object.material]).some((m) => !isOpaqueMaterial(m)))
      return;
    const label: string[] = [];
    for (let p: Object3D | null = object; p && p !== root; p = p.parent) if (p.name) label.unshift(p.name);
    const name = `${label.join('/') || object.geometry.type}/mesh-${object.id}`;
    const take = (matrix: Matrix4, suffix: string, multiplier: Point = [1, 1, 1]) => {
      object.geometry.computeBoundingBox();
      if (!object.geometry.boundingBox) return;
      bounds.copy(object.geometry.boundingBox).applyMatrix4(matrix);
      if (bounds.distanceToPoint(at) > radius) return;
      const ground = object.geometry.hasAttribute('covePath');
      const material = Array.isArray(object.material) ? object.material[0]! : object.material;
      const surface = materialSurface(material, object.castShadow, object.receiveShadow, multiplier);
      if (Array.isArray(object.material)) surface.uncertain = 'unresolved material groups';
      const map = (material as Material & { map?: { uuid: string } | null }).map;
      if (map) surface.texture = { id: map.uuid, uv: [] };
      const faces = geometryFaces(object.geometry, matrix, name + suffix, ground, surface, name).filter((f) => {
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
        const color = object.instanceColor
          ? ([object.instanceColor.getX(i), object.instanceColor.getY(i), object.instanceColor.getZ(i)] as Point)
          : undefined;
        if (Math.abs(matrix.determinant()) > 1e-12) take(matrix, `/instance-${i}`, color);
      }
    } else take(object.matrixWorld, '');
  });
  return out;
}
