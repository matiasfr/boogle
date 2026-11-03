// Bounded Local presentation experiment. Research: stylized-terrain recommendations 6/9 and ultra-water 4/7.
// The original triangles remain available for same-tab A/B/A; only their indices change while this flag is on.
import * as THREE from 'three/webgpu';
import { CELL, HALF, COURT } from '../../constants.ts';
import { heights, groundHeight } from '../../island/heights.ts';
import { island } from '../../island/index.ts';
import { SHORE, inShore, shoreMode } from '../../island/shore-options.ts';
import { placements } from '../../entities/props/state.ts';
import { smoothstep, valueNoise } from '../../math.ts';
import { freezeStatic } from '../../render/instances.ts';
import { groundNoise, sandNormal } from '../water/ground.ts';
import { TSL } from '../water/tsl.ts';

const { attribute, cameraViewMatrix, float, mix, normalWorldGeometry, positionWorld, vec4, smoothstep: ss } = TSL;
const trees = placements.filter((p) => p.blueprint !== 'rock' && inShore(p.x, p.z));
const wet = new THREE.Color('#c9ad78'),
  sand = new THREE.Color('#efd89d');
const grass = new THREE.Color('#7cc650'),
  dark = new THREE.Color('#4e9a3d');
const originals: { geometry: THREE.BufferGeometry; full: THREE.BufferAttribute; cut: THREE.BufferAttribute }[] = [];
let patch: THREE.Mesh | undefined;
let smoothMaterial: THREE.MeshStandardNodeMaterial, detailMaterial: THREE.MeshStandardNodeMaterial;

function feather(x: number, z: number) {
  return smoothstep(0, 7.5, Math.min(x - SHORE.x0, SHORE.x1 - x, z - SHORE.z0, SHORE.z1 - z));
}
/** Exact original triangle plane, rather than bilinear interpolation across its diagonal. */
export function originalHeight(x: number, z: number) {
  const u = (x + HALF) / CELL,
    v = (HALF - z) / CELL;
  const i = Math.floor(u),
    j = Math.floor(v),
    a = u - i,
    b = v - j;
  const h00 = heights[i]![j]!,
    h10 = heights[i + 1]![j]!,
    h01 = heights[i]![j + 1]!,
    h11 = heights[i + 1]![j + 1]!;
  return a + b <= 1 ? h00 + (h10 - h00) * a + (h01 - h00) * b : h11 + (h01 - h11) * (1 - a) + (h10 - h11) * (1 - b);
}
export function shoreHeight(x: number, z: number) {
  const base = originalHeight(x, z),
    edge = feather(x, z);
  if (!edge) return base;
  // A 2.5 m low-pass of the authored heightfield rounds the profile, not just its normals.
  let rounded = groundHeight(x, z) * 4;
  for (const [dx, dz, w] of [
    [1.25, 0, 2],
    [-1.25, 0, 2],
    [0, 1.25, 2],
    [0, -1.25, 2],
    [1.25, 1.25, 1],
    [-1.25, 1.25, 1],
    [1.25, -1.25, 1],
    [-1.25, -1.25, 1],
  ])
    rounded += groundHeight(x + dx!, z + dz!) * w!;
  rounded /= 16;
  const beach = smoothstep(-0.2, 0.5, base) * (1 - smoothstep(1.2, 2.6, base));
  const berm = Math.exp(-(((base - 0.85) / 0.45) ** 2)) * (0.08 + 0.06 * Math.sin(x * 0.25 + z * 0.12));
  const dunes = Math.sin(x * 0.38 + z * 0.19) * Math.sin(z * 0.43 - x * 0.08) * 0.08;
  let contact = 1;
  for (const p of trees) contact = Math.min(contact, smoothstep(0.65, 2, Math.hypot(x - p.x, z - p.z)));
  const court = smoothstep(COURT.r + 1, COURT.r + 7, Math.hypot(x - COURT.x, z - COURT.z));
  const paint = island.paintAt(x, z);
  const protect = paint ? 1 - paint[3]! : 1;
  // Keep the actual waterline and all POI paint/contacts; bound walking mismatch without flattening the shapes.
  const offset = 0.14 * Math.tanh((rounded - base + beach * (berm + dunes)) / 0.14);
  return base + offset * edge * contact * court * protect * smoothstep(-0.3, 0.25, base);
}

