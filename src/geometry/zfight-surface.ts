import type { Face, Point } from './zfight.ts';

/** Portable drawn appearance. Unknown shader effects are never evidence of a harmless joint. */
export type Surface = {
  material: string;
  color: Point;
  castShadow: boolean;
  receiveShadow: boolean;
  vertexColors?: boolean;
  vertex?: readonly Point[];
  texture?: { id: string; uv: readonly Point[] };
  uncertain?: string;
  occlusionUncertain?: boolean;
};
const close = (a: Point, b: Point) => a.every((v, i) => Math.abs(v - b[i]!) < 1e-5);
function sample(face: Face, values: readonly Point[], p: Point): Point {
  // All collected faces are triangles. Constant convex test faces need no interpolation.
  if (values.every((v) => close(v, values[0]!))) return values[0]!;
  const sub = (a: Point, b: Point) => a.map((v, i) => v - b[i]!);
  const dot = (a: number[], b: number[]) => a.reduce((sum, v, i) => sum + v * b[i]!, 0);
  const a = face.points[0]!,
    u = sub(face.points[1]!, a),
    v = sub(face.points[2]!, a),
    w = sub(p, a);
  const uu = dot(u, u),
    uv = dot(u, v),
    vv = dot(v, v),
    wu = dot(w, u),
    wv = dot(w, v);
  const denominator = uu * vv - uv * uv;
  const y = (vv * wu - uv * wv) / denominator,
    z = (uu * wv - uv * wu) / denominator;
  return [0, 1, 2].map(
    (i) => values[0]![i]! * (1 - y - z) + values[1]![i]! * y + values[2]![i]! * z,
  ) as unknown as Point;
}
export function surfaceDifferences(a: Face, b: Face, at: Point): string[] {
  const x = a.surface,
    y = b.surface;
  if (!x || !y) return ['unknown appearance'];
  const reasons: string[] = [];
  // Interpolated attributes are affine on a triangle. Equal values at the centroid alone can hide
  // crossing gradients. Agreement at three non-collinear points proves agreement on the overlap.
  const sameField = (left: readonly Point[], right: readonly Point[]) =>
    [at, ...a.points.slice(0, 3)].every((p) => close(sample(a, left, p), sample(b, right, p)));
  if (x.material !== y.material) reasons.push('material');
  if (!close(x.color, y.color)) reasons.push('colour');
  if (!sameField(x.vertex ?? [[1, 1, 1]], y.vertex ?? [[1, 1, 1]])) reasons.push('vertex colour');
  if (x.castShadow !== y.castShadow || x.receiveShadow !== y.receiveShadow) reasons.push('shadow flags');
  if ((x.texture && x.texture.uv.length < 3) || (y.texture && y.texture.uv.length < 3))
    reasons.push('unknown texture coordinates');
  else if (
    !!x.texture !== !!y.texture ||
    (x.texture && y.texture && (x.texture.id !== y.texture.id || !sameField(x.texture.uv, y.texture.uv)))
  )
    reasons.push('texture/UV');
  if (x.uncertain || y.uncertain) reasons.push(x.uncertain ?? y.uncertain!);
  return reasons;
}

/** Structural material snapshot: accepts three.js materials without importing the renderer into pure tests. */
export type DrawMaterial = {
  type: string;
  visible: boolean;
  transparent: boolean;
  opacity: number;
  colorWrite: boolean;
  depthWrite: boolean;
  color?: { toArray(): number[] };
  roughness?: number;
  metalness?: number;
  emissive?: { toArray(): number[] };
  emissiveIntensity?: number;
  vertexColors?: boolean;
  colorNode?: unknown;
  positionNode?: unknown;
  opacityNode?: unknown;
  maskNode?: unknown;
  emissiveNode?: unknown;
  normalNode?: unknown;
  flatShading?: boolean;
  side?: number;
};

/** Shared eligibility for collected triangles and the crosshair's first opaque hit. */
export const isOpaqueMaterial = (m: DrawMaterial) =>
  m.visible && !m.transparent && m.opacity === 1 && m.colorWrite && m.depthWrite;

export function materialSurface(
  material: DrawMaterial,
  castShadow: boolean,
  receiveShadow: boolean,
  multiplier: Point = [1, 1, 1],
): Surface {
  const m = material;
  return {
    material: JSON.stringify([
      m.type,
      m.roughness,
      m.metalness,
      m.emissive?.toArray(),
      m.emissiveIntensity,
      m.side,
      m.flatShading,
    ]),
    color: (m.color?.toArray() ?? [1, 1, 1]).map((v, i) => v * multiplier[i]!) as unknown as Point,
    castShadow,
    receiveShadow,
    vertexColors: m.vertexColors === true,
    occlusionUncertain: !!(m.positionNode || m.opacityNode || m.maskNode),
    ...(m.colorNode || m.positionNode || m.opacityNode || m.maskNode || m.emissiveNode || m.normalNode
      ? { uncertain: 'unresolved shader appearance' }
      : {}),
  };
}
