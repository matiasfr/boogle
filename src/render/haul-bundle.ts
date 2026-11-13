// Local bundle geometry and seating, shared by the game haul view and the isolated asset stage.
import * as THREE from 'three/webgpu';
import { abs, float, mix, normalGeometry, positionGeometry, sin, smoothstep as ss, vec3 } from 'three/tsl';
import { PIECE, pieceMesh, pieceColor, commitPieces } from './haul-pieces.ts';

export const SHOWN = 22;
export const BUNDLE_SCALE = 0.75;
const R = PIECE.r * BUNDLE_SCALE;
export type BundleFit = { back: number; floor: number; len: number; round: boolean; radius?: number };
type Worn = { inner?: THREE.Object3D; loadFit?: BundleFit & { frame: THREE.Object3D } };
export const frameOf = (a: THREE.Object3D): THREE.Object3D => {
  const u = a.userData as Worn;
  return u.loadFit?.frame ?? u.inner ?? a;
};
export const fitOf = (a: THREE.Object3D): BundleFit =>
  (a.userData as Worn).loadFit ?? { back: 0.45, floor: 0.16, len: 1, round: false };
const slotsFor = (tall: number): [number, number][] => {
  const pts: [number, number][] = [];
  for (let j = 0; j < 8; j++) for (let i = 0; i < 9; i++) pts.push([(i + (j % 2) * 0.5) * 2 * R, j * 2 * R * 0.866]);
  const score = ([y, z]: [number, number]) => (y / tall) ** 2 + z ** 2;
  return pts.sort((p, r) => score(p) - score(r) || p[0] - r[0]).slice(0, SHOWN);
};
const extentsOf = (slots: [number, number][]) =>
  slots.map((_, k): [number, number] => [
    Math.max(...slots.slice(0, k + 1).map((s) => s[0])),
    Math.max(...slots.slice(0, k + 1).map((s) => s[1])),
  ]);
const TALL = slotsFor(1.4);
const ROUND = slotsFor(0.9);
const EXTENTS = new Map([TALL, ROUND].map((s) => [s, extentsOf(s)]));
export const shownOf = (n: number): number => (n <= 12 ? n : Math.min(SHOWN, Math.round(12 + (n - 12) * 0.21)));
// Keep the established visual growth scale independently of the retired classic stack cap.
export const lenOf = (n: number): number => 1 + 0.55 * Math.min(1, n / 60);
const q = new THREE.Quaternion(),
  e = new THREE.Euler(),
  v = new THREE.Vector3(),
  sc = new THREE.Vector3();
export const slotAt = (m: number, fit: BundleFit, out: THREE.Vector3): THREE.Vector3 => {
  const [y, z] = (fit.round ? ROUND : TALL)[m]!;
  const radius = fit.radius ?? 1;
  return out.set((((m * 37) % 7) - 3) * 0.012, fit.floor + (R + y) * radius, fit.back + (R + z) * radius);
};
export function pieceAt(f: THREE.Object3D, fit: BundleFit, m: number, len: number, out: THREE.Matrix4): THREE.Matrix4 {
  q.setFromEuler(e.set(0, (((m * 13) % 5) - 2) * 0.03, (((m * 7) % 5) - 2) * 0.02));
  const radius = BUNDLE_SCALE * (fit.radius ?? 1);
  sc.set(len * (1 + (((m * 11) % 5) - 2) * 0.03), radius, radius);
  return out.compose(slotAt(m, fit, v), q, sc).premultiply(f.matrixWorld);
}
export function bandAt(
  f: THREE.Object3D,
  fit: BundleFit,
  k: number,
  len: number,
  side: number,
  out: THREE.Matrix4,
): THREE.Matrix4 {
  const [y1, z1] = EXTENTS.get(fit.round ? ROUND : TALL)![k - 1]!;
  const radius = fit.radius ?? 1;
  v.set(side * 0.28 * PIECE.len * len, fit.floor + (R + y1 / 2) * radius, fit.back + (R + z1 / 2) * radius);
  const lip = fit.round ? 0.6 : 1.05;
  sc.set(1, (y1 / 2 + R * lip) * radius, (z1 / 2 + R * lip) * radius);
  return out.compose(v, q.identity(), sc).premultiply(f.matrixWorld);
}
export function makeBundleBands(capacity: number) {
  const bands = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(1, 1, 0.09, 18, 1, true).rotateZ(Math.PI / 2),
    new THREE.MeshStandardNodeMaterial({ color: '#d6b878', roughness: 1, side: THREE.DoubleSide, flatShading: true }),
    capacity,
  );
  bands.count = 0;
  bands.frustumCulled = false;
  bands.castShadow = true;
  return bands;
}

/** The game's bark, amber band and pale cut ends. Call only on an owned material or at its initial setup. */
export function dressBundleLogs(m: THREE.MeshStandardNodeMaterial, tint: THREE.Color) {
  m.flatShading = false;
  const p = positionGeometry;
  const c = (hex: string) => {
    const k = new THREE.Color(hex);
    return vec3(k.r / tint.r, k.g / tint.g, k.b / tint.b);
  };
  const band = ss(float(0.11), float(0.12), p.x).mul(ss(float(0.17), float(0.16), p.x));
  const grain = sin(
    p.y
      .add(p.z)
      .mul(90)
      .add(sin(p.x.mul(9)).mul(1.4)),
  )
    .mul(0.08)
    .add(1);
  m.colorNode = mix(
    mix(c('#6a4526').mul(grain), c('#f2a51a'), band),
    c('#e3b877'),
    ss(float(0.7), float(0.9), abs(normalGeometry.x)),
  );
  m.needsUpdate = true;
}

/** Stage-owned buffers/materials; transforms remain local to the same production load socket. */
export function makeBundlePreview(fit: BundleFit) {
  const root = new THREE.Group();
  root.name = 'wear_carried_logs';
  const pieces = pieceMesh(SHOWN);
  pieces.name = 'wear_carried_logs_pieces';
  pieces.geometry = pieces.geometry.clone();
  const logMaterial = (pieces.material as THREE.MeshStandardNodeMaterial).clone();
  dressBundleLogs(logMaterial, pieceColor(0));
  pieces.material = logMaterial;
  const bands = makeBundleBands(2);
  bands.name = 'wear_carried_logs_bands';
  root.add(pieces, bands);
  const local = new THREE.Object3D(),
    matrix = new THREE.Matrix4();
  return {
    root,
    setCount(n: number) {
      const shown = shownOf(Math.max(0, Math.floor(n)));
      const len = lenOf(n) * fit.len;
      for (let m = 0; m < shown; m++) {
        pieces.setMatrixAt(m, pieceAt(local, fit, m, len, matrix));
        pieces.setColorAt(m, pieceColor(0));
      }
      commitPieces(pieces, shown);
      bands.count = shown >= 3 ? 2 : 0;
      if (bands.count) {
        bands.setMatrixAt(0, bandAt(local, fit, shown, len, -1, matrix));
        bands.setMatrixAt(1, bandAt(local, fit, shown, len, 1, matrix));
        bands.instanceMatrix.needsUpdate = true;
      }
    },
  };
}