export function setShoreMode(mode: 'today' | 'smooth' | 'smooth-detail') {
  if (!patch) return;
  for (const { geometry, full, cut } of originals) geometry.setIndex(mode === 'today' ? full : cut);
  patch.visible = mode !== 'today';
  patch.material = mode === 'smooth-detail' ? detailMaterial : smoothMaterial;
}

export function buildShore(group: THREE.Group, source: THREE.MeshStandardNodeMaterial) {
  const position: number[] = [],
    normal: number[] = [],
    color: number[] = [],
    face: number[] = [],
    blend: number[] = [],
    indices: number[] = [];
  const va = new THREE.Vector3(),
    vb = new THREE.Vector3(),
    vc = new THREE.Vector3(),
    fn = new THREE.Vector3();
  const originalColor = new THREE.Color(),
    localColor = new THREE.Color(),
    green = new THREE.Color();
  let removed = 0,
    maxOffset = 0,
    squareOffset = 0,
    landSamples = 0,
    worst = { x: 0, z: 0, offset: 0 };
  // Subdivide each original triangle independently: boundary samples lie on its exact old edge, including diagonals.
  // Duplicate only at old triangle boundaries so the flat-normal collar exactly matches the neighbouring old faces.
  for (const child of group.children) {
    if (!(child instanceof THREE.Mesh)) continue;
    const geometry = child.geometry,
      full = geometry.index!;
    const pos = geometry.getAttribute('position'),
      colours = geometry.getAttribute('color');
    const kept: number[] = [];
    for (let k = 0; k < full.count; k += 3) {
      const ids = [full.getX(k), full.getX(k + 1), full.getX(k + 2)];
      va.fromBufferAttribute(pos, ids[0]!);
      vb.fromBufferAttribute(pos, ids[1]!);
      vc.fromBufferAttribute(pos, ids[2]!);
      if (!inShore((va.x + vb.x + vc.x) / 3, (va.z + vb.z + vc.z) / 3)) {
        kept.push(...ids);
        continue;
      }
      removed++;
      fn.crossVectors(vb.clone().sub(va), vc.clone().sub(va)).normalize();
      const rows: number[][] = [],
        n = SHORE.divisions;
      for (let a = 0; a <= n; a++) {
        const row: number[] = [];
        rows.push(row);
        for (let b = 0; b <= n - a; b++) {
          const weights = [1 - (a + b) / n, a / n, b / n];
          const x = va.x * weights[0]! + vb.x * weights[1]! + vc.x * weights[2]!;
          const z = va.z * weights[0]! + vb.z * weights[1]! + vc.z * weights[2]!;
          const base = va.y * weights[0]! + vb.y * weights[1]! + vc.y * weights[2]!,
            y = shoreHeight(x, z),
            f = feather(x, z);
          row.push(position.length / 3);
          position.push(x, y, z);
          face.push(fn.x, fn.y, fn.z);
          blend.push(f);
          const dx = (shoreHeight(x + 0.15, z) - shoreHeight(x - 0.15, z)) / 0.3;
          const dz = (shoreHeight(x, z + 0.15) - shoreHeight(x, z - 0.15)) / 0.3,
            length = Math.hypot(dx, 1, dz);
          normal.push(-dx / length, 1 / length, -dz / length);
          originalColor.setRGB(0, 0, 0);
          ids.forEach((id, i) => {
            originalColor.r += colours.getX(id) * weights[i]!;
            originalColor.g += colours.getY(id) * weights[i]!;
            originalColor.b += colours.getZ(id) * weights[i]!;
          });
          // Suggestion 1: a gently irregular, wider grass/sand feather, with today's exact palette endpoints.
          const noise = valueNoise(x * 0.3, z * 0.3);
          localColor.copy(wet).lerp(sand, smoothstep(-1.5, 0.4, y));
          green.copy(grass).lerp(dark, smoothstep(-0.2, 0.6, noise) * 0.7 + smoothstep(4, 8, y) * 0.3);
          localColor.lerp(green, smoothstep(1.2, 1.95, y + noise * 0.25));
          const protectedPaint = island.paintAt(x, z)?.[3] ?? 0;
          const natural =
            f *
            (1 - protectedPaint) *
            smoothstep(COURT.r + 1, COURT.r + 7, Math.hypot(x - COURT.x, z - COURT.z)) *
            (1 - smoothstep(2, 3, y));
          originalColor.lerp(localColor, natural);
          color.push(originalColor.r, originalColor.g, originalColor.b);
          if (base > 0) {
            const offset = y - base;
            landSamples++;
            squareOffset += offset * offset;
            if (Math.abs(offset) > maxOffset) {
              maxOffset = Math.abs(offset);
              worst = { x, z, offset };
            }
          }
        }
      }
      for (let a = 0; a < n; a++)
        for (let b = 0; b < n - a; b++) {
          indices.push(rows[a]![b]!, rows[a + 1]![b]!, rows[a]![b + 1]!);
          if (b < n - a - 1) indices.push(rows[a + 1]![b]!, rows[a + 1]![b + 1]!, rows[a]![b + 1]!);
        }
    }
    if (kept.length !== full.count)
      originals.push({ geometry, full, cut: new THREE.BufferAttribute(new Uint32Array(kept), 1) });
  }
  const geometry = new THREE.BufferGeometry();
  for (const [name, array, size] of [
    ['position', position, 3],
    ['normal', normal, 3],
    ['color', color, 3],
    ['shoreFace', face, 3],
    ['shoreBlend', blend, 1],
  ] as const)
    geometry.setAttribute(name, new THREE.Float32BufferAttribute(array, size));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  smoothMaterial = source.clone();
  smoothMaterial.flatShading = false;
  const f = attribute('shoreBlend', 'float'),
    p = positionWorld;
  const worldNormal = mix(attribute('shoreFace', 'vec3'), normalWorldGeometry, f).normalize();
  smoothMaterial.normalNode = cameraViewMatrix.mul(vec4(worldNormal, 0)).xyz.normalize();
  detailMaterial = smoothMaterial.clone();
  const noise = groundNoise();
  // Preserve vertex paint. Cheap filtered grain/variation and static wet sand; no new swash or water work.
  detailMaterial.colorNode = float(1).sub(noise.filtered(p.xz.mul(0.6)).sub(0.5).mul(0.09).mul(f));
  const damp = ss(-0.1, 0.65, p.y).oneMinus().mul(f);
  detailMaterial.colorNode = detailMaterial.colorNode!.mul(mix(1, 0.83, damp));
  detailMaterial.roughnessNode = mix(0.95, 0.65, damp);
  detailMaterial.normalNode = mix(
    smoothMaterial.normalNode,
    sandNormal(p, worldNormal, float(1.5), noise),
    f,
  ).normalize();
  patch = new THREE.Mesh(geometry, smoothMaterial);
  patch.name = 'shore-slice';
  patch.castShadow = patch.receiveShadow = true;
  group.add(patch);
  freezeStatic(patch);
  setShoreMode(shoreMode === 'smooth-detail' ? 'smooth-detail' : 'smooth');
  const meshBytes = Object.values(geometry.attributes).reduce(
    (s, a) => s + a.array.byteLength,
    geometry.index!.array.byteLength,
  );
  console.info(
    'SHORE MESH ' +
      JSON.stringify({
        bounds: SHORE,
        vertices: position.length / 3,
        triangles: indices.length / 3,
        removed,
        added: indices.length / 3 - removed,
        meshBytes,
        colliderOffset: { max: maxOffset, rms: Math.sqrt(squareOffset / landSamples), worst },
        drawsAdded: 1,
      }),
  );
}
