// Capture the current builders' static tech meshes, rather than the retired prototype's pad catalogue.
import fs from 'node:fs';
import * as THREE from 'three/webgpu';
import * as tech from '../../src/place/tech-layout.ts';
import * as layout from '../../src/place/layout.ts';
import { H } from '../../src/place/terrain.ts';
import { flat } from '../../src/render/flat.ts';
import { merged } from '../../src/render/part-geometry.ts';
import { hookRings } from '../../src/entities/railway/hook-path.ts';
import { geometryFaces, materialSurface } from '../../src/geometry/drawn-faces.ts';
import type { Face } from '../../src/geometry/zfight.ts';
import { sourceModule } from './source.ts';

/** Fail closed if either source-owned geometry boundary moves. No copied dimensions or pad keep/exclude list. */
function runSection(file: string, start: string, end: string, bindings: Record<string, unknown>) {
  const source = fs.readFileSync(file, 'utf8');
  const a = source.indexOf(start),
    b = source.indexOf(end, a);
  if (a < 0 || b <= a || source.indexOf(start, a + start.length) !== -1)
    throw new Error(`Tech geometry boundary changed: ${file}`);
  sourceModule<{ capture: () => void }>(`export function capture() {${source.slice(a, b)}}`, bindings).capture();
}

export function collectTechGeometry(): Face[] {
  const faces: Face[] = [];
  const capture = (mesh: THREE.Mesh, id: string) => {
    mesh.updateMatrixWorld(true);
    const mat = mesh.material as THREE.Material;
    faces.push(
      ...geometryFaces(
        mesh.geometry,
        mesh.matrixWorld,
        id,
        false,
        materialSurface(mat, mesh.castShadow, mesh.receiveShadow),
      ),
    );
    mesh.geometry.dispose();
  };
  const meshes: THREE.Mesh[] = [];
  const land = { H, addStatic() {}, addStatics() {} };
  runSection('src/entities/railway/tools.ts', '  const pillar = tech.PILLARS[0]!;', '  let lip: THREE.Mesh | null', {
    THREE,
    tech,
    layout,
    land,
    owner: {},
    flat: { flat },
    mesh: (geometry: THREE.BufferGeometry, material: THREE.Material) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      meshes.push(mesh);
      return mesh;
    },
  });
  meshes.forEach((mesh, i) => capture(mesh, `tech/tools/${i}`));
  meshes.length = 0;
  let i = 0;
  runSection('src/entities/railway/hook-view.ts', '  for (const { pad: p } of rings.slice(1))', '  const ringMesh =', {
    THREE,
    rings: hookRings(tech.PADS, tech.ringAt, layout.ORIGIN.x),
    ox: layout.ORIGIN.x,
    shapes: { merged },
    flatMod: { flat },
    land,
    owner: {},
    partMat: new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.75, flatShading: true }),
    glow: new THREE.MeshStandardNodeMaterial(),
    add: (mesh: THREE.Mesh) => {
      meshes.push(mesh);
      return mesh;
    },
  });
  for (const mesh of meshes) capture(mesh, `tech/hook/${i++}`);
  meshes.length = 0;
  const partMat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.75, flatShading: true });
  runSection('src/entities/railway/line2-view.ts', '  const stonePad =', '  const hook = tech.DEVICES.hook;', {
    THREE,
    tech,
    ox: layout.ORIGIN.x,
    land,
    owner: {},
    shapes: { merged },
    flat,
    STONE: '#917b5e',
    mesh: (geometry: THREE.BufferGeometry, material = partMat) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      meshes.push(mesh);
      return mesh;
    },
  });
  meshes.forEach((mesh, i) => capture(mesh, `tech/line2/${i}`));
  const parts: THREE.BufferGeometry[] = [];
  runSection('src/entities/finds/secrets-view.ts', '  const m4 =', "  // The tower's boxes stand", {
    THREE,
    parts,
    merged,
    padById: tech.padById,
    H,
    ox: layout.ORIGIN.x,
    STONE: '#917b5e',
    BRASS: '#c79a3e',
    addStatic() {},
    owner: {},
  });
  parts.forEach((geometry, i) => {
    const mesh = new THREE.Mesh(geometry, partMat);
    mesh.castShadow = mesh.receiveShadow = true;
    capture(mesh, `tech/secrets/${i}`);
  });
  return faces;
}
